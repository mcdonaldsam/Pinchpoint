#!/usr/bin/env node
// PinchPoint Spike — Test claude CLI with CLAUDE_CODE_OAUTH_TOKEN
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { execFileSync } from 'child_process'

const credsPath = join(homedir(), '.claude', '.credentials.json')
const creds = JSON.parse(await readFile(credsPath, 'utf-8'))
const token = creds.claudeAiOauth?.accessToken

console.log('Token prefix:', token.slice(0, 20) + '...')
console.log('Subscription:', creds.claudeAiOauth?.subscriptionType)
console.log('Token valid:', Date.now() < creds.claudeAiOauth?.expiresAt ? 'YES' : 'EXPIRED')
console.log()

// Test: claude -p with CLAUDE_CODE_OAUTH_TOKEN (using execFileSync for safety)
console.log('=== Test: claude -p with CLAUDE_CODE_OAUTH_TOKEN ===')
try {
  const result = execFileSync('claude', ['-p', 'Reply with just the word pong', '--max-turns', '1'], {
    env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token },
    timeout: 60000,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  console.log('Output:', result.trim())
  console.log()
  console.log('CLI PING: SUCCESS')
} catch (e) {
  console.log('Exit code:', e.status)
  console.log('stdout:', e.stdout?.slice(0, 500))
  console.log('stderr:', e.stderr?.slice(0, 500))
  console.log()
  console.log('CLI PING: FAILED')
}
