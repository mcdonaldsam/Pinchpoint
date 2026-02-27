// Input validation for schedule and timezone

const VALID_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday',
]
const TIME_REGEX = /^([01]\d|2[0-3]):00$/

/**
 * Build default rolls from a start time (each +5h apart).
 * @param {string} startTime - "HH:MM" in 24h format
 * @param {number} [maxRolls=5] - number of rolls to generate (1-5)
 * @returns {Array<{time: string, enabled: boolean}>}
 */
export function buildDefaultRolls(startTime, maxRolls = 5) {
  const [h, m] = startTime.split(':').map(Number)
  return Array.from({ length: maxRolls }, (_, i) => {
    const totalMin = (h * 60 + m + i * 300) % 1440
    const rh = String(Math.floor(totalMin / 60)).padStart(2, '0')
    const rm = String(totalMin % 60).padStart(2, '0')
    return { time: `${rh}:${rm}`, enabled: true }
  })
}

/**
 * Normalize schedule: convert old string format → new rolls format.
 * Old: { day: "HH:MM" | null }
 * New: { day: null | [{ time, enabled }, ...] }
 */
export function normalizeSchedule(schedule) {
  if (!schedule) return {}
  const out = {}
  for (const [day, value] of Object.entries(schedule)) {
    if (!VALID_DAYS.includes(day)) continue
    if (value === null) out[day] = null
    else if (typeof value === 'string') out[day] = buildDefaultRolls(value)
    else if (Array.isArray(value)) out[day] = value.map(r => ({ time: r.time, enabled: r.enabled }))
    else out[day] = null
  }
  return out
}

/**
 * Validate a schedule object.
 * Supports both old format (string per day) and new format (array of rolls per day).
 * @param {object} schedule - { day: "HH:MM" | null | [{ time, enabled }, ...] }
 * @returns {string|null} Error message or null if valid
 */
export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return 'Schedule must be an object'
  }
  for (const [day, value] of Object.entries(schedule)) {
    if (!VALID_DAYS.includes(day)) return `Invalid day: ${day}`

    if (value === null) continue

    // Old format: string time
    if (typeof value === 'string') {
      if (!TIME_REGEX.test(value)) {
        return `Invalid time for ${day}: ${value} (must be HH:MM as HH:00 hourly)`
      }
      continue
    }

    // New format: array of 1-5 rolls
    if (Array.isArray(value)) {
      if (value.length < 1 || value.length > 5) {
        return `${day} must have 1-5 rolls`
      }
      for (let i = 0; i < value.length; i++) {
        const roll = value[i]
        if (!roll || typeof roll !== 'object') {
          return `${day} roll ${i + 1} must be an object`
        }
        if (!TIME_REGEX.test(roll.time)) {
          return `${day} roll ${i + 1}: invalid time ${roll.time} (must be HH:MM as HH:00 hourly)`
        }
        if (typeof roll.enabled !== 'boolean') {
          return `${day} roll ${i + 1}: enabled must be a boolean`
        }
      }
      // Roll 1 must be enabled
      if (!value[0].enabled) {
        return `${day}: roll 1 must be enabled`
      }
      // Rolls must be exactly 5h apart (matching buildDefaultRolls cascade)
      const expected = buildDefaultRolls(value[0].time)
      for (let i = 1; i < value.length; i++) {
        if (value[i].time !== expected[i].time) {
          return `${day} roll ${i + 1}: must be ${expected[i].time} (5h from roll 1), got ${value[i].time}`
        }
      }
      continue
    }

    return `Invalid value for ${day}: must be null, a time string, or an array of rolls`
  }

  // Cross-day overlap check: last enabled roll's 5h window must not overlap
  // the next enabled day's first roll (roll 1, which is always enabled).
  const normalized = normalizeSchedule(schedule)
  const enabledDays = VALID_DAYS.filter(d => normalized[d] && Array.isArray(normalized[d]))
  for (let idx = 0; idx < enabledDays.length; idx++) {
    const dayA = enabledDays[idx]
    const dayB = enabledDays[(idx + 1) % enabledDays.length]
    if (dayA === dayB) continue // only one enabled day

    const rollsA = normalized[dayA]
    const rollsB = normalized[dayB]
    const roll1A = timeToMinutes(rollsA[0].time)

    // Find last enabled roll on day A
    let lastEnabledA = rollsA[0]
    for (const r of rollsA) { if (r.enabled) lastEnabledA = r }
    const lastMinA = timeToMinutes(lastEnabledA.time)
    const isWrapped = lastMinA < roll1A
    const lastAbsolute = lastMinA + (isWrapped ? 1440 : 0)

    // First enabled roll on day B is always roll 1
    const firstMinB = timeToMinutes(rollsB[0].time)

    // How many calendar days apart are A and B?
    const idxA = VALID_DAYS.indexOf(dayA)
    const idxB = VALID_DAYS.indexOf(dayB)
    const dayGap = (idxB - idxA + 7) % 7 || 7
    const firstAbsolute = firstMinB + dayGap * 1440

    if (lastAbsolute + 300 > firstAbsolute) {
      const endH = Math.floor(((lastAbsolute + 300) % 1440) / 60)
      const endM = (lastAbsolute + 300) % 60
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      return `${dayB} roll 1 (${rollsB[0].time}) overlaps ${dayA}'s last window (ends ${endTime}). Move ${dayB} to ${endTime} or later`
    }
  }

  return null
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Validate an IANA timezone string.
 * @param {string} tz - IANA timezone (e.g., "America/New_York")
 * @returns {string|null} Error message or null if valid
 */
export function validateTimezone(tz) {
  if (!tz || typeof tz !== 'string') return 'Timezone must be a string'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return null
  } catch {
    return `Invalid timezone: ${tz}`
  }
}
