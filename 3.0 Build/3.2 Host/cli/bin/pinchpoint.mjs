#!/usr/bin/env node
// PinchPoint CLI — one-command connect flow
// Usage: npx pinchpoint connect

import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { execFileSync } from 'child_process'
import { createInterface } from 'readline'

const API_URL = process.env.PINCHPOINT_API_URL || 'https://pinchpoint.dev'

// ─── Helpers ─────────────────────────────────────────────────────

function log(msg) { process.stdout.write(`  ${msg}\n`) }
function logBold(msg) { process.stdout.write(`\n  \x1b[1m${msg}\x1b[0m\n`) }
function logGreen(msg) { process.stdout.write(`  \x1b[32m${msg}\x1b[0m\n`) }
function logRed(msg) { process.stdout.write(`  \x1b[31m${msg}\x1b[0m\n`) }
function logDim(msg) { process.stdout.write(`  \x1b[2m${msg}\x1b[0m\n`) }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start'
    : process.platform === 'darwin' ? 'open'
    : 'xdg-open'
  try {
    if (process.platform === 'win32') {
      execFileSync('cmd', ['/c', 'start', '', url], { stdio: 'ignore' })
    } else {
      execFileSync(cmd, [url], { stdio: 'ignore' })
    }
  } catch {
    log(`Open this URL in your browser: ${url}`)
  }
}

// ─── Step 1: Get Claude token ────────────────────────────────────

async function getClaudeToken() {
  const credsPath = join(homedir(), '.claude', '.credentials.json')

  try {
    const creds = JSON.parse(await readFile(credsPath, 'utf-8'))
    const token = creds.claudeAiOauth?.accessToken

    if (token && Date.now() < (creds.claudeAiOauth?.expiresAt || 0)) {
      return token
    }

    if (token) {
      // Token exists but may be expired — setup-token generates long-lived tokens
      // so if it starts with sk-ant-oat01 it's likely still valid (~1 year)
      if (token.startsWith('sk-ant-oat01-')) {
        return token
      }
    }
  } catch {
    // No credentials file — need to generate
  }

  // Try to run claude setup-token
  log('No Claude credentials found.')
  log('')
  log('Checking for Claude Code CLI...')

  try {
    execFileSync('claude', ['--version'], { stdio: 'ignore' })
  } catch {
    logRed('Claude Code CLI is not installed.')
    log('')
    log('Install it first:')
    log('  npm install -g @anthropic-ai/claude-code')
    log('')
    log('Then run:')
    log('  claude setup-token')
    log('')
    log('After that, run this command again:')
    log('  npx pinchpoint connect')
    process.exit(1)
  }

  log('Running claude setup-token...')
  log('Follow the prompts in your browser to authorize.')
  log('')

  try {
    execFileSync('claude', ['setup-token'], {
      stdio: 'inherit',
      timeout: 120_000,
    })
  } catch {
    logRed('claude setup-token failed.')
    log('Try running it manually: claude setup-token')
    process.exit(1)
  }

  // Re-read credentials after setup
  try {
    const creds = JSON.parse(await readFile(credsPath, 'utf-8'))
    const token = creds.claudeAiOauth?.accessToken
    if (token) return token
  } catch {
    // fall through
  }

  logRed('Could not read Claude credentials after setup.')
  process.exit(1)
}

// ─── Step 2-4: Connect to PinchPoint ─────────────────────────────

async function connectToPinchPoint(setupToken) {
  // Step 2: Start a connect session
  const startRes = await fetch(`${API_URL}/api/connect/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!startRes.ok) {
    logRed(`Failed to start connect session (${startRes.status})`)
    process.exit(1)
  }

  const { sessionId } = await startRes.json()

  // Step 3: Open browser for approval
  log('Opening PinchPoint in your browser...')
  openBrowser(`${API_URL}/connect?session=${sessionId}`)
  log('')

  // Step 4: Poll for approval
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const timeout = Date.now() + 5 * 60 * 1000 // 5 minute timeout

  while (Date.now() < timeout) {
    process.stdout.write(`\r  ${spinner[i++ % spinner.length]} Waiting for approval...`)

    const pollRes = await fetch(`${API_URL}/api/connect/poll?session=${sessionId}`)
    const pollData = await pollRes.json()

    if (pollData.status === 'approved') {
      process.stdout.write('\r  Waiting for approval... approved!  \n')
      break
    }

    if (pollData.status === 'expired') {
      process.stdout.write('\r')
      logRed('Session expired. Run this command again.')
      process.exit(1)
    }

    await sleep(2000)
  }

  if (Date.now() >= timeout) {
    process.stdout.write('\r')
    logRed('Timed out waiting for approval.')
    process.exit(1)
  }

  // Step 5: Send token
  log('Connecting...')

  const completeRes = await fetch(`${API_URL}/api/connect/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, setupToken }),
  })

  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}))
    logRed(`Failed to connect: ${err.error || completeRes.statusText}`)
    process.exit(1)
  }

  return true
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2]

  if (!command || command === 'connect') {
    console.log()
    logBold('PinchPoint — Connect your Claude account')
    console.log()

    log('Looking for Claude credentials...')
    const token = await getClaudeToken()
    logGreen('Claude token found.')
    console.log()

    await connectToPinchPoint(token)

    console.log()
    logGreen('Your Claude account is linked!')
    log(`Set your schedule → ${API_URL}/dashboard`)
    console.log()
    return
  }

  if (command === '--help' || command === '-h') {
    console.log()
    logBold('PinchPoint CLI')
    console.log()
    log('Usage: pinchpoint connect')
    log('')
    log('Connects your Claude Pro/Max account to PinchPoint')
    log('so your 5-hour usage window starts on your schedule.')
    console.log()
    return
  }

  logRed(`Unknown command: ${command}`)
  log('Usage: pinchpoint connect')
  process.exit(1)
}

main().catch(e => {
  logRed(`Error: ${e.message}`)
  process.exit(1)
})
