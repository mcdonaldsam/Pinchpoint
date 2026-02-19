# Claude Code Internal API Research

> Research conducted 2026-02-19 (partial — agent stopped early)

## Key Question

How does Claude Code CLI actually communicate with Anthropic's servers when using a Pro/Max subscription (OAuth token)?

## What We Know

### Direct API Fails

Our spike test confirmed:
- `api.anthropic.com/v1/messages` with Bearer auth → 401 "OAuth authentication is currently not supported"
- `api.anthropic.com/v1/messages` with x-api-key header → 401 "invalid x-api-key"
- `api.claude.ai/v1/messages` → connection error (not a valid endpoint)
- Token refresh at `console.anthropic.com/api/oauth/token` → 404

### OAuth Token Structure

From `~/.claude/.credentials.json`:
- `claudeAiOauth.accessToken` — format: `sk-ant-oat01-...` (OAuth Access Token)
- `claudeAiOauth.refreshToken` — format: `sk-ant-ort01-...` (OAuth Refresh Token)
- `claudeAiOauth.expiresAt` — timestamp in ms (~8 hours from generation)
- `claudeAiOauth.subscriptionType` — e.g., "max"
- `claudeAiOauth.rateLimitTier` — e.g., "default_claude_max_5x"
- `claudeAiOauth.scopes` — `["user:inference", "user:mcp_servers", "user:profile", "user:sessions:claude_code"]`

### How the SDK/CLI Handles It

Claude Code and the Agent SDK use `CLAUDE_CODE_OAUTH_TOKEN` env var. Internally, they route through a different mechanism than the public API:
- The SDK spawns a subprocess or uses an internal client that handles the OAuth routing
- The exact internal endpoint is not publicly documented
- [Issue #6536](https://github.com/anthropics/claude-code/issues/6536) — user tried SDK with long-lived token, got "Invalid API key" initially
- [Issue #6058](https://github.com/anthropics/claude-code/issues/6058) — "Anthropic API Authentication Error: OAuth Not Supported"
- [Issue #8938](https://github.com/anthropics/claude-code/issues/8938) — setup-token wasn't sufficient for headless auth

### Working Approaches

1. **Claude Code CLI** — `claude -p "ping"` with `CLAUDE_CODE_OAUTH_TOKEN` set. The CLI handles all internal routing. Works reliably.

2. **Agent SDK** — `@anthropic-ai/claude-agent-sdk` (npm) or `claude-agent-sdk` (pip). Uses the same internal routing as the CLI. Confirmed working in [Issue #559](https://github.com/anthropics/claude-agent-sdk-python/issues/559) and [demo repo](https://github.com/weidwonder/claude_agent_sdk_oauth_demo).

3. **Claude Max API Proxy** — [atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy): "Use your Claude Max/Pro subscription with any OpenAI-compatible client." This project reverse-engineers the internal routing to expose a standard API interface.

### LLM Gateway Support

Claude Code supports [LLM gateway configurations](https://code.claude.com/docs/en/llm-gateway) that must expose the Anthropic Messages API format at `/v1/messages`. This suggests the CLI ultimately does hit a `/v1/messages` endpoint, but with additional authentication headers/routing that the OAuth token provides through the SDK layer.

### `claude setup-token`

Generates a long-lived token (~1 year) specifically for headless/CI usage:
- Documented in [Claude Code auth docs](https://code.claude.com/docs/en/authentication)
- Designed for GitHub Actions, Docker containers, CI/CD pipelines
- Sets `CLAUDE_CODE_OAUTH_TOKEN` env var

### Recent Issues (Jan-Feb 2026)

- [Issue #23703](https://github.com/anthropics/claude-code/issues/23703) — "setup-token is now only requesting user interface scope" — possible scope reduction
- [Issue #23568](https://github.com/anthropics/claude-code/issues/23568) — "Auth broken in all IDE extensions since 2.1.32" — auth changes are actively happening
- Anthropic crackdown on unauthorized harnesses (Jan 2026) — targeting tools that spoof Claude Code client headers

## Conclusion

The public API (`api.anthropic.com/v1/messages`) explicitly rejects OAuth tokens. The working path is through the Claude Code CLI or Agent SDK, which handle internal routing transparently. For PinchPoint, use the Agent SDK or CLI — don't try to replicate the internal auth mechanism directly.
