# PinchPoint — Architecture & Strategy Review Plan

**Date:** 2026-02-22
**Scope:** Full-stack architecture assessment, business strategy evaluation, feature expansion analysis
**Status:** Deployed and live at pinchpoint.dev

---

## Purpose

This review assesses PinchPoint's architecture fitness, product strategy, user experience, and expansion opportunities. The goal is to identify strengths, weaknesses, and a prioritized roadmap for what to build next — grounded in what the codebase and research already tell us is possible.

---

## Section 1: System Architecture Assessment

### What We're Evaluating

The split architecture: **Cloudflare Workers** (API + routing) → **Durable Objects** (per-user state + scheduling) → **Fly.io** (ping execution via Agent SDK).

### Key Questions

- **Why this split?** The Agent SDK spawns `claude` as a child process — requires full Node.js with `child_process` support. Cloudflare Workers' `nodejs_compat` has a non-functional `child_process` stub only. Fly.io provides the full runtime.
- **Why DOs over KV + cron?** KV `list()` caps at 1,000 keys per call, is eventually consistent (60s propagation), and scanning all users every minute hits the 30s CPU limit. DOs give per-user isolation, strong consistency, and alarm-based scheduling with zero fan-out.
- **What's the cold-start cost?** Fly.io machines are configured with `auto_stop_machines: stop` and `auto_start_machines: true`, `min_machines_running: 0`. First ping after idle period incurs cold-start latency.
- **Where does it break?** Free tier ceilings — Cloudflare (100K req/day, 5GB DO storage), Fly.io (3 shared VMs), Clerk (10K MAU), Resend (100 emails/day).
- **Single points of failure?** Fly.io ping service is the only execution path. If it's down, all pings fail.

### Files to Reference

| File | What It Tells Us |
|------|-----------------|
| `3.0 Build/3.2 Host/worker/wrangler.toml` | DO bindings, KV bindings, vars, cron config |
| `3.0 Build/3.2 Host/ping-service/fly.toml` | Fly.io config: region, scaling, health checks |
| `3.0 Build/3.2 Host/ping-service/Dockerfile` | Node 22-slim, non-root, pre-cached CLI |
| `2.0 Research/Cloud Automation Options.md` | 5 approaches evaluated, why this one was chosen |

---

## Section 2: Data Flow & Operational Mechanics

### What We're Evaluating

Every operational flow from the user's perspective, tracing data through the full stack.

### Flows to Trace

**Flow A — First Connection (CLI → OAuth → Dashboard)**
1. `npx pinchpoint connect` → CLI does own PKCE OAuth → gets 1-year token
2. CLI generates token fingerprint + 4-digit verification code + SHA-256 hash
3. CLI calls `POST /api/connect/start` with fingerprint + codeHash → gets sessionId
4. CLI opens browser to `pinchpoint.dev/connect?session={id}`
5. User enters code in dashboard → `POST /api/connect/approve` verifies hash
6. CLI polls `GET /api/connect/poll` → sees "approved"
7. CLI calls `POST /api/connect/complete` with plaintext token → server encrypts with HKDF → stores in DO
8. Session consumed (deleted from KV)

**Flow B — Scheduled Ping Execution**
1. DO alarm fires at scheduled time
2. `executePing()`: decrypt token (HKDF) → re-encrypt for transit → HMAC sign with nonce
3. `POST https://pinchpoint-ping.fly.dev/ping` (25s timeout)
4. Ping service: verify HMAC → check nonce → decrypt token → run Agent SDK `query()` → extract `SDKRateLimitEvent`
5. Return `{success, rateLimitInfo}` → DO updates state → schedules next alarm

**Flow C — Multi-Roll Scheduling**
- 4 rolls per day, 5h apart. Roll 1 is anchor (user-set), rolls 2-4 cascade.
- Midnight wrap: if roll N's time < roll 1's time, belongs to next calendar day.
- DST handling: `buildTargetDate()` builds UTC target, retries ±1h if DST boundary crossed.

**Flow D — Failure & Recovery**
- 1-2 failures: retry in 2 min
- 3+ failures: yellow health, still retrying
- 5+ failures: red health, auto-pause (stops retrying)
- User unpauses: resets to green, reschedules

### Key Questions

- Is the 25s ping timeout sufficient? (Workers have 30s CPU limit)
- How accurate is DST handling in practice? (spring-forward can cause ±1h drift)
- What happens if Fly.io cold-starts take >25s?
- Is the retry interval (fixed 2 min) appropriate, or should it back off?

### Files to Reference

| File | What It Tells Us |
|------|-----------------|
| `3.0 Build/3.2 Host/worker/src/index.js` | Router, connect flow, rate limiting |
| `3.0 Build/3.2 Host/worker/src/user-schedule-do.js` | DO state, alarms, ping execution, health machine |
| `3.0 Build/3.2 Host/worker/src/validate.js` | Schedule validation, multi-roll normalization |
| `3.0 Build/3.2 Host/ping-service/index.mjs` | HMAC verification, token decryption, SDK execution |
| `3.0 Build/3.2 Host/cli/bin/pinchpoint.mjs` | CLI OAuth flow, verification code |
| `2.0 Research/Token Lifecycle & Refresh Strategy.md` | Why 1-year token, why own OAuth flow |

---

## Section 3: User Experience & Interaction Design

### What We're Evaluating

How real users experience PinchPoint — from first visit to daily use.

### User Journeys to Assess

**Journey 1: First-Time User**
1. Lands on `pinchpoint.dev` → sees Landing page
2. Signs up via Clerk (Google OAuth)
3. Redirected to Dashboard → sees "Connect your Claude account"
4. Opens terminal → runs `npx pinchpoint connect`
5. Browser opens Claude OAuth → clicks Authorize
6. Browser redirects to PinchPoint Connect page → enters 4-digit code
7. Dashboard shows connected status → sets schedule in heatmap grid

**Journey 2: Returning User**
1. Opens Dashboard → sees StatusPanel (countdown, health, last/next ping)
2. May adjust schedule (drag rolls, toggle days)
3. May use "Pinch now" for manual test
4. Checks if pings are working (green/yellow/red health)

### UX Assessment Areas

| Area | Questions |
|------|-----------|
| **ScheduleGrid** (790 lines) | Is the heatmap intuitive? Can users understand multi-roll? Is drag-to-move discoverable? |
| **StatusPanel** | Is the countdown useful? Is health status clear? |
| **Connect flow** | Is CLI requirement a friction wall? Is the 4-digit code confusing? |
| **Error states** | What does the user see when pings fail? Is recovery obvious? |
| **Mobile** | Is the heatmap usable on phone? Touch targets adequate? |
| **Accessibility** | Keyboard navigation? Screen reader support? Color contrast? |
| **Onboarding** | Does the landing page explain the value prop clearly? |
| **Information architecture** | Is the nav structure logical? Can users find what they need? |

### Files to Reference

| File | What It Tells Us |
|------|-----------------|
| `web/src/pages/Landing.jsx` | Current production landing page |
| `web/src/pages/Dashboard.jsx` | Main app: status, schedule, controls |
| `web/src/components/ScheduleGrid.jsx` | Interactive 24h×7d heatmap editor |
| `web/src/components/StatusPanel.jsx` | Countdown timer, health badge, ping info |
| `web/src/pages/Connect.jsx` | OAuth approval with code entry |
| `web/src/App.jsx` | Routing, auth guards |

---

## Section 4: Business & Strategic Position

### What We're Evaluating

PinchPoint's viability as a product and business.

### Key Questions

| Question | Where to Find the Answer |
|----------|------------------------|
| Who needs this? | `Strategy & Monetization.md` — TAM analysis |
| How big is the market? | Claude Pro/Max subscribers who use Claude Code with predictable daily schedules |
| What's the competitive landscape? | `OAuth Flow & ToS Analysis.md` — enforcement precedents |
| Can Anthropic kill this? | Yes — by adding native window scheduling or enforcing ToS |
| Is the core defensible? | No — one HTTP request, any developer could replicate the ping |
| What IS defensible? | UX, scheduling intelligence, analytics layer, multi-provider expansion |
| What's the market window? | Until Anthropic acts (could be months or years) |

### Competitive & Enforcement History

| Tool | What Happened | Relevance |
|------|--------------|-----------|
| OpenClaw (Claudebot) | Cease-and-desist from Anthropic | Direct precedent |
| OpenCode | Reportedly banned from OAuth access | Direct precedent |
| Roo Code | Closed OAuth feature after ToS review | Self-censored |
| Goose | Maintainer confirmed account ban risks | Community warning |
| General (Jan 2026) | Anthropic "tightened safeguards against spoofing Claude Code harness" | Ongoing enforcement |

### PinchPoint's Specific Exposure

- Uses Agent SDK (called out in ToS)
- Stores tokens server-side and executes on behalf of users
- Does NOT replicate OAuth (lower risk than OpenClaw/OpenCode)
- Creates independent OAuth grant (doesn't interfere with user's Claude Code)

### Files to Reference

| File | What It Tells Us |
|------|-----------------|
| `3.0 Build/3.1 Design/Strategy & Monetization.md` | TAM, 5 monetization paths, tiered features |
| `2.0 Research/OAuth Flow & ToS Analysis.md` | Risk levels, enforcement precedents, legal quotes |
| `2.0 Research/Claude Code Internal API.md` | What works and doesn't with OAuth tokens |

---

## Section 5: Monetization & Growth Paths

### What We're Evaluating

How PinchPoint could generate revenue and grow its user base.

### Current Cost Structure

| Component | Provider | Free Tier Limit | Cost After |
|-----------|----------|----------------|------------|
| API + routing | Cloudflare Workers | 100K req/day | $5/mo + usage |
| Per-user state | Durable Objects | 100K req/day, 5GB | $5/mo + usage |
| Ping execution | Fly.io | 3 shared VMs | ~$2/mo per VM |
| Auth | Clerk | 10K MAU | $25/mo |
| Email | Resend | 100/day | $20/mo |
| **Total today** | | | **$0/month** |

### Revenue Models to Evaluate

| Model | Pros | Cons | Viability |
|-------|------|------|-----------|
| **Stay free** | Portfolio piece, reputation | No revenue | Good for learning |
| **Freemium** | Revenue if demand exists | Small market, churn risk | $500-2k MRR if works |
| **B2B / Teams** | Highest ARPU, per-seat | Hardest to build, smallest market | Best if demand exists |
| **Platform play** | Bigger market (multi-provider) | Harder to build, different product | Best long-term hedge |

### Feature Gating Opportunities

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Basic scheduling (1 roll/day) | Yes | — |
| Multi-roll (4/day) | — | Yes |
| Usage analytics | — | Yes |
| Webhook notifications | — | Yes |
| Team coordination | — | Yes |
| Priority support | — | Yes |

### Files to Reference

| File | What It Tells Us |
|------|-----------------|
| `3.0 Build/3.1 Design/Strategy & Monetization.md` | 5 monetization paths ranked |
| `3.0 Build/3.1 Design/Multi-Roll Schedule & Email Cleanup.md` | Multi-roll as differentiator |

---

## Section 6: Feature Expansion Opportunities

### What We're Evaluating

What can be built next — prioritized by effort, impact, and what the research tells us is technically possible.

### Tier 0: Already Available — Zero New API Calls

The Agent SDK already returns data we're not capturing. From `Potential API Features.md`:

| Data Point | Source | Current Status |
|-----------|--------|---------------|
| `input_tokens`, `output_tokens` | `result` event | Ignored |
| `duration_ms`, `total_cost_usd` | `result` event | Ignored |
| Weekly rate limit events | `SDKRateLimitEvent` | Only capturing `five_hour` |
| Account info (email, subscription) | `accountInfo()` method | Not called |
| Model, available tools | System init message | Ignored |

**One PR could enable:** token usage history, ping latency tracking, weekly limit awareness.

### Tier 1: Near-Term (Days to Weeks)

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Token expiry prediction** | Low | High | 1-year token, warn at 30/7/1 days remaining |
| **Adaptive scheduling** | Low | High | Use exact `resetsAt` timestamp instead of fixed schedule |
| **Usage history dashboard** | Medium | High | Store + display captured SDK data |
| **Email notifications** | Low | Medium | Already have Resend; add failure alerts |

### Tier 2: Medium-Term (Weeks to Months)

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Slack/Discord notifications** | Medium | High | Webhook-based, popular with dev users |
| **Webhooks/API** | Medium | High | Zapier/Make integration for power users |
| **Calendar sync** | High | Medium | Google Calendar/Outlook — auto-adjust schedule |
| **Browser extension** | High | Medium | Countdown badge on claude.ai |
| **Smart scheduling** | High | Medium | Learn patterns, auto-optimize timing |

### Tier 3: Long-Term / Pivot Options

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Multi-provider dashboard** | Very High | Very High | Claude + ChatGPT + Gemini rate limits |
| **AI Subscription Optimizer** | Very High | Very High | Track spending/usage across 3+ tools |
| **B2B team coordination** | High | High | Stagger windows for always-active coverage |

### Hard Limitations (Cannot Build)

| Feature | Why Not |
|---------|---------|
| Usage % progress bars | Requires API keys (`sk-ant-api03-`), OAuth tokens return 401 |
| Real-time rate limit monitoring | No streaming endpoint for rate limit data |
| Token refresh automation | 1-year tokens, no refresh needed (by design) |

### Files to Reference

| File | What It Tells Us |
|------|-----------------|
| `3.0 Build/3.1 Design/Potential API Features.md` | 10 tiered features, SDK data already available |
| `3.0 Build/3.1 Design/Strategy & Monetization.md` | Feature roadmap by tier |
| `2.0 Research/Claude Code Internal API.md` | What's technically possible vs blocked |
| `2.0 Research/Token Lifecycle & Refresh Strategy.md` | Token types, lifetime, refresh mechanics |

---

## Section 7: Risk Assessment

### Categories

**Technical Risks**
- Fly.io cold-start latency exceeding 25s timeout
- DST edge cases causing missed or double pings
- Cloudflare DO alarm drift at scale
- Free tier exhaustion with growth
- Agent SDK breaking changes

**Business Risks**
- Anthropic adds native window scheduling (kills the product)
- ToS enforcement escalation (cease-and-desist or OAuth revocation)
- Small TAM limits growth ceiling
- User churn from annual re-authorization friction

**Operational Risks**
- No monitoring/alerting (pings could fail silently for all users)
- No secret rotation procedures documented
- No backup strategy for DO storage
- Single-region Fly.io deployment (IAD only)

**Strategic Risks**
- Building features on a potentially temporary market window
- Investing in B2B before proving individual demand
- Multi-provider pivot requires fundamentally different architecture

---

## Section 8: Recommendations & Roadmap

The review report will synthesize all findings into:

1. **Immediate Wins** — Things that can ship in days with minimal effort
2. **Short-Term Improvements** — 1-4 week investments that materially improve the product
3. **Strategic Decisions** — Binary choices that affect the product's direction
4. **Prioritized "Build Next" List** — Ranked by effort × impact × risk

---

## Methodology

- Trace every user-facing flow through the code
- Cross-reference implementation against research documents
- Evaluate each feature idea against technical feasibility and ToS constraints
- Rate risks as Critical / High / Medium / Low
- Ground all recommendations in specific code files and research findings
