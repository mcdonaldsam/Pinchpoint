# Potential API Features — PinchPoint

**Research date:** 2026-02-21 (updated same day with live test results)
**Scope:** What features we could build now that we have a live Claude OAuth token and the Agent SDK running on every scheduled ping

---

## What We Currently Get from the SDK

Each ping runs `query()` from `@anthropic-ai/claude-agent-sdk` and captures ONE event type:

```json
{
  "type": "rate_limit_event",
  "rate_limit_info": {
    "status": "allowed",
    "resetsAt": 1771657200,
    "rateLimitType": "five_hour",
    "overageStatus": "rejected",
    "overageDisabledReason": "org_level_disabled",
    "isUsingOverage": false
  }
}
```

**Confirmed from Fly.io logs (2026-02-21).** Key observations:
- `usedPercentage` is **NOT present** in the five_hour event — Anthropic doesn't include it
- `overageStatus` / `overageDisabledReason` / `isUsingOverage` are present but informational only
- Weekly events (`weekly_all_models`, `weekly_sonnet`) were NOT emitted during test pings — they only fire when approaching weekly limits (less than 2% of users)
- `resetsAt` is a Unix timestamp in seconds — the exact window reset time ✓

This is the minimum. The SDK emits significantly more data that we currently discard.

---

## Data We're Already Receiving But Ignoring

### 1. Full Result Message (`SDKResultMessage`)

The final `result` event from every `query()` call contains:

```typescript
{
  type: "result",
  subtype: "success",
  total_cost_usd: number,          // Cost of this ping in USD
  duration_ms: number,             // Total wall time
  duration_api_ms: number,         // Time spent in Anthropic API
  num_turns: number,               // Conversation turns
  usage: {
    input_tokens: number,
    output_tokens: number,
    cache_creation_input_tokens: number,
    cache_read_input_tokens: number,
  },
  modelUsage: {
    [modelName: string]: {
      inputTokens: number,
      outputTokens: number,
      cacheReadInputTokens: number,
      cacheCreationInputTokens: number,
      webSearchRequests: number,
      costUSD: number,
      contextWindow: number,
    }
  },
  permission_denials: [],
  errors: [],
}
```

**Cost of capturing this:** Zero — we already iterate through all messages, we just don't save the `result` event.

### 2. Weekly Rate Limit Events

The `rateLimitType` field can also be `"weekly_all_models"` and `"weekly_sonnet"` — not just `"five_hour"`. The weekly events include `resets_at`, `resets_in_seconds`, and `used_percentage`. We currently only save the last `rate_limit_event` we see, which is likely the five-hour one, but weekly limit data may be present in the stream too.

### 3. `accountInfo()` on the Query Object

The `query()` return value has an `accountInfo()` method we never call:

```typescript
{
  email: string,
  organization: string,
  subscriptionType: string,    // Currently returns "Claude API" for all subscription
                               // users (known Anthropic bug, issue #22247)
  tokenSource: string,
  apiKeySource: string,
}
```

**Caveat:** As of early 2026, `subscriptionType` returns `"Claude API"` for Pro and Max users alike — Anthropic hasn't fixed this to return `"Pro"` or `"Max"`. So we can't distinguish subscription tiers from this field yet, but we can confirm the token is alive and associated with a valid account.

### 4. System Init Message

The first message from every `query()` is `{ type: "system", subtype: "init" }` with:

```typescript
{
  model: string,          // e.g. "claude-sonnet-4-6"
  tools: string[],        // Available tools
  permissionMode: string,
  apiKeySource: string,   // "user" | "project" | "org" | "temporary"
}
```

---

## ~~External Rate Limit Headers~~ — CONFIRMED NOT ACCESSIBLE

> **Dead end — confirmed 2026-02-21.** Do not attempt this approach.

These headers (`anthropic-ratelimit-unified-session-used_percentage`, etc.) are returned by `api.anthropic.com` on successful API responses. They require a **regular Anthropic API key** (`sk-ant-api03-...`).

Claude OAuth tokens (`sk-ant-oat01-...`) **cannot make direct API calls**. Anthropic returns HTTP 401 with:

```json
{"type":"error","error":{"type":"authentication_error","message":"OAuth authentication is currently not supported."}}
```

We tested both `Authorization: Bearer <token>` and `x-api-key: <token>` — both return 401. The SDK also runs `claude` as a child process internally, so HTTP interception from the parent process is impossible.

**The headers exist and would work** for regular API key users, but PinchPoint users have Pro/Max subscriptions (OAuth tokens), not API keys. These are completely separate billing systems. A regular API key tracks pay-per-use API tier limits, NOT Pro/Max subscription limits — so even if a user had both, the headers would show the wrong limits.

**Usage % bars cannot be shown with the current architecture. This is a hard limitation.**

---

## Rate Limit System — Full Picture (2025–2026)

There are now **two independent limit layers**:

| Layer | Window | Pro | Max 5x ($100) | Max 20x ($200) |
|-------|--------|-----|----------------|-----------------|
| Session | Rolling 5h | ✓ | ✓ | ✓ |
| Weekly all-models | Rolling 7d | ~40-80h | ~140-280h | ~240-480h |
| Weekly Opus sub-limit | Rolling 7d | Stricter | Stricter | Stricter |

Weekly limits were added August 28, 2025. Less than 2% of users hit them under normal use, but heavy Claude Code users and automation scenarios (like PinchPoint) could approach them.

**The 5-hour window is what PinchPoint manages. Weekly limits are the ceiling above it.**

---

## Feature Ideas

### Tier 1 — Zero-Code-Change: Capture More Data We Already Have

These require only changes to the ping service's result handling and DO storage.

---

#### Feature A: Token Usage History

**What:** Store `input_tokens`, `output_tokens`, `duration_ms` from the `result` event on every ping. Display a history log in the dashboard.

**Why it's valuable:** Users can see the token footprint of each ping and track latency trends.

**Implementation:**
- Ping service: extract `result.usage` and `result.duration_ms` alongside `rateLimitInfo`
- DO: extend `lastPing` storage to include `{ inputTokens, outputTokens, durationMs }`
- Dashboard: show token counts in StatusPanel under "Last pinch"
- DO: keep a rolling history of last 30 pings (lightweight, small data per entry)

**Data already available:** Yes — `result.usage` is in every query result.

**Caveat on `total_cost_usd`:** Pro/Max subscription users are billed by subscription, not per-token. The SDK likely reports `total_cost_usd: 0` for OAuth token sessions (no per-token charge). Token counts (`input_tokens`, `output_tokens`) are still meaningful as usage indicators even with $0 cost.

---

#### Feature B: Cumulative Usage Tracking

**What:** Aggregate weekly token usage across all pings. Show a "This week" usage summary.

**Data:** Each ping's cost/tokens, summed by day and week in DO storage.

**Display options:**
- "This week: 1,240 tokens used across 8 pings ($0.003)"
- Weekly trend chart (sparkline)
- Cost-per-day breakdown

**Why it's valuable:** Users can see the actual "cost" of their window management. Makes PinchPoint feel like a premium tool with real observability.

---

#### Feature C: Weekly Limit Awareness

**What:** Monitor the `weekly_all_models` rate limit event (if emitted) alongside the `five_hour` event. Alert users when they're approaching the weekly ceiling.

**New data to capture:** The SDK may emit `{ rateLimitType: "weekly_all_models", resetsAt }` when approaching weekly limits. `usedPercentage` is NOT present in the `five_hour` event and is unconfirmed for weekly events — Anthropic may or may not include it.

**What we know from testing:**
- Weekly events are NOT emitted during normal pings — they only trigger near the limit
- When they do fire, the structure is likely similar to five_hour (confirmed: no `usedPercentage` in five_hour)
- `resetsAt` (exact reset timestamp) is confirmed present

**Realistic implementation:** Capture weekly events if/when emitted. Store `weeklyResetsAt` in DO. On weekly limit event, email user and offer auto-pause. Cannot show a "67% used" progress bar — that data isn't in the event.

**Automated action:** If weekly event fires (approaching limit), send an email warning. If limit hit (`status: "blocked"`), auto-pause schedule.

**Token health state addition:** Extend the green/yellow/red system to include weekly limit status alongside 5-hour ping health.

---

#### Feature D: Ping Latency Tracking

**What:** Store `duration_ms` and `duration_api_ms` from each ping result. Track how long pings take.

**Why:** Latency spikes could indicate Anthropic infrastructure issues. A sudden jump from 800ms to 5s average ping time is a leading indicator that something is wrong with the user's token or Anthropic's servers.

**Display:** "Last ping: 1.2s" in StatusPanel. Could add a spark graph of recent ping latencies.

---

### Tier 2 — New API Calls: Account Verification Features

These require calling `query.accountInfo()` during the ping or a separate lightweight health-check flow.

---

#### Feature E: Account Info Display

**What:** Call `accountInfo()` once per ping and cache the result. Display account metadata in the dashboard.

**Data available:**
```json
{
  "email": "user@example.com",
  "organization": "...",
  "subscriptionType": "Claude API"  // currently imprecise
}
```

**Display:** Show the connected account's email in StatusPanel. Useful for users who have multiple Claude accounts and want to confirm which one PinchPoint is using.

**Caveat:** `subscriptionType` currently returns `"Claude API"` for all Pro/Max users (Anthropic bug). When Anthropic fixes this, we get free subscription tier detection.

---

#### Feature F: Token Expiry Prediction

**What:** Track consecutive successful pings and the `apiKeySource` from the system init message. OAuth tokens last ~1 year. If we know when the token was first connected (we store this in connect flow), we can warn users at 11 months, 11.5 months, 11.75 months.

**Data source:** `connectTime` (already stored when token is saved) + 365-day offset.

**Alerts:**
- 30 days before expiry: "Your token expires in ~30 days — reconnect to stay uninterrupted"
- 7 days before: Email + dashboard badge
- Day of: Auto-pause + urgent email

**Implementation:** DO stores `tokenConnectedAt`. Alarm checks this on every fire. Dedicated "token age check" computation at alarm time costs ~0 extra tokens.

---

#### Feature G: Pre-Ping Token Verification

**What:** Before the scheduled ping fires, run a zero-cost token validity check (e.g., calling `accountInfo()` directly without a full `query()`). If it fails, skip the real ping, save the error, and email the user — without consuming tokens on a doomed ping attempt.

**Why:** Currently, if a token is revoked or expired, the full ping attempt runs, fails, increments `consecutiveFailures`, and eventually hits red/auto-pause. A pre-check costs nothing and saves the timeout delay.

**Note:** Need to verify if `accountInfo()` can be called without a full `query()` invocation. May require a minimal query to get the Query object.

---

### Tier 3 — Smart Scheduling: Use Usage Data to Optimize Timing

---

#### Feature H: Adaptive Next-Ping Scheduling

**What:** Currently, we schedule the next ping based on the user's fixed schedule (e.g., "Monday 9am"). We already get the exact `resetsAt` timestamp from the SDK. We could use this to adaptively schedule the *next* ping at the optimal time relative to the actual reset.

**Current behavior:** User sets "Monday 9am" → we ping at 9am → window opens → we schedule next ping for Tuesday 9am (regardless of when the window actually resets).

**Improved behavior:** If the SDK says the window resets at 2:07pm today, we could offer an option to also ping at 2:08pm (right when the next window becomes available). This doubles effective usage of the subscription.

**UI:** "Pin to window reset" toggle — fires a follow-up ping at the exact `resetsAt` time automatically.

---

#### Feature I: Usage Pattern Insights

**What:** After 2–4 weeks of pings, surface insights in the dashboard:

- "You ping most on weekdays — consider adding Saturday morning"
- "Your pings are clustered 9am–11am — the window resets around 2pm, so you might want a 2pm ping too"
- "3 of your last 5 pings failed on Monday — is that a connectivity issue?"

**Data source:** Ping history log (Feature A) + schedule data already in DO.

---

#### Feature J: Slack / Webhook Notifications

**What:** Let users configure a webhook URL (Slack, Discord, ntfy, custom). Send a POST on:
- Ping success (window opened) — with `resetsAt` time
- Ping failure
- Token health change (green → yellow → red)
- Weekly limit warning

**Implementation:** Store `webhookUrl` in DO. Fire-and-forget POST in alarm handler (same pattern as email). No external dependency beyond the existing Resend pattern.

**Why:** Power users who have Claude Code in their workflow want to know the instant their window opens. A Slack message "Your Claude window just opened, resets at 3:00pm" is more actionable than checking the dashboard.

---

### Tier 4 — Longer-Term / Speculative

These require more research or depend on Anthropic changes.

---

#### Feature K: Multi-Token Support

**What:** Let users connect multiple Claude accounts and ping them in round-robin or priority order.

**Use case:** Heavy Claude Code users who hit weekly limits could switch to a second account's token while the first resets.

**Complexity:** High — changes the DO storage model significantly, adds account-switching logic.

---

#### Feature L: Public API for Developers

**What:** Expose a read-only API for the user's PinchPoint data. Developers could poll `/api/status` with their own key and integrate "Claude window status" into their tools.

**Data available:** `{ windowActive, resetsAt, paused, nextPing, tokenHealth }`

**Use case:** Claude Code power users who want to write shell scripts or IDE extensions that check "is my window open right now before I start this big task?"

---

#### Feature M: Subscription Tier Detection (Future)

**What:** When Anthropic fixes `subscriptionType` in `accountInfo()` to return `"Pro"` or `"Max"` (issue #22247), automatically detect the user's plan and:
- Adjust displayed weekly limit thresholds
- Surface plan-specific guidance ("You're on Max 20x — you can safely run 2–3 pings per day without approaching weekly limits")
- Offer plan upgrade prompts if user is consistently hitting Pro limits

---

## What We Can Build Right Now (Priority Order)

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| 1 | **Token Usage History** (A) | Low — ping service + DO change | High — real observability |
| 2 | **Ping Latency Tracking** (D) | Low — same change | Medium — health signal |
| 3 | **Weekly Limit Awareness** (C) | Medium — capture new event type | High — prevents surprises |
| 4 | **Account Info Display** (E) | Low — one extra API call | Medium — trust/clarity |
| 5 | **Token Expiry Prediction** (F) | Low — date math in DO | High — prevents disruption |
| 6 | **Cumulative Usage Tracking** (B) | Medium — aggregation logic | High — premium feel |
| 7 | **Webhook Notifications** (J) | Medium — new settings + HTTP call | High — power user feature |
| 8 | **Adaptive Scheduling** (H) | Medium — scheduling logic change | High — core value prop |
| 9 | **Pre-Ping Verification** (G) | Medium — research needed | Medium — reliability |
| 10 | **Usage Insights** (I) | High — data analysis | Medium — engagement |

---

## Immediate Quick Wins (One PR)

The lowest-effort, highest-value change is capturing the `result` event data on every ping:

```javascript
// In ping-service/index.mjs — add to the message iteration loop:
let fiveHourInfo = null
let weeklyInfo = null
let pingResult = null

for await (const msg of conversation) {
  if (msg.type === 'rate_limit_event' && msg.rate_limit_info) {
    if (msg.rate_limit_info.rateLimitType === 'five_hour') {
      fiveHourInfo = msg.rate_limit_info
    } else if (msg.rate_limit_info.rateLimitType === 'weekly_all_models') {
      weeklyInfo = msg.rate_limit_info
    }
  }
  if (msg.type === 'result') {
    pingResult = {
      // Note: total_cost_usd is likely $0 for Pro/Max OAuth users — no per-token billing
      // Still useful to capture: token counts are real usage indicators
      durationMs: msg.duration_ms,
      durationApiMs: msg.duration_api_ms,
      inputTokens: msg.usage?.input_tokens,
      outputTokens: msg.usage?.output_tokens,
      cacheReadTokens: msg.usage?.cache_read_input_tokens,
    }
  }
}

return { success: true, rateLimitInfo: fiveHourInfo, weeklyInfo, pingResult }
```

Then store `pingResult` in DO alongside `lastPing`. Zero extra API calls. Zero extra cost. Immediate access to token usage and latency data per ping.

---

## Sources & References

- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [SDK Cost Tracking Guide](https://platform.claude.com/docs/en/agent-sdk/cost-tracking)
- [Usage and Cost Admin API](https://platform.claude.com/docs/en/api/usage-cost-api)
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits)
- [`accountInfo()` subscriptionType bug — Issue #22247](https://github.com/anthropics/claude-code/issues/22247)
- [Weekly limits announcement — TechCrunch (Aug 2025)](https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/)
- [Claude Code weekly vs 5-hour limits explained](https://usagebar.com/blog/claude-code-weekly-limit-vs-5-hour-lockout)
- [Rate limit header format — Issue #19385](https://github.com/anthropics/claude-code/issues/19385)
- [Agent SDK Python issue — Max plan billing](https://github.com/anthropics/claude-agent-sdk-python/issues/559)
