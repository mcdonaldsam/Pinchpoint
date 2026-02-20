// PinchPoint Ping Service — Fly.io
// Receives signed requests from the Worker, runs Claude Agent SDK to ping

import http from 'http'
import crypto from 'crypto'
import { execFileSync } from 'child_process'
import { query } from '@anthropic-ai/claude-agent-sdk'

const PING_SECRET = process.env.PING_SECRET
const PING_ENCRYPTION_KEY = process.env.PING_ENCRYPTION_KEY
const PORT = process.env.PORT || 8080

if (!PING_SECRET || !PING_ENCRYPTION_KEY) {
  console.error('PING_SECRET and PING_ENCRYPTION_KEY env vars are required')
  process.exit(1)
}

// ─── Nonce cache — reject replayed requests within the 60s window ────
const seenNonces = new Map()

setInterval(() => {
  const cutoff = Date.now() - 120_000 // keep nonces 2min (covers the 60s window + margin)
  for (const [nonce, ts] of seenNonces) {
    if (ts < cutoff) seenNonces.delete(nonce)
  }
}, 30_000)

// ─── Error sanitization — strip tokens from log output ──────────
const TOKEN_PATTERN = /sk-ant-\w{3,6}-[A-Za-z0-9_-]{10,}/g

function sanitizeError(message) {
  if (typeof message !== 'string') return String(message)
  return message.replace(TOKEN_PATTERN, 'sk-ant-***REDACTED***')
}

// Clear sensitive env vars on unhandled errors to prevent leaks in crash dumps
process.on('uncaughtException', (err) => {
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  console.error('Uncaught exception:', sanitizeError(err.message))
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  console.error('Unhandled rejection:', sanitizeError(String(reason)))
  process.exit(1)
})

function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', c => {
      size += c.length
      if (size > maxBytes) { req.destroy(); return reject(new Error('Body too large')) }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

// Serialize ping execution — env var is process-global, so concurrent
// requests would overwrite each other's tokens (race condition).
let pingRunning = false
const pingWaiters = []
const MAX_QUEUE = 5

async function queuePing(token) {
  if (pingWaiters.length >= MAX_QUEUE) {
    throw new Error('Service busy')
  }
  if (pingRunning) {
    await new Promise(resolve => pingWaiters.push(resolve))
  }
  pingRunning = true
  try {
    return await executePing(token)
  } finally {
    pingRunning = false
    if (pingWaiters.length > 0) pingWaiters.shift()()
  }
}

async function executePing(token) {
  process.env.CLAUDE_CODE_OAUTH_TOKEN = token
  delete process.env.CLAUDECODE

  try {
    const conversation = query({
      prompt: 'Reply with just the word "pong" and nothing else.',
      options: {
        maxTurns: 1,
        allowedTools: [],
      },
    })

    let rateLimitInfo = null
    for await (const msg of conversation) {
      if (msg.type === 'rate_limit_event' && msg.rate_limit_info) {
        rateLimitInfo = msg.rate_limit_info
      }
    }

    return { success: true, rateLimitInfo }
  } catch (e) {
    const errMsg = sanitizeError(e.message || String(e))
    console.error('Ping failed:', errMsg)
    return { success: false, error: errMsg }
  } finally {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    token = null
  }
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// Decrypt transit-encrypted token (AES-256-GCM from Web Crypto)
// Web Crypto appends the 16-byte auth tag to the ciphertext
function decryptTransitToken(stored) {
  const [ivHex, ciphertextHex] = stored.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const raw = Buffer.from(ciphertextHex, 'hex')
  const authTag = raw.subarray(raw.length - 16)
  const encrypted = raw.subarray(0, raw.length - 16)
  const key = Buffer.from(PING_ENCRYPTION_KEY, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, null, 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function verifySignature(payload, timestamp, nonce, signature) {
  const expected = crypto
    .createHmac('sha256', PING_SECRET)
    .update(`${payload}:${timestamp}:${nonce}`)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  )
}

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true })
  }

  // Ping endpoint
  if (req.method === 'POST' && req.url === '/ping') {
    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      return send(res, 400, { error: 'Invalid JSON' })
    }

    const { encryptedToken, timestamp, nonce, signature } = body
    if (!encryptedToken || !timestamp || !nonce || !signature) {
      return send(res, 400, { error: 'Missing encryptedToken, timestamp, nonce, or signature' })
    }

    // Strict type validation on timestamp
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      return send(res, 400, { error: 'Invalid timestamp' })
    }

    // Verify timestamp freshness (60 second window) — check before HMAC to fail fast
    if (Math.abs(Date.now() - timestamp) > 60_000) {
      return send(res, 401, { error: 'Request expired' })
    }

    // Reject replayed nonces
    if (seenNonces.has(nonce)) {
      return send(res, 401, { error: 'Duplicate request' })
    }

    // Validate signature format before timing-safe comparison (prevents RangeError side-channel)
    if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) {
      return send(res, 401, { error: 'Invalid signature format' })
    }

    // Verify HMAC signature (signed against encrypted payload + nonce)
    try {
      if (!verifySignature(encryptedToken, timestamp, nonce, signature)) {
        return send(res, 401, { error: 'Invalid signature' })
      }
    } catch {
      return send(res, 401, { error: 'Invalid signature' })
    }

    // Record nonce after successful verification
    seenNonces.set(nonce, Date.now())

    // Decrypt transit token
    let token
    try {
      token = decryptTransitToken(encryptedToken)
    } catch {
      return send(res, 400, { error: 'Transit decryption failed' })
    }

    // Log token format diagnostics (prefix only — never the full token)
    const tokenPrefix = token.substring(0, 12)
    const tokenLen = token.length
    console.log(`Token decrypted: prefix=${tokenPrefix}..., length=${tokenLen}`)

    // Queue ping execution to prevent concurrent env var overwrites
    let result
    try {
      result = await queuePing(token)
    } catch (e) {
      if (e.message === 'Service busy') return send(res, 503, { error: 'Service busy' })
      return send(res, 500, { error: 'Ping execution failed' })
    }
    token = null
    return send(res, 200, result)
  }

  // Debug endpoint — runs claude CLI directly with execFileSync to capture stderr
  if (req.method === 'POST' && req.url === '/test') {
    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      return send(res, 400, { error: 'Invalid JSON' })
    }

    const { encryptedToken, timestamp, nonce, signature } = body
    if (!encryptedToken || !timestamp || !nonce || !signature) {
      return send(res, 400, { error: 'Missing fields' })
    }
    if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > 60_000) {
      return send(res, 401, { error: 'Request expired or invalid timestamp' })
    }
    if (typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) {
      return send(res, 401, { error: 'Invalid signature format' })
    }
    try {
      if (!verifySignature(encryptedToken, timestamp, nonce, signature)) {
        return send(res, 401, { error: 'Invalid signature' })
      }
    } catch {
      return send(res, 401, { error: 'Invalid signature' })
    }

    let token
    try {
      token = decryptTransitToken(encryptedToken)
    } catch {
      return send(res, 400, { error: 'Transit decryption failed' })
    }

    // Run claude CLI directly (no shell) to capture stderr
    try {
      const result = execFileSync('npx', ['@anthropic-ai/claude-code', '-p', 'reply pong', '--output-format', 'json'], {
        env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token },
        timeout: 25000,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      })
      token = null
      return send(res, 200, { success: true, output: result.substring(0, 500) })
    } catch (e) {
      token = null
      const stderr = sanitizeError(e.stderr || '')
      const stdout = sanitizeError(e.stdout || '')
      return send(res, 200, {
        success: false,
        exitCode: e.status,
        stderr: stderr.substring(0, 500),
        stdout: stdout.substring(0, 500),
      })
    }
  }

  send(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Ping service listening on port ${PORT}`)
})
