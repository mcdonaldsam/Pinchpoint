# Security Hardening Plan

> Created 2026-02-20 — covers token lifecycle hardening, per-user key isolation, injection analysis, and implementation steps.

---

## Executive Summary

PinchPoint stores and uses long-lived Claude OAuth tokens (`sk-ant-oat01-...`) on behalf of users. A token compromise means an attacker gets full access to a user's Claude Pro/Max account for up to ~1 year (token lifetime). There is no known revocation endpoint — once leaked, a token is live until the user manually revokes it in their Claude.ai settings.

This plan addresses every point in the token lifecycle where plaintext exists, introduces per-user key isolation so a single secret compromise doesn't unlock all users, hardens all transit paths, and audits every input surface for injection risks.

---

## Table of Contents

1. [Current Token Lifecycle — Threat Model](#1-current-token-lifecycle--threat-model)
2. [Per-User Key Derivation (HKDF)](#2-per-user-key-derivation-hkdf)
3. [Transit Hardening — DO to Ping Service](#3-transit-hardening--do-to-ping-service)
4. [Token Revocation / Disconnect Flow](#4-token-revocation--disconnect-flow)
5. [Injection & Input Validation Audit](#5-injection--input-validation-audit)
6. [Auth Hardening — Clerk JWT](#6-auth-hardening--clerk-jwt)
7. [Connect Flow Hardening](#7-connect-flow-hardening)
8. [Ping Replay Protection](#8-ping-replay-protection)
9. [Public Endpoint Rate Limiting](#9-public-endpoint-rate-limiting)
10. [Supply Chain Hardening](#10-supply-chain-hardening)
11. [Error Path Sanitization](#11-error-path-sanitization)
12. [Infrastructure Hardening](#12-infrastructure-hardening)
13. [Implementation Sequence](#13-implementation-sequence)

---

## 1. Current Token Lifecycle — Threat Model

### Where the plaintext token exists today

| # | Location | Duration | Risk |
|---|----------|----------|------|
| 1 | User's machine (`~/.claude/.credentials.json`) | Permanent | Not our responsibility |
| 2 | CLI to Worker (HTTPS POST body) | Milliseconds (transit) | Low — TLS encrypted |
| 3 | Worker `connectComplete()` memory | Milliseconds (while encrypting) | Low — brief, no logging |
| 4 | DO storage (AES-256-GCM encrypted) | Indefinite | **Medium** — single `ENCRYPTION_KEY` for all users |
| 5 | DO `alarm()` memory (after decryption) | Seconds | Low — brief, but token in memory |
| 6 | DO to Ping service (HTTPS POST body) | Milliseconds (transit) | **High** — plaintext token in request body |
| 7 | Ping service memory (`process.env`) | Seconds during SDK execution | **High** — env var readable by any code in process |
| 8 | Ping service error logs | Potentially permanent | **High** — `e.message` might contain token data |

### What an attacker gets with a compromised token

- Full Claude Pro/Max account access for up to ~1 year
- Can run Claude Code, use the Agent SDK, start conversations
- No known programmatic revocation endpoint exists
- User must manually revoke in claude.ai settings

---

## 2. Per-User Key Derivation (HKDF)

### Problem

Currently, `ENCRYPTION_KEY` is a single 32-byte hex secret used to encrypt every user's token. If this key is compromised (Cloudflare breach, leaked wrangler config, insider threat, accidental logging), **all** stored tokens are decryptable at once.

### Solution

Derive a unique encryption key per user using HKDF (HMAC-based Key Derivation Function). The master key stays the same, but each user's token is encrypted with a key that can only be derived if you know both the master key AND the user ID.

```
userKey = HKDF-SHA256(
  ikm:  ENCRYPTION_KEY (master, 32 bytes),
  salt: "pinchpoint-v1" (static, version-tagged),
  info: userId (Clerk user ID, e.g. "user_2abc123...")
) -> 32 bytes
```

### Why this helps

- A leaked ciphertext from one user's DO cannot be decrypted with another user's derived key
- A compromised master key alone isn't enough without also knowing which userId to target
- If we ever need to rotate the master key, we can re-encrypt per-user without a single catastrophic exposure window

### Implementation

**File:** `worker/src/crypto.js`

Add a `deriveUserKey(masterHexKey, userId)` function that:
1. Imports the master key as HKDF input keying material via Web Crypto
2. Derives a per-user AES-256-GCM key with HKDF-SHA256, a static salt `"pinchpoint-v1"`, and the userId as info
3. Returns a non-extractable `CryptoKey`

Update `encryptToken()` / `decryptToken()` to accept a `CryptoKey` directly instead of a hex string.

### Migration

Existing users have tokens encrypted with the old flat key. Migration strategy:

1. Add a `keyVersion` field to DO storage (default: `1` for legacy, `2` for HKDF-derived)
2. On next alarm fire or status check, if `keyVersion === 1`:
   - Decrypt with legacy flat key
   - Re-encrypt with HKDF-derived key
   - Store with `keyVersion: 2`
3. New tokens always use version 2
4. After sufficient time (e.g. 30 days), remove v1 fallback code

---

## 3. Transit Hardening — DO to Ping Service

### Problem

The DO decrypts the token and sends it as **plaintext JSON** in the POST body to the Fly.io ping service (`user-schedule-do.js:57-61`). Even with HMAC signing and HTTPS:

- TLS terminates at Fly.io's load balancer — Fly.io infrastructure sees plaintext
- Any request logging, APM, or error reporting on the Fly.io side captures it
- The HMAC signature authenticates the request but does NOT encrypt the payload

### Solution: Double-Encrypt for Transit

Encrypt the token a second time specifically for transit between the DO and the ping service, using a shared symmetric key (`PING_ENCRYPTION_KEY`) that's separate from the storage encryption key.

### Why a separate key?

Key isolation principle — the storage encryption key (`ENCRYPTION_KEY`) should never leave Cloudflare. The transit encryption key (`PING_ENCRYPTION_KEY`) is shared only between the Worker and the ping service. A compromise of one key doesn't compromise the other.

| Key | Knows it | Purpose |
|-----|----------|---------|
| `ENCRYPTION_KEY` | Worker only | Encrypt tokens at rest in DO storage |
| `PING_ENCRYPTION_KEY` | Worker + Ping service | Encrypt tokens in transit between DO and Fly.io |
| `PING_SECRET` | Worker + Ping service | HMAC request signing (authenticity, not confidentiality) |

### Implementation

**Worker side (`user-schedule-do.js` alarm):**
- After decrypting the stored token, re-encrypt using `PING_ENCRYPTION_KEY` with AES-256-GCM and a fresh random IV
- Send the encrypted payload as `encryptedToken` (not plaintext `token`)
- Sign the encrypted payload with HMAC (not the plaintext)

**Ping service side (`index.mjs`):**
- Accept `encryptedToken` instead of `token`
- Decrypt using `PING_ENCRYPTION_KEY` via Node.js `crypto.createDecipheriv`
- Wipe token from memory in `finally` block + crash handlers

### New secret

```bash
openssl rand -hex 32
wrangler secret put PING_ENCRYPTION_KEY
fly secrets set PING_ENCRYPTION_KEY=<same value>
```

---

## 4. Token Revocation / Disconnect Flow

### The problem

There is **no documented token revocation endpoint** in Anthropic's OAuth implementation. Anthropic can and does revoke tokens server-side, but there's no third-party API for triggering this.

### What we can offer

A "Disconnect" flow:

1. **Immediately delete** the encrypted token from DO storage
2. **Cancel all pending alarms** (stop scheduled pings)
3. **Clear all user data** from DO
4. **Display clear instructions** to the user on how to revoke their token at claude.ai
5. **Send an email** with the same instructions

### Implementation

**Backend** — `deleteAccount()` already calls `storage.deleteAll()`. Correct.

**Frontend** — Add a "Disconnect" button that calls `DELETE /api/account`, then shows instructions.

**Email** — Include steps to revoke the token in claude.ai settings.

### Probing for a revocation endpoint

Try the standard RFC 7009 pattern against `https://platform.claude.com/v1/oauth/revoke`. **Test manually before implementation.**

---

## 5. Injection & Input Validation Audit

### SQL Injection — Not Applicable

PinchPoint uses **no SQL databases**. Storage is Cloudflare KV and DO storage — both key-value. **SQL injection is not possible.**

### NoSQL Injection — Not Applicable

Keys are either hardcoded strings or derived from authenticated Clerk user IDs.

### XSS — Low Risk

**Frontend:** React escapes all JSX expressions by default. No unsafe HTML rendering patterns found anywhere in `web/src/`. All user data rendered through standard JSX.

**Hardening:** Truncate reflected user input in validation errors:

```javascript
if (!VALID_DAYS.includes(day)) return `Invalid day: ${String(day).slice(0, 20)}`
```

### Command Injection — Not Applicable

The ping service uses the Agent SDK `query()`, not shell execution. The CLI uses `execFileSync` (not shell-based) for opening the browser — safe.

### Prototype Pollution — Low Risk

The `VALID_DAYS.includes()` whitelist check catches unexpected keys. Schedule is never spread onto another object. Safe.

### SSRF — Not Applicable

All outbound request URLs come from environment config, never from user input.

---

## 6. Auth Hardening — Clerk JWT

### Problem

The Clerk JWT validation in `auth.js` only checks `exp` and `iss`. Missing:
- **`aud` (audience):** Without audience validation, a JWT for a different Clerk app could be accepted
- **`azp` (authorized party):** Should match the expected client ID
- **`nbf` (not before):** Tokens used before their valid-from time should be rejected

### Fix (apply immediately)

In `auth.js`, after decoding the payload, add `nbf`, `azp`, and `aud` checks. See Phase 1 in implementation sequence.

**Severity: High.**

---

## 7. Connect Flow Hardening

### Problem

The connect approval flow has a social engineering vector:
- Frontend takes `session` directly from URL query parameter
- Token fingerprint is **optional** at session start (`body?.tokenFingerprint || null`)
- If no fingerprint was provided at start, the fingerprint check is skipped entirely
- A victim can be tricked into approving someone else's session link

### Fix

**Phase 1 (quick):** Make `tokenFingerprint` required in `connectStart()`. Always verify in `connectComplete()`.

**Phase 2 (hardening):** Add verification code challenge:
1. CLI generates a random 4-digit code, sends its hash with `connectStart`
2. CLI displays the code to the user
3. Approval page prompts user to enter the code
4. Server verifies hash matches before approving
5. This binds the browser approval to the specific CLI session

---

## 8. Ping Replay Protection

### Problem

- Timestamp freshness check uses no strict type validation — `timestamp` from JSON could be a string, NaN, etc.
- No nonce/jti cache — within the 60-second replay window, the same signed request can be replayed

### Fix

**Quick fix (type validation):** Validate `typeof timestamp === 'number' && Number.isFinite(timestamp)` before the freshness check.

**Architecture fix (nonce cache):** Add a nonce to each request. The ping service maintains an in-memory Map of seen nonces with TTL cleanup. Worker generates a random nonce per request and includes it in the HMAC signature.

---

## 9. Public Endpoint Rate Limiting

### Problem

Rate limiting exists only on `POST /api/connect/start`. These public endpoints are unthrottled:
- `GET /api/connect/poll`
- `POST /api/connect/complete`

### Fix

Add IP-based rate limiting to all public endpoints:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/connect/start` | 10 | 1 min (existing) |
| `GET /api/connect/poll` | 60 | 1 min |
| `POST /api/connect/complete` | 10 | 1 min |

Extract rate-limit logic into a reusable helper. Also add per-user rate limiting on authenticated routes.

---

## 10. Supply Chain Hardening

### Problem

1. **Dockerfile** uses `npm install` without a lockfile — non-deterministic builds with caret ranges
2. **CLI** distributed via `npx pinchpoint connect` — package compromise reads local credentials
3. **`.gitignore`** lacks `.env*` patterns

### Fix

**Dockerfile (quick):** Copy `package-lock.json`, use `npm ci`.

**CLI (documentation):** Pin version in docs: `npx pinchpoint@1.0.0 connect`. Consider npm provenance attestation.

**.gitignore (quick):** Add `.env*` patterns.

---

## 11. Error Path Sanitization

### Problem

The ping service logs errors that might contain token data. If the Agent SDK throws an error containing the token string, it ends up in Fly.io's log aggregation.

### Solution

Create a `sanitizeError` function that strips token-like patterns (`/sk-ant-\w{3,6}-[A-Za-z0-9_-]{10,}/g`). Apply to all error logging in the ping service and DO.

Also add global exception handlers in the ping service that clear `process.env.CLAUDE_CODE_OAUTH_TOKEN` before exiting.

---

## 12. Infrastructure Hardening

### Fly.io Container

| Measure | Status | Action |
|---------|--------|--------|
| Run as non-root | Done | Dockerfile has `USER appuser` |
| Read-only filesystem | N/A | Agent SDK needs writable `/tmp` for subprocess |
| No SSH access | Default | Fly.io default — no SSH configured |
| Private networking / IP allowlisting | N/A | CF Workers have no fixed egress IPs; HMAC+transit encryption is the auth layer |
| Memory limits | Done | `fly.toml` — 1GB shared CPU |
| Health checks | Done | `fly.toml` — GET /health every 30s |

### Content-Security-Policy

Done — `web/public/_headers`:
- CSP with `default-src 'self'`, locked to Clerk + API domains
- HSTS with 1-year max-age + includeSubDomains
- X-Frame-Options: DENY
- Permissions-Policy: all sensitive APIs disabled
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

---

## 13. Implementation Sequence

### Phase 1: Quick Fixes — DONE

| Fix | File(s) | Status |
|-----|---------|--------|
| Add `aud`/`azp`/`nbf` to Clerk JWT validation | `auth.js` | Done |
| Add `.env*` to `.gitignore` | `.gitignore` | Done |
| Make token fingerprint mandatory in connect flow | `index.js` | Done |
| Add strict type validation on ping timestamp | `index.mjs` | Done |
| Add `sanitizeError()` to ping service + DO | `index.mjs`, `user-schedule-do.js` | Done |
| Add crash handlers to clear env vars | `index.mjs` | Done |
| Fix Dockerfile: copy lockfile, use `npm ci` | `Dockerfile` | Done |
| Add rate limiting to poll/complete endpoints | `index.js` | Done |

### Phase 2: Per-User Key Derivation (HKDF) — DONE

1. Added `deriveUserKey()` to `crypto.js` (HKDF-SHA256, salt "pinchpoint-v1", userId as info)
2. Updated encrypt/decrypt to accept `CryptoKey` objects (typeof polymorphism)
3. Hard-migrated (no v1 fallback — no users yet)
4. Updated `connectComplete()` to derive per-user key
5. Updated `alarm()` to use derived key, bails if no userId

### Phase 3: Transit Encryption (DO to Ping Service) — DONE

1. New secret: `PING_ENCRYPTION_KEY` (Worker + Fly.io)
2. DO re-encrypts token with transit key after decryption, clears plaintext
3. HMAC signs encrypted payload (not plaintext)
4. Ping service decrypts transit token (Node.js crypto, handles Web Crypto auth tag format)

### Phase 4: Replay Protection (Nonce Cache) — DONE

1. DO generates `crypto.randomUUID()` nonce per request
2. Nonce included in HMAC signature: `${payload}:${timestamp}:${nonce}`
3. Ping service: in-memory Map with 2-min TTL, checked after timestamp but before HMAC to prevent cache poisoning

### Phase 5: Connect Flow Challenge Binding — DONE

1. CLI generates random 4-digit code, SHA-256 hashes it, sends hash with `connectStart`
2. Code displayed in terminal with spaced formatting
3. Approval page has numeric input field (4 digits, digits-only filter)
4. Server verifies hash matches before approving session

### Phase 6: Disconnect Flow — DONE

1. New `disconnectToken()` DO method — removes token, cancels alarms, preserves account/schedule
2. New `POST /api/disconnect` route (Clerk-authenticated)
3. Disconnect email template with revocation instructions (claude.ai/settings)
4. Dashboard UI: Disconnect button + RevocationInstructions component
5. Delete account also sends revocation email if token was stored
6. IP allowlisting not practical (CF Workers have no fixed egress IPs) — HMAC is the auth layer

### Phase 7: Infrastructure Hardening — DONE

1. CSP headers via `_headers` (already existed, added Permissions-Policy + HSTS)
2. Fly.io health checks in `fly.toml` (GET /health every 30s)
3. CLI version pinned in CLAUDE.md documentation
4. IP allowlisting: N/A — CF Workers use dynamic egress IPs; HMAC+transit encryption+nonce is sufficient

---

**All phases complete.** Security Hardening Plan fully implemented 2026-02-20.

---

## Key Isolation Summary (After Implementation)

```
+-------------------------------------------------------------+
|                    Cloudflare Worker                         |
|                                                             |
|  ENCRYPTION_KEY (master)                                    |
|       +-- HKDF(master, "user_abc") -> userKey_abc           |
|       +-- HKDF(master, "user_xyz") -> userKey_xyz           |
|                                                             |
|  PING_ENCRYPTION_KEY (transit only)                         |
|  PING_SECRET (HMAC only)                                    |
+-------------------------------------------------------------+
                            |
                    encrypted transit
                            v
+-------------------------------------------------------------+
|                    Fly.io Ping Service                       |
|                                                             |
|  PING_ENCRYPTION_KEY (transit decrypt)                      |
|  PING_SECRET (HMAC verify)                                  |
|                                                             |
|  Token in memory ONLY during ping (seconds)                 |
|  Wiped in finally block + crash handlers                    |
+-------------------------------------------------------------+
```

**Compromise scenarios after hardening:**

| What's compromised | What attacker gets |
|---|---|
| `ENCRYPTION_KEY` alone | Can derive per-user keys, but needs DO storage access too |
| `PING_ENCRYPTION_KEY` alone | Can decrypt transit, but needs network position or Fly.io access |
| `PING_SECRET` alone | Can forge requests, but needs valid encrypted token + nonce |
| Single DO's storage | One user's ciphertext (needs `ENCRYPTION_KEY` + `userId` to decrypt) |
| Fly.io container | Can observe tokens during active pings only (seconds) |
| Cloudflare dashboard | Full compromise — mitigate with 2FA + audit logs |

---

## What This Plan Does NOT Solve

1. **Anthropic enforcement** — ToS risk, not a security one.
2. **Plaintext in ping service memory during execution** — fundamental to server-side architecture. Only Path C (hybrid) eliminates this.
3. **Cloudflare dashboard compromise** — mitigated by Cloudflare's own security.
4. **Token lifetime (~1 year)** — even if deleted from our systems, remains valid at Anthropic until user revokes.
