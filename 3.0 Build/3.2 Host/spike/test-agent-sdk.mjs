#!/usr/bin/env node
// PinchPoint Spike — Comprehensive Agent SDK test
// Logs ALL message types, checks for rate limit data, captures stderr/debug output
//
// Usage: node test-agent-sdk.mjs
// Requires: ~/.claude/.credentials.json (from `claude login`)

import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

// ─── Load token ──────────────────────────────────────────────────

const credsPath = join(homedir(), '.claude', '.credentials.json')
let creds
try {
  creds = JSON.parse(await readFile(credsPath, 'utf-8'))
} catch {
  console.error('Could not read', credsPath)
  process.exit(1)
}

const token = creds.claudeAiOauth?.accessToken
if (!token) {
  console.error('No OAuth token found in', credsPath)
  process.exit(1)
}

console.log('Token prefix:', token.slice(0, 20) + '...')
console.log('Subscription:', creds.claudeAiOauth?.subscriptionType)
console.log('Rate limit tier:', creds.claudeAiOauth?.rateLimitTier)
console.log('Token valid:', Date.now() < creds.claudeAiOauth?.expiresAt ? 'YES' : 'EXPIRED')
console.log()

// Set env var that the SDK expects
process.env.CLAUDE_CODE_OAUTH_TOKEN = token
// Clear nesting guard
delete process.env.CLAUDECODE

// ─── Test 1: Full message dump from query() ──────────────────────

console.log('='.repeat(60))
console.log('TEST 1: Agent SDK query() — dump ALL messages + stderr')
console.log('='.repeat(60))
console.log()

const stderrLines = []

try {
  const { query } = await import('@anthropic-ai/claude-agent-sdk')

  const conversation = query({
    prompt: 'Reply with just the word "pong" and nothing else.',
    options: {
      maxTurns: 1,
      allowedTools: [],
      debug: true,
      stderr: (data) => {
        stderrLines.push(data)
        // Look for rate limit related data in stderr
        if (/rate.?limit|x-ratelimit|retry.?after|reset/i.test(data)) {
          console.log('[STDERR — RATE LIMIT DATA]:', data)
        }
      },
    },
  })

  const messages = []
  const messageTypes = new Map()

  for await (const msg of conversation) {
    messages.push(msg)

    // Count by type/subtype
    const typeKey = msg.subtype ? `${msg.type}/${msg.subtype}` : msg.type
    messageTypes.set(typeKey, (messageTypes.get(typeKey) || 0) + 1)

    // Log every message with full JSON
    console.log(`─── Message #${messages.length} [${typeKey}] ───`)
    console.log(JSON.stringify(msg, null, 2))
    console.log()

    // Check for SDKRateLimitEvent (type might be 'rate_limit' or similar)
    if (msg.type === 'rate_limit' || typeKey.includes('rate_limit')) {
      console.log('***************************************************')
      console.log('*** SDKRateLimitEvent FOUND ***')
      console.log('***************************************************')
    }

    // Check assistant messages for rate limit error
    if (msg.type === 'assistant' && msg.error) {
      console.log(`*** Assistant error field: "${msg.error}" ***`)
    }

    // Check result messages for extra keys / rate info
    if (msg.type === 'result') {
      console.log('*** Result ***')
      console.log('  subtype:', msg.subtype)
      console.log('  total_cost_usd:', msg.total_cost_usd)
      console.log('  usage:', JSON.stringify(msg.usage))
      console.log('  modelUsage:', JSON.stringify(msg.modelUsage))
      console.log('  All keys:', Object.keys(msg).join(', '))

      // Flag any unknown keys
      const knownKeys = new Set([
        'type', 'subtype', 'duration_ms', 'duration_api_ms', 'is_error',
        'num_turns', 'result', 'stop_reason', 'total_cost_usd', 'usage',
        'modelUsage', 'permission_denials', 'uuid', 'session_id',
        'structured_output', 'errors',
      ])
      for (const key of Object.keys(msg)) {
        if (!knownKeys.has(key)) {
          console.log(`  *** UNKNOWN KEY: "${key}" =`, JSON.stringify(msg[key]))
        }
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────

  console.log()
  console.log('='.repeat(60))
  console.log('MESSAGE SUMMARY')
  console.log('='.repeat(60))
  console.log('Total messages:', messages.length)
  console.log('Message types:')
  for (const [type, count] of messageTypes) {
    console.log(`  ${type}: ${count}`)
  }

  // ─── accountInfo() ──────────────────────────────────────────

  console.log()
  console.log('='.repeat(60))
  console.log('ACCOUNT INFO')
  console.log('='.repeat(60))
  try {
    const acctInfo = await conversation.accountInfo()
    console.log(JSON.stringify(acctInfo, null, 2))
  } catch (e) {
    console.log('accountInfo() error:', e.message)
  }

} catch (e) {
  console.error('Query failed:', e.message)
  console.error('Stack:', e.stack)
}

// ─── Test 2: Stderr analysis ─────────────────────────────────────

console.log()
console.log('='.repeat(60))
console.log('TEST 2: Stderr analysis (rate limit headers)')
console.log('='.repeat(60))
console.log()

if (stderrLines.length === 0) {
  console.log('No stderr output captured.')
} else {
  console.log(`Captured ${stderrLines.length} stderr chunks.`)

  const rateLimitLines = stderrLines.filter(l =>
    /rate.?limit|x-ratelimit|retry.?after|reset|quota|throttl/i.test(l)
  )

  if (rateLimitLines.length > 0) {
    console.log()
    console.log('*** RATE LIMIT LINES IN STDERR ***')
    for (const line of rateLimitLines) {
      console.log(line)
    }
  } else {
    console.log('No rate-limit-related lines found in stderr.')
    console.log()
    console.log('First 30 stderr lines:')
    for (const line of stderrLines.slice(0, 30)) {
      console.log('  ', line.trimEnd())
    }
  }
}

// ─── Test 3: CLI with --output-format json ───────────────────────

console.log()
console.log('='.repeat(60))
console.log('TEST 3: claude CLI with --output-format json')
console.log('='.repeat(60))
console.log()

import { execFileSync } from 'child_process'

try {
  const result = execFileSync('claude', [
    '-p', 'Reply with just the word pong',
    '--max-turns', '1',
    '--output-format', 'json',
  ], {
    env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token },
    timeout: 120_000,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  console.log('Raw JSON output:')
  console.log(result)

  // Parse and look for rate limit info
  try {
    const parsed = JSON.parse(result)
    console.log()
    console.log('Parsed keys:', Object.keys(parsed).join(', '))
    if (parsed.usage) console.log('usage:', JSON.stringify(parsed.usage))
    if (parsed.cost) console.log('cost:', parsed.cost)
    if (parsed.rate_limit) console.log('*** rate_limit:', JSON.stringify(parsed.rate_limit))

    // Check all keys for anything rate-limit-related
    for (const key of Object.keys(parsed)) {
      if (/rate|limit|reset|window|quota/i.test(key)) {
        console.log(`*** RATE-RELATED KEY: "${key}" =`, JSON.stringify(parsed[key]))
      }
    }
  } catch {
    console.log('(output is not JSON)')
  }
} catch (e) {
  console.log('CLI failed. Exit code:', e.status)
  console.log('stdout:', e.stdout?.slice(0, 500))
  console.log('stderr:', e.stderr?.slice(0, 500))
}

console.log()
console.log('='.repeat(60))
console.log('SPIKE COMPLETE')
console.log('='.repeat(60))
