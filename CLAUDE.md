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
| Ping execution | Fly.io (container) | `3.0 Build/3.2 Host/ping-service/` |
| Dashboard | Cloudflare Pages | `web/` |
| CLI (connect only) | npm package | `3.0 Build/3.2 Host/cli/` |

**Connect flow:** User runs `npx pinchpoint connect` → CLI performs its own OAuth flow with PKCE (same as `claude setup-token`) requesting a **1-year token** (`expires_in: 31536000`) → Claude consent screen in browser → user clicks Authorize → callback exchanges code for token, starts PinchPoint session, redirects browser to PinchPoint connect page → user enters 4-digit verification code + clicks Approve → CLI sends token → encrypted with per-user HKDF key and stored in DO. Token is an independent OAuth grant — does NOT touch `~/.claude/.credentials.json` or interfere with the user's regular Claude Code sessions.

**Ping flow:** User sets schedule → Worker routes to user's DO → DO sets alarm → Alarm fires → DO decrypts token (HKDF-derived key), re-encrypts for transit (separate key), signs HMAC with nonce → calls Fly.io `/ping` → Fly.io verifies HMAC + nonce, decrypts transit token, runs Agent SDK `query()`, extracts `SDKRateLimitEvent` → returns `{ success, rateLimitInfo }` → DO stores result with exact `resetsAt`, fire-and-forget email, schedules next alarm.

**Why DOs over KV + cron:** KV `list()` caps at 1,000 keys per call, is eventually consistent (60s propagation), and scanning all users every minute hits the 30-second CPU limit. DOs give per-user isolation, strong consistency, and alarm-based scheduling with no fan-out.

---

## Tech Stack

- **Cloudflare Workers + Durable Objects + KV + Pages** — API, per-user scheduling, connect sessions, frontend
- **Fly.io** — container runtime for Agent SDK (free tier: 3 shared VMs)
- **`@anthropic-ai/claude-agent-sdk`** — the ONLY way to ping Claude Pro/Max (see spike results)
- **React 19 + Vite + Tailwind CSS** — frontend
- **Clerk** — auth (JWT verification with JWKS caching + `kid` matching)
- **Resend** — email notifications (fire-and-forget, timezone-aware)
- **Node.js CLI** — `npx pinchpoint connect` (zero dependencies)

**Cost:** $0/month — Cloudflare Free plan includes Durable Objects (100K req/day, 5GB storage), Fly.io free tier covers ping service, Clerk + Resend free tiers cover auth + email

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |
| POST | `/api/connect/start` | None | CLI starts a connect session (KV, 5min TTL) |
| GET | `/api/connect/poll` | None | CLI polls for approval status |
| POST | `/api/connect/approve` | Clerk | Dashboard user approves session |
| POST | `/api/connect/complete` | None | CLI sends token after approval |
| GET | `/api/status` | Clerk | Get user status from DO |
| PUT | `/api/schedule` | Clerk | Update schedule in DO |
| POST | `/api/pause` | Clerk | Toggle pause in DO |
| POST | `/api/disconnect` | Clerk | Remove token + stop pings, keep account |
| DELETE | `/api/account` | Clerk | Delete account + all data |

---

## Build & Deployment Status (as of 2026-02-21)

### Everything is DEPLOYED, LIVE, and WORKING

| Component | URL | Status |
|-----------|-----|--------|
| Worker API | `https://api.pinchpoint.dev` | Live (`/api/health` → `{"ok":true}`) |
| Frontend | `https://pinchpoint.dev` | Live |
| Ping Service | `https://pinchpoint-ping.fly.dev` | Live (Fly.io, app: `pinchpoint-ping`) |
| CLI | `3.0 Build/3.2 Host/cli/` | Built, not yet published to npm |

### Worker API — DEPLOYED
All routes implemented and wired: health, connect (start/poll/approve/complete), status, schedule, pause, disconnect, account delete. Includes CORS, rate limiting, input validation, Clerk JWT auth with JWKS caching + `kid` rotation, and DO proxy helper.

**Files:** `index.js`, `auth.js`, `crypto.js`, `validate.js`, `email.js`
**Config:** `CLERK_FRONTEND_API = "clerk.pinchpoint.dev"` in wrangler.toml

### Durable Object (UserScheduleDO) — DEPLOYED
Full implementation: schedule storage, alarm-based ping scheduling with DST-aware time calculation, token encrypt/decrypt with HKDF per-user keys, ping service calls with transit encryption + HMAC + nonce, retry logic (2min), token health state machine (green/yellow/red), auto-pause at 5 failures, fire-and-forget email notifications, disconnect + account deletion.

### Ping Service (Fly.io) — DEPLOYED
HMAC signature verification with nonce replay protection, transit token decryption, Agent SDK `query()` execution with `SDKRateLimitEvent` extraction, serialized ping queue (prevents env var race condition), error sanitization, crash handlers.

### CLI — BUILT (not published)
Zero-dependency `npx pinchpoint connect`: performs its own OAuth flow with PKCE to get a 1-year token (`expires_in: 31536000`), creates independent OAuth grant (doesn't touch `~/.claude/.credentials.json`), generates 4-digit verification code + SHA-256 hash binding, token fingerprint, single-browser-flow (Claude OAuth → localhost callback → 302 redirect → PinchPoint approval page), HTTPS enforcement.
**Local run:** `cd "3.0 Build/3.2 Host/cli" && node bin/pinchpoint.mjs connect`

### Frontend — DEPLOYED
- **Landing page** — multiple design variants (A through O) in `web/src/pages/`, default at `/`
- **Dashboard** — status panel, schedule grid (timezone-aware, 15-min increments), pause toggle, disconnect with revocation instructions, account deletion
- **Connect page** — approval flow for CLI sessions
- **Privacy / Terms** — static pages
- **Auth** — Clerk `SignedIn`/`SignedOut` guards, auto-redirect to dashboard when signed in
- **API client** — `apiFetch` helper with Clerk token injection

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

**Worker secrets** (all set via `wrangler secret put`):
- `CLERK_SECRET_KEY`, `RESEND_API_KEY`, `PING_SERVICE_URL`, `PING_SECRET`, `ENCRYPTION_KEY`, `PING_ENCRYPTION_KEY`

**Ping service secrets** (Fly.io): `PING_SECRET`, `PING_ENCRYPTION_KEY` (match Worker)

### Remaining Work
- **Choose landing page design** — 15 variants (A-O) created, need to pick one and apply consistent styling to Dashboard/Connect/Privacy/Terms
- **npm publish** — Publish CLI package to npm registry (`npx pinchpoint connect`)
- **End-to-end smoke test** — Verify first scheduled ping fires correctly and email is sent

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
schedule            → { monday: "08:00" | null, ... }
timezone            → string (IANA)
paused              → boolean
setupToken          → string (AES-256-GCM encrypted)
lastPing            → { time, success, windowEnds, exact }
consecutiveFailures → number
tokenHealth         → "green" | "yellow" | "red"
```

### KV (ephemeral connect sessions only)
```
connect:{uuid} → { status, userId?, email?, ... }  (TTL: 5 min)
```

### Token Health States
- **green:** Pings succeeding normally
- **yellow:** 3+ consecutive failures — user emailed warning
- **red:** 5+ consecutive failures — auto-paused, user emailed "token expired"

---

## Security

- **Token encryption (at rest):** AES-256-GCM via Web Crypto API, per-user HKDF-derived keys (master key + userId), per-token random IV
- **Token encryption (transit):** Separate AES-256-GCM key for DO→ping service communication, re-encrypted per request
- **Ping service auth:** HMAC-SHA256 signing over `payload:timestamp:nonce`, 60s freshness window, nonce-based replay protection
- **CORS:** Locked to `env.FRONTEND_URL` (not `*`)
- **JWT auth:** JWKS cached 1 hour, `kid` matching with rotation fallback, `aud`/`azp`/`nbf` checks
- **Input validation:** Schedule days, times (15-min increments), timezone all validated
- **Connect sessions:** Unguessable UUID, 5-minute TTL, one-time use, approval requires Clerk auth, 4-digit verification code challenge (SHA-256 hash binding), mandatory token fingerprint
- **Error sanitization:** Token patterns stripped from all log output, crash handlers clear env vars
- **Headers:** CSP, HSTS, X-Frame-Options DENY, Permissions-Policy, X-Content-Type-Options nosniff
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

## Build Plans

All major implementation plans and design documents MUST be saved as `.md` files in `3.0 Build/3.1 Design/`. When starting any significant feature, phase, or architectural change, write a plan document there before coding.

**Directory:** `3.0 Build/3.1 Design/`

Existing plans:
- `Implementation Plan.md` — original v1 implementation plan
- `Security Hardening Plan.md` — token lifecycle hardening, per-user key derivation, transit encryption, injection audit

---

## Secrets (never commit)

Worker secrets (via `wrangler secret put`):
- `CLERK_SECRET_KEY` — Clerk backend key
- `RESEND_API_KEY` — Resend email API key
- `PING_SERVICE_URL` — Fly.io service URL
- `PING_SECRET` — HMAC shared secret for request signing
- `ENCRYPTION_KEY` — AES-256 master key for at-rest encryption (hex-encoded, 32 bytes)
- `PING_ENCRYPTION_KEY` — AES-256 key for transit encryption (hex-encoded, 32 bytes)

Ping service env vars (`fly secrets set`):
- `PING_SECRET` — must match Worker's value
- `PING_ENCRYPTION_KEY` — must match Worker's value

Frontend env vars (`.env`):
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `VITE_API_URL` — Worker API URL

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
