# PinchPoint Security Review II — Verification & Deep Dive Plan

**Date:** 2026-02-22
**Reviewer:** Claude Opus 4.6
**Prerequisite:** Security Review Report (2026-02-22) — 18 findings, 13 fixes implemented

---

## Objective

Two-part security review:

1. **Verification Pass** — Confirm all 13 fixes from Review I are correctly implemented, complete, and introduce no regressions
2. **Deep Dive** — Hunt for less obvious attack vectors: logic flaws, state machine attacks, race conditions, crypto subtleties, and abuse scenarios that require understanding multi-component data flow

---

## Part 1: Fix Verification (13 items)

For each fix, I will verify:
- The code change exists and matches the recommended fix
- No off-by-one errors, typos, or incomplete patches
- No regressions (e.g., did the fix break another code path?)
- The fix addresses the root cause, not just the symptom

| SEC ID | Fix Summary | Files to Verify |
|--------|-------------|-----------------|
| SEC-01 | Secrets block removed from `getStatus()` + `pingServiceUrl` from `executePing()` | `user-schedule-do.js` |
| SEC-02 | Nonce replay protection on `/test` endpoint | `ping-service/index.mjs` |
| SEC-03 | `crypto.randomInt()` replaces `Math.random()` | `cli/bin/pinchpoint.mjs` |
| SEC-04 | `azp` check is fail-closed (rejects if `CLERK_PUBLISHABLE_KEY` missing) | `auth.js` |
| SEC-05 | Token prefix/length logging removed | `ping-service/index.mjs` |
| SEC-06 | `/test` routed through `queueExecution()` | `ping-service/index.mjs` |
| SEC-07 | `execFileSync` replaced with async `execFileAsync` | `ping-service/index.mjs` |
| SEC-08 | 60s cooldown on both `testPing()` and `testPingDebug()` | `user-schedule-do.js` |
| SEC-09 | `header.alg !== 'RS256'` check added | `auth.js` |
| SEC-11 | Extra properties stripped from roll objects via `normalizeSchedule()` | `validate.js` |
| SEC-12 | Dockerfile pinned to `sha256` digest | `ping-service/Dockerfile` |
| SEC-14 | UUID regex validation on session ID in Connect.jsx | `web/src/pages/Connect.jsx` |
| SEC-15 | `Cross-Origin-Opener-Policy: same-origin-allow-popups` header added | `web/public/_headers` |

---

## Part 2: Deep Dive — Less Obvious Attack Vectors

### Category A: Connect Flow State Machine Attacks

| ID | Vector | Description | Files |
|----|--------|-------------|-------|
| A1 | Session fixation | Can an attacker create a session, trick a user into approving it, then use it to capture their token? Analyze the full trust chain: who creates the session, who approves, who sends the token | `index.js` (connectStart/Approve/Complete) |
| A2 | Race condition in session consumption | Between `KV.get()` (check status=approved) and `KV.delete()` (consume), can a second `connectComplete` slip through and capture the token? | `index.js:301-316` |
| A3 | Code hash binding bypass | Is the code hash verified only at approval, or also at completion? Can an attacker approve a different session than the one the CLI is polling? | `index.js:254-267` |
| A4 | Token fingerprint TOCTOU | The fingerprint is computed at `/connect/start` (by CLI) and verified at `/connect/complete` (by Worker). Can an attacker send a different token that happens to match the fingerprint prefix? | `index.js:310-312`, `crypto.js:89-92` |
| A5 | Session ID enumeration | Can an attacker brute-force session UUIDs during the 5-minute window? What's the probability? | `index.js:198` |

### Category B: Durable Object State & Alarm Logic

| ID | Vector | Description | Files |
|----|--------|-------------|-------|
| B1 | Alarm manipulation via schedule | Can a malicious schedule cause alarms to fire continuously? E.g., overlapping rolls, edge-case times (00:00), DST boundary abuse | `user-schedule-do.js:388-422` |
| B2 | Storage corruption via concurrent requests | Two simultaneous `setSchedule` + `testPing` — can they corrupt DO state? DOs are single-threaded per stub, but verify | `user-schedule-do.js` |
| B3 | Denial of storage | Can a user exhaust their DO storage by repeatedly changing schedules? Is there a storage size limit enforced? | `user-schedule-do.js:180-185` |
| B4 | Token overwrite without alarm reset | If `setToken` is called while an alarm is pending, does the alarm use the old or new token? | `user-schedule-do.js:209-220` |
| B5 | Unpause → immediate alarm fire | After auto-pause at 5 failures, unpause resets `consecutiveFailures` to 0 and reschedules. But if the token is actually invalid, this creates an infinite loop of 5-failure-cycles | `user-schedule-do.js:224-235` |
| B6 | Midnight-wrap correctness | Roll 2+ with time < roll 1 time is treated as next-day. Verify this doesn't cause double-scheduling or missed alarms | `user-schedule-do.js:406-414` |

### Category C: Cryptographic Edge Cases

| ID | Vector | Description | Files |
|----|--------|-------------|-------|
| C1 | IV reuse probability | AES-256-GCM uses `crypto.getRandomValues(new Uint8Array(12))`. With 96-bit IVs, birthday collision at ~2^48 operations. Is this realistic per user? | `crypto.js:56` |
| C2 | HKDF with empty userId | If `userId` is empty string or null, does `deriveUserKey` still produce a unique key? Could two users collide? | `crypto.js:24-44` |
| C3 | Token hash truncation | `hashToken()` returns first 32 hex chars (128 bits of SHA-256). Is 128 bits sufficient for collision resistance in the fingerprint use case? | `crypto.js:89-92` |
| C4 | HMAC secret length | `signPingRequest` uses `PING_SECRET` as raw string input to HMAC. If it's short or low-entropy, HMAC security degrades. Is there a minimum length check? | `crypto.js:102-116` |
| C5 | Timing side-channel in JWT verification | `timingSafeEqual` on HMAC, but JWT signature verification uses Web Crypto `verify()` — is that timing-safe? | `auth.js:71` |
| C6 | AES-GCM ciphertext format validation | `decryptToken` splits on `:` — what if the stored value has no `:`? Multiple `:`? | `crypto.js:72` |
| C7 | Transit encryption key reuse | Same `PING_ENCRYPTION_KEY` used for all users' transit encryption. If an attacker captures multiple transit payloads, can they correlate users? | `crypto.js:52-63` |

### Category D: Input Validation Gaps

| ID | Vector | Description | Files |
|----|--------|-------------|-------|
| D1 | Oversized JSON body | Worker's `request.json()` — is there a body size limit? Could a 100MB JSON body exhaust CPU time? | `index.js:41-45` |
| D2 | `__proto__` / prototype pollution | Schedule uses `Object.entries()` — does the validator reject `__proto__` or `constructor` keys? | `validate.js:51` |
| D3 | Timezone DoS | `Intl.DateTimeFormat` with a malicious timezone string — can it crash the Worker? | `validate.js:100-105`, `user-schedule-do.js:367-380` |
| D4 | Schedule with all 7 days null | Valid per validator, but does the DO handle this gracefully? (No alarm scheduled = safe, but verify) | `user-schedule-do.js:188-205` |
| D5 | Extremely long token at connect | `setupToken` could be a multi-MB string. Is there a length check before encryption + storage? | `index.js:295-296` |
| D6 | Email injection via Clerk user data | `fetchClerkEmail` returns arbitrary email from Clerk API. Could a crafted email header inject extra recipients? | `email.js:13`, `index.js:270` |

### Category E: Ping Service Abuse

| ID | Vector | Description | Files |
|----|--------|-------------|-------|
| E1 | Process.env mutation scope | `executePing` sets `process.env.CLAUDE_CODE_OAUTH_TOKEN`. Even with queue serialization, does the `finally` block reliably clean up on timeout/kill? | `ping-service/index.mjs:87-119` |
| E2 | Environment snapshot in /test | `/test` uses `{ ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token }` — does this snapshot include `PING_SECRET`? Is that a risk if `execFileAsync` passes it to the child? | `ping-service/index.mjs:277` |
| E3 | Output truncation bypass | `stdout.substring(0, 500)` — could a crafted output have a valid token before byte 500? | `ping-service/index.mjs:283, 292` |
| E4 | Memory growth in nonce cache | `seenNonces` grows until cleanup interval. Under high load (many unique nonces), could this exhaust memory before the 30s cleanup fires? | `ping-service/index.mjs:22-29` |
| E5 | Health check timing | During a 25s `executePing`, the event loop is free (async). But if the Agent SDK query hangs for >30s, can multiple health checks stack up? | `ping-service/index.mjs:87-119` |

### Category F: Frontend & Client-Side Security

| ID | Vector | Description | Files |
|----|--------|-------------|-------|
| F1 | Open redirect via `?session=` | Connect page uses session ID from URL. Is there any code path that redirects based on user input? | `Connect.jsx` |
| F2 | Clickjacking on /connect approval | X-Frame-Options is DENY, but verify the CSP `frame-ancestors` is also set. Some browsers only respect CSP. | `_headers` |
| F3 | Sensitive data in error messages | Dashboard displays `error` from API. Could a crafted error from a MITM expose internal info? | `Dashboard.jsx:55, 148-155` |
| F4 | VITE_API_URL injection | If attacker controls `VITE_API_URL` (e.g., via compromised `.env`), all API calls go to their server including auth tokens | `lib/api.js:1` |
| F5 | Clerk publishable key exposure | `VITE_CLERK_PUBLISHABLE_KEY` is in client bundle (by design). Verify this cannot be used to issue tokens or access backend APIs. | `main.jsx:8` |
| F6 | ScheduleGrid timezone spoofing | Client picks timezone from `Intl.DateTimeFormat().resolvedOptions()`. If spoofed, alarms fire at wrong times. (User shoots own foot, but verify no server-side impact) | `ScheduleGrid.jsx:693` |

### Category G: Infrastructure & Configuration

| ID | Vector | Description | Files |
|----|--------|-------------|-------|
| G1 | Account ID in wrangler.toml | `account_id` is committed to the repo. Can it be used to enumerate resources or perform actions? | `worker/wrangler.toml:4` |
| G2 | CLERK_PUBLISHABLE_KEY in wrangler.toml [vars] | Publishable key is in committed config. Is this safe? (It is by design — "publishable" — but verify it can't be abused) | `worker/wrangler.toml:27` |
| G3 | Fly.io unauthenticated access | Ping service `/health` is public. Are there any other unauthenticated endpoints? Can `/ping` and `/test` be accessed from outside Fly's network? | `fly.toml`, `ping-service/index.mjs` |
| G4 | CORS bypass via non-simple requests | CORS headers are set, but only on explicit route matches. What happens for routes that return 404? Do they still have CORS headers? | `index.js:52-56, 148` |
| G5 | Missing `Content-Security-Policy` on API responses | Worker API returns JSON. Should it set CSP `default-src 'none'` to prevent accidental HTML interpretation? | `index.js:33-37` |
| G6 | `new_sqlite_classes` migration | wrangler.toml uses SQLite-backed DOs. Is the migration tag safe from rollback attacks? | `worker/wrangler.toml:17` |

---

## Methodology

For each finding:
1. **Trace the data flow** end-to-end (not just the file where the issue is)
2. **Construct a concrete attack scenario** — who is the attacker, what access do they have, what's the impact
3. **Rate severity** using the same scale as Review I (CRITICAL / HIGH / MEDIUM / LOW / INFO)
4. **Provide fix recommendation** with code where applicable
5. **Distinguish "exploitable" from "theoretical"** — real-world exploitability matters

Findings that are already covered by Review I will be marked as "VERIFIED" or "REGRESSION" rather than duplicate.

---

## Deliverable

**`3.0 Build/3.1 Design/Security Review II Report.md`** containing:
1. Fix verification results (pass/fail for each of 13 fixes)
2. New findings organized by severity
3. Updated risk assessment
4. Prioritized remediation recommendations
