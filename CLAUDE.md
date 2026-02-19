# PinchPoint — CLAUDE.md

PinchPoint is a SaaS that pings a Claude Pro/Max subscription at scheduled times so the 5-hour usage window starts exactly when the user wants it.

**Implementation plan (v3):** `.claude/plans/mutable-squishing-stream.md`
**ToS analysis:** `2.0 Research/OAuth Flow & ToS Analysis.md`

---

## Architecture (v3 — Simplified)

Split architecture — required because the Claude Agent SDK spawns `claude` as a child process (needs full Node.js runtime with subprocess support). Cloudflare Workers `nodejs_compat` does NOT support `child_process` (non-functional stub only).

| Component | Platform | Path |
|-----------|----------|------|
| API + routing | Cloudflare Worker | `3.0 Build/3.2 Host/worker/` |
| Per-user scheduling | Durable Objects (alarms) | `3.0 Build/3.2 Host/worker/src/user-schedule-do.js` |
| Ping execution | Google Cloud Run | `3.0 Build/3.2 Host/ping-service/` |
| Dashboard | Cloudflare Pages | `web/` |
| CLI (connect only) | npm package | `3.0 Build/3.2 Host/cli/` |

**Connect flow:** User runs `npx pinchpoint connect` → CLI reads Claude token from `~/.claude/.credentials.json` → CLI starts polling session → opens browser to PinchPoint → user clicks Approve → CLI sends token → encrypted and stored in DO.

**Ping flow:** User sets schedule → Worker routes to user's DO → DO sets alarm → Alarm fires → DO decrypts token, signs HMAC request → calls Cloud Run `/ping` → Cloud Run runs Agent SDK `query()`, extracts `SDKRateLimitEvent` → returns `{ success, rateLimitInfo }` → DO stores result with exact `resetsAt`, fire-and-forget email, schedules next alarm.

**Why DOs over KV + cron:** KV `list()` caps at 1,000 keys per call, is eventually consistent (60s propagation), and scanning all users every minute hits the 30-second CPU limit. DOs give per-user isolation, strong consistency, and alarm-based scheduling with no fan-out.

---

## Tech Stack

- **Cloudflare Workers + Durable Objects + KV + Pages** — API, per-user scheduling, connect sessions, frontend
- **Google Cloud Run** — container runtime for Agent SDK (free tier: 2M req/mo)
- **`@anthropic-ai/claude-agent-sdk`** — the ONLY way to ping Claude Pro/Max (see spike results)
- **React 19 + Vite + Tailwind CSS** — frontend
- **Clerk** — auth (JWT verification with JWKS caching + `kid` matching)
- **Resend** — email notifications (fire-and-forget, timezone-aware)
- **Node.js CLI** — `npx pinchpoint connect` (zero dependencies)

**Cost:** $5/month (Workers Paid plan required for Durable Objects)

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

- **Token encryption:** AES-256-GCM via Web Crypto API. Per-token random IV. Key stored as Worker secret.
- **Cloud Run auth:** HMAC-SHA256 request signing with timestamp (60s replay window)
- **CORS:** Locked to `env.FRONTEND_URL` (not `*`)
- **JWT auth:** JWKS cached 1 hour, `kid` matching with rotation fallback
- **Input validation:** Schedule days, times (15-min increments), timezone all validated
- **Connect sessions:** Unguessable UUID, 5-minute TTL, one-time use, approval requires Clerk auth

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
docker run -p 8080:8080 -e PING_SECRET=test pinchpoint-ping

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

## Secrets (never commit)

Worker secrets (via `wrangler secret put`):
- `CLERK_SECRET_KEY` — Clerk backend key
- `RESEND_API_KEY` — Resend email API key
- `PING_SERVICE_URL` — Cloud Run service URL
- `PING_SECRET` — HMAC shared secret for request signing
- `ENCRYPTION_KEY` — AES-256 key (hex-encoded, 32 bytes)

Ping service env vars:
- `PING_SECRET` — must match Worker's value

Frontend env vars (`.env`):
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `VITE_API_URL` — Worker API URL
