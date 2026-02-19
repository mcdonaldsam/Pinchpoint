# OAuth Flow & Terms of Service Analysis

> Research conducted 2026-02-19

## Key Question

Can PinchPoint replicate the Claude Code OAuth flow to streamline user onboarding? And more broadly, does PinchPoint's architecture (storing and using tokens on behalf of users) comply with Anthropic's Terms of Service?

---

## Part 1: The OAuth Flow (Technical)

### What `claude setup-token` actually does

When a user runs `claude setup-token`, the CLI performs a standard **OAuth 2.0 Authorization Code flow with PKCE**. Extracted from `@anthropic-ai/claude-code` v2.1.47 source (`cli.js`):

**Step 1 — Generate PKCE parameters:**
```javascript
codeVerifier  = crypto.randomBytes(32).toString('base64url')
codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
state         = crypto.randomBytes(32).toString('base64url')
```

**Step 2 — Open browser to authorization URL:**
```
https://claude.ai/oauth/authorize?
  code=true
  &client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e
  &response_type=code
  &redirect_uri=http://localhost:{PORT}/callback
  &scope=user:profile user:inference user:sessions:claude_code user:mcp_servers
  &code_challenge={code_challenge}
  &code_challenge_method=S256
  &state={state}
```

The user sees a consent screen: "Claude Code would like to connect to your Claude chat account."

**Step 3 — User clicks Authorize, browser redirects to localhost:**
```
http://localhost:{PORT}/callback?code={AUTH_CODE}&state={STATE}
```

**Step 4 — CLI exchanges auth code for tokens:**
```
POST https://platform.claude.com/v1/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "{AUTH_CODE}",
  "redirect_uri": "http://localhost:{PORT}/callback",
  "client_id": "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  "code_verifier": "{CODE_VERIFIER}",
  "state": "{STATE}"
}
```

**Response:** `{ access_token, refresh_token, expires_in, scope }`

**Step 5 — Token refresh (when access token expires):**
```
POST https://platform.claude.com/v1/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "{REFRESH_TOKEN}",
  "client_id": "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  "scope": "user:profile user:inference user:sessions:claude_code user:mcp_servers"
}
```

### Key details

| Detail | Value |
|--------|-------|
| **Client ID** | `9d1c250a-e61b-44d9-88ed-5944d1962f5e` |
| **Client type** | Public (PKCE only, no client_secret) |
| **Authorization URL** | `https://claude.ai/oauth/authorize` |
| **Token URL** | `https://platform.claude.com/v1/oauth/token` |
| **Redirect URIs** | `http://localhost:{PORT}/callback` (dynamic port) or `https://platform.claude.com/oauth/code/callback` (manual flow) |
| **Scopes** | `user:profile`, `user:inference`, `user:sessions:claude_code`, `user:mcp_servers` |
| **Access token format** | `sk-ant-oat01-...` |
| **Refresh token format** | `sk-ant-ort01-...` |
| **Access token lifetime** | ~8 hours |
| **Long-lived token lifetime** | ~1 year (from `setup-token`) |

### Domain migration note

The source code references `platform.claude.com` for token endpoints. Earlier documentation and libraries used `console.anthropic.com`. Anthropic appears to have migrated domains. Our earlier spike (`test-refresh.mjs`) failed because it used the old URL (`console.anthropic.com/api/oauth/token`) and wrong client ID (`claude-code` instead of the UUID).

### Could PinchPoint replicate this flow?

**Technically: yes.** It's a public PKCE client with no secret. localhost redirect URIs with dynamic ports are supported. We could build an identical flow into our CLI tool. The user would see the same "Authorize" screen and never need Claude Code installed.

**But we shouldn't.** See Part 2.

---

## Part 2: Terms of Service Analysis

### The explicit prohibition

From Anthropic's [Legal and Compliance documentation](https://code.claude.com/docs/en/legal-and-compliance):

> **OAuth authentication** (used with Free, Pro, and Max plans) is intended exclusively for Claude Code and Claude.ai. Using OAuth tokens obtained through Claude Free, Pro, or Max accounts in any other product, tool, or service — **including the Agent SDK** — is not permitted and constitutes a violation of the Consumer Terms of Service.

> Anthropic **does not permit third-party developers** to offer Claude.ai login or to **route requests through Free, Pro, or Max plan credentials on behalf of their users.**

> Anthropic reserves the right to take measures to enforce these restrictions and may do so **without prior notice.**

From the [Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms):

> Except when you are accessing our Services via an Anthropic API Key or where we otherwise explicitly permit it, [you may not] access the Services through automated or non-human means, whether through a bot, script, or otherwise.

### Enforcement precedents

Anthropic is actively enforcing these terms:

| Project | What happened |
|---------|--------------|
| **OpenClaw** (formerly Claudebot) | Received cease-and-desist from Anthropic |
| **OpenCode** | Reportedly banned from OAuth access |
| **Roo Code** ([Issue #4799](https://github.com/RooCodeInc/Roo-Code/issues/4799)) | Considered implementing OAuth, closed as "not planned" after reviewing ToS |
| **Goose** ([Issue #3647](https://github.com/block/goose/issues/3647)) | Maintainer confirmed with Anthropic that using the OAuth flow is not permitted, with account ban risks |
| **General crackdown (Jan 2026)** | Anthropic "tightened safeguards against spoofing the Claude Code harness" — [VentureBeat coverage](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses) |

### The partial walkback

After community backlash, Anthropic posted a [clarification](https://www.anthropic.com/news/updates-to-our-consumer-terms):

> "Nothing changes around how customers have been using their account."

They called the documentation update "a clarification of existing language." However, the legal text remains unchanged, and the distinction appears to be:

- **Tolerated:** Individual users running tools locally for personal use (their own token, their own machine)
- **Not tolerated:** Third-party SaaS products routing requests through user credentials

---

## Part 3: What This Means for PinchPoint

### Three levels of risk

| Approach | Description | ToS Risk | Enforcement Risk |
|----------|-------------|----------|------------------|
| **1. Replicate the OAuth flow** | PinchPoint CLI uses Claude's client_id to authorize users directly | **HIGH** | Explicitly banned. Active enforcement against similar projects. |
| **2. Store and use tokens server-side (current architecture)** | Users paste their `setup-token` result, PinchPoint stores it encrypted and uses it from Cloud Run | **MODERATE** | "Route requests through Pro/Max credentials on behalf of users" — this is us. Gray area since user provides their own token. |
| **3. Fully local execution** | Users run everything on their own machine. Token never leaves their computer. | **LOW** | "Nothing changes around how customers have been using their account." Individual local use is tolerated. |

### PinchPoint's specific exposure

The current SaaS architecture has two points of friction with the ToS:

1. **"Including the Agent SDK"** — We use the Agent SDK on Cloud Run to send pings. The ToS explicitly calls this out.

2. **"Route requests... on behalf of their users"** — We store a user's token, then a server (not the user's machine) uses that token to make a request. This is the exact pattern Anthropic prohibits.

The fact that users voluntarily provide their own tokens and the ping is tiny (one word) doesn't change the legal framing.

### What about `setup-token` being official?

`setup-token` generates a long-lived token designed for CI/CD, GitHub Actions, Docker containers, etc. Anthropic [documents this](https://code.claude.com/docs/en/authentication) as an official feature for headless environments.

The gray area: Anthropic envisions the user running their own CI pipeline with their own token on their own infrastructure. PinchPoint is a third-party service collecting tokens from many users and executing on shared infrastructure. These are different.

---

## Part 4: Paths Forward

### Path A: Ship as-is (accept the risk)

Keep the current architecture. Users paste their own tokens. PinchPoint stores and uses them on Cloud Run.

**Pros:**
- Simplest path to launch
- Users explicitly opt in
- Token is encrypted at rest
- Many similar tools operate in this gray area

**Cons:**
- Technically violates ToS language
- Anthropic could shut down user accounts without notice
- Anthropic could send a C&D to PinchPoint
- Reputational risk if users get banned

**Risk assessment:** Moderate. Anthropic's enforcement has targeted tools that act as "Claude Code alternatives" (IDEs, coding agents). PinchPoint isn't competing with Claude Code — it's sending one word per day. But the ToS language is broad enough to cover us.

### Path B: Make it fully local

Ship a desktop app, system service, or local cron job that runs on the user's own machine. The token never leaves their computer.

**Implementation options:**

| Option | How it works | Complexity |
|--------|-------------|------------|
| **Electron app** | Desktop app with tray icon, runs Agent SDK locally, built-in scheduler | High |
| **Node.js system service** | `npx pinchpoint install` → installs as systemd/launchd/Windows service | Moderate |
| **Local cron + script** | User adds a cron job that runs `claude -p "ping"` | Low (but manual) |
| **VS Code extension** | Extension that runs the ping on a schedule while VS Code is open | Moderate |

**Pros:**
- Clearly within tolerated use (personal, local, own token)
- No server costs
- No token storage liability

**Cons:**
- User's computer must be on at the scheduled time
- No dashboard (or dashboard is display-only, status comes from local sync)
- Harder to build, distribute, and support across OS platforms
- Loses the "set it and forget it" server-side reliability

### Path C: Hybrid approach

Dashboard for scheduling and status, but actual ping execution happens on the user's machine.

1. User signs up on pinchpoint.dev, sets schedule
2. User installs a local agent (`npx pinchpoint agent`)
3. Local agent polls pinchpoint.dev for schedule changes
4. At scheduled time, local agent runs the ping using the user's own token
5. Local agent reports results back to dashboard

**Pros:**
- Token never leaves the user's machine
- Dashboard UX is preserved
- Server only stores schedule + results, never tokens
- Clearly within tolerated use

**Cons:**
- Requires user to keep a process running (or install a service)
- If user's machine is asleep/off, ping doesn't happen
- More moving parts than a pure SaaS

### Path D: Wait for official API access

Anthropic may eventually offer Pro/Max users API access through official channels. Some signals:
- The Agent SDK exists and supports OAuth tokens (even if the ToS says not to use it this way)
- `setup-token` is designed for automation use cases
- Community pressure for API access to Pro/Max tiers is significant
- Anthropic's partial walkback suggests internal debate

**Pros:** Would make PinchPoint fully legitimate
**Cons:** Could be months or never

### Path E: Use API keys instead of Pro/Max subscriptions

Pivot to serving users who have Anthropic API keys (pay-per-use) rather than Pro/Max subscriptions. API keys are explicitly supported for programmatic access.

**Problem:** Defeats the purpose. PinchPoint exists because Pro/Max users have a 5-hour window they want to optimize. API users don't have this constraint.

---

## Recommendation

**For MVP / personal use:** Path A is fine. Ship it, use it yourself, share with friends. The risk to individual users is very low given Anthropic's "nothing changes" clarification.

**For a public SaaS product:** Path C (hybrid) is the safest architecture that preserves the product vision. The dashboard handles scheduling and display; the user's own machine handles execution. Tokens never touch your servers.

**What to avoid:** Replicating the OAuth flow (Path 1 in the risk table). This is the most explicitly prohibited action and the one Anthropic is most actively enforcing.

---

## Sources

- [Anthropic Legal and Compliance — Claude Code Docs](https://code.claude.com/docs/en/legal-and-compliance)
- [Anthropic Authentication — Claude Code Docs](https://code.claude.com/docs/en/authentication)
- [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms)
- [Anthropic Consumer Terms Update (clarification)](https://www.anthropic.com/news/updates-to-our-consumer-terms)
- [VentureBeat — Anthropic cracks down on unauthorized Claude usage](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses)
- [TheNewStack — Anthropic Agent SDK confusion](https://thenewstack.io/anthropic-agent-sdk-confusion/)
- [DevGenius — Breaking Claude's ToS](https://blog.devgenius.io/you-might-be-breaking-claudes-tos-without-knowing-it-228fcecc168c)
- [Roo Code Issue #4799 — OAuth support declined](https://github.com/RooCodeInc/Roo-Code/issues/4799)
- [Goose Issue #3647 — Anthropic OAuth login](https://github.com/block/goose/issues/3647)
- [claude-code-login (community reimplementation)](https://github.com/grll/claude-code-login)
- [anthropic-auth Rust library](https://github.com/querymt/anthropic-auth)
- [Claude Code CLI source — cli.js v2.1.47](https://www.npmjs.com/package/@anthropic-ai/claude-code)
