# PinchPoint — ToS Defensibility Analysis

**Date:** 2026-02-22
**Purpose:** Assess PinchPoint's actual risk profile against Anthropic's Terms of Service enforcement, and make the case that PinchPoint is fundamentally different from the tools that have been targeted.

---

## The Core Argument

PinchPoint is a self-scheduling tool. It helps users start their own 5-hour Claude usage window at a time they choose — something they could do manually by opening Claude and typing "hi" at 9am. PinchPoint automates the alarm clock, not the work.

It does not compete with Claude Code. It does not replace claude.ai. It does not let users exceed, share, sell, or pool their rate limits. It does not cost Anthropic meaningful compute. It is a mechanism for users to help themselves get value from a subscription they're already paying for.

---

## What Anthropic Is Actually Enforcing Against

### The Problem They're Solving: Token Arbitrage

Anthropic's enforcement actions have targeted one specific economic problem: **developers routing heavy compute workloads through flat-rate subscription tokens to avoid per-token API billing.**

A Claude Max subscription costs $200/month flat. The same compute via API keys can exceed $1,000/month. Third-party tools exploited this gap:

> "A single power user on a $200 Max subscription could generate thousands of dollars in compute costs monthly."
> — [Natural 20 coverage](https://natural20.com/coverage/anthropic-banned-openclaw-oauth-claude-code-third-party)

> "Token arbitrage emerged when customers accessed Claude models via subscriptions linked to third-party harnesses because it cost less than doing the same work via API key."
> — [The Register](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)

### What the Enforced Tools Were Doing

| Tool | What It Did | Why Anthropic Cared |
|------|-------------|---------------------|
| **OpenCode** (107K+ GitHub stars) | Full Claude Code alternative IDE; spoofed Claude Code's client identity via HTTP headers | Massive compute routing; header spoofing made requests indistinguishable from official Claude Code |
| **OpenClaw** (formerly Claudebot/Clawdbot) | Claude Code alternative; "Login with Claude" OAuth capture | Compete directly with Claude Code; trademark issue (name too similar to "Claude") |
| **Cline / RooCode** | IDE extensions routing all coding work through subscription tokens | Full workload routing; autonomous agent loops running overnight |
| **Cursor** | IDE with Claude integration via subscription credentials | Enterprise-scale compute on flat-rate subscriptions; employees at xAI and OpenAI using it |

**Common pattern:** These tools captured OAuth tokens and routed **all coding work** — autonomous loops, multi-file refactors, test-fix cycles, hours of continuous agent operation — through subscription credentials. They were full Claude Code replacements consuming $1,000+ worth of compute on a $200 subscription.

### The Technical Enforcement (January 9, 2026)

Anthropic deployed server-side safeguards that blocked subscription OAuth tokens from working outside their official Claude Code CLI. This was targeted at tools **spoofing the Claude Code harness** — sending HTTP headers that made Anthropic's servers believe requests came from the official CLI.

### The ToS Language Update (February 19, 2026)

Anthropic updated their legal documentation:

> "OAuth authentication (used with Free, Pro, and Max plans) is intended exclusively for Claude Code and Claude.ai. Using OAuth tokens obtained through Claude Free, Pro, or Max accounts in any other product, tool, or service — including the Agent SDK — is not permitted."

> "Anthropic does not permit third-party developers to offer Claude.ai login or to route requests through Free, Pro, or Max plan credentials on behalf of their users."

### The Partial Walkback (February 19, 2026)

After community backlash, Anthropic engineer Thariq Shihipar clarified:

> "Apologies, this was a docs clean up we rolled out that's caused some confusion. Nothing is changing about how you can use the Agent SDK and MAX subscriptions!"

> "Nothing changes around how customers have been using their account and Anthropic will not be canceling accounts."

He later added that Anthropic wants to encourage experimentation, but: **"If you're building a business on top of the Agent SDK, you should use an API key instead."**

---

## PinchPoint vs. the Enforced Tools

### Direct Comparison

| Dimension | OpenCode / Cline / OpenClaw | PinchPoint |
|-----------|----------------------------|------------|
| **Purpose** | Replace Claude Code as primary IDE/coding agent | Help users schedule when their own usage window starts |
| **Compute per user per day** | $30-50+ (thousands of tokens, autonomous loops, multi-hour sessions) | < $0.001 (~50 input tokens, ~5 output tokens per ping) |
| **What it sends to Claude** | Full coding workloads: refactors, test suites, debugging sessions, multi-turn conversations | The word "pong" |
| **Relationship to Claude Code** | Direct competitor / replacement | Complementary — users still use Claude Code for actual work |
| **Revenue model** | Platform for doing real work on subscription tokens | Free tool (donation-supported at most) |
| **Token arbitrage** | Yes — $200 subscription for $1,000+ of compute | No — each ping costs fractions of a cent |
| **HTTP spoofing** | Some tools spoofed Claude Code client headers | No — uses official Agent SDK as intended |
| **Rate limit impact** | Users consuming full session allocations through third-party tools | Minimal — one trivial message per ping |
| **User's subscription value** | Consumed by the third-party tool | Consumed by the user themselves, after PinchPoint opens the window |
| **Overnight autonomous loops** | Yes — long-running agents burning tokens 24/7 | No — sends "pong" once, done in under 2 seconds |
| **Does it replace any Anthropic product?** | Yes — replaces Claude Code and/or claude.ai | No — it's a scheduler; the user still uses Claude Code/claude.ai for all actual work |

### The Economic Argument

Anthropic's enforcement is economically motivated. As The Register reported, the company's concern is tools that make subscription tokens "deeply unprofitable" by routing industrial-scale compute through flat-rate plans.

**PinchPoint's compute footprint per ping:**
- Input tokens: ~50 (system prompt + "Reply with just the word pong")
- Output tokens: ~5 ("pong")
- Wall time: ~1-2 seconds
- Anthropic's cost to serve: fractions of a cent

**PinchPoint's compute footprint per user per day (4 rolls):**
- ~200 input tokens, ~20 output tokens
- Less than a single human message in a real Claude conversation

PinchPoint does not create token arbitrage. The compute cost to Anthropic is negligible. The subscription value ($20-200/month) is consumed entirely by the user through their normal Claude Code and claude.ai usage — PinchPoint just helps them control *when* that consumption starts.

### The Competitive Argument

Every tool that received enforcement action was a **direct competitor** to Claude Code or claude.ai. They provided an alternative interface for doing the same work — coding, conversation, agent execution — that Anthropic's own products provide.

PinchPoint does not compete with any Anthropic product. There is no Anthropic product that lets you schedule your window start time. PinchPoint fills a gap in Anthropic's offering; it doesn't replace any part of their offering.

If anything, PinchPoint **helps Anthropic** by:
- Reducing subscription churn (users get more value from what they're paying for)
- Not cannibalizing claude.ai or Claude Code usage (all real work still goes through Anthropic's products)
- Not enabling abuse, sharing, or pooling of rate limits

### The "Self-Scheduling" Framing

What PinchPoint does is functionally identical to a user setting a phone alarm for 9:00 AM that says "open Claude now." The only difference is that PinchPoint also opens Claude for them — by sending a single trivial message.

The user could achieve the exact same result by:
1. Setting a recurring alarm on their phone
2. Opening Claude Code at the alarm time
3. Typing "hi"

PinchPoint automates step 2 and 3. It doesn't automate any actual work. The user's 5-hour window starts, and then *they* use it — through Claude Code, through claude.ai, however they normally would. PinchPoint's job is done after the ping.

---

## Where PinchPoint Technically Touches the ToS

Being honest about what the ToS language covers:

### 1. "Using OAuth tokens... in any other product, tool, or service — including the Agent SDK"

**PinchPoint does use the Agent SDK with an OAuth token.** This is a factual match with the prohibition language. The question is whether Anthropic would enforce this against a tool that:
- Sends 50 tokens per request (not 50,000)
- Runs once per scheduled time (not continuously)
- Doesn't do any actual work (just triggers a window)
- Costs Anthropic nothing meaningful

### 2. "Route requests through Free, Pro, or Max plan credentials on behalf of their users"

**PinchPoint does route a request through user credentials on a server.** The user provides their token, and PinchPoint's server uses it to make a request the user could have made themselves.

### 3. "Access the Services through automated or non-human means"

**PinchPoint is automated.** The ping fires on a schedule without human interaction. This is technically covered.

### What the ToS Does NOT Cover

The language doesn't distinguish based on:
- Volume of requests (one vs. thousands)
- Compute consumed (negligible vs. industrial)
- Purpose (scheduling vs. full workload replacement)
- Revenue model (free vs. commercial)
- Competitive relationship (complementary vs. competitor)

This is by design — broad language gives Anthropic maximum enforcement discretion. But broad language also means they can choose *not* to enforce.

---

## The Enforcement Calculus

Anthropic's enforcement decisions are driven by practical factors, not just legal text:

### Factors That Reduce Enforcement Risk

| Factor | Details |
|--------|---------|
| **Negligible compute cost** | ~50 tokens per ping. Anthropic spends more serving a single human "hello" message on claude.ai. |
| **Not competitive** | PinchPoint doesn't replace any Anthropic product. No Anthropic product does window scheduling. |
| **No token arbitrage** | No one is getting $1,000 of compute for $200. The subscription value is consumed by the user through normal Anthropic products. |
| **Not spoofing anything** | Uses the official Agent SDK. No header manipulation, no client ID spoofing, no pretending to be Claude Code. |
| **User-initiated, user-consented** | Users explicitly connect their own token through a multi-step verification flow. PinchPoint doesn't scrape, phish, or intercept tokens. |
| **Complements the subscription** | Helps users get more value from their existing subscription → reduces churn → good for Anthropic. |
| **Not monetized** | No revenue from Anthropic's infrastructure. Free tool, donations at most. |
| **Tiny scale** | Not a 107K-star GitHub project with enterprise adoption. Small user base, niche tool. |
| **PR downside for Anthropic** | "Anthropic C&D's free community alarm clock tool" is a worse headline than "Anthropic stops IDE that spoofed their client headers." |

### Factors That Increase Enforcement Risk

| Factor | Details |
|--------|---------|
| **Technically matches ToS language** | Agent SDK + OAuth token + server-side execution = technically prohibited regardless of scale or intent. |
| **Server-side token storage** | Token leaves user's machine and is stored/used on PinchPoint infrastructure — closer to "third-party service routing requests" than personal use. |
| **Broad enforcement precedent** | If Anthropic decides to enforce uniformly rather than case-by-case, PinchPoint is covered. |
| **Visibility risk** | If PinchPoint becomes popular enough to be visible, it becomes a target regardless of harmlessness. |

---

## Analogies That Work in PinchPoint's Favor

### The Alarm Clock Analogy
PinchPoint is to Claude what a smart alarm clock is to a coffee machine. The alarm clock turns on the coffee machine at 6:00 AM. It doesn't make coffee — it just starts the machine. The coffee (Claude usage) is still consumed by the user, one cup at a time, throughout their morning.

Anthropic isn't threatened by alarm clocks. They're threatened by tools that drink all the coffee.

### The DVR Analogy
PinchPoint is like a DVR that records the first second of a TV show to "start" your viewing window. You still watch the show yourself. The DVR doesn't watch the show for you, share your subscription with others, or let you watch more than you're paying for.

The tools Anthropic enforced against were like illegal cable splitters — letting dozens of people watch simultaneously on one subscription.

### The Gym Analogy
PinchPoint is like scheduling an automatic gym check-in at 6:00 AM so your day pass starts when you want it. You still do the workout yourself. The tool doesn't compete with the gym, doesn't let you bring extra people, and doesn't cost the gym anything beyond the check-in.

---

## Anthropic's Own Words — In PinchPoint's Favor

### Thariq Shihipar's Clarification

> "Nothing is changing about how you can use the Agent SDK and MAX subscriptions!"

PinchPoint uses the Agent SDK with a Max/Pro subscription. If "nothing is changing," PinchPoint's use case (minimal SDK query for scheduling) falls within what's tolerated.

> "If you're building a business on top of the Agent SDK, you should use an API key instead."

PinchPoint is not building a business. It's a free tool. The guidance is about commercial products, not community utilities.

### "Nothing Changes Around How Customers Have Been Using Their Account"

PinchPoint doesn't change how the customer uses their account. Their Claude Code usage, their claude.ai conversations, their rate limits — all unchanged. PinchPoint just controls *when* the 5-hour window starts. The user's relationship with Anthropic's products is completely unaffected.

### The Setup-Token Precedent

Anthropic officially provides `setup-token` for headless/CI environments. It generates a 1-year token explicitly designed for automation — Docker containers, GitHub Actions, CI/CD pipelines. The documented use case is: "a machine runs Claude on a schedule, using your token."

PinchPoint does exactly this, just on shared infrastructure instead of the user's own CI pipeline. The token is the same, the OAuth flow is the same, the Agent SDK call is the same. The only difference is whose server it runs on.

---

## Risk Summary

| Scenario | Likelihood | What Happens |
|----------|-----------|--------------|
| **Anthropic ignores PinchPoint** | High (~70%) | Too small, too harmless, not worth enforcement resources |
| **Anthropic adds native window scheduling** | Medium (~20%) | PinchPoint becomes unnecessary; no enforcement needed |
| **Anthropic contacts PinchPoint informally** | Low (~8%) | "Please stop" or "please move to local execution." Comply immediately. |
| **Anthropic sends formal C&D** | Very Low (~2%) | Shut down server-side execution, pivot to hybrid/local architecture |
| **Anthropic bans individual user accounts** | Extremely Low (<1%) | PR disaster for Anthropic; contradicts "nothing changes" statement; users just scheduled their window |

### Why User Account Bans Are Nearly Impossible

Banning a user for using PinchPoint would mean:
1. Banning someone for starting their own Claude session at a scheduled time
2. Something they could do manually with a phone alarm
3. Something Anthropic's own `setup-token` is designed to enable (in CI/CD)
4. After Anthropic explicitly said "nothing changes around how customers have been using their account"
5. With zero economic damage to Anthropic (negligible compute)

This would be indefensible PR. Anthropic's enforcement has been targeted at tools causing real economic harm (thousands of dollars in compute arbitrage). Banning users of a scheduling tool that sends "pong" would undermine their community goodwill for no measurable benefit.

---

## If Contact Happens — How to Respond

If Anthropic ever reaches out, the response is straightforward and honest:

1. **Explain what PinchPoint does:** "We help users schedule when their 5-hour window starts. We send the word 'pong' once at a time they choose. That's it."

2. **Show the compute:** "Each ping is ~50 input tokens, ~5 output tokens. Less than a single human 'hello' on claude.ai."

3. **Show the intent:** "We don't compete with Claude Code or claude.ai. Users do all their real work through your products. We're an alarm clock, not a replacement."

4. **Show willingness to comply:** "If you'd like us to move execution to users' machines (hybrid architecture), we can do that. We've already designed the architecture for it."

5. **Don't argue the legal text.** The ToS technically covers PinchPoint. Acknowledge that. The argument isn't "we don't violate the ToS" — it's "we're harmless, we're complementary, and enforcement would cost you more goodwill than it's worth."

---

## Recommendation

**Ship as-is.** The risk profile is low given PinchPoint's minimal compute footprint, non-competitive nature, free pricing, and small scale. The tools that received enforcement were fundamentally different — they were IDE replacements routing $1,000+ of compute through $200 subscriptions.

**Keep the hybrid architecture design ready** as a fallback. If Anthropic contacts you, move execution to users' machines within a week. This eliminates the "server-side token storage" concern entirely.

**Don't monetize.** Stay free/donation-only. This removes the "building a business on top of the Agent SDK" concern that Thariq specifically called out.

**Don't make noise.** A quiet community tool with 50 users will never attract enforcement attention. A ProductHunt launch with "we hack Claude's rate limits!" will.

**Frame it correctly from day one.** In all public-facing copy (landing page, README, security page), describe PinchPoint as a "self-scheduling tool" that "helps you start your Claude window when you want it." Never say "bypass," "hack," "exploit," or "unlimited." The framing matters.

---

## Sources

- [Anthropic Legal and Compliance — Claude Code Docs](https://code.claude.com/docs/en/legal-and-compliance)
- [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)
- [Anthropic — Updates to Consumer Terms](https://www.anthropic.com/news/updates-to-our-consumer-terms)
- [Anthropic Banned OpenClaw: The OAuth Lockdown — Natural 20](https://natural20.com/coverage/anthropic-banned-openclaw-oauth-claude-code-third-party)
- [OpenClaw Blog: Anthropic Banned Third-Party Tools](https://openclaw.rocks/blog/anthropic-oauth-ban)
- [Anthropic clarifies ban on third-party tool access — The Register](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)
- [Anthropic cracks down on unauthorized Claude usage — VentureBeat](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses)
- [Anthropic Bans Claude Subscription OAuth in Third-Party Apps — WinBuzzer](https://winbuzzer.com/2026/02/19/anthropic-bans-claude-subscription-oauth-in-third-party-apps-xcxwbn/)
- [You can still use your Claude accounts to run OpenClaw — The New Stack](https://thenewstack.io/anthropic-agent-sdk-confusion/)
- [Roo Code Issue #4799 — OAuth support declined](https://github.com/RooCodeInc/Roo-Code/issues/4799)
- [Goose Issue #3647 — Anthropic OAuth login](https://github.com/block/goose/issues/3647)
- [Claude Code Authentication Docs](https://code.claude.com/docs/en/authentication)
- [Anthropic Rate Limits Explained — Portkey](https://portkey.ai/blog/claude-code-limits/)
- [HN Discussion: Anthropic officially bans subscription auth for third party use](https://news.ycombinator.com/item?id=47069299)
