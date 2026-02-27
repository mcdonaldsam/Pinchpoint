# PinchPoint Security Review Report

**Date:** 2026-02-22
**Reviewer:** Claude Opus 4.6 (automated security audit)
**Scope:** Full codebase — Worker, Durable Object, Ping Service, CLI, Frontend, Configuration
**Classification:** Internal — contains vulnerability details

---

## Executive Summary

PinchPoint's security posture is **solid overall**. The architecture demonstrates strong security engineering: 3-key isolation, per-user HKDF-derived encryption, HMAC-authenticated service calls with nonce replay protection, and a well-designed connect flow with cryptographic binding. No **CRITICAL** vulnerabilities were found.

However, 18 findings were identified across all severity levels. The 3 **HIGH** findings should be addressed before production launch: secret configuration leakage to users, missing nonce replay protection on the debug endpoint, and use of `Math.random()` for security-relevant code generation. All fixes are surgical (no architectural changes needed).

### Risk Summary

| Severity | Count | Action Required |
|----------|-------|----------------|
| CRITICAL | 0 | — |
| HIGH | 3 | Fix before launch |
| MEDIUM | 5 | Fix soon |
| LOW | 8 | Address when convenient |
| INFO | 2 | Awareness only |

---

## HIGH Severity Findings

### SEC-01: Secret Configuration Leaked to All Authenticated Users

**File:** `3.0 Build/3.2 Host/worker/src/user-schedule-do.js` lines 352-358
**Category:** Information Disclosure
**CVSS Estimate:** 5.3 (Medium — but HIGH priority due to attack surface mapping)

**Vulnerable Code:**
```javascript
secrets: {
  ENCRYPTION_KEY: this.env.ENCRYPTION_KEY ? 'set' : 'MISSING',
  PING_ENCRYPTION_KEY: this.env.PING_ENCRYPTION_KEY ? 'set' : 'MISSING',
  PING_SECRET: this.env.PING_SECRET ? 'set' : 'MISSING',
  PING_SERVICE_URL: this.env.PING_SERVICE_URL ? 'set' : 'MISSING',
  RESEND_API_KEY: this.env.RESEND_API_KEY ? 'set' : 'MISSING',
},
```

**Attack Scenario:** Any user who signs up via Clerk and calls `GET /api/status` receives the names and configuration status of all backend secrets. An attacker can:
1. Map the infrastructure (5 secret names reveal the encryption, HMAC, ping service, and email architecture)
2. Identify misconfigured secrets (a `MISSING` value signals a potential weakness)
3. Target specific subsystems based on their status

**Recommendation:** Remove the `secrets` block entirely from the `getStatus()` response. If needed for debugging, gate behind an admin user ID check:
```javascript
// Only include diagnostics for admin
if (userId === env.ADMIN_USER_ID) {
  response.secrets = { ... }
}
```

Also remove the `pingServiceUrl: this.env.PING_SERVICE_URL ? 'set' : 'MISSING'` from `executePing()` return at line 127.

---

### SEC-02: Ping `/test` Endpoint Missing Nonce Replay Protection

**File:** `3.0 Build/3.2 Host/ping-service/index.mjs` lines 229-283
**Category:** Replay Attack
**CVSS Estimate:** 5.9 (Medium — requires network interception)

**Description:** The `/ping` endpoint correctly records nonces at line 201:
```javascript
seenNonces.set(nonce, Date.now())
```

The `/test` endpoint (lines 229-283) verifies the HMAC signature and timestamp but **never records or checks nonces**. A captured `/test` request can be replayed unlimited times within the 60-second timestamp window.

**Attack Scenario:** An attacker with network access between the Worker and Fly.io intercepts a `/test` request. They can replay it repeatedly, each time executing the Claude CLI with the user's decrypted token, consuming their quota.

**Recommendation:** Add nonce tracking to `/test`, identical to `/ping`:
```javascript
// Add after line 253 (HMAC verification):
if (seenNonces.has(nonce)) {
  return send(res, 401, { error: 'Duplicate request' })
}
seenNonces.set(nonce, Date.now())
```

---

### SEC-03: CLI Uses `Math.random()` for Verification Code

**File:** `3.0 Build/3.2 Host/cli/bin/pinchpoint.mjs` line 58
**Category:** Weak Randomness
**CVSS Estimate:** 4.2 (Medium — mitigated by server-side rate limiting)

**Vulnerable Code:**
```javascript
const verificationCode = String(Math.floor(1000 + Math.random() * 9000))
```

**Description:** `Math.random()` uses V8's xorshift128+ PRNG, which is **not cryptographically secure**. The internal state can be predicted if an attacker observes enough outputs. The `crypto` module is already imported on line 7 (`import { randomBytes, createHash } from 'node:crypto'`).

**Mitigating Factor:** The server limits code guessing to 3 attempts per session (index.js lines 248-251), and the code space is only 9,000 values. The rate limit is the primary defense, not the randomness. However, using crypto-grade randomness is trivial and eliminates the weakness entirely.

**Recommendation:**
```javascript
import { randomInt } from 'node:crypto'
const verificationCode = String(randomInt(1000, 10000))
```

Or using the already-imported `randomBytes`:
```javascript
const verificationCode = String(1000 + (randomBytes(2).readUInt16BE() % 9000))
```

---

## MEDIUM Severity Findings

### SEC-04: JWT Audience (`aud`) Claim Not Required

**File:** `3.0 Build/3.2 Host/worker/src/auth.js` lines 87-91
**Category:** Authentication Bypass (theoretical)
**CVSS Estimate:** 4.7

**Vulnerable Code:**
```javascript
if (payload.aud) {
  const validAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!validAud.some(a => a === `https://${clerkDomain}` || a === clerkDomain)) return null
}
```

**Description:** If the JWT has no `aud` claim, the audience check is completely skipped. A Clerk JWT issued for a different application on the same Clerk instance (if one exists) could be accepted.

**Combined with SEC-04b — `azp` check silently disabled (line 85):**
```javascript
if (payload.azp && env.CLERK_PUBLISHABLE_KEY && payload.azp !== env.CLERK_PUBLISHABLE_KEY) return null
```
If `CLERK_PUBLISHABLE_KEY` is not set as a Worker secret, the authorized party check is a no-op.

**Recommendation:**
1. Verify `CLERK_PUBLISHABLE_KEY` is set via `wrangler secret put`
2. Make the `azp` check fail-closed:
```javascript
// Require azp validation — fail if publishable key is not configured
if (!env.CLERK_PUBLISHABLE_KEY) return null
if (payload.azp && payload.azp !== env.CLERK_PUBLISHABLE_KEY) return null
```

---

### SEC-05: Token Prefix and Length Logged to Fly.io Stdout

**File:** `3.0 Build/3.2 Host/ping-service/index.mjs` lines 212-214
**Category:** Information Disclosure
**CVSS Estimate:** 3.7

**Vulnerable Code:**
```javascript
const tokenPrefix = token.substring(0, 12)
const tokenLen = token.length
console.log(`Token decrypted: prefix=${tokenPrefix}..., length=${tokenLen}`)
```

**Description:** After transit decryption, the first 12 characters of the plaintext OAuth token and its exact length are written to stdout. On Fly.io, logs are accessible via `fly logs`, can be forwarded to external aggregators, and are retained in Fly.io's logging infrastructure. If logs are compromised, this reveals:
- Token format confirmation (`sk-ant-oat01`)
- Exact token length (reduces brute-force space)

**Recommendation:** Replace with a non-revealing confirmation:
```javascript
console.log('Token decrypted: ok')
```

---

### SEC-06: `/test` Endpoint Bypasses Ping Serialization Queue

**File:** `3.0 Build/3.2 Host/ping-service/index.mjs` lines 262-282
**Category:** Race Condition
**CVSS Estimate:** 4.0

**Description:** The `/ping` endpoint uses `queuePing()` (line 219) to serialize execution and prevent concurrent `process.env.CLAUDE_CODE_OAUTH_TOKEN` mutations. The `/test` endpoint (line 264) uses `execFileSync` with `{...process.env, CLAUDE_CODE_OAUTH_TOKEN: token}` and does NOT go through the queue.

If `/test` and `/ping` execute concurrently:
- `/ping` sets `process.env.CLAUDE_CODE_OAUTH_TOKEN` at line 85
- `/test`'s `{...process.env}` spread captures the current `process.env` snapshot
- The explicit `CLAUDE_CODE_OAUTH_TOKEN: token` override in the spread means `/test` uses its own token (mitigating direct token leakage)
- But `execFileSync` blocks the entire event loop for up to 25s, stalling all other requests including health checks

**Recommendation:** Route `/test` through `queuePing()` or a separate mutex. At minimum, use async `execFile` instead of `execFileSync`.

---

### SEC-07: `execFileSync` Blocks Event Loop (Health Check DoS)

**File:** `3.0 Build/3.2 Host/ping-service/index.mjs` line 264
**Category:** Denial of Service
**CVSS Estimate:** 4.3

**Description:** `execFileSync` is synchronous and blocks the Node.js event loop for up to 25 seconds. During this time:
- `GET /health` checks cannot be processed
- Fly.io health checks (every 30s, 5s timeout per `fly.toml`) will fail
- Fly.io may restart the machine, killing in-progress `/ping` operations

**Recommendation:** Replace with async `execFile`:
```javascript
import { execFile } from 'child_process'
import { promisify } from 'util'
const execFileAsync = promisify(execFile)

// In /test handler:
const { stdout } = await execFileAsync('npx', [...args], { env, timeout: 25000, encoding: 'utf8' })
```

---

### SEC-08: No Per-User Rate Limiting on Test-Ping Endpoints

**File:** `3.0 Build/3.2 Host/worker/src/index.js` lines 106-110
**Category:** Resource Exhaustion
**CVSS Estimate:** 3.5

**Description:** `POST /api/test-ping` and `POST /api/test-ping-debug` require Clerk auth but have no per-user rate limit. An authenticated user can repeatedly trigger ping executions, saturating the Fly.io ping service (which has a queue of only 5 waiters before returning 503).

**Recommendation:** Add DO-side rate limiting (e.g., minimum 60s between test pings):
```javascript
async testPing() {
  const lastTest = await this.state.storage.get('lastTestPing')
  if (lastTest && Date.now() - lastTest < 60_000) {
    return json({ error: 'Please wait 60 seconds between test pings' }, 429)
  }
  await this.state.storage.put('lastTestPing', Date.now())
  // ... existing logic
}
```

---

## LOW Severity Findings

### SEC-09: JWT `alg` Header Not Explicitly Validated

**File:** `3.0 Build/3.2 Host/worker/src/auth.js` lines 40-42
**Category:** Defense in Depth

The JWT header's `alg` field is not checked against `RS256`. The Web Crypto `importKey` call on line 60 pins the algorithm to `RSASSA-PKCS1-v1_5`, which prevents algorithm confusion attacks. However, explicitly rejecting non-RS256 tokens would add defense in depth.

**Recommendation:** Add after line 42:
```javascript
if (header.alg !== 'RS256') return null
```

---

### SEC-10: KV Rate Limiting Has TOCTOU Race Condition

**File:** `3.0 Build/3.2 Host/worker/src/index.js` lines 18-23
**Category:** Rate Limit Bypass

The `rateLimit()` function reads count, checks, then writes — a classic Time-of-Check-Time-of-Use race. This is acknowledged in comments (lines 14-16) and mitigated by per-session attempt counters for the critical connect approval flow (lines 248-251). The KV rate limit provides defense-in-depth but is not the primary control.

**Status:** Accepted risk (documented). No fix needed unless abuse is observed.

---

### SEC-11: Schedule Roll Objects Accept Extra Properties

**File:** `3.0 Build/3.2 Host/worker/src/validate.js` lines 69-79
**Category:** Data Pollution

Roll objects like `{ time: "09:00", enabled: true, arbitrary: "data" }` pass validation because only `time` and `enabled` are checked. Extra properties are stored in the Durable Object. The DO only reads `time` and `enabled`, so this is not exploitable, but it allows users to store arbitrary data in their DO.

**Recommendation:** Strip extra properties in `normalizeSchedule()` or `validateSchedule()`:
```javascript
// In validation, after checking time and enabled:
value[i] = { time: roll.time, enabled: roll.enabled }
```

---

### SEC-12: Dockerfile Base Image Not Pinned to Digest

**File:** `3.0 Build/3.2 Host/ping-service/Dockerfile` line 1
**Category:** Supply Chain

`FROM node:22-slim` uses a floating tag. Different builds may pull different images with different vulnerability profiles. The `npm ci` + lockfile combination provides deterministic dependencies, but the OS layer varies.

**Recommendation:** Pin to a specific digest:
```dockerfile
FROM node:22-slim@sha256:<current-digest>
```

---

### SEC-13: Token Persists in CLI Memory Until Process Exit

**File:** `3.0 Build/3.2 Host/cli/bin/pinchpoint.mjs` lines 206-258
**Category:** Memory Exposure

After `performOAuthFlow()` returns, the `token` variable remains in scope through the polling loop (up to 5 minutes). JavaScript strings are immutable and cannot be securely wiped. This is a fundamental language limitation.

**Status:** Accepted risk. No practical mitigation in Node.js.

---

### SEC-14: Frontend Session ID Not Validated Client-Side

**File:** `web/src/pages/Connect.jsx` line 8
**Category:** Defense in Depth

The `sessionId` from the URL query parameter is sent directly to the API without client-side format validation. The server validates it (KV lookup + UUID format), so this is not exploitable. Adding a UUID regex check on the client would provide defense in depth and prevent unnecessary API calls.

---

### SEC-15: Missing `Cross-Origin-Opener-Policy` Header

**File:** `web/public/_headers`
**Category:** Browser Isolation

The `_headers` file includes CSP, HSTS, X-Frame-Options, Referrer-Policy, and Permissions-Policy. Adding `Cross-Origin-Opener-Policy: same-origin` would provide additional isolation against Spectre-like side-channel attacks. However, this can break Clerk modal popups and Google OAuth flows, so it requires testing.

---

### SEC-16: CSP Allows `blob:` in `script-src`

**File:** `web/public/_headers` line 2
**Category:** CSP Relaxation

```
script-src 'self' blob: https://*.clerk.com ...
```

The `blob:` directive in `script-src` is required by Clerk for worker-based session management. This slightly widens the script execution surface. This is a necessary trade-off for the auth provider.

**Status:** Accepted risk (Clerk dependency).

---

## INFO Severity Findings

### SEC-17: Error Messages Echo User Input in Validation

**File:** `3.0 Build/3.2 Host/worker/src/validate.js` lines 52, 59, 75, 88, 104

User-supplied values (day names, times, timezones) are reflected in error response JSON. Since responses are JSON (not HTML), XSS is not a concern. However, very long strings would be reflected verbatim. Input length validation (e.g., max 50 characters) would be a minor improvement.

---

### SEC-18: Timestamp Check Before HMAC Allows Clock Probing

**File:** `3.0 Build/3.2 Host/ping-service/index.mjs` lines 177-179

The timestamp freshness check occurs before HMAC verification, allowing an unauthenticated attacker to probe whether the server's clock is within 60 seconds of their claimed timestamp. This leaks minimal information (server clock proximity) and is an intentional fail-fast optimization.

**Status:** Accepted risk (documented in code comments).

---

## Confirmed Secure Implementations

The following security mechanisms were reviewed and found to be correctly implemented:

| Mechanism | Assessment |
|-----------|------------|
| **PKCE OAuth Flow** | RFC 7636 compliant. 256-bit verifier, S256 challenge, cryptographic state parameter (32 bytes). |
| **AES-256-GCM Encryption** | Random 12-byte IV per operation, non-extractable CryptoKey objects, separate keys for at-rest vs transit. |
| **HKDF Key Derivation** | Per-user keys from master key + userId. Salt "pinchpoint-v1" is appropriate (HKDF security doesn't depend on salt secrecy). |
| **3-Key Isolation** | `ENCRYPTION_KEY` (at-rest, Worker only), `PING_ENCRYPTION_KEY` (transit, Worker + ping), `PING_SECRET` (HMAC). Compromise of one does not expose the others. |
| **HMAC-SHA256 on /ping** | Timing-safe comparison, signature format pre-validation (prevents `RangeError` side-channel), nonce replay protection with 120s retention. |
| **Connect Session Security** | UUID session IDs, 5-minute TTL, one-time consumption (KV delete), SHA-256 code hash binding, token fingerprint server-side recomputation. |
| **Token Sanitization** | Regex strips `sk-ant-*` patterns from all error messages. Crash handlers clear token env vars. |
| **CORS** | Locked to `env.FRONTEND_URL` (no wildcards). Bearer token auth prevents CSRF. |
| **Clerk JWT Validation** | RS256 signature verification, `exp`/`nbf`/`iss` checks, JWKS cache with rotation fallback. |
| **Frontend XSS Protection** | Zero raw HTML injection patterns. All rendering via React JSX auto-escaping. No dynamic code execution, innerHTML, or dynamic location assignments. |
| **Session Storage** | No localStorage/sessionStorage for tokens. Clerk manages sessions in-memory only. |
| **Security Headers** | CSP, HSTS (1 year + includeSubDomains), X-Frame-Options DENY, strict Referrer-Policy, Permissions-Policy. |
| **Container Security** | Non-root `appuser`, `node:22-slim` base, root-owned `node_modules`, 64KB body size limit. |
| **Secret Management** | All secrets in `.env.secrets` (gitignored via `.env.*`). Worker secrets via `wrangler secret put`. No secrets in committed code. |
| **Connect Flow Integrity** | Token fingerprint verified server-side at `/connect/complete` (recomputed, never trusted from caller). Session consumed after use. Verification code rate-limited to 3 attempts. |

---

## Prioritized Remediation Roadmap

### Phase 1: Immediate (before launch)
1. **SEC-01** — Remove `secrets` block from `getStatus()` response
2. **SEC-02** — Add nonce replay protection to ping `/test` endpoint
3. **SEC-03** — Replace `Math.random()` with `crypto.randomInt()` in CLI
4. **SEC-05** — Remove token prefix logging from ping service

### Phase 2: Soon (within 1 week)
5. **SEC-04** — Make JWT `azp` check fail-closed; verify `CLERK_PUBLISHABLE_KEY` is set
6. **SEC-06** — Route `/test` through serialization queue
7. **SEC-07** — Replace `execFileSync` with async `execFile`
8. **SEC-08** — Add per-user rate limiting on test-ping endpoints

### Phase 3: Hardening (when convenient)
9. **SEC-09** — Add explicit `alg` check in JWT validation
10. **SEC-11** — Strip extra properties from schedule roll objects
11. **SEC-12** — Pin Dockerfile base image to digest
12. **SEC-14** — Add client-side UUID validation for session IDs
13. **SEC-15** — Test and add `Cross-Origin-Opener-Policy` header

### Phase 4: Accept
14. **SEC-10** — KV rate limiting race (accepted, documented)
15. **SEC-13** — Token in CLI memory (Node.js limitation)
16. **SEC-16** — CSP `blob:` in script-src (Clerk dependency)
17. **SEC-17** — Error message reflection (JSON, not exploitable)
18. **SEC-18** — Timestamp before HMAC (intentional)

---

## Remediation Checklist

- [x] **SEC-01** Remove `secrets` block from `getStatus()` and `pingServiceUrl` from `executePing()` return
- [x] **SEC-02** Add nonce replay check + recording to `/test` endpoint in ping service
- [x] **SEC-03** Replace `Math.random()` with `crypto.randomInt(1000, 10000)` in CLI
- [x] **SEC-04** Make `azp` check fail-closed in auth.js; verify secret is deployed
- [x] **SEC-05** Remove token prefix/length logging from ping service
- [x] **SEC-06** Route `/test` through `queueExecution()` serialization queue
- [x] **SEC-07** Replace `execFileSync` with async `execFile` in `/test` handler
- [x] **SEC-08** Add 60s cooldown on test-ping in Durable Object (both endpoints)
- [x] **SEC-09** Add `header.alg !== 'RS256'` check in auth.js
- [x] **SEC-11** Strip extra properties from schedule roll objects in validate.js
- [x] **SEC-12** Pin Dockerfile `FROM` to specific digest (`sha256:5373f1...`)
- [x] **SEC-14** Add UUID regex validation in Connect.jsx
- [x] **SEC-15** Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` header

---

## Appendix: Files Reviewed

| File | Lines | Status |
|------|-------|--------|
| `3.0 Build/3.2 Host/worker/src/index.js` | 339 | Fully reviewed |
| `3.0 Build/3.2 Host/worker/src/auth.js` | 97 | Fully reviewed |
| `3.0 Build/3.2 Host/worker/src/crypto.js` | 117 | Fully reviewed |
| `3.0 Build/3.2 Host/worker/src/user-schedule-do.js` | 518 | Fully reviewed |
| `3.0 Build/3.2 Host/worker/src/validate.js` | 107 | Fully reviewed |
| `3.0 Build/3.2 Host/worker/src/email.js` | 36 | Fully reviewed |
| `3.0 Build/3.2 Host/ping-service/index.mjs` | 289 | Fully reviewed |
| `3.0 Build/3.2 Host/ping-service/Dockerfile` | 17 | Fully reviewed |
| `3.0 Build/3.2 Host/ping-service/fly.toml` | ~20 | Fully reviewed |
| `3.0 Build/3.2 Host/cli/bin/pinchpoint.mjs` | ~270 | Fully reviewed |
| `web/src/App.jsx` | ~50 | Fully reviewed |
| `web/src/main.jsx` | ~15 | Fully reviewed |
| `web/src/lib/api.js` | ~20 | Fully reviewed |
| `web/src/pages/Dashboard.jsx` | ~270 | Fully reviewed |
| `web/src/pages/Connect.jsx` | ~110 | Fully reviewed |
| `web/src/pages/Landing.jsx` | ~200 | Fully reviewed |
| `web/src/components/ScheduleGrid.jsx` | 790 | Fully reviewed |
| `web/src/components/StatusPanel.jsx` | ~80 | Fully reviewed |
| `web/index.html` | ~15 | Fully reviewed |
| `web/public/_headers` | 7 | Fully reviewed |
| `web/vite.config.js` | ~10 | Fully reviewed |
| `.gitignore` | ~30 | Fully reviewed |
| `3.0 Build/3.2 Host/worker/wrangler.toml` | ~30 | Fully reviewed |
| `web/wrangler.toml` | ~15 | Fully reviewed |

**Total: ~3,500 lines of security-critical code reviewed across 24 files.**
