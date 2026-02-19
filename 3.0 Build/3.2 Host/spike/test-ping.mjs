#!/usr/bin/env node
// PinchPoint Spike — Test if OAuth token works with Messages API
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

const credsPath = join(homedir(), '.claude', '.credentials.json')
const creds = JSON.parse(await readFile(credsPath, 'utf-8'))
const oauth = creds.claudeAiOauth

if (!oauth?.accessToken) {
  console.error('No Claude OAuth token found in', credsPath)
  process.exit(1)
}

console.log('Token prefix:', oauth.accessToken.slice(0, 20) + '...')
console.log('Subscription:', oauth.subscriptionType)
console.log('Rate limit tier:', oauth.rateLimitTier)
console.log('Expires at:', new Date(oauth.expiresAt).toISOString())
console.log('Token valid:', Date.now() < oauth.expiresAt ? 'YES' : 'NO (expired)')
console.log()

// --- Attempt 1: Bearer auth to Messages API ---
console.log('=== Test 1: Bearer auth → api.anthropic.com/v1/messages ===')
const res1 = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${oauth.accessToken}`,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'ping' }],
  }),
})
console.log('Status:', res1.status)
console.log('Response:', await res1.text())
console.log()

// --- Attempt 2: x-api-key header ---
console.log('=== Test 2: x-api-key header → api.anthropic.com/v1/messages ===')
const res2 = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': oauth.accessToken,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'ping' }],
  }),
})
console.log('Status:', res2.status)
console.log('Response:', await res2.text())
console.log()

// --- Attempt 3: Bearer auth to api.claude.ai ---
console.log('=== Test 3: Bearer auth → api.claude.ai/v1/messages ===')
try {
  const res3 = await fetch('https://api.claude.ai/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oauth.accessToken}`,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  })
  console.log('Status:', res3.status)
  console.log('Response:', await res3.text())
} catch (e) {
  console.log('Error:', e.message)
}
