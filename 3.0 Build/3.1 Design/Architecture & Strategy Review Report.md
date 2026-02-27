# PinchPoint — Architecture & Strategy Review Report

**Date:** 2026-02-22
**Scope:** System architecture, user experience, business strategy, feature expansion
**Status:** All components deployed and live

---

## Executive Summary

PinchPoint is a well-engineered product built on a narrow insight: the Claude Agent SDK returns an exact `resetsAt` timestamp for the 5-hour usage window, enabling precise scheduling. The architecture is sound — split across Cloudflare Workers (routing/scheduling) and Fly.io (execution) at $0/month — but the product faces existential risk from Anthropic ToS enforcement and a small addressable market. The core ping is not defensible; the opportunity lies in the layers built around it.

This report covers what's working, what's not, where the risks are, and what to build next.

---

## 1. System Architecture

### What's Built

```
User (Browser)
  → Clerk Auth (Google OAuth)
    → Cloudflare Worker (thin router, CORS, rate limiting, validation)
      → Durable Object (per-user state, alarms, token encryption)
        → Fly.io (HMAC-verified, transit-encrypted ping via Agent SDK)
          → Claude API (SDKRateLimitEvent with exact resetsAt)
```

Three layers, three encryption keys, zero shared state between users.

### Architecture Strengths

**The DO decision was correct.** KV + cron would have required scanning all users every minute (1,000-key list cap, 60s eventual consistency, 30s CPU limit). DOs give per-user isolation with alarm-based scheduling — no fan-out, no polling, no coordination. Each user is a self-contained state machine.

**The split was necessary.** The Agent SDK spawns `claude` as a child process. Cloudflare Workers' `nodejs_compat` has a non-functional `child_process` stub. Fly.io provides the full Node.js runtime. There was no way around this.

**The cost structure is remarkable.** Cloudflare free tier (100K req/day, 5GB DO storage), Fly.io free tier (3 shared VMs, auto-stop), Clerk free tier (10K MAU), Resend free tier (100 emails/day). Total: $0/month. This holds well into hundreds of active users.

**Key isolation is proper.** Three separate secrets with distinct purposes:
- `ENCRYPTION_KEY` — at-rest token storage (Worker-only)
- `PING_ENCRYPTION_KEY` — transit encryption (Worker + Fly.io)
- `PING_SECRET` — HMAC request signing (Worker + Fly.io)

Compromise of one doesn't give access to the others' functions.

### Architecture Concerns

**Fly.io cold-start is a timing risk.** Configured with `min_machines_running: 0` and `auto_stop_machines: stop`. When idle, the machine stops completely. First ping after idle incurs a cold-start — Node.js boot + npm cache warming. The DO has a 25s timeout on ping requests (under the Worker's 30s CPU limit). If cold-start exceeds 25s, the ping fails, triggers a retry in 2 minutes, and fires again into a warm machine. Functionally this works, but the user's window starts 2 minutes late on first ping of the day. **This is the most likely source of user-visible timing drift.**

**Single execution path.** If Fly.io is down (region outage, deployment issue, Dockerfile break), all pings for all users fail. There's no fallback. The health state machine will auto-pause after 5 failures, but by then the user has missed their window. No alerting exists to catch this proactively.

**No monitoring or observability.** There are no dashboards, no alerts, no error aggregation. If pings silently fail for all users, the only signal is individual users checking their dashboards and seeing red health. For a deployed product, this is a gap.

**Free tier ceilings and when costs kick in:**

| Component | Free Limit | Breaks At (Approx.) | Cost After |
|-----------|-----------|---------------------|------------|
| CF Workers | 100K req/day | ~1,000 active users polling status frequently | $5/mo + $0.50/M requests |
| Durable Objects | 100K req/day, 5GB | ~500 users with 4 rolls/day + status checks | $5/mo + usage |
| Fly.io | 3 shared VMs | ~50 concurrent pings (serialized queue of 5) | ~$2/mo per additional VM |
| Clerk | 10K MAU | 10,000 registered users | $25/mo |
| Resend | 100/day | 100 disconnect emails/day | $20/mo |

The first constraint hit will be Fly.io's serialized queue (max 5 concurrent waiters). With 50+ users whose pings cluster at popular times (e.g., 9:00 AM weekdays), some will get 503 "Service busy" responses.

### Architecture Verdict

**Fit for purpose at current scale.** The architecture is clean, cost-effective, and handles the core use case well. The main gaps are operational (no monitoring, no fallback) and scaling (serialized ping queue). Neither matters until there are real users.

---

## 2. Data Flow & Operational Mechanics

### Connect Flow

The connect flow is the most complex user-facing operation. It spans CLI, browser, Worker, KV, and DO:

1. CLI generates PKCE params + 4-digit verification code + token fingerprint
2. CLI calls `POST /api/connect/start` → KV session (5-min TTL)
3. CLI opens browser → Claude OAuth → consent → callback to localhost → redirect to PinchPoint
4. User enters 4-digit code on PinchPoint → `POST /api/connect/approve` verifies SHA-256(code) match
5. CLI polls `GET /api/connect/poll` → sees "approved"
6. CLI sends token via `POST /api/connect/complete` → server verifies fingerprint, encrypts with HKDF, stores in DO
7. Session consumed (deleted from KV)

**Assessment:** Mechanically solid. The fingerprint binding prevents token substitution. The verification code prevents session hijacking. The 5-minute TTL limits the attack window. One-time session consumption prevents replay.

**Concern:** The flow requires the user to have a terminal, run a CLI command, understand OAuth consent, switch to a browser, enter a code, and switch back. This is at least 6 context switches. For the target audience (developers), this is acceptable. For broader adoption, it's a wall.

### Scheduled Ping Lifecycle

1. DO alarm fires at scheduled time
2. Decrypt token from storage (HKDF per-user key)
3. Re-encrypt for transit (separate key, fresh IV)
4. Sign with HMAC (payload + timestamp + UUID nonce)
5. POST to Fly.io `/ping` (25s timeout)
6. Fly.io: verify HMAC → check nonce → decrypt token → run `query("pong")` → extract `SDKRateLimitEvent`
7. Return `{success, rateLimitInfo}` with exact `resetsAt`
8. DO updates state, schedules next alarm

**Assessment:** Robust. Double encryption (at-rest + transit), HMAC signing, replay protection, serialized execution to prevent env var races. The `resetsAt` extraction is the core value — it's the only way to know exactly when the window resets.

### Multi-Roll Scheduling

4 rolls per day, 5 hours apart. Roll 1 is the user-set anchor; rolls 2-4 cascade automatically. Each roll can be individually enabled/disabled.

**Example:** Roll 1 at 06:00 → Roll 2 at 11:00 → Roll 3 at 16:00 → Roll 4 at 21:00

**Midnight wrap:** If Roll 3 is at 23:00 and Roll 4 would be 04:00, the system correctly identifies Roll 4 as belonging to the next calendar day.

**DST handling:** `buildTargetDate()` constructs a UTC timestamp for the target local time, then verifies it resolves correctly in the timezone. If DST boundary is crossed (spring-forward/fall-back), it retries ±1 hour and picks the closest match. On rare edge cases, a ping could fire up to 1 hour late during a DST transition — acceptable for a 5-hour window.

**Assessment:** The multi-roll model is well-designed and is one of the genuinely differentiating features. Most users won't build their own cron job with 4-roll cascade logic, midnight wrap detection, and DST awareness.

### Failure Recovery

The token health state machine (green → yellow → red) with auto-pause at 5 failures is conservative and correct. The fixed 2-minute retry interval is simple but could lead to unnecessary churn if the issue is transient (e.g., Fly.io cold-start). Exponential backoff (2min → 5min → 10min) would be better but adds complexity for marginal benefit at current scale.

---

## 3. User Experience & Interaction Design

### First-Time Journey

```
Landing page → Sign up (Google OAuth via Clerk) → Dashboard → "Connect your Claude account"
→ Open terminal → npx pinchpoint connect → Claude OAuth in browser → Enter 4-digit code
→ Connected → Set schedule in heatmap → Done
```

**Time to value:** ~3-5 minutes for a developer comfortable with CLI tools. This is reasonable for the target audience. Non-developers will not complete this flow.

**The CLI requirement is the biggest friction point.** The user must:
- Have Node.js installed
- Know how to open a terminal
- Run an npx command
- Trust a third-party CLI with their Claude OAuth flow
- Complete a browser-terminal handoff with a verification code

Every step loses users. This is acceptable for a developer tool, but limits growth ceiling.

### Dashboard (Daily Use)

The dashboard shows: StatusPanel (countdown, health, last/next ping) + ScheduleGrid (interactive heatmap) + Controls (pinch now, pause, disconnect, delete).

**StatusPanel assessment:** The live countdown with 1-second tick is effective. Health badges (green/yellow/red) are clear. "Last pinch" with relative time ("5m ago") is good. The `~` prefix for estimated (vs exact) reset times is a nice detail most users won't notice but power users will appreciate.

**ScheduleGrid assessment:** At 790 lines, this is the most complex frontend component. The 24h×7d heatmap with drag-to-move, tap-to-edit, and double-tap-to-toggle is feature-rich. The green/light-green color coding for ping vs window is visually clear.

**ScheduleGrid concerns:**
- **Discoverability:** Drag, single-tap, and double-tap all do different things. There are no visible affordances or tooltips explaining this. A first-time user will likely tap a cell and wonder what happened.
- **No undo:** Accidental changes are saved after 800ms debounce. There's no way to revert.
- **Day toggle confusion:** Single-clicking a day header toggles the entire day on/off. This is destructive (removes all 4 rolls) with no confirmation.
- **Mobile usability:** The grid requires precise touch targets. On a phone, distinguishing between tap, double-tap, and drag on a small cell will be difficult.
- **Accessibility:** No keyboard navigation, no ARIA labels, no screen reader support. The grid is entirely pointer-driven.

### Connect Page

Two modes: with `?session=` param (shows code entry UI) or without (shows CLI instructions). The code entry is a simple 4-digit numeric input with an Approve button. Clear and functional.

**Concern:** If the session expires (5-min TTL) while the user is still fumbling with the CLI, the Connect page doesn't warn them. They'll enter the code, get an error, and need to restart.

### Error States

- Stale data: amber warning "Unable to refresh — data may be stale" with retry button
- Ping failure: red text in StatusPanel, health badge changes
- Disconnect: shows revocation instructions (go to claude.ai/settings)
- No credentials: shows CLI command to connect

**Assessment:** Error states exist but are reactive. The user must check the dashboard to discover problems. There's no proactive notification (email, push, webhook) when pings start failing.

### Landing Page

Current production Landing.jsx: hero ("Start your Claude window exactly when you want it"), 4-step how-it-works, feature cards, footer.

**Assessment:** Clean, on-brand. The value prop is immediately clear. 15 design variants (A-O) exist but aren't routed — a final design needs to be chosen.

---

## 4. Business & Strategic Position

### Product-Market Fit

**The problem is real but narrow.** Claude Pro/Max subscribers who:
1. Have predictable daily schedules (not everyone does)
2. Care enough about window timing to install a tool (power users only)
3. Understand the 5-hour window mechanic (not all subscribers do)
4. Trust a third-party service with their OAuth token (high bar)

This is a subset of a subset. The total addressable market is small — perhaps 5-10% of Claude Pro/Max subscribers, and only a fraction of those will convert.

### Competitive Landscape

**No direct competitors currently exist.** The alternatives are:
- Set a personal alarm and manually open Claude
- Write a cron job with `claude -p "ping"` (requires local machine to be on)
- GitHub Actions workflow (free, ~15 lines of YAML, well-documented)

The GitHub Actions alternative is PinchPoint's most dangerous "competitor" — it's free, requires no trust of a third party, runs on Microsoft's infrastructure, and can be set up in minutes by anyone who can follow a tutorial.

### What PinchPoint Has That a Cron Job Doesn't

1. **Multi-roll scheduling with cascade logic** — non-trivial to implement manually
2. **DST-aware timezone handling** — subtle and error-prone to do yourself
3. **Health monitoring with auto-pause** — prevents burning your window on a broken token
4. **Exact resetsAt tracking** — shows precisely when your window ends
5. **Visual schedule editor** — heatmap grid is genuinely nice UX
6. **Encrypted token storage** — proper crypto, not plaintext in a `.env` file
7. **Zero maintenance** — set and forget, no server to manage

These layers are the defensible part. The ping itself is trivial; the UX and reliability around it are not.

### ToS Exposure

**This is the existential risk.** From Anthropic's legal documentation:

> "Using OAuth tokens obtained through Claude Free, Pro, or Max accounts in any other product, tool, or service — **including the Agent SDK** — is not permitted."

> "Anthropic **does not permit third-party developers** to... route requests through Free, Pro, or Max plan credentials on behalf of their users."

PinchPoint does exactly this. The architecture stores user tokens server-side and executes Agent SDK queries on shared infrastructure on behalf of users.

**Enforcement precedents exist:** OpenClaw (C&D), OpenCode (banned), Roo Code (self-censored), Goose (warned by Anthropic directly).

**Mitigating factors:**
- PinchPoint isn't a Claude Code alternative — it sends one word ("pong") per ping
- Users explicitly opt in and provide their own tokens
- The ping is minimal (not building a competing product on their infra)
- Anthropic's "nothing changes for how customers have been using their account" clarification

**Risk level: MODERATE.** PinchPoint falls squarely in the gray area. It's less aggressive than tools that got C&D'd (those were full IDE replacements), but the legal language is broad enough to cover it. The likely outcomes:
1. **Most likely:** Anthropic ignores PinchPoint (too small to matter)
2. **Possible:** Anthropic adds native scheduling (kills PinchPoint's reason to exist)
3. **Less likely:** Anthropic sends a C&D or revokes OAuth access
4. **Unlikely:** Anthropic bans individual user accounts (PR disaster for them)

### Defensibility

**The core is not defensible.** One HTTP request, well-documented OAuth flow, public client ID. Any developer can build the equivalent in an afternoon.

**What IS defensible:**
- The scheduling intelligence (multi-roll, DST, cascade, midnight wrap)
- The UX layer (heatmap grid, status panel, countdown)
- The reliability layer (health monitoring, auto-pause, encrypted storage)
- User trust and brand (if established)
- Speed to market (first mover in a niche)

**What would create a moat:**
- ~~Multi-provider support~~ — dead; window scheduling is uniquely Claude (GPT has fixed-schedule message caps, Gemini has soft fair-use limits — neither has a triggerable window)
- Community and content (become "the" resource for Claude power users)
- Data insights from aggregated usage patterns (if enough users)
- Notification/webhook ecosystem (integrations that make PinchPoint the center of a Claude workflow)

---

## 5. Monetization & Growth

### Will Users Pay?

**Probably not for the current feature set.** The Strategy & Monetization doc is honest about this:

> "The core is a scheduled HTTP request. Any developer could write a cron job. Users are already paying $20–100/month for Claude. Another $5 feels like a tax on a tax."

The features that might justify payment are: analytics/history, notifications, calendar sync, team coordination. None of these exist yet.

### Recommended Monetization Sequence

**Phase 1: Free launch, prove demand.**
Ship as-is. Validate that people will sign up and connect tokens. Success metric: 100+ active users in 2 months. If this doesn't happen, nothing else matters.

**Phase 2: Build notification + visibility layer.**
Add Slack/Discord/webhook notifications, token expiry warnings. These create stickiness and are the features most likely to justify a paid tier.

**Phase 3: Decide based on signal.**
- If users are engaging daily → freemium ($3-5/mo for notifications + analytics)
- If Anthropic adds native scheduling → pivot to multi-provider dashboard
- If neither → keep as portfolio piece

**Phase 4: B2B only if demand exists.**
Team coordination (stagger windows) is the highest-ARPU path but requires the most investment. Don't build it speculatively.

### Growth Levers

| Lever | Effort | Potential |
|-------|--------|-----------|
| Reddit/HN launch post | Low | High initial spike, need retention |
| Claude community forums | Low | Targeted audience, warm leads |
| Tutorial blog post ("How I schedule my Claude window") | Low | SEO, evergreen |
| GitHub README + stars | Low | Developer trust signal |
| Word of mouth | Zero | Slow but sticky |
| Browser extension (if built) | High | Distribution through Chrome Web Store |

---

## 6. Feature Expansion — What's Actually Worth Building

### What We Now Know Doesn't Work

| Idea | Why It's Dead |
|------|--------------|
| Token usage history (input/output tokens) | The ping sends "pong" — every ping shows the same trivial ~50 input / ~5 output tokens. Useless. |
| Weekly/hourly limit events | Don't fire in practice — confirmed from live testing. Events only trigger near limits, which a minimal ping never approaches. |
| Ping latency tracking | Just bloat. Duration_ms tells you nothing actionable. |
| Usage % progress bars | OAuth tokens can't call the API that returns these headers. Hard limitation. |
| Cumulative usage tracking | No meaningful data to aggregate when every ping is identical. |

### What's Actually Valuable

#### 1. Token Expiry Prediction
**Effort:** Very low (date math in DO)
**Value:** High — prevents surprise disconnects

The DO already knows when the token was connected (stored during `connectComplete`). A 1-year token has a predictable expiry. Add warnings at 30/7/1 days remaining. This is pure date arithmetic — no new API calls, no new infrastructure.

Implementation: Check `tokenConnectedAt + 365 days` on every alarm fire. If within warning threshold, set a `tokenExpiryWarning` field in status. Dashboard shows a banner.

#### 2. Notifications (Slack/Discord/Webhook)
**Effort:** Medium
**Value:** High — the #1 feature power users would want

Users want to know the instant their window opens without checking the dashboard. A Slack message "Your Claude window just opened — resets at 3:07 PM" is more actionable than any dashboard.

Implementation: Store a `webhookUrl` in DO. Fire-and-forget POST on ping success (same pattern as email). JSON payload: `{event: "window_opened", resetsAt, timezone}`. Expand later to failure events, weekly limit warnings, token expiry.

#### 3. Adaptive Scheduling (Pin to Window Reset)
**Effort:** Medium
**Value:** High — directly increases subscription value

Currently: user sets "Monday 9:00 AM" → ping fires at 9:00 AM → window opens → next ping is Tuesday 9:00 AM, regardless of when the window actually resets.

With adaptive scheduling: SDK returns `resetsAt` (e.g., 2:07 PM) → DO schedules an additional ping at 2:08 PM → back-to-back windows, maximizing subscription utilization.

This is a "pin to reset" toggle per roll. When enabled, the system fires an extra ping at the exact `resetsAt` time. This doubles effective window coverage.

Implementation: After successful ping, if `pinToReset` is enabled, schedule an additional alarm at `resetsAt + 60 seconds`. Requires a new `adaptiveAlarm` concept in the DO alongside the regular schedule-based alarm.

#### 4. Browser Extension
**Effort:** High
**Value:** Medium-High — always-visible countdown without opening dashboard

A Chrome/Firefox extension that shows time remaining in the toolbar badge. Polls `/api/status` periodically (or receives a push when window status changes).

This is a distribution channel as much as a feature — Chrome Web Store listing gives visibility to users searching for Claude tools.

#### 5. Hybrid Architecture (Local Execution)
**Effort:** High
**Value:** Strategic — eliminates ToS risk

Move ping execution to the user's machine. Dashboard becomes schedule management + status display only. Token never touches PinchPoint servers.

```
Current:  User → Dashboard → Worker → DO → Fly.io (executes ping with stored token)
Hybrid:   User → Dashboard → Worker → DO (schedule only)
          User's machine → Local agent polls schedule → Executes ping locally
```

This is the safest architecture from a ToS perspective ("nothing changes around how customers have been using their account" — it's local, personal use). But it requires the user's machine to be on at ping time, and adds installation/maintenance friction.

**Possible implementations:**
- Node.js background service (`npx pinchpoint agent` → installs as system service)
- VS Code extension (runs while editor is open)
- Desktop tray app (Electron, but heavy)

#### 6. ~~Multi-Provider Dashboard (Pivot Play)~~ — DEAD

**Research confirmed (2026-02-22):** The 5-hour "starts when you first use it" window is **uniquely Claude**. Other providers don't have an equivalent:

- **ChatGPT Plus/Pro:** Message caps per rolling time period (150 GPT-4o per 3 hours, 100 o3 per week). These refill automatically on fixed schedules regardless of when you use them. Nothing to schedule.
- **Gemini Advanced:** Fair-use soft limits for consumers. No rigid window or lockout mechanic. API has RPM/TPM quotas but those are for developer access, not subscriber plans.

There is nothing to "schedule" on GPT or Gemini — the window-scheduling concept only works because Claude's window is triggered by first use. A multi-provider "rate limit dashboard" would be tracking fundamentally different things on each platform with no unified UX concept.

**If a pivot is needed**, it would have to be a different product entirely (AI subscription cost tracker, usage analytics) rather than extending window scheduling to other providers.

### Prioritized Roadmap

| Priority | Feature | Effort | Impact | Risk |
|----------|---------|--------|--------|------|
| 1 | **Token expiry prediction** | Days | High | None |
| 2 | **Webhook notifications** | 1-2 weeks | High | None |
| 3 | **Adaptive scheduling (pin to reset)** | 1-2 weeks | High | Low |
| 4 | **Choose landing page design** | Days | Medium | None |
| 5 | **npm publish CLI** | Days | Medium | None |
| 6 | **Basic monitoring/alerting** | Days | Medium | None |
| 7 | **Browser extension** | 2-4 weeks | Medium | Low |
| 8 | **Hybrid local execution** | 4-8 weeks | Strategic | Medium |
| ~~9~~ | ~~**Multi-provider dashboard**~~ | — | — | Dead — window scheduling is uniquely Claude; GPT/Gemini have no equivalent mechanic |

---

## 7. Risk Assessment

### Critical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Anthropic adds native window scheduling** | Medium-High | Fatal — product loses reason to exist | No multi-provider pivot available (uniquely Claude mechanic). Build defensible layers (notifications, adaptive scheduling, community) that provide value even if the core ping becomes obsolete. Accept this as the terminal risk. |
| **Anthropic sends C&D or revokes OAuth access** | Low-Medium | Fatal — can't execute pings | Hybrid architecture (local execution) as fallback; keep investment low until demand is proven |

### High Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Small TAM limits growth** | High | No revenue, remains side project | Accept this as default outcome; optimize for learning and reputation over revenue |
| **Fly.io cold-start exceeds timeout** | Medium | First ping of day fires 2 min late | Monitor; consider `min_machines_running: 1` ($2/mo) if it becomes a real problem |
| **No monitoring catches silent failures** | Medium | All users affected before anyone notices | Add basic health check: cron that pings `/api/health` and Fly.io `/health`, alerts on failure |

### Medium Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Agent SDK breaking changes** | Medium | Pings fail until updated | Pin SDK version; test upgrades before deploying |
| **Clerk free tier exceeded** | Low | $25/mo cost | Only triggers at 10K MAU — a good problem to have |
| **DST causes 1-hour ping drift** | Low (2x/year) | Minor timing inaccuracy | Current ±1h retry logic handles most cases; document known behavior |

### Low Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Token compromise via infrastructure** | Very Low | Individual user's Claude access | Multi-layer encryption, per-user keys, memory clearing |
| **GitHub Actions "competitor"** | Medium | Users choose free alternative | Differentiate on UX, reliability, multi-roll, notifications |

---

## 8. Recommendations

### Immediate (Ship in Days)

1. **Token expiry prediction** — Add `tokenConnectedAt` tracking (may already be implicit in DO state), compute days remaining, show dashboard warning at 30/7/1 days. Pure date math, zero new dependencies.

2. **Choose a landing page design** — 15 variants exist, none are routed. Pick one, apply it, move on. This blocks any public launch.

3. **npm publish the CLI** — `npx pinchpoint connect` needs to actually work from npm. This is the entry point for every user.

4. **Basic health monitoring** — A simple external cron (even a free UptimeRobot check) hitting `/api/health` and Fly.io `/health`. Get alerted before users notice.

### Short-Term (1-4 Weeks)

5. **Webhook notifications** — Store a webhook URL per user. POST on window open (with `resetsAt`), ping failure, and token expiry warning. Start with a generic JSON payload that works with Slack, Discord, or custom endpoints.

6. **Adaptive scheduling** — "Pin to window reset" toggle. After successful ping, schedule an additional alarm at `resetsAt + 60s`. This is the most compelling feature expansion because it directly increases the value of the user's subscription.

7. **ScheduleGrid UX polish** — Add tooltips explaining interactions (drag to move, tap to edit, double-tap to toggle). Add an undo/revert button. Add a confirmation dialog for day toggle off.

### Strategic Decisions

8. **Decide on ToS posture.** Either:
   - **Accept the risk** and ship as a public SaaS (most likely fine at small scale)
   - **Build hybrid architecture** and move execution to user's machine (eliminates risk, adds friction)
   - **Keep it semi-private** — share in communities, don't do a big public launch that attracts Anthropic attention

9. **Decide on monetization timeline.** Either:
   - **Launch free, measure demand, add paid tier later** (recommended)
   - **Launch with freemium from day one** (premature — need to prove demand first)
   - **Never monetize** (portfolio piece and community tool)

10. **Accept Claude-only scope.** Multi-provider pivot is dead — window scheduling is uniquely Claude. GPT has fixed-schedule message caps (150/3hr, refill automatically), Gemini has soft fair-use limits. Neither has a triggerable window to schedule. If Anthropic kills the use case, there's no equivalent product to build on other platforms. Focus on making the Claude experience excellent rather than hedging with a pivot that doesn't exist.

### What NOT to Build

- **Token usage analytics** — ping data is meaningless (same tiny numbers every time)
- **Rate limit dashboards** — can't access the data (OAuth token limitation)
- **Complex billing/subscription system** — premature until demand is proven
- **Mobile app** — the dashboard works in mobile browsers; a native app adds maintenance for no clear benefit
- **AI-powered scheduling suggestions** — over-engineering a simple scheduling tool

---

## Appendix: Key File Reference

| Area | File | Lines | Purpose |
|------|------|-------|---------|
| Router | `worker/src/index.js` | 340 | API routes, CORS, rate limiting, connect flow |
| Auth | `worker/src/auth.js` | 98 | Clerk JWT verification, JWKS caching |
| Crypto | `worker/src/crypto.js` | ~100 | HKDF, AES-256-GCM, HMAC, fingerprinting |
| Validation | `worker/src/validate.js` | 107 | Schedule/timezone validation, normalization |
| Durable Object | `worker/src/user-schedule-do.js` | 518 | State machine, alarms, ping execution |
| Ping Service | `ping-service/index.mjs` | 310 | HMAC verification, SDK execution, serialized queue |
| CLI | `cli/bin/pinchpoint.mjs` | ~230 | OAuth PKCE, verification code, connect flow |
| Dashboard | `web/src/pages/Dashboard.jsx` | 270 | Main UI: status, schedule, controls |
| Schedule Grid | `web/src/components/ScheduleGrid.jsx` | 790 | Interactive heatmap editor |
| Status Panel | `web/src/components/StatusPanel.jsx` | 165 | Countdown, health, ping info |
| Landing | `web/src/pages/Landing.jsx` | 150+ | Production homepage |
| Strategy | `3.1 Design/Strategy & Monetization.md` | 160 | Business analysis |
| ToS Analysis | `2.0 Research/OAuth Flow & ToS Analysis.md` | 278 | Risk levels, enforcement history |
| Feature Research | `3.1 Design/Potential API Features.md` | 409 | SDK data analysis, feature tiers |
