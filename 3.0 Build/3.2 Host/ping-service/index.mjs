// PinchPoint Ping Service — Fly.io
// Receives signed requests from the Worker, runs Claude Agent SDK to ping

import http from 'http'
import crypto from 'crypto'
import { execFile, fork } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import path from 'path'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKER_PATH = path.join(__dirname, 'ping-worker.mjs')

const PING_SECRET = process.env.PING_SECRET
const PING_ENCRYPTION_KEY = process.env.PING_ENCRYPTION_KEY
const PORT = process.env.PORT || 8080

// Minimal env for child processes — excludes PING_SECRET and PING_ENCRYPTION_KEY
const CHILD_ENV = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production' }

if (!PING_SECRET || !PING_ENCRYPTION_KEY) {
  console.error('PING_SECRET and PING_ENCRYPTION_KEY env vars are required')
  process.exit(1)
}
if (PING_SECRET.length < 32) {
  console.error('PING_SECRET must be at least 32 characters')
  process.exit(1)
}
if (PING_ENCRYPTION_KEY.length < 64) {
  console.error('PING_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)')
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
const TOKEN_PATTERN = /sk-ant-\w{2,10}-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{20,}/g

function sanitizeError(message) {
  if (typeof message !== 'string') return String(message)
  return message.replace(TOKEN_PATTERN, 'sk-ant-***REDACTED***')
}

// Clear sensitive env vars on unhandled errors to prevent leaks in crash dumps
process.on('uncaughtException', (err) => {
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  console.error('Uncaught exception:', sanitizeError(err.message))
  // Allow stderr to flush before exiting
  setTimeout(() => process.exit(1), 100)
})
process.on('unhandledRejection', (reason) => {
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  console.error('Unhandled rejection:', sanitizeError(String(reason)))
  setTimeout(() => process.exit(1), 100)
})

function readBody(req, maxBytes = 64 * 1024, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    const timer = setTimeout(() => {
      req.destroy()
      reject(new Error('Body read timed out'))
    }, timeoutMs)
    req.on('data', c => {
      size += c.length
      if (size > maxBytes) { clearTimeout(timer); req.destroy(); return reject(new Error('Body too large')) }
      chunks.push(c)
    })
    req.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks).toString()) })
    req.on('error', (e) => { clearTimeout(timer); reject(e) })
  })
}

// ─── Concurrency pool — each ping runs in an isolated child process ──
// Token is passed via env to the forked child only (never in parent's env).
// Concurrency is limited by available RAM (~150MB per child + SDK + CLI).
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_PINGS || '2', 10)
const MAX_QUEUE = parseInt(process.env.MAX_PING_QUEUE || '5', 10)
let activeCount = 0
const waitQueue = []

async function withConcurrencyLimit(fn) {
  if (activeCount >= MAX_CONCURRENT && waitQueue.length >= MAX_QUEUE) {
    throw new Error('Service busy')
  }
  if (activeCount >= MAX_CONCURRENT) {
    await new Promise(resolve => waitQueue.push(resolve))
  }
  activeCount++
  try {
    return await fn()
  } finally {
    activeCount--
    if (waitQueue.length > 0) waitQueue.shift()()
  }
}

async function executePing(token) {
  return new Promise((resolve) => {
    const child = fork(WORKER_PATH, [], {
      env: { ...CHILD_ENV, CLAUDE_CODE_OAUTH_TOKEN: token },
      silent: true,
    })
    token = null

    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGTERM')
        // SIGKILL fallback — if SDK doesn't exit gracefully within 3s, force kill
        setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 3000)
        resolve({ success: false, error: 'Ping timed out' })
      }
    }, 25000)

    child.on('message', (result) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(result)
      }
    })

    child.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve({ success: false, error: sanitizeError(err.message) })
      }
    })

    child.on('exit', (code) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        if (code !== 0) resolve({ success: false, error: `Worker exited with code ${code}` })
        else resolve({ success: false, error: 'Worker exited without result' })
      }
    })

    child.stderr?.on('data', (chunk) => {
      console.error('[ping-worker]', sanitizeError(chunk.toString().trim()))
    })
  })
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

    console.log('Token decrypted: ok')

    // Execute ping in isolated child process (concurrency-limited)
    let result
    try {
      result = await withConcurrencyLimit(() => executePing(token))
    } catch (e) {
      if (e.message === 'Service busy') return send(res, 503, { error: 'Service busy' })
      return send(res, 500, { error: 'Ping execution failed' })
    }
    token = null
    return send(res, 200, result)
  }

  // Debug endpoint — runs claude CLI directly to capture stderr (async, queued)
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

    // Reject replayed nonces
    if (seenNonces.has(nonce)) {
      return send(res, 401, { error: 'Duplicate request' })
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

    // Record nonce after successful verification
    seenNonces.set(nonce, Date.now())

    let token
    try {
      token = decryptTransitToken(encryptedToken)
    } catch {
      return send(res, 400, { error: 'Transit decryption failed' })
    }

    // Run claude CLI via async execFile (concurrency-limited)
    let result
    try {
      result = await withConcurrencyLimit(async () => {
        try {
          const { stdout } = await execFileAsync('./node_modules/.bin/claude', ['-p', 'reply pong', '--output-format', 'json'], {
            env: { ...CHILD_ENV, CLAUDE_CODE_OAUTH_TOKEN: token },
            timeout: 25000,
            encoding: 'utf8',
            maxBuffer: 1024 * 1024,
          })
          token = null
          return { success: true, output: stdout.substring(0, 500) }
        } catch (e) {
          token = null
          const stderr = sanitizeError(e.stderr || '')
          const stdout = sanitizeError(e.stdout || '')
          return {
            success: false,
            exitCode: e.code,
            stderr: stderr.substring(0, 500),
            stdout: stdout.substring(0, 500),
          }
        }
      })
    } catch (e) {
      if (e.message === 'Service busy') return send(res, 503, { error: 'Service busy' })
      return send(res, 500, { error: 'Test execution failed' })
    }
    token = null
    return send(res, 200, result)
  }

  send(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Ping service listening on port ${PORT}`)
})
