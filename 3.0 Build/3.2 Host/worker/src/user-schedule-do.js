// UserScheduleDO — One Durable Object per user
// Handles schedule storage, alarm-based ping scheduling, retry logic, token health

import { decryptToken, signPingRequest } from './crypto.js'
import { sendPingNotification, sendTokenWarningNotification, sendTokenExpiredNotification } from './email.js'

export class UserScheduleDO {
  constructor(state, env) {
    this.state = state
    this.env = env
  }

  async fetch(request) {
    const url = new URL(request.url)

    try {
      switch (url.pathname) {
        case '/get-status': return this.getStatus()
        case '/set-schedule': return this.setSchedule(request)
        case '/set-token': return this.setToken(request)
        case '/toggle-pause': return this.togglePause(request)
        case '/delete-account': return this.deleteAccount()
        default: return json({ error: 'Not found' }, 404)
      }
    } catch (e) {
      return json({ error: e.message }, 500)
    }
  }

  // ─── Alarm: fires at scheduled ping time ─────────────────────

  async alarm() {
    const paused = await this.state.storage.get('paused')
    if (paused) return

    const encryptedToken = await this.state.storage.get('setupToken')
    if (!encryptedToken) return

    let token
    try {
      token = await decryptToken(encryptedToken, this.env.ENCRYPTION_KEY)
    } catch {
      // Decryption failed — token data is corrupt
      await this.state.storage.put('tokenHealth', 'red')
      return this.scheduleNextAlarm()
    }

    // Sign the request with HMAC
    const timestamp = Date.now()
    const signature = await signPingRequest(token, timestamp, this.env.PING_SECRET)

    // Call ping service
    let success = false
    let rateLimitInfo = null
    try {
      const res = await fetch(`${this.env.PING_SERVICE_URL}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, timestamp, signature }),
      })
      const data = await res.json()
      success = data.success === true
      rateLimitInfo = data.rateLimitInfo || null
    } catch {
      success = false
    }

    await this.handlePingResult(success, rateLimitInfo)
  }

  async handlePingResult(success, rateLimitInfo) {
    const now = new Date()
    const consecutiveFailures = (await this.state.storage.get('consecutiveFailures')) || 0
    const email = await this.state.storage.get('email')
    const timezone = await this.state.storage.get('timezone') || 'UTC'

    if (success) {
      // Use exact resetsAt from SDK if available, otherwise estimate now + 5h
      const windowEnds = rateLimitInfo?.resetsAt
        ? new Date(rateLimitInfo.resetsAt * 1000).toISOString()
        : new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString()

      await this.state.storage.put('lastPing', {
        time: now.toISOString(),
        success: true,
        windowEnds,
        exact: !!rateLimitInfo?.resetsAt,
      })
      await this.state.storage.put('consecutiveFailures', 0)
      await this.state.storage.put('tokenHealth', 'green')

      // Fire-and-forget email
      if (email && this.env.RESEND_API_KEY) {
        sendPingNotification(this.env, email, windowEnds, timezone, !!rateLimitInfo?.resetsAt)
      }

      await this.scheduleNextAlarm()
      return
    }

    // Failure path
    const newFailures = consecutiveFailures + 1
    await this.state.storage.put('consecutiveFailures', newFailures)
    await this.state.storage.put('lastPing', {
      time: now.toISOString(),
      success: false,
      windowEnds: null,
    })

    if (newFailures >= 5) {
      // Auto-pause — stop retrying
      await this.state.storage.put('paused', true)
      await this.state.storage.put('tokenHealth', 'red')
      if (email && this.env.RESEND_API_KEY) {
        sendTokenExpiredNotification(this.env, email)
      }
    } else if (newFailures >= 3) {
      // Warning state — email user, keep retrying
      await this.state.storage.put('tokenHealth', 'yellow')
      if (newFailures === 3 && email && this.env.RESEND_API_KEY) {
        sendTokenWarningNotification(this.env, email)
      }
      // Retry in 2 minutes
      await this.state.storage.setAlarm(Date.now() + 2 * 60 * 1000)
    } else {
      // Retry in 2 minutes
      await this.state.storage.setAlarm(Date.now() + 2 * 60 * 1000)
    }
  }

  // ─── Schedule management ─────────────────────────────────────

  async setSchedule(request) {
    const { schedule, timezone } = await request.json()
    if (schedule) await this.state.storage.put('schedule', schedule)
    if (timezone) await this.state.storage.put('timezone', timezone)
    await this.scheduleNextAlarm()
    return json({ ok: true })
  }

  async scheduleNextAlarm() {
    const schedule = await this.state.storage.get('schedule')
    const timezone = await this.state.storage.get('timezone') || 'UTC'
    const paused = await this.state.storage.get('paused')

    if (!schedule || paused) {
      await this.state.storage.deleteAlarm()
      return
    }

    const nextTime = calculateNextPingTime(schedule, timezone)
    if (nextTime) {
      await this.state.storage.setAlarm(nextTime.getTime())
    } else {
      await this.state.storage.deleteAlarm()
    }
  }

  // ─── Token management ────────────────────────────────────────

  async setToken(request) {
    const { encryptedToken, email, userId } = await request.json()
    await this.state.storage.put('setupToken', encryptedToken)
    if (email) await this.state.storage.put('email', email)
    if (userId) await this.state.storage.put('userId', userId)
    await this.state.storage.put('consecutiveFailures', 0)
    await this.state.storage.put('tokenHealth', 'green')

    // If schedule exists, start scheduling
    await this.scheduleNextAlarm()
    return json({ ok: true })
  }

  // ─── Pause toggle ────────────────────────────────────────────

  async togglePause(request) {
    const { paused } = await request.json()
    await this.state.storage.put('paused', !!paused)

    if (paused) {
      await this.state.storage.deleteAlarm()
    } else {
      // Unpausing — reset failure tracking, reschedule
      await this.state.storage.put('consecutiveFailures', 0)
      await this.state.storage.put('tokenHealth', 'green')
      await this.scheduleNextAlarm()
    }

    return json({ paused: !!paused })
  }

  // ─── Account deletion ──────────────────────────────────────

  async deleteAccount() {
    await this.state.storage.deleteAlarm()
    await this.state.storage.deleteAll()
    return json({ ok: true })
  }

  // ─── Status ──────────────────────────────────────────────────

  async getStatus() {
    const schedule = await this.state.storage.get('schedule')
    const timezone = await this.state.storage.get('timezone') || 'UTC'
    const paused = await this.state.storage.get('paused') || false
    const lastPing = await this.state.storage.get('lastPing') || null
    const setupToken = await this.state.storage.get('setupToken')
    const tokenHealth = await this.state.storage.get('tokenHealth') || 'green'
    const email = await this.state.storage.get('email') || null

    const nextPing = calculateNextPingInfo(schedule, timezone)

    return json({
      email,
      hasCredentials: !!setupToken,
      paused,
      lastPing,
      nextPing,
      schedule: schedule || {},
      timezone,
      tokenHealth,
    })
  }
}

// ─── Time helpers ────────────────────────────────────────────────

function getLocalTime(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase()
  let hour = parts.find(p => p.type === 'hour').value.padStart(2, '0')
  if (hour === '24') hour = '00' // Normalize midnight edge case
  const minute = parts.find(p => p.type === 'minute').value.padStart(2, '0')
  return { weekday, time: `${hour}:${minute}` }
}

/**
 * Calculate the next ping time as a Date (for alarm scheduling).
 * Scans forward up to 7 days from now.
 */
function calculateNextPingTime(schedule, timezone) {
  if (!schedule) return null
  const now = new Date()

  for (let offset = 0; offset < 7; offset++) {
    const checkDate = new Date(now.getTime() + offset * 86400_000)
    const { weekday } = getLocalTime(checkDate, timezone)
    const scheduledTime = schedule[weekday]
    if (!scheduledTime) continue

    const [hours, minutes] = scheduledTime.split(':').map(Number)

    // Build target date: start from checkDate at midnight in user's timezone
    // then add hours/minutes. Use a search approach to handle DST correctly.
    const target = buildTargetDate(checkDate, hours, minutes, timezone)
    if (target && target > now) return target
  }
  return null
}

/**
 * Build a Date object for a specific HH:MM in a timezone on a given day.
 * Handles DST transitions by searching for the correct UTC offset.
 */
function buildTargetDate(referenceDate, hours, minutes, timezone) {
  // Get the date components in the target timezone
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = dateFmt.format(referenceDate) // "2026-02-19"
  const [year, month, day] = dateStr.split('-').map(Number)

  // Estimate: create a UTC date and adjust for timezone offset
  // Start with a rough guess and refine
  const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes))

  // Check what time our guess corresponds to in the target timezone
  const { time: guessTime } = getLocalTime(guess, timezone)
  const [guessH, guessM] = guessTime.split(':').map(Number)
  const targetMinutes = hours * 60 + minutes
  const guessMinutes = guessH * 60 + guessM
  const diffMs = (targetMinutes - guessMinutes) * 60 * 1000

  const adjusted = new Date(guess.getTime() + diffMs)

  // Verify the adjustment landed correctly (DST can cause +-1h drift)
  const { time: verifyTime } = getLocalTime(adjusted, timezone)
  if (verifyTime === `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`) {
    return adjusted
  }

  // If DST caused a mismatch, try +-1 hour
  for (const delta of [-3600_000, 3600_000]) {
    const retry = new Date(adjusted.getTime() + delta)
    const { time: retryTime } = getLocalTime(retry, timezone)
    if (retryTime === `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`) {
      return retry
    }
  }

  // Fallback: use the best guess
  return adjusted
}

/**
 * Calculate next ping for display (returns { day, time, date } or null).
 * Scans forward up to 7 days.
 */
function calculateNextPingInfo(schedule, timezone) {
  if (!schedule) return null
  const now = new Date()

  for (let offset = 0; offset < 7; offset++) {
    const checkDate = new Date(now.getTime() + offset * 86400_000)
    const { weekday } = getLocalTime(checkDate, timezone)
    const scheduledTime = schedule[weekday]
    if (!scheduledTime) continue

    const [hours, minutes] = scheduledTime.split(':').map(Number)
    const target = buildTargetDate(checkDate, hours, minutes, timezone)
    if (target && target > now) {
      return { day: weekday, time: scheduledTime, date: target.toISOString() }
    }
  }
  return null
}

// ─── Response helper ─────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
