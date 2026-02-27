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
| CLI (connect only) | npm package | `3.0 Build/3.2 Host/cli/` |

**Connect flow:** User runs `npx pinchpoint connect` → CLI performs its own OAuth flow with PKCE (same as `claude setup-token`) requesting a **1-year token** (`expires_in: 31536000`) → Claude consent screen in browser → user clicks Authorize → callback exchanges code for token, starts PinchPoint session, redirects browser to PinchPoint connect page → user enters 4-digit verification code + clicks Approve → CLI sends token → encrypted with per-user HKDF key and stored in DO. Token is an independent OAuth grant — does NOT touch `~/.claude/.credentials.json` or interfere with the user's regular Claude Code sessions.

**Ping flow:** User sets schedule (up to 4 rolls/day, 5h apart) → Worker routes to user's DO → DO sets alarm → Alarm fires → DO decrypts token (HKDF-derived key), re-encrypts for transit (separate key), signs HMAC with nonce → calls Fly.io `/ping` → Fly.io verifies HMAC + nonce, decrypts transit token, runs Agent SDK `query()`, extracts `SDKRateLimitEvent` → returns `{ success, rateLimitInfo }` → DO stores result with exact `resetsAt`, schedules next alarm.

**Why DOs over KV + cron:** KV `list()` caps at 1,000 keys per call, is eventually consistent (60s propagation), and scanning all users every minute hits the 30-second CPU limit. DOs give per-user isolation, strong consistency, and alarm-based scheduling with no fan-out.

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Cloudflare Workers + DO + KV | wrangler ^4.0.0 | API, per-user scheduling, connect sessions |
| Fly.io | Node 22-slim, 1 shared CPU, 1GB RAM | Container runtime for Agent SDK |
| `@anthropic-ai/claude-agent-sdk` | ^0.2.47 | The ONLY way to ping Claude Pro/Max |
| React | 19.2.0 | Frontend UI framework |
| React Router | 7.13.0 | Client-side routing |
| Vite | 7.3.1 | Build tool + dev server |
| Tailwind CSS | 4.2.0 (via `@tailwindcss/vite`) | Utility-first CSS |
| Clerk | `@clerk/clerk-react` 5.61.0 | Auth (JWT + JWKS caching + `kid` matching) |
| lucide-react | 0.575.0 | Icons |
| Resend | API | Email notifications (disconnect/revocation only) |
| Node.js CLI | Zero dependencies | `npx pinchpoint connect` |

**Cost:** $0/month — Cloudflare Free plan includes Durable Objects (100K req/day, 5GB storage), Fly.io free tier covers ping service (auto-stop to 0 machines when idle), Clerk + Resend free tiers cover auth + email

---

## API Routes

### Worker (Cloudflare)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check → `{"ok":true}` |
| POST | `/api/connect/start` | None | CLI starts connect session (KV, 5min TTL) |
| GET | `/api/connect/poll` | None | CLI polls for approval status |
| POST | `/api/connect/approve` | Clerk | Dashboard user approves session (code verification) |
| POST | `/api/connect/complete` | None | CLI sends token after approval |
| GET | `/api/status` | Clerk | Get user status from DO |
| POST | `/api/test-ping` | Clerk | Force immediate ping execution (diagnostics) |
| POST | `/api/test-ping-debug` | Clerk | Call ping service `/test` endpoint (stderr capture) |
| PUT | `/api/schedule` | Clerk | Update schedule + timezone in DO |
| POST | `/api/pause` | Clerk | Toggle pause in DO |
| POST | `/api/disconnect` | Clerk | Remove token + stop pings, keep account |
| DELETE | `/api/account` | Clerk | Delete account + all data |

### Ping Service (Fly.io)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Liveness check for Fly.io health probes |
| POST | `/ping` | HMAC + nonce | Production ping — Agent SDK `query()`, extracts `SDKRateLimitEvent` |
| POST | `/test` | HMAC + nonce | Debug ping — runs Claude CLI `npx @anthropic-ai/claude-code`, captures stderr |

---

## File Structure

```
PinchPoint/
├── CLAUDE.md                                    # This file
├── README.md
├── .gitignore
├── .env.secrets                                 # All secrets (gitignored via .env.*)
│
├── 2.0 Research/
│   ├── Claude Code Internal API.md              # How Claude Code communicates with Anthropic
│   ├── Cloud Automation Options.md              # Evaluated 5 approaches to cloud pinging
│   ├── OAuth Flow & ToS Analysis.md             # PKCE flow details + ToS risk levels
│   └── Token Lifecycle & Refresh Strategy.md    # Token types, refresh mechanics, 1-year decision
│
├── 3.0 Build/
│   ├── 3.1 Design/
│   │   ├── Implementation Plan.md               # v3 architecture blueprint + phased roadmap
│   │   ├── Security Hardening Plan.md           # 7-phase security plan (all complete)
│   │   ├── Strategy & Monetization.md           # Product strategy, TAM, monetization paths
│   │   ├── Multi-Roll Schedule & Email Cleanup.md  # 4-roll/day design (implemented)
│   │   └── Potential API Features.md            # Tiered feature ideas from SDK data
│   │
│   └── 3.2 Host/
│       ├── cli/
│       │   ├── package.json                     # name: pinchpoint, bin: pinchpoint
│       │   └── bin/pinchpoint.mjs               # Zero-dep CLI: OAuth PKCE + connect flow
│       │
│       ├── ping-service/
│       │   ├── package.json                     # deps: @anthropic-ai/claude-agent-sdk ^0.2.47
│       │   ├── index.mjs                        # /health, /ping, /test endpoints
│       │   ├── Dockerfile                       # node:22-slim, non-root, pre-cached CLI
│       │   └── fly.toml                         # app: pinchpoint-ping, region: iad, auto-stop
│       │
│       ├── spike/                               # Proof-of-concept tests (completed)
│       │   ├── test-agent-sdk.mjs
│       │   ├── test-cli-ping.mjs
│       │   ├── test-ping.mjs
│       │   └── test-refresh.mjs
│       │
│       └── worker/
│           ├── package.json                     # devDeps: wrangler ^4.0.0 (no prod deps)
│           ├── wrangler.toml                    # DO binding, KV binding, vars, cron
│           └── src/
│               ├── index.js                     # Router, CORS, rate limiting, connect flow, DO proxy
│               ├── auth.js                      # Clerk JWT verification (JWKS cache, kid rotation)
│               ├── crypto.js                    # HKDF key derivation, AES-256-GCM, HMAC signing
│               ├── email.js                     # Resend: disconnect/revocation notification only
│               ├── user-schedule-do.js          # Durable Object: schedule, alarms, ping execution
│               └── validate.js                  # Schedule validation, multi-roll normalization
│
├── 4.0 Testing/                                 # Screenshot archive of landing page designs
│
├── web/
│   ├── index.html                               # SPA entry point + meta tags
│   ├── vite.config.js                           # React + Tailwind CSS plugins
│   ├── wrangler.toml                            # Static assets, SPA 404→index.html
│   ├── package.json                             # React 19, Clerk, lucide, Tailwind 4, Vite 7
│   ├── public/
│   │   └── _headers                             # Security headers (CSP, HSTS, etc.)
│   └── src/
│       ├── main.jsx                             # Bootstrap: StrictMode + ClerkProvider + BrowserRouter
│       ├── App.jsx                              # Routes + ProtectedRoute auth guard
│       ├── index.css                            # Tailwind @import + scrollbar customization
│       ├── lib/
│       │   └── api.js                           # apiFetch(path, options, getToken) helper
│       ├── components/
│       │   ├── ScheduleGrid.jsx                 # Main interactive heatmap editor (790 lines)
│       │   ├── ScheduleGridA/B/C.jsx            # Experimental grid variants (not in production)
│       │   └── StatusPanel.jsx                  # Countdown timer + health + last/next ping
│       └── pages/
│           ├── Landing.jsx                      # Production homepage (routed at / and /home)
│           ├── LandingA.jsx–LandingO.jsx        # 15 design variants (not routed)
│           ├── Dashboard.jsx                    # Authenticated: status, schedule, pause, disconnect
│           ├── Connect.jsx                      # OAuth approval: code entry or CLI instructions
│           ├── Privacy.jsx                      # Privacy policy (static)
│           ├── Terms.jsx                        # Terms of service (static)
│           ├── Security.jsx                     # Security documentation (static, detailed)
│           └── SchedulePreview.jsx              # Internal: side-by-side grid design comparison
```

---

## Build & Deployment Status (as of 2026-02-21)

### Everything is DEPLOYED, LIVE, and WORKING

| Component | URL | Status |
|-----------|-----|--------|
| Worker API | `https://api.pinchpoint.dev` | Live (`/api/health` → `{"ok":true}`) |
| Frontend | `https://pinchpoint.dev` | Live |
| Ping Service | `https://pinchpoint-ping.fly.dev` | Live (Fly.io, app: `pinchpoint-ping`, auto-stop/start) |
| CLI | `3.0 Build/3.2 Host/cli/` | Published (`pinchpoint@0.1.0` on npm) |

### Worker API — DEPLOYED
All routes implemented and wired: health, connect (start/poll/approve/complete), status, test-ping, test-ping-debug, schedule, pause, disconnect, account delete. Includes CORS (locked to `FRONTEND_URL`), KV-based rate limiting, input validation with multi-roll normalization, Clerk JWT auth with JWKS caching + `kid` rotation, and DO proxy helper.

**Files:** `index.js` (router + connect flow), `auth.js` (JWT), `crypto.js` (HKDF + AES + HMAC), `validate.js` (schedule validation + multi-roll), `email.js` (disconnect notification)
**Config:** `CLERK_FRONTEND_API = "clerk.pinchpoint.dev"`, `FRONTEND_URL = "https://pinchpoint.dev"` in wrangler.toml
**Cron:** `0 */6 * * *` (maintenance, every 6 hours — currently unused)

### Durable Object (UserScheduleDO) — DEPLOYED
Full implementation: multi-roll schedule storage (4 pings/day, 5h apart per day), alarm-based scheduling with DST-aware time calculation (±1h retry on DST boundaries), midnight-wrap detection for late-night rolls, token encrypt/decrypt with HKDF per-user keys (salt="pinchpoint-v1"), ping service calls with transit encryption + HMAC + nonce (25s timeout), retry logic (2min), token health state machine (green/yellow/red), auto-pause at 5 consecutive failures, disconnect email notification, account deletion.

**DO Routes:** `/get-status`, `/set-schedule`, `/set-token`, `/toggle-pause`, `/disconnect-token`, `/delete-account`, `/test-ping`, `/test-ping-debug`

### Ping Service (Fly.io) — DEPLOYED
Three endpoints: `/health` (liveness), `/ping` (production), `/test` (debug). HMAC signature verification with timing-safe comparison + nonce replay protection (120s retention window). Transit token decryption (AES-256-GCM). Agent SDK `query()` execution with `SDKRateLimitEvent` extraction. Serialized ping queue (max 5 waiters, prevents `CLAUDE_CODE_OAUTH_TOKEN` env var race condition). Error sanitization + crash handlers that clear env vars.

**Fly.io config:** `auto_stop_machines: stop`, `auto_start_machines: true`, `min_machines_running: 0` (scales to zero when idle, cold-starts on request). Health check every 30s at `/health`.

### CLI — BUILT (not published)
Zero-dependency `npx pinchpoint connect`: performs its own OAuth flow with PKCE to get a 1-year token (`expires_in: 31536000`), creates independent OAuth grant (doesn't touch `~/.claude/.credentials.json`), generates 4-digit verification code + SHA-256 hash binding, token fingerprint (first 32 chars of SHA-256), single-browser-flow (Claude OAuth → localhost callback → 302 redirect → PinchPoint approval page), HTTPS enforcement. Polls every 2s with 5min timeout.
**OAuth:** CLIENT_ID `9d1c250a-e61b-44d9-88ed-5944d1962f5e`, scope `user:inference`, authorize via `claude.ai/oauth/authorize`, token exchange via `platform.claude.com/v1/oauth/token`
**Local run:** `cd "3.0 Build/3.2 Host/cli" && node bin/pinchpoint.mjs connect`

### Frontend — DEPLOYED

**Routes:**
| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | Home | None | Redirects to `/dashboard` if signed in, else shows Landing |
| `/home` | Landing | None | Public landing (always accessible, even when signed in) |
| `/dashboard` | Dashboard | Protected | Main app: status panel, schedule grid, controls |
| `/connect` | Connect | Protected | OAuth approval with code entry (or CLI instructions) |
| `/privacy` | Privacy | None | Privacy policy |
| `/terms` | Terms | None | Terms of service |
| `/security` | Security | None | Detailed security documentation |
| `/schedule-preview` | SchedulePreview | None | Internal: side-by-side grid design comparison |

**Key components:**
- **ScheduleGrid** (790 lines) — Interactive 24h×7d heatmap with drag-to-move rolls, tap-to-edit time, double-tap-to-toggle enabled/disabled, auto-save (800ms debounce), timezone picker (145 timezones), multi-roll support (4 pinches/day)
- **StatusPanel** — Live countdown timer (1s tick), health badge (green/yellow/red), last ping + relative time, next ping day/time, paused indicator
- **Dashboard** — Fetches `/api/status`, save schedule via `/api/schedule`, manual "Pinch now" via `/api/test-ping`, pause toggle, disconnect with revocation instructions, account deletion with 2-step confirmation
- **Connect** — Two modes: with `?session=` param (code entry + approve) or without (shows CLI instructions)
- **Landing** — Hero, 4-step how-it-works, feature cards, footer with legal links
- **Landing variants** — 15 designs (A-O), NOT routed in production, for design selection

**Styling:** Tailwind utility classes throughout, stone/emerald/amber/red color palette, responsive (sm:grid-cols-2), no custom CSS components

### Auth & DNS — FULLY CONFIGURED

**Clerk (Production):**
- Production keys active (`pk_live_...` / `sk_live_...`)
- Google OAuth with custom credentials (Client ID + Secret in Clerk SSO connections)
- Google OAuth redirect URIs: `https://clerk.pinchpoint.dev/v1/oauth_callback` and `https://sweet-giraffe-55.clerk.accounts.dev/v1/oauth_callback`
- IMPORTANT: Dev and prod are separate environments in Clerk dashboard — always switch to Production before configuring

**DNS (Cloudflare — all CNAME, DNS-only/grey cloud):**
- `clerk.pinchpoint.dev` → `frontend-api.clerk.services`
- `accounts.pinchpoint.dev` → `accounts.clerk.services`
- `clkmail.pinchpoint.dev` → `mail.vd7o1m9v1by4.clerk.services`
- `clk._domainkey.pinchpoint.dev` → `dkim1.vd7o1m9v1by4.clerk.services`
- `clk2._domainkey.pinchpoint.dev` → `dkim2.vd7o1m9v1by4.clerk.services`
- `api.pinchpoint.dev` → Worker

### Remaining Work
All core work is complete. The product is fully deployed and live.

- CLI published to npm as `pinchpoint@0.1.0` (`npx pinchpoint connect`)
- Worker API, Frontend, and Ping Service all deployed and operational

---

## Spike Results (Completed 2026-02-19)

### What WORKS
- **Claude Agent SDK** with `CLAUDE_CODE_OAUTH_TOKEN` env var → SUCCESS
- **Claude CLI** (`claude -p "ping"`) with `CLAUDE_CODE_OAUTH_TOKEN` → SUCCESS
- **Long-lived token** from `claude setup-token` (~1 year, format: `sk-ant-oat01-...`)

### `SDKRateLimitEvent` — resetsAt CONFIRMED
The runtime `SDKRateLimitEvent` is emitted with exact rate limit data:
```json
{
  "type": "rate_limit_event",
  "rate_limit_info": {
    "status": "allowed",
    "resetsAt": 1771502400,
    "rateLimitType": "five_hour"
  }
}
```
- `resetsAt` is a Unix timestamp in seconds — the exact 5-hour window reset time
- Ping service extracts and returns `rateLimitInfo` to the DO
- DO uses exact `resetsAt` when available, falls back to `now + 5h` estimate

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

### KV (ephemeral connect sessions only)
```
connect:{uuid} → { status, userId?, email?, tokenFingerprint, codeHash, ... }  (TTL: 5 min)
rate:{action}:{ip} → { count, resetAt }  (TTL: 60s, eventual consistency)
```

### Token Health States
- **green:** Pings succeeding normally
- **yellow:** 3+ consecutive failures — retrying every 2 min
- **red:** 5+ consecutive failures — auto-paused (stops retrying)

### Multi-Roll Schedule Model
Each day can have up to 4 "rolls" (pings), spaced 5 hours apart:
- Roll 1 is the anchor time (user-set, mandatory if day is enabled)
- Rolls 2-4 cascade at +5h intervals
- Each roll has `{time: "HH:MM", enabled: bool}` — disabled rolls are skipped but not deleted
- Midnight-wrap: if roll 2+ has an earlier time than roll 1, it belongs to the next calendar day
- `validate.js` enforces exactly 4 rolls per day, hourly increments, roll 1 must be enabled
- `normalizeSchedule()` converts old string format to new rolls array format

---

## Security

- **Token encryption (at rest):** AES-256-GCM via Web Crypto API, per-user HKDF-derived keys (master key + userId, salt="pinchpoint-v1"), random 12-byte IV per token
- **Token encryption (transit):** Separate AES-256-GCM key for DO→ping service communication, re-encrypted per request with fresh IV
- **Ping service auth:** HMAC-SHA256 signing over `payload:timestamp:nonce`, 60s freshness window, nonce-based replay protection (120s retention), timing-safe comparison
- **Ping concurrency:** Serialized queue (max 5 waiters) prevents `CLAUDE_CODE_OAUTH_TOKEN` env var race condition
- **CORS:** Locked to `env.FRONTEND_URL` (not `*`)
- **JWT auth:** JWKS cached 1 hour, `kid` matching with rotation fallback (cache bust + refetch), `exp`/`nbf`/`iss`/`aud`/`azp` checks
- **Input validation:** Schedule days, times (hourly increments), rolls (exactly 4/day, roll 1 enabled), timezone all validated
- **Rate limiting:** KV-based per IP — `/connect/start` 10/60s, `/connect/poll` 60/60s, `/connect/complete` 10/60s, connect approval max 3 code attempts/session
- **Connect sessions:** Unguessable UUID, 5-minute TTL, one-time use, approval requires Clerk auth, 4-digit verification code challenge (SHA-256 hash binding), mandatory token fingerprint
- **Error sanitization:** Token patterns (`sk-ant-*`) stripped from all log output, crash handlers clear env vars
- **Headers:** CSP, HSTS, X-Frame-Options DENY, Permissions-Policy, X-Content-Type-Options nosniff (via `public/_headers`)
- **Key isolation:** 3 separate secrets — `ENCRYPTION_KEY` (at-rest, Worker only), `PING_ENCRYPTION_KEY` (transit, Worker + ping), `PING_SECRET` (HMAC, Worker + ping)
- **Disconnect flow:** Token deletion from DO, alarm cancellation, revocation instructions via email + in-app

---

## Deployment Commands

**IMPORTANT:** Local `wrangler login` is on a different Cloudflare account than the production account in `wrangler.toml`. Always use `CLOUDFLARE_API_TOKEN` env var for deploys. All tokens/keys are in `.env.secrets` (gitignored).

```bash
# Deploy Worker (source CLOUDFLARE_API_TOKEN from .env.secrets)
cd "3.0 Build/3.2 Host/worker"
CLOUDFLARE_API_TOKEN=<see .env.secrets> npx wrangler deploy

# Deploy Frontend
npm run build --prefix web
CLOUDFLARE_API_TOKEN=<see .env.secrets> npx wrangler deploy --config web/wrangler.toml

# Set Worker secrets (one-time, already done)
CLOUDFLARE_API_TOKEN=<see .env.secrets> npx wrangler secret put SECRET_NAME --config "3.0 Build/3.2 Host/worker/wrangler.toml"

# Fly.io ping service
cd "3.0 Build/3.2 Host/ping-service"
C:/Users/samcd/.fly/bin/fly.exe deploy
```

### Credentials Reference
All API tokens, keys, account IDs, and secrets are stored in `.env.secrets` (gitignored via `.env.*` pattern). Never commit secrets to the repo.

---

## Dev Commands

```bash
# Worker (Cloudflare)
cd "3.0 Build/3.2 Host/worker"
npm install
npm run dev           # http://localhost:8787

# Ping service (Docker)
cd "3.0 Build/3.2 Host/ping-service"
docker build -t pinchpoint-ping .
docker run -p 8080:8080 -e PING_SECRET=test -e PING_ENCRYPTION_KEY=test pinchpoint-ping

# Frontend
cd web
npm install
npm run dev           # http://localhost:5173

# CLI (local dev)
cd "3.0 Build/3.2 Host/cli"
npm link
PINCHPOINT_API_URL=http://localhost:8787 pinchpoint connect
```

---

## Build Plans & Research

All major implementation plans and design documents MUST be saved as `.md` files in `3.0 Build/3.1 Design/`. When starting any significant feature, phase, or architectural change, write a plan document there before coding.

### Design Documents (`3.0 Build/3.1 Design/`)

| Document | Status | Description |
|----------|--------|-------------|
| `Implementation Plan.md` | Complete | v3 architecture blueprint, phased roadmap (Phases 1-5) |
| `Security Hardening Plan.md` | Complete (all 7 phases) | Token lifecycle threats, HKDF, transit encryption, replay protection, error sanitization |
| `Strategy & Monetization.md` | Strategic framework | Product strategy, TAM analysis, 5 monetization paths, Tier 1-3 feature ideas |
| `Multi-Roll Schedule & Email Cleanup.md` | Implemented | 4-roll/day design, midnight-wrap, cascade logic, email scope reduction |
| `Potential API Features.md` | Research complete | SDK data already received but ignored, 10 tiered feature ideas, priority ranking |

### Research Documents (`2.0 Research/`)

| Document | Description |
|----------|-------------|
| `OAuth Flow & ToS Analysis.md` | PKCE flow details, 3 risk levels (HIGH/MODERATE/LOW), ToS compliance, enforcement precedents |
| `Claude Code Internal API.md` | How Claude Code communicates with Anthropic, OAuth token rejection by public API, SDK routing |
| `Cloud Automation Options.md` | 5 approaches evaluated (browser, Docker+CLI, GitHub Actions, Agent SDK, serverless Puppeteer) |
| `Token Lifecycle & Refresh Strategy.md` | Token types (8h vs 1-year), refresh mechanics, multi-device independence, decision: CLI does own OAuth |

---

## Secrets (never commit)

Worker secrets (via `wrangler secret put`):
- `CLERK_SECRET_KEY` — Clerk backend key (for fetching user email)
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (JWT `azp` validation)
- `RESEND_API_KEY` — Resend email API key
- `PING_SERVICE_URL` — Fly.io service URL
- `PING_SECRET` — HMAC shared secret for request signing
- `ENCRYPTION_KEY` — AES-256 master key for at-rest encryption (hex-encoded, 32 bytes)
- `PING_ENCRYPTION_KEY` — AES-256 key for transit encryption (hex-encoded, 32 bytes)

Worker public vars (wrangler.toml `[vars]`):
- `CLERK_FRONTEND_API` = `"clerk.pinchpoint.dev"` — JWKS domain + JWT issuer
- `FRONTEND_URL` = `"https://pinchpoint.dev"` — CORS origin

Ping service env vars (`fly secrets set`):
- `PING_SECRET` — must match Worker's value
- `PING_ENCRYPTION_KEY` — must match Worker's value

Frontend env vars (`.env`):
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `VITE_API_URL` — Worker API URL

---

## Worker Module Map

| File | Exports | Key Functions |
|------|---------|---------------|
| `index.js` | `UserScheduleDO` (re-export) | `rateLimit()`, `corsHeaders()`, `json()`, `parseJSON()`, `proxyToDO()`, `fetchClerkEmail()`, `connectStart()`, `connectPoll()`, `connectApprove()`, `connectComplete()` |
| `auth.js` | `verifyClerkSession()` | `fetchJWKS()`, `base64UrlDecode()` — JWKS cached 1hr with cache-bust on `kid` miss |
| `crypto.js` | `deriveUserKey()`, `encryptToken()`, `decryptToken()`, `hashToken()`, `signPingRequest()` | `hexToBuffer()`, `bufferToHex()` |
| `email.js` | `sendDisconnectNotification()` | Fire-and-forget POST to Resend API (disconnect/revocation only) |
| `validate.js` | `buildDefaultRolls()`, `normalizeSchedule()`, `validateSchedule()`, `validateTimezone()` | Constants: `VALID_DAYS`, `TIME_REGEX` |
| `user-schedule-do.js` | `UserScheduleDO` class | `alarm()`, `executePing()`, `handlePingResult()`, `getLocalTime()`, `calculateNextPingTime()`, `buildTargetDate()`, `calculateNextPingInfo()` |

---

## Available Skills & Slash Commands

Skills are invoked via `/skill-name` in chat. Use these instead of doing things manually.

### Workflow (use these)
| Command | What it does |
|---------|-------------|
| `/commit` | Create a git commit with proper message |
| `/commit-push-pr` | Commit, push, and open a PR in one step |
| `/clean_gone` | Clean up local branches deleted on remote |
| `/code-review` | Code review a pull request |
| `/review-pr` | Comprehensive PR review with specialized agents |
| `/feature-dev` | Guided feature development with architecture focus |

### Planning & Quality
| Command | What it does |
|---------|-------------|
| `/brainstorming` | **Use before any creative/feature work** — explores intent and requirements before implementation |
| `/writing-plans` | Write implementation plans for multi-step tasks |
| `/executing-plans` | Execute a written plan with review checkpoints |
| `/plan-reviewer` | Review plans, identify completed/incomplete work |
| `/plan-chunker` | Extract milestone-specific files from large plans |
| `/verification-before-completion` | **Use before claiming work is done** — run verification, evidence before assertions |
| `/systematic-debugging` | Structured debugging before proposing fixes |
| `/test-driven-development` | TDD workflow — tests before implementation |

### Code Quality
| Command | What it does |
|---------|-------------|
| `/requesting-code-review` | Request review after completing work |
| `/receiving-code-review` | Handle review feedback with technical rigor |
| `/typescript-audit` | Audit for memory leaks, dead code, race conditions, security |
| `/typescript-expert` | Deep TypeScript/JS expertise |
| `/performance` | Web performance audit and optimization |

### Development
| Command | What it does |
|---------|-------------|
| `/frontend-design` | Production-grade frontend design (not generic AI aesthetics) |
| `/subagent-driven-development` | Parallel task execution for independent work |
| `/dispatching-parallel-agents` | Dispatch 2+ independent tasks in parallel |
| `/using-git-worktrees` | Isolated git worktrees for feature work |
| `/finishing-a-development-branch` | Guide merge/PR/cleanup when implementation is complete |

### Research & Utilities
| Command | What it does |
|---------|-------------|
| `/web-search` | Web search via Tavily/Exa |
| `/find-skills` | Discover and install new skills |
| `/pdf` | Read, merge, split, create PDFs |
| `/docx` | Create/edit Word documents |
| `/ai-sdk` | AI SDK (Vercel) integration help |

### Plugin Development
| Command | What it does |
|---------|-------------|
| `/create-plugin` | Guided plugin creation workflow |
| `/hookify` | Create hooks to prevent unwanted behaviors |

### Key Workflow Rules (from superpowers)
- **Always `/brainstorming` before creative work** — features, components, new functionality
- **Always `/verification-before-completion` before claiming done** — run tests, check output
- **Always `/systematic-debugging` before proposing fixes** — investigate root cause first
- **Use `/writing-plans` before touching code** on multi-step tasks
- **Use `/requesting-code-review` after completing major work**

---

## Custom Agents (`.claude/agents/`)

| Agent | Purpose |
|-------|---------|
| Navigator | Codebase navigation and exploration |
| Researcher | Deep research tasks |
| Scribe | Documentation and writing |
| Wizard | Complex multi-step implementation |
| code-simplifier | Simplify and refine code for clarity |

---

## MCP Servers

- **Playwright** — browser automation, screenshots, page interaction (auto-allowed)
- **Serena** — available (auto-allowed)

---

## Permissions & Sandbox

Running in **bypass permissions** mode with sandbox enabled. Bash is auto-allowed when sandboxed. All core tools (Read, Edit, Write, Glob, Grep, Task, etc.) and Playwright/Serena MCP tools are pre-allowed.
