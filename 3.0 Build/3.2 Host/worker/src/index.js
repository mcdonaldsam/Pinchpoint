// PinchPoint — Cloudflare Worker (v3)
// Thin API router — scheduling handled by UserScheduleDO alarms
// Connect flow uses polling-based approval (no code copy-paste)

import { UserScheduleDO } from './user-schedule-do.js'
import { verifyClerkSession } from './auth.js'
import { encryptToken } from './crypto.js'
import { validateSchedule, validateTimezone } from './validate.js'

// Re-export DO class for wrangler binding
export { UserScheduleDO }

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
      return connectStart(env, headers)
    }

    // Connect flow: CLI polls for approval
    if (route === 'GET /api/connect/poll') {
      const sessionId = url.searchParams.get('session')
      if (!sessionId) return json({ error: 'Missing session param' }, 400, headers)
      return connectPoll(env, sessionId, headers)
    }

    // Connect flow: CLI sends token after approval
    if (route === 'POST /api/connect/complete') {
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
        return connectApprove(env, userId, body.sessionId, headers)
      }

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

// ─── Connect flow (polling-based) ────────────────────────────────

// Step 1: CLI starts a connect session
async function connectStart(env, headers) {
  const sessionId = crypto.randomUUID()

  await env.KV.put(
    `connect:${sessionId}`,
    JSON.stringify({ status: 'pending', createdAt: Date.now() }),
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
async function connectApprove(env, userId, sessionId, headers) {
  const session = await env.KV.get(`connect:${sessionId}`, 'json')

  if (!session) {
    return json({ error: 'Session expired or invalid' }, 404, headers)
  }

  if (session.status !== 'pending') {
    return json({ error: 'Session already used' }, 409, headers)
  }

  // Get user email from DO for notifications
  const doId = env.USER_SCHEDULE.idFromName(userId)
  const stub = env.USER_SCHEDULE.get(doId)
  const statusRes = await stub.fetch(new Request('https://do/get-status'))
  const status = await statusRes.json()

  await env.KV.put(
    `connect:${sessionId}`,
    JSON.stringify({
      status: 'approved',
      userId,
      email: status.email || null,
      approvedAt: Date.now(),
    }),
    { expirationTtl: 300 }, // Keep 5 min TTL from creation
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

  // Consume the session (one-time use)
  await env.KV.delete(`connect:${sessionId}`)

  // Encrypt token and store in user's DO
  const encryptedToken = await encryptToken(setupToken, env.ENCRYPTION_KEY)

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
