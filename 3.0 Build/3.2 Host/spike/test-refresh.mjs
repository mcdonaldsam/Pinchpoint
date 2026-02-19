#!/usr/bin/env node
// PinchPoint Spike — Test OAuth token refresh
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

const credsPath = join(homedir(), '.claude', '.credentials.json')
const creds = JSON.parse(await readFile(credsPath, 'utf-8'))
const refreshToken = creds.claudeAiOauth?.refreshToken

if (!refreshToken) {
  console.error('No refresh token found in', credsPath)
  process.exit(1)
}

console.log('Refresh token prefix:', refreshToken.slice(0, 20) + '...')
console.log()

console.log('=== Attempting token refresh ===')
const res = await fetch('https://console.anthropic.com/api/oauth/token', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: 'claude-code',
  }),
})

console.log('Status:', res.status)

if (res.ok) {
  const data = await res.json()
  console.log('New access token prefix:', data.access_token?.slice(0, 20) + '...')
  console.log('New refresh token prefix:', data.refresh_token?.slice(0, 20) + '...')
  console.log('Expires in:', data.expires_in, 'seconds')
  console.log('Scopes:', data.scope)
  console.log()
  console.log('TOKEN REFRESH: SUCCESS')
} else {
  const text = await res.text()
  console.log('Response:', text)
  console.log()
  console.log('TOKEN REFRESH: FAILED')
}
