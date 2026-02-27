# PinchPoint — CLAUDE.md

PinchPoint is a SaaS that pings a Claude Pro/Max subscription at scheduled times so the 5-hour usage window starts exactly when the user wants it.

**Implementation plan (v3):** `3.0 Build/3.1 Design/Implementation Plan.md`
**Security hardening plan:** `3.0 Build/3.1 Design/Security Hardening Plan.md`
**ToS analysis:** `2.0 Research/OAuth Flow & ToS Analysis.md`

---

## Architecture (v3 — Simplified)

Split architecture — required because the Claude Agent SDK spawns `claude` as a child process (needs full Node.js runtime with subprocess support). Cloudflare Workers `nodejs_compat` does NOT support `child_process` (non-functional stub only).

| Component | Platform | Path |
|-----------|----------|------|
| API + routing | Cloudflare Worker | `3.0 Build/3.2 Host/worker/` |
| Per-user scheduling | Durable Objects (alarms) | `3.0 Build/3.2 Host/worker/src/user-schedule-do.js` |
| Ping execution | Fly.io (Node 22, 1GB RAM, IAD region) | `3.0 Build/3.2 Host/ping-service/` |
| Frontend | Cloudflare Workers (static assets) | `web/` |
| CLI (connect only) | npm package (`pinchpoint@0.1.0`) | `3.0 Build/3.2 Host/cli/` |

**Connect flow:** User runs `npx pinchpoint connect` → CLI does its own OAuth PKCE flow requesting a 1-year token (`expires_in: 31536000`) → Claude consent screen → callback exchanges code for token → redirects to PinchPoint connect page → user enters 4-digit verification code + clicks Approve → CLI sends token → encrypted with per-user HKDF key and stored in DO. Token is an independent OAuth grant — does NOT touch `~/.claude/.credentials.json`.

**Ping flow:** DO alarm fires → decrypts token, re-encrypts for transit, signs HMAC with nonce → calls Fly.io `/ping` → Fly.io verifies HMAC + nonce, decrypts transit token, runs Agent SDK `query()`, extracts `SDKRateLimitEvent` → returns `{ success, rateLimitInfo }` → DO stores result with exact `resetsAt`, schedules next alarm. `SDKRateLimitEvent` shape: `{ type: "rate_limit_event", rate_limit_info: { status, resetsAt: <unix seconds>, rateLimitType: "five_hour" } }`.

**Why DOs over KV + cron:** KV `list()` caps at 1,000 keys, is eventually consistent (60s propagation), and scanning all users every minute hits the 30-second CPU limit. DOs give per-user isolation, strong consistency, and alarm-based scheduling with no fan-out.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Cloudflare Workers + DO + KV | API, per-user scheduling, connect sessions |
| Fly.io (Node 22-slim) | Container runtime for Agent SDK (child_process required) |
| `@anthropic-ai/claude-agent-sdk` | The ONLY way to ping Claude Pro/Max |
| React + Vite + Tailwind CSS 4 | Frontend |
| Clerk | Auth — JWT + JWKS caching + `kid` matching |
| Resend | Email notifications (disconnect/revocation only) |

**Cost:** $0/month — all free tiers (Cloudflare, Fly.io auto-stop, Clerk, Resend).

---

## API Routes

### Worker (Cloudflare) — see `worker/src/index.js` for full implementation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | `{"ok":true}` |
| POST | `/api/connect/start` | None | CLI starts connect session |
| GET | `/api/connect/poll` | None | CLI polls for approval |
| POST | `/api/connect/approve` | Clerk | Dashboard approves (code verification) |
| POST | `/api/connect/complete` | None | CLI sends token |
| GET | `/api/status` | Clerk | Get user status from DO |
| POST | `/api/test-ping` | Clerk | Force immediate ping |
| POST | `/api/test-ping-debug` | Clerk | Ping service `/test` (stderr capture) |
| PUT | `/api/schedule` | Clerk | Update schedule + timezone |
| POST | `/api/pause` | Clerk | Toggle pause |
| POST | `/api/disconnect` | Clerk | Remove token + stop pings |
| DELETE | `/api/account` | Clerk | Delete account + all data |

### Ping Service (Fly.io)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Liveness check |
| POST | `/ping` | HMAC + nonce | Production ping — Agent SDK `query()` |
| POST | `/test` | HMAC + nonce | Debug ping — captures stderr |

---

## Key File Paths

```
3.0 Build/3.1 Design/        # All plans and design docs (write new plans here)
2.0 Research/                # Research docs (OAuth, token lifecycle, etc.)
3.0 Build/3.2 Host/
  worker/src/
    index.js                 # Router, CORS, rate limiting, connect flow, DO proxy
    auth.js                  # Clerk JWT verification
    crypto.js                # HKDF, AES-256-GCM, HMAC
    email.js                 # Resend disconnect notification
    validate.js              # Schedule validation + multi-roll normalization
    user-schedule-do.js      # Durable Object: alarms, ping execution, health state
  ping-service/index.mjs     # /health, /ping, /test
  cli/bin/pinchpoint.mjs     # Zero-dep CLI: OAuth PKCE + connect flow
web/src/
  components/ScheduleGrid.jsx  # Main heatmap editor (multi-roll, drag, auto-save)
  components/StatusPanel.jsx   # Countdown timer + health badge
  pages/Landing.jsx            # Production homepage
  pages/LandingA.jsx–O.jsx     # 15 design variants — NOT routed, pending selection
  pages/Dashboard.jsx          # Authenticated main app
  pages/Connect.jsx            # OAuth approval flow
```

---

## Deployment Status (as of 2026-02-21)

All components deployed and live: Worker API (`https://api.pinchpoint.dev`), Frontend (`https://pinchpoint.dev`), Ping Service (`https://pinchpoint-ping.fly.dev`, Fly.io auto-stop), CLI (`pinchpoint@0.1.0` on npm).

---

## Storage Model

### Durable Object Storage (per user DO)
```
userId              → string (Clerk user ID)
email               → string
schedule            → { monday: null | [{time: "HH:MM", enabled: bool}, ...], ... }
                      (4 rolls per day, hourly increments, null = day off)
timezone            → string (IANA, default: "UTC")
paused              → boolean
setupToken          → string (AES-256-GCM encrypted, format: {ivHex}:{ciphertextHex})
lastPing            → { time: ISO8601, success: bool, windowEnds: ISO8601|null, exact: bool }
consecutiveFailures → number (0–5+)
tokenHealth         → "green" | "yellow" | "red"
```

### KV (ephemeral only)
```
connect:{uuid} → { status, userId?, email?, tokenFingerprint, codeHash, ... }  (TTL: 5 min)
rate:{action}:{ip} → { count, resetAt }  (TTL: 60s)
```

### Token Health States
- **green:** Pings succeeding normally
- **yellow:** 3+ consecutive failures — retrying every 2 min
- **red:** 5+ consecutive failures — auto-paused

### Multi-Roll Schedule Model
Each day: up to 4 rolls, 5h apart. Roll 1 is anchor (mandatory if day enabled). Rolls 2–4 cascade at +5h. Midnight-wrap: if roll 2+ has earlier time than roll 1, it's next calendar day. `validate.js` enforces exactly 4 rolls, hourly increments, roll 1 enabled. `normalizeSchedule()` converts old string format.

---

## Security

- **Token at rest:** AES-256-GCM, per-user HKDF key (master key + userId, salt="pinchpoint-v1"), random 12-byte IV
- **Token in transit:** Separate AES-256-GCM key, re-encrypted per request with fresh IV
- **Ping auth:** HMAC-SHA256 over `payload:timestamp:nonce`, 60s freshness, nonce replay protection (120s), timing-safe comparison
- **Ping concurrency:** Serialized queue (max 5 waiters) — prevents `CLAUDE_CODE_OAUTH_TOKEN` env var race condition
- **CORS:** Locked to `env.FRONTEND_URL`
- **JWT:** JWKS cached 1hr, `kid` matching with rotation fallback, `exp`/`nbf`/`iss`/`aud`/`azp` checks
- **Rate limiting:** KV per IP — `/connect/start` 10/60s, `/connect/poll` 60/60s, `/connect/complete` 10/60s, approval max 3 attempts/session
- **Connect sessions:** Unguessable UUID, 5-min TTL, one-time use, SHA-256 code hash binding, mandatory token fingerprint
- **Error sanitization:** `sk-ant-*` patterns stripped from all logs, crash handlers clear env vars
- **Headers:** CSP, HSTS, X-Frame-Options DENY, Permissions-Policy, X-Content-Type-Options (`public/_headers`)
- **Key isolation:** 3 separate secrets — `ENCRYPTION_KEY` (at-rest), `PING_ENCRYPTION_KEY` (transit), `PING_SECRET` (HMAC)

---

## Workflow Rules

- **Verify before done:** Always run the relevant build (`npm run build` in `web/`, or `wrangler deploy` for the worker) and confirm it succeeds. Never claim a fix is done without confirming it builds and works.

- **Clarify context before debugging:** Confirm the specific component, route, mode, and file path before diving into code. Don't assume the default code path.

- **Deploy when implied:** If a task changes live behavior, deploy and confirm the live site reflects it. A code change is not done until deployed.

- **Incremental findings on audits/reviews:** Share findings after every 3–5 files read. Don't read the entire codebase before producing output.

- **Cite sources on external facts:** Always cite sources for external services, APIs, pricing. Never state fees or external facts as definitive without a source.

---

## Deployment Commands

**IMPORTANT:** Local `wrangler login` is on a different Cloudflare account. Always use `CLOUDFLARE_API_TOKEN` env var. All tokens/keys are in `.env.secrets` (gitignored).

```bash
# Deploy Worker
cd "3.0 Build/3.2 Host/worker"
CLOUDFLARE_API_TOKEN=<see .env.secrets> npx wrangler deploy

# Deploy Frontend
npm run build --prefix web
CLOUDFLARE_API_TOKEN=<see .env.secrets> npx wrangler deploy --config web/wrangler.toml

# Fly.io ping service
cd "3.0 Build/3.2 Host/ping-service"
C:/Users/samcd/.fly/bin/fly.exe deploy
```

---

## Dev Commands

```bash
# Worker
cd "3.0 Build/3.2 Host/worker" && npm run dev   # http://localhost:8787

# Ping service (Docker)
cd "3.0 Build/3.2 Host/ping-service"
docker build -t pinchpoint-ping .
docker run -p 8080:8080 -e PING_SECRET=test -e PING_ENCRYPTION_KEY=test pinchpoint-ping

# Frontend
cd web && npm run dev   # http://localhost:5173

# CLI (local dev)
cd "3.0 Build/3.2 Host/cli" && npm link
PINCHPOINT_API_URL=http://localhost:8787 pinchpoint connect
```

---

## Secrets

Worker (via `wrangler secret put`): `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `PING_SERVICE_URL`, `PING_SECRET`, `ENCRYPTION_KEY`, `PING_ENCRYPTION_KEY`

Worker vars (`wrangler.toml [vars]`): `CLERK_FRONTEND_API = "clerk.pinchpoint.dev"`, `FRONTEND_URL = "https://pinchpoint.dev"`

Ping service (`fly secrets set`): `PING_SECRET`, `PING_ENCRYPTION_KEY` (must match Worker values)

Frontend (`.env`): `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`

---

## Worker Module Map

| File | Key Exports / Functions |
|------|------------------------|
| `index.js` | `rateLimit()`, `corsHeaders()`, `proxyToDO()`, `fetchClerkEmail()`, connect flow handlers |
| `auth.js` | `verifyClerkSession()` — JWKS cached 1hr, `kid` rotation fallback |
| `crypto.js` | `deriveUserKey()`, `encryptToken()`, `decryptToken()`, `signPingRequest()` |
| `email.js` | `sendDisconnectNotification()` — fire-and-forget Resend POST |
| `validate.js` | `buildDefaultRolls()`, `normalizeSchedule()`, `validateSchedule()`, `validateTimezone()` |
| `user-schedule-do.js` | `alarm()`, `executePing()`, `handlePingResult()`, `calculateNextPingTime()` |

---

## Key Workflow Skills

- **Before any feature/creative work:** `/brainstorming`
- **Before claiming work is done:** `/verification-before-completion`
- **Before proposing fixes:** `/systematic-debugging`
- **Before touching code on multi-step tasks:** `/writing-plans`
- **After completing major work:** `/requesting-code-review`

---

## MCP Servers

- **Playwright** — browser automation, screenshots (auto-allowed)
- **Serena** — available (auto-allowed)

## Permissions & Sandbox

Bypass permissions mode, sandbox enabled. Bash, Read, Edit, Write, Glob, Grep, Task, Playwright/Serena all pre-allowed.
