// PinchPoint Ping Service — Google Cloud Run
// Receives signed requests from the Worker, runs Claude Agent SDK to ping

import http from 'http'
import crypto from 'crypto'

const PING_SECRET = process.env.PING_SECRET
const PORT = process.env.PORT || 8080

if (!PING_SECRET) {
  console.error('PING_SECRET env var is required')
  process.exit(1)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function verifySignature(token, timestamp, signature) {
  const expected = crypto
    .createHmac('sha256', PING_SECRET)
    .update(`${token}:${timestamp}`)
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

    const { token, timestamp, signature } = body
    if (!token || !timestamp || !signature) {
      return send(res, 400, { error: 'Missing token, timestamp, or signature' })
    }

    // Verify HMAC signature
    try {
      if (!verifySignature(token, timestamp, signature)) {
        return send(res, 401, { error: 'Invalid signature' })
      }
    } catch {
      return send(res, 401, { error: 'Invalid signature' })
    }

    // Verify timestamp freshness (60 second window)
    if (Math.abs(Date.now() - timestamp) > 60_000) {
      return send(res, 401, { error: 'Request expired' })
    }

    // Run Agent SDK
    process.env.CLAUDE_CODE_OAUTH_TOKEN = token
    // Clear nesting guard (not relevant in production, but safe)
    delete process.env.CLAUDECODE

    try {
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const conversation = query({
        prompt: 'Reply with just the word "pong" and nothing else.',
        options: {
          maxTurns: 1,
          allowedTools: [],
        },
      })

      // Drain messages and extract rate limit info
      let rateLimitInfo = null
      for await (const msg of conversation) {
        if (msg.type === 'rate_limit_event' && msg.rate_limit_info) {
          rateLimitInfo = msg.rate_limit_info
        }
      }

      return send(res, 200, {
        success: true,
        rateLimitInfo,
      })
    } catch (e) {
      console.error('Ping failed:', e.message)
      return send(res, 200, { success: false, error: e.message })
    }
  }

  send(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Ping service listening on port ${PORT}`)
})
