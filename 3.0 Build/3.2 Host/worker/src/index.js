// PinchPoint — Cloudflare Worker (v3)
// Thin API router — scheduling handled by UserScheduleDO alarms
// Connect flow uses polling-based approval (no code copy-paste)

import { UserScheduleDO } from './user-schedule-do.js'
import { verifyClerkSession } from './auth.js'
import { encryptToken, hashToken, deriveUserKey } from './crypto.js'
import { validateSchedule, validateTimezone } from './validate.js'

// Re-export DO class for wrangler binding
export { UserScheduleDO }

// ─── Rate limiting helper ──────────────────────────────────────────
// NOTE: KV-based rate limiting is best-effort (non-atomic read-then-write,
// eventually consistent). Concurrent requests can bypass the limit.
// Security-critical flows (connect approve) use per-session attempt counters instead.

async function rateLimit(env, key, maxRequests, windowSeconds) {
  const count = parseInt(await env.KV.get(key) || '0', 10)
  if (count >= maxRequests) return false
  await env.KV.put(key, String(count + 1), { expirationTtl: windowSeconds })
  return true
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.FRONTEND_URL || 'https://pinchpoint.dev',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

async function parseJSON(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

// ─── Entry point ─────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const headers = corsHeaders(env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    const url = new URL(request.url)
    const route = `${request.method} ${url.pathname}`

    // ─── Public routes (no auth) ───────────────────────────────

    if (url.pathname === '/api/health') {
      return json({ ok: true }, 200, headers)
    }

    // Connect flow: CLI starts a session
    if (route === 'POST /api/connect/start') {
      return connectStart(request, env, headers)
    }

    // Connect flow: CLI polls for approval
    if (route === 'GET /api/connect/poll') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
      if (!await rateLimit(env, `ratelimit:poll:${ip}`, 60, 60)) {
        return json({ error: 'Too many requests' }, 429, headers)
      }
      const sessionId = url.searchParams.get('session')
      if (!sessionId) return json({ error: 'Missing session param' }, 400, headers)
      return connectPoll(env, sessionId, headers)
    }

    // Connect flow: CLI sends token after approval
    if (route === 'POST /api/connect/complete') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
      if (!await rateLimit(env, `ratelimit:complete:${ip}`, 10, 60)) {
        return json({ error: 'Too many requests' }, 429, headers)
      }
      return connectComplete(request, env, headers)
    }

    // ─── Clerk-authenticated routes ────────────────────────────

    const userId = await verifyClerkSession(request, env)
    if (!userId) {
      return json({ error: 'Unauthorized' }, 401, headers)
    }

    const doId = env.USER_SCHEDULE.idFromName(userId)
    const stub = env.USER_SCHEDULE.get(doId)

    switch (route) {
      case 'GET /api/status':
        return proxyToDO(stub, '/get-status', 'GET', null, headers)

      case 'POST /api/test-ping':
        return proxyToDO(stub, '/test-ping', 'POST', null, headers)

      case 'POST /api/test-ping-debug':
        return proxyToDO(stub, '/test-ping-debug', 'POST', null, headers)

      case 'PUT /api/schedule': {
        const body = await parseJSON(request)
        if (!body) return json({ error: 'Invalid JSON body' }, 400, headers)

        if (body.schedule) {
          const err = validateSchedule(body.schedule)
          if (err) return json({ error: err }, 400, headers)
        }
        if (body.timezone) {
          const err = validateTimezone(body.timezone)
          if (err) return json({ error: err }, 400, headers)
        }
        return proxyToDO(stub, '/set-schedule', 'PUT', body, headers)
      }

      case 'POST /api/pause': {
        const body = await parseJSON(request)
        if (!body) return json({ error: 'Invalid JSON body' }, 400, headers)
        return proxyToDO(stub, '/toggle-pause', 'POST', body, headers)
      }

      // Connect flow: dashboard approves a session
      case 'POST /api/connect/approve': {
        const body = await parseJSON(request)
        if (!body?.sessionId) return json({ error: 'Missing sessionId' }, 400, headers)
        if (!body?.code) return json({ error: 'Missing verification code' }, 400, headers)
        return connectApprove(env, userId, body.sessionId, body.code, headers)
      }

      case 'POST /api/disconnect':
        return proxyToDO(stub, '/disconnect-token', 'POST', null, headers)

      case 'DELETE /api/account':
        return proxyToDO(stub, '/delete-account', 'DELETE', null, headers)

      default:
        return json({ error: 'Not found' }, 404, headers)
    }
  },

  // Maintenance cron (every 6h) — NOT for ping scheduling
  async scheduled(event, env, ctx) {
    // Future: aggregate health metrics, cleanup
  },
}

// ─── DO proxy helper ─────────────────────────────────────────────

async function proxyToDO(stub, path, method, body, corsHeaders) {
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) init.body = JSON.stringify(body)

  const doRes = await stub.fetch(new Request(`https://do${path}`, init))
  const data = await doRes.json()
  return json(data, doRes.status, corsHeaders)
}

// ─── Clerk Backend API helper ─────────────────────────────────────

async function fetchClerkEmail(env, userId) {
  if (!env.CLERK_SECRET_KEY) return null
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return null
    const user = await res.json()
    const primary = user.email_addresses?.find(e => e.id === user.primary_email_address_id)
    return primary?.email_address || user.email_addresses?.[0]?.email_address || null
  } catch {
    return null
  }
}

// ─── Connect flow (polling-based) ────────────────────────────────

// Step 1: CLI starts a connect session
async function connectStart(request, env, headers) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!await rateLimit(env, `ratelimit:connect:${ip}`, 10, 60)) {
    return json({ error: 'Too many requests' }, 429, headers)
  }

  const sessionId = crypto.randomUUID()
  const body = await parseJSON(request)
  const tokenFingerprint = body?.tokenFingerprint
  if (!tokenFingerprint || typeof tokenFingerprint !== 'string') {
    return json({ error: 'Missing tokenFingerprint' }, 400, headers)
  }
  const codeHash = body?.codeHash
  if (!codeHash || typeof codeHash !== 'string') {
    return json({ error: 'Missing codeHash' }, 400, headers)
  }

  await env.KV.put(
    `connect:${sessionId}`,
    JSON.stringify({ status: 'pending', createdAt: Date.now(), tokenFingerprint, codeHash }),
    { expirationTtl: 300 }, // 5 minutes
  )

  return json({ sessionId }, 200, headers)
}

// Step 2: CLI polls for approval status
async function connectPoll(env, sessionId, headers) {
  const session = await env.KV.get(`connect:${sessionId}`, 'json')

  if (!session) {
    return json({ status: 'expired' }, 200, headers)
  }

  return json({ status: session.status }, 200, headers)
}

// Step 3: Dashboard user approves the session (Clerk-authenticated)
async function connectApprove(env, userId, sessionId, code, headers) {
  const session = await env.KV.get(`connect:${sessionId}`, 'json')

  if (!session) {
    return json({ error: 'Session expired or invalid' }, 404, headers)
  }

  if (session.status !== 'pending') {
    return json({ error: 'Session expired or invalid' }, 404, headers)
  }

  // Enforce session TTL from creation time (not approval time)
  if (Date.now() - session.createdAt > 300_000) {
    await env.KV.delete(`connect:${sessionId}`)
    return json({ error: 'Session expired' }, 404, headers)
  }

  // Rate-limit verification code attempts per session (max 3 tries)
  const attempts = (session.attempts || 0) + 1
  if (attempts > 3) {
    await env.KV.delete(`connect:${sessionId}`)
    return json({ error: 'Too many attempts — session invalidated' }, 403, headers)
  }

  // Verify the verification code matches the hash from connectStart
  const codeDigest = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))),
  ).map(b => b.toString(16).padStart(2, '0')).join('')
  if (codeDigest !== session.codeHash) {
    // Increment attempt counter on failure
    const remainingTtl = Math.max(1, Math.ceil((session.createdAt + 300_000 - Date.now()) / 1000))
    await env.KV.put(
      `connect:${sessionId}`,
      JSON.stringify({ ...session, attempts }),
      { expirationTtl: remainingTtl },
    )
    return json({ error: 'Invalid verification code' }, 403, headers)
  }

  // Fetch user email from Clerk Backend API (not DO — avoids circular dependency for new users)
  const email = await fetchClerkEmail(env, userId)

  // Use remaining TTL from creation time (don't extend session)
  const remainingTtl = Math.max(1, Math.ceil((session.createdAt + 300_000 - Date.now()) / 1000))
  await env.KV.put(
    `connect:${sessionId}`,
    JSON.stringify({
      status: 'approved',
      userId,
      email: email || null,
      tokenFingerprint: session.tokenFingerprint,
      createdAt: session.createdAt,
      approvedAt: Date.now(),
    }),
    { expirationTtl: remainingTtl },
  )

  return json({ ok: true }, 200, headers)
}

// Step 4: CLI sends token after seeing approval
async function connectComplete(request, env, headers) {
  const body = await parseJSON(request)
  if (!body) return json({ error: 'Invalid JSON body' }, 400, headers)

  const { sessionId, setupToken } = body
  if (!sessionId || !setupToken) {
    return json({ error: 'Missing sessionId or setupToken' }, 400, headers)
  }

  // Verify session is approved
  const session = await env.KV.get(`connect:${sessionId}`, 'json')
  if (!session) {
    return json({ error: 'Session expired or invalid' }, 404, headers)
  }
  if (session.status !== 'approved') {
    return json({ error: 'Session not approved' }, 403, headers)
  }

  // Verify token fingerprint — always compute server-side, never trust caller
  const computedFingerprint = await hashToken(setupToken)
  if (computedFingerprint !== session.tokenFingerprint) {
    return json({ error: 'Token mismatch' }, 403, headers)
  }

  // Consume the session (one-time use)
  await env.KV.delete(`connect:${sessionId}`)

  // Encrypt token with per-user derived key (HKDF)
  const userKey = await deriveUserKey(env.ENCRYPTION_KEY, session.userId)
  const encryptedToken = await encryptToken(setupToken, userKey)

  const doId = env.USER_SCHEDULE.idFromName(session.userId)
  const stub = env.USER_SCHEDULE.get(doId)
  const doRes = await stub.fetch(new Request('https://do/set-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedToken,
      email: session.email,
      userId: session.userId,
    }),
  }))

  if (!doRes.ok) {
    return json({ error: 'Failed to save credentials' }, 500, headers)
  }

  return json({ ok: true }, 200, headers)
}
