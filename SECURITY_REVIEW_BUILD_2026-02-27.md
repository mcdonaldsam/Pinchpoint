# PinchPoint Build Security Review

Date: 2026-02-27  
Reviewer: Codex (read-only review; no code changes)

## Scope

- `3.0 Build/3.2 Host/worker` (Cloudflare Worker + Durable Object)
- `3.0 Build/3.2 Host/ping-service` (Fly.io Node service + Dockerfile)
- `3.0 Build/3.2 Host/cli` (connect flow CLI)
- `web` (frontend API integration + security headers)
- Build/deploy config (`wrangler.toml`, `fly.toml`, `Dockerfile`, `package-lock.json`)

## Method

- Manual code review of auth, token handling, transport security, replay protection, and rate limiting.
- Config review for deployment/runtime hardening.
- Dependency audit with `npm audit --package-lock-only --omit=dev` for:
  - `worker` (0 vulns)
  - `ping-service` (0 vulns)
  - `web` (0 vulns)
  - `spike` (0 vulns)
- `cli` has no lockfile/dependencies to audit (`ENOLOCK` is expected for that package shape).

## Executive Summary

- Critical findings: **0**
- High findings: **1**
- Medium findings: **2**
- Low findings: **1**

Primary risk is **supply-chain execution via unpinned `npx`** in production build/runtime paths.  
Core cryptographic design and auth flow are generally solid (JWT verification, token encryption, HMAC signing, nonce use, and short-lived connect sessions).

## Findings

### HIGH-01: Unpinned `npx` execution in build and runtime paths (supply-chain RCE risk)

Severity: **High**

Evidence:
- `3.0 Build/3.2 Host/ping-service/Dockerfile:12`
  - `RUN npx @anthropic-ai/claude-code --version`
- `3.0 Build/3.2 Host/ping-service/index.mjs:313`
  - `execFileAsync('npx', ['@anthropic-ai/claude-code', ...])`

Why this matters:
- `npx` without an exact pinned version and lockfile binding can resolve and execute remote package code.
- This affects both:
  - image build time (Docker layer creation),
  - runtime debug path (`/test` endpoint).

Impact:
- If upstream package publishing is compromised, an attacker can run arbitrary code in the ping-service environment.
- That environment handles decrypted user tokens during ping execution.

Recommendation:
- Remove runtime `npx` package resolution.
- Pin exact CLI version in `package.json` + `package-lock.json` and execute local binary only.
- Prefer `npx --no-install` or direct `node_modules/.bin/...` execution.
- Consider disabling `/test` in production entirely.

---

### MED-01: Nonce replay protection is process-local and resets on restart/instance change

Severity: **Medium**

Evidence:
- In-memory nonce cache:
  - `3.0 Build/3.2 Host/ping-service/index.mjs:36-41`
- Replay checks on `/ping` and `/test` rely on this cache:
  - `index.mjs:222-223`, `241`, `283-284`, `299`
- Fly config allows cold-stop:
  - `3.0 Build/3.2 Host/ping-service/fly.toml:14`
  - `fly.toml:16`

Why this matters:
- Nonce history is lost on restart and not shared across instances.
- A captured signed request could be replayed within timestamp validity if routed to a fresh instance/process.

Impact:
- Replay window is short (60s), but protection is weaker than intended under restart/scale events.

Recommendation:
- Store nonce IDs in a shared short-TTL store (Redis/KV/DO) keyed by nonce.
- If keeping memory-only nonces, run single warm instance and accept residual replay risk explicitly.

---

### MED-02: KV-based rate limiting is non-atomic and eventually consistent

Severity: **Medium**

Evidence:
- Limiter implementation:
  - `3.0 Build/3.2 Host/worker/src/index.js:18-21`
- Used on public connect endpoints:
  - `index.js:81`, `86`, `97`, `210`

Why this matters:
- Concurrent requests can bypass limits (`get` then `put` race).
- Distributed/bursty traffic can exceed intended throttles.

Impact:
- Higher-than-expected session creation/polling/complete attempts.
- Increased abuse and cost exposure; weaker brute-force resistance boundaries.

Recommendation:
- Move rate limiting to a strongly consistent primitive (Durable Object counter, Cloudflare native WAF/rate-limit rules, or Turnstile on connect start).
- Keep per-session attempt caps (already present) as secondary control.

---

### LOW-01: Connect flow payload validation is permissive on security-relevant fields

Severity: **Low**

Evidence:
- `connect/start` only checks type presence:
  - `3.0 Build/3.2 Host/worker/src/index.js:216-222`
- `connect/complete` does not UUID-validate `sessionId`:
  - `index.js:311-313`
- UUID validation exists on other connect routes:
  - `index.js:92`, `152`

Why this matters:
- Overly permissive input allows malformed values and unnecessary KV churn/error paths.
- Not currently an auth bypass, but weakens robustness.

Recommendation:
- Enforce strict regex and length constraints:
  - `tokenFingerprint`: `^[a-f0-9]{32}$`
  - `codeHash`: `^[a-f0-9]{64}$`
  - `sessionId`: UUID regex on all routes including `connect/complete`

## Positive Controls Confirmed

- Worker JWT verification includes signature, `exp`, `nbf`, `iss`, `azp`, and `kid` handling (`worker/src/auth.js`).
- Frontend security headers are present (`web/public/_headers:2-8`), including CSP, HSTS, XFO, and Permissions-Policy.
- API CORS is origin-scoped (no wildcard) (`worker/src/index.js:27`).
- `.env` and `.env.*` are ignored (`.gitignore:6-9`), and `.env` / `.env.secrets` are not tracked in git.
- Dependency audits for lockfile-based packages found no known vulnerabilities.

## Residual Risk Notes

- Debug execution path (`/api/test-ping-debug` -> `/test`) expands attack surface and should be treated as production-risky unless tightly gated.
- This review is static; no live penetration testing, IAM review, or cloud account policy audit was performed.

