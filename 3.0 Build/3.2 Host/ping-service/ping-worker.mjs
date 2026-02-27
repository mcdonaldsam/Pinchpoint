// PinchPoint Ping Worker — isolated child process for Agent SDK execution
// Token: received via CLAUDE_CODE_OAUTH_TOKEN env var (set by parent per-fork)
// Results: sent via IPC (process.send)

import { query } from '@anthropic-ai/claude-agent-sdk'

const TOKEN_PATTERN = /sk-ant-\w{3,6}-[A-Za-z0-9_-]{10,}/g

function sanitizeError(msg) {
  if (typeof msg !== 'string') return String(msg)
  return msg.replace(TOKEN_PATTERN, 'sk-ant-***REDACTED***')
}

async function run() {
  let fiveHourInfo = null
  try {
    const conversation = query({
      prompt: 'Reply with just the word "pong" and nothing else.',
      options: { maxTurns: 1, allowedTools: [] },
    })
    for await (const msg of conversation) {
      if (msg.type === 'rate_limit_event' && msg.rate_limit_info?.rateLimitType === 'five_hour') {
        fiveHourInfo = msg.rate_limit_info
      }
    }
    process.send({
      success: true,
      rateLimitInfo: fiveHourInfo,
      rateLimits: fiveHourInfo ? { five_hour: fiveHourInfo } : {},
    })
  } catch (e) {
    process.send({ success: false, error: sanitizeError(e.message || String(e)) })
  } finally {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  }
}

run().then(() => process.exit(0)).catch(() => process.exit(1))
