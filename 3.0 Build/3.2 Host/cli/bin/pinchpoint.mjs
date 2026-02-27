#!/usr/bin/env node
// PinchPoint CLI — `npx pinchpoint connect`
// Zero dependencies. Performs OAuth flow to get a 1-year Claude token,
// then links it to PinchPoint via polling-based approval.

import { createServer } from 'node:http'
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const API_URL = process.env.PINCHPOINT_API_URL || 'https://api.pinchpoint.dev'
const FRONTEND_URL = process.env.PINCHPOINT_FRONTEND_URL || 'https://pinchpoint.dev'

// Claude OAuth (public PKCE client — same as `claude setup-token`)
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const AUTHORIZE_URL = 'https://claude.ai/oauth/authorize'
const TOKEN_URL = 'https://platform.claude.com/v1/oauth/token'
const TOKEN_LIFETIME = 31536000 // 1 year in seconds

// Prevent token transmission over unencrypted connections
if (!API_URL.startsWith('https://') && !API_URL.startsWith('http://localhost')) {
  console.error('  \x1b[31mAPI URL must use HTTPS\x1b[39m')
  process.exit(1)
}

// ─── Helpers ─────────────────────────────────────────────────────

const bold = t => `\x1b[1m${t}\x1b[22m`
const dim = t => `\x1b[2m${t}\x1b[22m`
const green = t => `\x1b[32m${t}\x1b[39m`
const red = t => `\x1b[31m${t}\x1b[39m`
const cyan = t => `\x1b[36m${t}\x1b[39m`

function log(msg = '') { process.stdout.write(`  ${msg}\n`) }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      // Escape & as ^& for cmd.exe (& is a command separator)
      execFileSync('cmd', ['/c', 'start', '', url.replace(/&/g, '^&')], { stdio: 'ignore' })
    } else {
      execFileSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' })
    }
  } catch {
    log(`Open this URL in your browser: ${cyan(url)}`)
  }
}

// ─── OAuth flow (get 1-year token) ──────────────────────────────

async function performOAuthFlow() {
  // PKCE parameters
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const state = randomBytes(32).toString('base64url')

  // Pre-generate PinchPoint verification code + hash (needed inside callback)
  const verificationCode = String(randomInt(1000, 10000))
  const codeHash = createHash('sha256').update(verificationCode).digest('hex')

  return new Promise((resolve, reject) => {
    let settled = false

    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${server.address().port}`)

      if (url.pathname !== '/callback') {
        res.writeHead(404)
        res.end()
        return
      }

      // Verify state
      if (url.searchParams.get('state') !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<html><body><p>State mismatch. Close this tab and try again.</p></body></html>')
        return
      }

      const authCode = url.searchParams.get('code')
      if (!authCode) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<html><body><p>No authorization code received. Close this tab and try again.</p></body></html>')
        return
      }

      try {
        // Exchange auth code for 1-year token
        const tokenRes = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: authCode,
            redirect_uri: `http://localhost:${server.address().port}/callback`,
            client_id: CLIENT_ID,
            code_verifier: codeVerifier,
            state,
            expires_in: TOKEN_LIFETIME,
          }),
        })

        if (!tokenRes.ok) {
          const errText = await tokenRes.text().catch(() => 'Unknown error')
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><p>Failed to get token from Claude. Close this tab and try again.</p></body></html>')
          server.close()
          if (!settled) { settled = true; reject(new Error(`Token exchange failed (${tokenRes.status}): ${errText}`)) }
          return
        }

        const { access_token } = await tokenRes.json()
        if (!access_token) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><p>No token received. Close this tab and try again.</p></body></html>')
          server.close()
          if (!settled) { settled = true; reject(new Error('Token exchange returned no access_token')) }
          return
        }

        // Start PinchPoint connect session
        const tokenFingerprint = createHash('sha256').update(access_token).digest('hex').slice(0, 32)
        const startRes = await fetch(`${API_URL}/api/connect/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenFingerprint, codeHash }),
        })

        if (!startRes.ok) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end('<html><body><p>Failed to connect to PinchPoint. Close this tab and try again.</p></body></html>')
          server.close()
          if (!settled) { settled = true; reject(new Error(`Connect start failed (${startRes.status})`)) }
          return
        }

        const { sessionId } = await startRes.json()

        // Redirect browser to PinchPoint connect page
        res.writeHead(302, { Location: `${FRONTEND_URL}/connect?session=${sessionId}` })
        res.end()

        server.close()
        if (!settled) {
          settled = true
          resolve({ token: access_token, sessionId, verificationCode, tokenFingerprint })
        }
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><p>Something went wrong. Close this tab and try again.</p></body></html>')
        server.close()
        if (!settled) { settled = true; reject(err) }
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port

      // Build authorization URL
      const authUrl = new URL(AUTHORIZE_URL)
      authUrl.searchParams.set('code', 'true')
      authUrl.searchParams.set('client_id', CLIENT_ID)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('redirect_uri', `http://localhost:${port}/callback`)
      authUrl.searchParams.set('scope', 'user:inference')
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
      authUrl.searchParams.set('state', state)

      process.stdout.write(`\r  ${dim('Opening Claude authorization...')}\n`)
      openBrowser(authUrl.toString())
    })

    server.on('error', (err) => {
      if (!settled) { settled = true; reject(err) }
    })

    // 5-minute timeout for the entire OAuth flow
    setTimeout(() => {
      server.close()
      if (!settled) { settled = true; reject(new Error('Authorization timed out. Run the command again.')) }
    }, 5 * 60 * 1000)
  })
}

// ─── Connect flow ───────────────────────────────────────────────

async function connect() {
  console.log()
  log(bold('PinchPoint Connect'))
  log(dim('Link your Claude credentials\n'))

  // Step 1: OAuth flow → 1-year token + PinchPoint session + browser redirect
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const spinAuth = setInterval(() => {
    process.stdout.write(`\r  ${spinner[i++ % spinner.length]} Waiting for authorization...`)
  }, 100)

  let result
  try {
    result = await performOAuthFlow()
  } finally {
    clearInterval(spinAuth)
  }

  const { token, sessionId, verificationCode, tokenFingerprint } = result
  process.stdout.write(`\r  ${green('✓')} Authorized!                \n`)

  // Step 2: Show verification code (browser is already at PinchPoint)
  log()
  log(bold('Verification code:'))
  log()
  log(`    ${bold(cyan(verificationCode.split('').join(' ')))}`)
  log()
  log(dim('Enter this code in the browser to confirm the connection.'))
  log()

  // Step 3: Poll for approval
  i = 0
  const deadline = Date.now() + 5 * 60 * 1000

  while (Date.now() < deadline) {
    process.stdout.write(`\r  ${spinner[i++ % spinner.length]} Waiting for approval...`)
    await sleep(2000)

    let poll
    try {
      const res = await fetch(`${API_URL}/api/connect/poll?session=${sessionId}`)
      poll = await res.json()
    } catch {
      continue // Network blip
    }

    if (poll.status === 'approved') {
      process.stdout.write(`\r  ${green('✓')} Approved!                \n`)

      // Step 4: Send token
      process.stdout.write('  Sending credentials... ')
      const completeRes = await fetch(`${API_URL}/api/connect/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, setupToken: token, tokenFingerprint }),
      })

      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}))
        process.stdout.write(red('failed') + '\n')
        log(dim(err.error || 'Unknown error'))
        process.exit(1)
      }

      process.stdout.write(green('done') + '\n')
      log()
      log(green('Connected successfully!'))
      log(dim('Set your schedule at ') + cyan(FRONTEND_URL))
      log()
      process.exit(0)
    }

    if (poll.status === 'expired') {
      process.stdout.write(`\r  ${red('✗')} Session expired.         \n`)
      log(dim('Run the command again.'))
      process.exit(1)
    }
  }

  process.stdout.write(`\r  ${red('✗')} Timed out.               \n`)
  log(dim('No approval received within 5 minutes.'))
  process.exit(1)
}

// ─── Entry ───────────────────────────────────────────────────────

const command = process.argv[2]

if (command === 'connect') {
  connect().catch(e => {
    log(red(`Error: ${e.message}`))
    process.exit(1)
  })
} else {
  console.log()
  log(bold('PinchPoint CLI'))
  log()
  log(`Usage: ${cyan('npx pinchpoint connect')}`)
  log()
  log('Connects your Claude Pro/Max account to PinchPoint')
  log('so your 5-hour usage window starts on your schedule.')
  log()
  if (command) process.exit(1)
}
