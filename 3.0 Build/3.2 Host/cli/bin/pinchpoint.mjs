#!/usr/bin/env node
// PinchPoint CLI — `npx pinchpoint connect`
// Zero dependencies. Reads Claude token and sends it to PinchPoint via polling-based approval.

import { readFile } from 'fs/promises'
import { createHash } from 'crypto'
import { homedir } from 'os'
import { join } from 'path'
import { execFileSync } from 'child_process'

const API_URL = process.env.PINCHPOINT_API_URL || 'https://api.pinchpoint.dev'
const FRONTEND_URL = process.env.PINCHPOINT_FRONTEND_URL || 'https://pinchpoint.dev'

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
      execFileSync('cmd', ['/c', 'start', '', url], { stdio: 'ignore' })
    } else {
      execFileSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' })
    }
  } catch {
    log(`Open this URL in your browser: ${url}`)
  }
}

// ─── Read Claude token ──────────────────────────────────────────

async function getClaudeToken() {
  const credsPath = join(homedir(), '.claude', '.credentials.json')

  try {
    const creds = JSON.parse(await readFile(credsPath, 'utf-8'))
    // setup-token generates long-lived tokens (~1 year, sk-ant-oat01-...)
    const token = creds?.claudeAiOauth?.accessToken
    if (token) return token
  } catch {
    // No credentials file
  }

  log(red('No Claude credentials found.'))
  log()
  log(`Run ${cyan('claude setup-token')} first to generate a long-lived token,`)
  log(`then re-run ${cyan('npx pinchpoint connect')}.`)
  process.exit(1)
}

// ─── Connect flow ───────────────────────────────────────────────

async function connect() {
  console.log()
  log(bold('PinchPoint Connect'))
  log(dim('Link your Claude credentials\n'))

  // Step 1: Read token
  process.stdout.write('  Reading Claude token... ')
  const token = await getClaudeToken()
  process.stdout.write(green('found') + '\n')

  // Step 2: Start session (include token fingerprint + verification code hash)
  const tokenFingerprint = createHash('sha256').update(token).digest('hex').slice(0, 32)
  const verificationCode = String(Math.floor(1000 + Math.random() * 9000))
  const codeHash = createHash('sha256').update(verificationCode).digest('hex')
  process.stdout.write('  Starting connect session... ')
  const startRes = await fetch(`${API_URL}/api/connect/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenFingerprint, codeHash }),
  })
  if (!startRes.ok) {
    process.stdout.write(red('failed') + '\n')
    log(dim(`Server returned ${startRes.status}`))
    process.exit(1)
  }
  const { sessionId } = await startRes.json()
  process.stdout.write(green('ok') + '\n')

  // Step 3: Open browser — show verification code
  const approveUrl = `${FRONTEND_URL}/connect?session=${sessionId}`
  log()
  log(bold('Verification code:'))
  log()
  log(`    ${bold(cyan(verificationCode.split('').join(' ')))}`)
  log()
  log(dim('Enter this code in the browser to confirm the connection.'))
  log()
  log(bold('Approve in your browser:'))
  log(cyan(approveUrl))
  log()
  openBrowser(approveUrl)

  // Step 4: Poll for approval
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
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

      // Step 5: Send token
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
