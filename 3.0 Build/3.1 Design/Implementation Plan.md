# PinchPoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a SaaS that pings your Claude Pro/Max subscription at scheduled times so your 5-hour usage window starts exactly when you want it.

**Architecture:** Split architecture — Cloudflare Worker (API + cron scheduling + KV storage) + a ping service on Google Cloud Run (runs Claude Agent SDK, which needs a full Node.js runtime with subprocess support). React + Vite + Tailwind frontend on Cloudflare Pages. Clerk for auth. CLI tool links credentials. Resend for email notifications.

**Tech Stack:** Cloudflare Workers + KV + Pages, Google Cloud Run, Claude Agent SDK, React 19, Vite, Tailwind CSS, Clerk, Resend, Node.js CLI

---

## Spike Results (Completed 2026-02-19)

### What Failed
- **Raw Messages API** (`api.anthropic.com/v1/messages`) with OAuth token → 401 "OAuth authentication is currently not supported"
- **x-api-key header** with OAuth token → 401 "invalid x-api-key"
- **Token refresh** at `console.anthropic.com/api/oauth/token` → 404

### What Worked
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) with `CLAUDE_CODE_OAUTH_TOKEN` env var → **SUCCESS**
  - Returns "pong" response + `rate_limit_info` with `resetsAt` timestamp (exact window expiry!)
  - Internally spawns Claude Code CLI as a subprocess
  - Requires full Node.js runtime (cannot run on Cloudflare Workers / V8 isolates)
- **Claude CLI** (`claude -p "ping"`) with `CLAUDE_CODE_OAUTH_TOKEN` → **SUCCESS**
  - Must unset `CLAUDECODE` env var if running inside another Claude Code session (not relevant in production)

### Key Discovery
The SDK response includes `rate_limit_info.resetsAt` — the exact Unix timestamp when the 5-hour window resets. This means we can tell users precisely when their window ends, not just estimate it.

### Credential Management
- Users run `claude setup-token` to generate a long-lived token (~1 year)
- Token stored as `CLAUDE_CODE_OAUTH_TOKEN` — no refresh logic needed for MVP
- Token format: `sk-ant-oat01-...`

---

## Architecture: Why Split?

The Agent SDK spawns Claude Code as a child process. This requires:
- Full Node.js runtime
- Filesystem access
- Subprocess spawning (`child_process`)

Cloudflare Workers (V8 isolates) cannot do any of this. So:

| Component | Platform | Reason |
|-----------|----------|--------|
| API + KV + Cron | Cloudflare Workers | Free, fast, excellent KV storage |
| Dashboard | Cloudflare Pages | Free, global CDN |
| Ping execution | Google Cloud Run | Free tier (2M req/mo), container runtime, runs Agent SDK |

**Flow:** Worker cron fires every minute → checks KV for due pings → calls Cloud Run endpoint with user's token → Cloud Run runs Agent SDK `query()` → returns result + `resetsAt` → Worker stores result + sends email.

---

## Phase 1: Project Scaffold

### Task 1.1: React + Vite + Tailwind Frontend

**Files:**
- Create: `PinchPoint/web/` (Vite scaffold)

**Step 1: Scaffold Vite + React project**

```bash
cd PinchPoint
npm create vite@latest web -- --template react
cd web
npm install
npm install -D tailwindcss @tailwindcss/vite
```

**Step 2: Configure Tailwind**

Add Tailwind plugin to `vite.config.js`:
```javascript
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

**Step 3: Install Clerk + React Router**

```bash
npm install @clerk/clerk-react react-router-dom
```

**Step 4: Verify dev server runs**

```bash
npm run dev
```

**Step 5: Commit**

```bash
git add web/
git commit -m "scaffold: vite + react + tailwind + clerk frontend"
```

### Task 1.2: Cloudflare Worker Setup

**Files:**
- Rewrite: `PinchPoint/worker/wrangler.toml`
- Rewrite: `PinchPoint/worker/src/index.js`
- Modify: `PinchPoint/worker/package.json`

**Step 1: Install wrangler**

```bash
cd PinchPoint/worker
npm install
```

**Step 2: Create KV namespace**

```bash
npx wrangler kv namespace create PINCHPOINT_KV
```

Copy the output ID into `wrangler.toml`.

**Step 3: Verify worker runs locally**

```bash
npm run dev
```

Hit `http://localhost:8787/api/health` → should return `{"ok":true}`

**Step 4: Commit**

```bash
git add worker/
git commit -m "scaffold: cloudflare worker with KV binding"
```

### Task 1.3: Ping Service (Google Cloud Run)

**Files:**
- Create: `PinchPoint/ping-service/Dockerfile`
- Create: `PinchPoint/ping-service/index.mjs`
- Create: `PinchPoint/ping-service/package.json`

The ping service is a tiny HTTP server that:
1. Receives `POST /ping` with `{ token }` body
2. Sets `CLAUDE_CODE_OAUTH_TOKEN` env var
3. Calls Agent SDK `query({ prompt: "ping", options: { maxTurns: 1, allowedTools: [] } })`
4. Returns `{ success, resetsAt, error? }`

Secured by a shared secret (`X-Ping-Secret` header) known only to the Worker.

**Dockerfile:**
```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package.json .
RUN npm install
RUN npx @anthropic-ai/claude-code --version || true
COPY index.mjs .
EXPOSE 8080
CMD ["node", "index.mjs"]
```

**Step 1: Write the ping service**
**Step 2: Test locally with Docker**
**Step 3: Commit**

```bash
git add ping-service/
git commit -m "scaffold: ping service for Cloud Run"
```

### Task 1.4: CLI Package Setup

**Files:**
- Modify: `PinchPoint/cli/package.json`
- Create: `PinchPoint/cli/bin/pinchpoint.mjs`

CLI reads `~/.claude/.credentials.json` OR the long-lived token from `claude setup-token`.

**Commit:**

```bash
git add cli/
git commit -m "scaffold: CLI package skeleton"
```

---

## Phase 2: Worker Backend

### Task 2.1: KV Schema + Helpers

**Files:**
- Create: `PinchPoint/worker/src/kv.js`

KV key structure:
```
user:{clerkUserId}     → { userId, email, schedule, timezone, paused, setupToken, lastPing }
link:{uuid}            → { userId, email } (TTL: 10 min — one-time CLI link tokens)
ping:{userId}:{date}   → { time, success, windowEnds } (TTL: 24 hrs — dedup)
```

Note: `setupToken` replaces `claudeTokens`. Users provide their long-lived token from `claude setup-token` (~1 year validity). No refresh logic needed.

Implement helper functions:
- `getUser(env, userId)` → get user record
- `putUser(env, userId, data)` → save user record
- `createLinkToken(env, userId, email)` → generate + store link token
- `consumeLinkToken(env, token)` → read + delete link token
- `recordPing(env, userId, date, result)` → store ping result with TTL
- `hasPingedToday(env, userId, date, time)` → dedup check

**Commit:** `feat(worker): add KV schema and helper functions`

### Task 2.2: Auth Middleware

**Files:**
- Create: `PinchPoint/worker/src/auth.js`

Implement Clerk JWT verification for Cloudflare Workers:
- Fetch JWKS from Clerk's `.well-known/jwks.json`
- Verify RS256 signature using Web Crypto API
- Extract `sub` (user ID) from payload
- Check expiration

Cache the JWKS key in a module-level variable (Workers are long-lived within an isolate).

**Commit:** `feat(worker): add Clerk JWT verification middleware`

### Task 2.3: API Routes

**Files:**
- Rewrite: `PinchPoint/worker/src/index.js`
- Create: `PinchPoint/worker/src/routes.js`

Routes:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |
| POST | `/api/connect` | Link token | CLI sends setup token |
| POST | `/api/link-token` | Clerk | Generate one-time link token for CLI |
| GET | `/api/schedule` | Clerk | Get user's schedule + status |
| PUT | `/api/schedule` | Clerk | Update schedule + timezone |
| GET | `/api/status` | Clerk | Get current status, last ping, next ping, windowEnds |
| POST | `/api/pause` | Clerk | Toggle pause on/off |

All routes return JSON. All authenticated routes expect `Authorization: Bearer <clerk_session_token>`.

CORS headers on all responses (frontend is on a different origin).

**Commit:** `feat(worker): implement API routes`

### Task 2.4: Cron Handler

**Files:**
- Create: `PinchPoint/worker/src/cron.js`

Logic (fires every minute):
1. List all KV keys with prefix `user:`
2. For each user (in parallel via `Promise.allSettled`):
   a. Skip if `paused` or no `setupToken`
   b. Get current time in user's timezone (`Intl.DateTimeFormat`)
   c. Look up `schedule[weekday]` — skip if null or doesn't match current HH:MM
   d. Dedup check — skip if already pinged this slot today
   e. Call ping service: `POST https://ping-service-url/ping` with `{ token: user.setupToken }`
   f. Parse response: `{ success, resetsAt, error }`
   g. Record ping result (including `resetsAt` for window end time)
   h. Send email notification if successful

**Commit:** `feat(worker): implement cron ping scheduler`

### Task 2.5: Email Notifications via Resend

**Files:**
- Create: `PinchPoint/worker/src/email.js`

Simple function: `sendPingNotification(env, email, windowEnds, timezone)`

Sends via Resend API:
- From: `PinchPoint <notify@pinchpoint.dev>`
- Subject: `Window active until {time in user's timezone}`
- Body: clean HTML with the window end time (using the exact `resetsAt` from the SDK response)

**Commit:** `feat(worker): add email notifications via Resend`

---

## Phase 3: CLI Tool

### Task 3.1: Implement `pinchpoint connect`

**Files:**
- Rewrite: `PinchPoint/cli/bin/pinchpoint.mjs`

Flow:
1. Parse args — expect `pinchpoint connect`
2. Try to read `~/.claude/.credentials.json` → extract `claudeAiOauth.accessToken`
3. If not found, prompt: "Run `claude setup-token` first, then paste your token:"
4. Prompt: "Enter your PinchPoint link token (from the dashboard):"
5. POST to `https://pinchpoint.dev/api/connect` with `{ linkToken, setupToken }`
6. Print success/failure

Dependencies: zero (Node.js built-ins only — `fs`, `readline`, `fetch`).

**Commit:** `feat(cli): implement pinchpoint connect command`

---

## Phase 4: Frontend (React + Tailwind)

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for landing page and dashboard design.

### Task 4.1: App Shell + Routing + Clerk

**Files:**
- Modify: `PinchPoint/web/src/main.jsx`
- Create: `PinchPoint/web/src/App.jsx`
- Create: `PinchPoint/web/src/lib/api.js`

Setup:
- `ClerkProvider` wrapping the app
- React Router with routes:
  - `/` → Landing page (public)
  - `/dashboard` → Dashboard (requires auth)
- API client module: thin wrapper around `fetch` that adds Clerk session token to headers

**Commit:** `feat(web): add app shell with Clerk auth and routing`

### Task 4.2: Landing Page

**Files:**
- Create: `PinchPoint/web/src/pages/Landing.jsx`

Use `frontend-design` skill to generate. Content:
- Hero: headline ("Start your Claude window on your schedule"), subheadline, CTA → Sign up
- How it works: 3-step visual (Set schedule → We ping → You work)
- Features: Schedule per day, email notifications, pause anytime, exact window countdown
- Pricing: Free
- Footer

**Commit:** `feat(web): add landing page`

### Task 4.3: Dashboard — Schedule Grid

**Files:**
- Create: `PinchPoint/web/src/pages/Dashboard.jsx`
- Create: `PinchPoint/web/src/components/ScheduleGrid.jsx`
- Create: `PinchPoint/web/src/components/TimePicker.jsx`

Schedule grid component:
- 7 rows (Mon–Sun), each with:
  - Day label
  - Toggle switch (on/off)
  - Time picker (15-min increments: 00:00, 00:15, 00:30, ... 23:45)
- Timezone selector dropdown (using `Intl.supportedValuesOf('timeZone')`)
- Save button → PUT `/api/schedule`
- Loads current schedule from GET `/api/schedule` on mount

**Commit:** `feat(web): add schedule grid component`

### Task 4.4: Dashboard — Status Panel

**Files:**
- Create: `PinchPoint/web/src/components/StatusPanel.jsx`

Shows:
- **Credentials status**: "Connected" (green) or "Not connected — run `npx pinchpoint connect`" (with the link token)
- **Window countdown**: "Active until 1:42pm AEST" with live countdown timer (uses `resetsAt` from SDK response)
- **Next ping**: "Wednesday 8:00am AEST" or "No pings scheduled"
- **Last ping**: "Monday 8:00am — Success" or "Failed — token may need refresh"
- **Pause toggle**: switch to pause/resume all pings
- **Link token button**: "Generate CLI link token" → shows token to copy

Polls GET `/api/status` every 30 seconds.

**Commit:** `feat(web): add status panel component`

### Task 4.5: Dashboard — Connect Flow

**Files:**
- Create: `PinchPoint/web/src/components/ConnectInstructions.jsx`

Shown when `hasCredentials` is false:
1. "First, generate a long-lived token:" → `claude setup-token`
2. "Click Generate Link Token" → calls POST `/api/link-token`, shows the token
3. "Open your terminal and run:" → `npx pinchpoint connect`
4. "Paste both tokens when prompted"
5. Auto-polls `/api/status` to detect when credentials are linked, then hides this panel

**Commit:** `feat(web): add CLI connect flow instructions`

---

## Phase 5: Deploy

### Task 5.1: Deploy Ping Service to Cloud Run

```bash
cd PinchPoint/ping-service
gcloud run deploy pinchpoint-ping \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars PING_SECRET=<generated-secret>
```

Note the service URL for the Worker config.

### Task 5.2: Deploy Worker

```bash
cd PinchPoint/worker
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put PING_SERVICE_URL
npx wrangler secret put PING_SECRET
npx wrangler deploy
```

Verify: `curl https://pinchpoint.<your-subdomain>.workers.dev/api/health`

### Task 5.3: Deploy Frontend to Cloudflare Pages

```bash
cd PinchPoint/web
npm run build
npx wrangler pages deploy dist --project-name pinchpoint
```

Or connect GitHub repo for automatic deploys.

### Task 5.4: Publish CLI (optional for MVP)

```bash
cd PinchPoint/cli
npm publish
```

Or just tell users to clone the repo and `npm link`.

### Task 5.5: End-to-End Smoke Test

1. Sign up on the frontend via Clerk
2. Generate a link token on the dashboard
3. Run `claude setup-token` locally to get a long-lived token
4. Run `npx pinchpoint connect`, paste tokens
5. Set a schedule for 2 minutes from now
6. Wait for the cron to fire
7. Verify: ping recorded in dashboard with exact `resetsAt` window end time, email received

---

## Project Structure (Final)

```
PinchPoint/
├── worker/                    ← Cloudflare Worker (API + cron)
│   ├── src/
│   │   ├── index.js           ← Entry point, fetch + scheduled handlers
│   │   ├── routes.js          ← API route handlers
│   │   ├── cron.js            ← Cron ping scheduler
│   │   ├── auth.js            ← Clerk JWT verification
│   │   ├── email.js           ← Resend notifications
│   │   └── kv.js              ← KV helpers
│   ├── wrangler.toml
│   └── package.json
├── ping-service/              ← Google Cloud Run (ping execution)
│   ├── index.mjs              ← HTTP server, runs Agent SDK
│   ├── Dockerfile
│   └── package.json
├── web/                       ← Cloudflare Pages (React dashboard)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── lib/
│   │   │   └── api.js         ← API client
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   │       ├── ScheduleGrid.jsx
│   │       ├── TimePicker.jsx
│   │       ├── StatusPanel.jsx
│   │       └── ConnectInstructions.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── cli/                       ← npx pinchpoint connect
│   ├── bin/
│   │   └── pinchpoint.mjs
│   └── package.json
├── spike/                     ← Research spike scripts (completed)
│   ├── test-ping.mjs
│   ├── test-refresh.mjs
│   ├── test-agent-sdk.mjs
│   └── test-cli-ping.mjs
├── 2.0 Research/              ← Research documents
│   ├── Cloud Automation Options.md
│   └── Claude Code Internal API.md
├── 3.1 Design/                ← Design documents
│   └── Implementation Plan.md
├── .gitignore
└── README.md
```

## Hosting Costs

All services run on free tiers. Confirmed 2026-02-20.

| Service | Free Tier | PinchPoint Usage |
|---------|-----------|-----------------|
| Cloudflare Workers | 100k req/day, 5 cron triggers | API + cron — well within |
| Cloudflare Durable Objects | 100k req/day, 13k GB-sec/day, 5GB storage | Per-user scheduling — well within |
| Cloudflare KV | 100k reads/day, 1k writes/day | Connect sessions — well within |
| Cloudflare Workers (frontend) | Included (static assets) | Dashboard — well within |
| Fly.io | 3 shared VMs (256MB each) | 1 ping/user/day — well within |
| Clerk | 10k MAU free | Auth — well within |
| Resend | 100 emails/day free | Notifications — well within |

**Total: $0/month** up to thousands of users. No paid plan required — Cloudflare added Durable Objects to the free tier (previously required the $5/mo Workers Paid plan).

## Verification

1. **Ping service:** `docker build && docker run`, hit `/ping` with a test token
2. **Worker:** `npm run dev` in worker/, hit all API endpoints with curl
3. **CLI:** `npm link` + `pinchpoint connect`, verify token appears in KV
4. **Frontend:** `npm run dev` in web/, full flow from signup to schedule save
5. **Integration:** E2E smoke test — schedule a ping 2 min out, verify it fires, check `resetsAt` in response
