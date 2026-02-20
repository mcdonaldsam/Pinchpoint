# Cloud-Based Automation of Claude's 5-Hour Usage Window

> Research conducted 2026-02-19

## Background: How the 5-Hour Window Works

The 5-hour rolling window starts the moment you send your first message — not at any fixed clock time. If you send a message at 2 PM, your window resets at 7 PM. The goal is to trigger this window early (e.g., 4 AM) so it resets by the time you actually start working (e.g., 9 AM). A simple `claude -p "Hi"` is confirmed to trigger the window start.

Sources: [Hacker News thread](https://news.ycombinator.com/item?id=44763619), [Avoiding 5-hour limits](https://harishgarg.com/how-i-avoid-hitting-claude-code-5-hour-limits-early), [Usagebar: 5-hour lockout explained](https://usagebar.com/blog/claude-code-weekly-limit-vs-5-hour-lockout)

---

## Option 1: Cloud Browser Automation (Browserbase, Browserless, etc.)

**Concept:** Use a cloud-hosted headless browser to navigate to claude.ai, authenticate with session cookies, and send a single message through the web UI.

### Services & Pricing

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| **Browserbase** | 1 browser hour/month, 1 concurrent | $20/mo Hobby (100 hrs), $99/mo Startup (500 hrs) | [Pricing](https://www.browserbase.com/pricing) |
| **Browserless** | 1,000 units (each = 30s) | $50/mo Starter, $200/mo Scale | [Pricing](https://www.browserless.io/pricing) |
| **Cloudflare Browser Rendering** | 10 min/day free, 3 concurrent | $0.09/hr beyond 10 hrs/mo on paid Workers plan | [Pricing](https://developers.cloudflare.com/browser-rendering/pricing/) |

### Evaluation

- **Feasibility:** LOW. Maintaining auth (cookies expire/rotate), handling CAPTCHAs, navigating React SPA.
- **Cost:** Free tiers sufficient for 1 daily interaction (~30 seconds).
- **Complexity:** HIGH. Fragile browser automation + cookie management system.
- **Reliability:** VERY LOW. Anthropic regularly updates claude.ai frontend. Any DOM change breaks scripts.
- **ToS Risk:** **CRITICAL.** Consumer ToS Section 3(7) explicitly prohibits "accessing the Services through automated or non-human means, whether through a bot, script, or otherwise."

---

## Option 2: Claude Code CLI in a Docker Container

**Concept:** Run `claude -p "ping"` inside a Docker container on a cloud platform, authenticating with `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`.

### Authentication

1. Run `claude setup-token` locally — opens browser, authenticates, outputs a long-lived OAuth token valid for **~1 year**.
2. Set `CLAUDE_CODE_OAUTH_TOKEN` environment variable in the container.
3. Run `claude -p "Hi"` in non-interactive mode.

### Platform Costs

| Platform | Free/Cheapest Tier | Notes |
|----------|-------------------|-------|
| **Fly.io** | ~$5/mo credit (3 containers) | Shared 256MB instance ~$0.003/hr |
| **Railway** | 30-day trial ($5 credit), then $5/mo Hobby | Pay-per-minute billing |
| **AWS Lambda** | 1M free requests/mo, 400k GB-seconds | Container image support |
| **Google Cloud Run** | 2M free requests/mo, 180k vCPU-seconds | Similar to Lambda |

### Existing Docker Solutions

- [cabinlab/claude-code-sdk-docker](https://github.com/cabinlab/claude-code-sdk-docker)
- [tintinweb/claude-code-container](https://github.com/tintinweb/claude-code-container)
- [nezhar/claude-container](https://github.com/nezhar/claude-container)

### Evaluation

- **Feasibility:** HIGH. Well-documented, working approach.
- **Cost:** Effectively FREE on AWS Lambda/Cloud Run free tiers.
- **Complexity:** MODERATE. Dockerfile + cron trigger + env var secret.
- **Reliability:** GOOD. Official CLI, token valid ~1 year.
- **ToS Risk:** **LOW-MODERATE.** Using Anthropic's own CLI with your own credentials.

---

## Option 3: GitHub Actions with Scheduled Workflow

**Concept:** Use a GitHub Actions cron workflow to run `claude -p "ping"` on a schedule.

### Implementation

```yaml
name: Trigger Claude Window
on:
  schedule:
    - cron: "0 4 * * *"  # 4 AM UTC daily
  workflow_dispatch: {}

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
      - name: Ping Claude
        env:
          CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
        run: claude -p "Hi"
```

**Note:** The official `claude-code-action` has a [P1 bug](https://github.com/anthropics/claude-code-action/issues/814) with cron-triggered workflows. Direct CLI installation approach above avoids this.

Also see: [Claude Code Action with OAuth](https://github.com/marketplace/actions/claude-code-action-with-oauth) (community fork with OAuth + refresh token support).

### Cost

GitHub Free: 2,000 minutes/month. A single ~1-minute workflow daily = ~30 min/month. Well within free tier.

### Evaluation

- **Feasibility:** MODERATE-HIGH.
- **Cost:** FREE.
- **Complexity:** LOW. ~15 lines of YAML.
- **Reliability:** MODERATE. Token lasts ~1 year from `setup-token`.
- **ToS Risk:** **LOW-MODERATE.**

---

## Option 4: Claude Agent SDK

**Concept:** Use the Claude Agent SDK with `CLAUDE_CODE_OAUTH_TOKEN` to send a message programmatically.

### Current Status

Available in [TypeScript](https://github.com/anthropics/claude-agent-sdk-typescript) and [Python](https://github.com/anthropics/claude-agent-sdk-python).

Setting `CLAUDE_CODE_OAUTH_TOKEN` allows the Agent SDK to use Pro/Max subscription billing. Confirmed in [Issue #559](https://github.com/anthropics/claude-agent-sdk-python/issues/559) (CLOSED/COMPLETED). Demo: [weidwonder/claude_agent_sdk_oauth_demo](https://github.com/weidwonder/claude_agent_sdk_oauth_demo).

### Code Example (TypeScript)

```typescript
import { ClaudeAgent } from '@anthropic-ai/claude-agent-sdk'
// CLAUDE_CODE_OAUTH_TOKEN set in environment
const agent = new ClaudeAgent()
const response = await agent.query("Hi")
```

### Code Example (Python)

```python
from claude_agent_sdk import ClaudeAgent
# CLAUDE_CODE_OAUTH_TOKEN set in environment
agent = ClaudeAgent()
response = agent.query("Hi")
```

### Evaluation

- **Feasibility:** HIGH. Confirmed working with OAuth tokens.
- **Cost:** FREE on serverless free tiers.
- **Complexity:** LOW. ~5-10 lines of code.
- **Reliability:** MODERATE. Undocumented auth path, could change.
- **ToS Risk:** **MODERATE.** Official SDK with undocumented auth path.

---

## Option 5: Puppeteer/Playwright on Serverless

Same fundamental problems as Option 1 (web scraping) but on serverless platforms. **Avoid** — ToS violation, technically fragile, complex packaging constraints.

---

## Comparative Summary

| Criterion | 1. Cloud Browser | 2. Docker + CLI | 3. GitHub Actions | 4. Agent SDK | 5. Serverless Puppeteer |
|-----------|-----------------|-----------------|-------------------|-------------|------------------------|
| **Feasibility** | Low | **High** | **Moderate-High** | **High** | Low |
| **Cost** | Free possible | Free possible | **Free** | Free possible | Free possible |
| **Complexity** | High | Moderate | **Low** | **Low** | High |
| **Reliability** | Very Low | **Good** | Moderate | Moderate | Very Low |
| **ToS Risk** | CRITICAL | **Low-Moderate** | **Low-Moderate** | Moderate | CRITICAL |

---

## Recommendations

### Best Overall: GitHub Actions (Direct CLI + OAuth Token)

- Free, ~15 lines of YAML, official CLI, token lasts ~1 year.

### Runner-Up: Agent SDK on Serverless

- Best if you want more control or a SaaS product (not per-user GitHub repo).

### Avoid: Browser Automation (Options 1 & 5)

- ToS violation, fragile, complex. Anthropic actively enforcing since Jan 2026.

### ToS Nuance

Claude Code CLI and Agent SDK are official Anthropic products. The ToS prohibition on "automated access through bots or scripts" targets the claude.ai web interface, not CLI/SDK. However, using automation to game window timing is not an intended use case and Anthropic could view it unfavorably.

Sources: [Anthropic Consumer ToS](https://privacy.claude.com/en/articles/9264813-consumer-terms-of-service-updates), [VentureBeat: Anthropic crackdown](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses), [Claude Code auth docs](https://code.claude.com/docs/en/authentication)

---

## Final Architecture (Chosen — 2026-02-20)

**Approach:** Option 4 (Agent SDK) deployed on Fly.io, orchestrated by Cloudflare Workers + Durable Objects.

| Component | Platform | Cost |
|-----------|----------|------|
| API + routing | Cloudflare Workers (free) | $0 |
| Per-user scheduling | Cloudflare Durable Objects (free — 100K req/day, 5GB) | $0 |
| Connect sessions | Cloudflare KV (free) | $0 |
| Ping execution | Fly.io (free — 3 shared VMs) | $0 |
| Frontend | Cloudflare Workers + static assets (free) | $0 |
| Auth | Clerk (free — 10K MAU) | $0 |
| Email | Resend (free — 100 emails/day) | $0 |
| **Total** | | **$0/month** |

**Key finding:** Cloudflare added Durable Objects to the free tier (previously required $5/mo Workers Paid plan). This makes the entire stack completely free. Fly.io chosen over Google Cloud Run for simpler setup (`fly launch` vs full GCP project configuration).

**Scaling headroom on free tiers:**
- DO: 100K requests/day → supports ~50K+ users (2 req/user/day for alarm + status)
- Fly.io: 3 VMs with 256MB each → handles hundreds of concurrent pings
- KV: 1K writes/day → sufficient for connect sessions
- Clerk: 10K monthly active users
- Resend: 100 emails/day → ~100 daily active users before upgrade needed
