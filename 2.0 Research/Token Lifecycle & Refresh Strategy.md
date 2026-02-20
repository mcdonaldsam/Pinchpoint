# Token Lifecycle & Refresh Strategy

> Research conducted 2026-02-21, following first scheduled ping failure (expired OAuth token)
> **Updated 2026-02-21** — corrected `setup-token` findings after deeper source code analysis

## Background

PinchPoint's first real scheduled ping (6:00am AEST, 2026-02-21) failed after three infrastructure bugs were fixed. The root cause was an **expired OAuth access token**. This document records the full investigation into Claude Code's token mechanics, the approaches considered, and the architectural decision made.

---

## Part 1: The Incident

### What happened

1. User ran `npx pinchpoint connect` on 2026-02-19, linking their Claude account
2. The CLI read the access token from `~/.claude/.credentials.json` and stored it (encrypted) in the Durable Object
3. A ping was scheduled for 6:00am AEST on 2026-02-21
4. When the alarm fired, the ping service attempted to use the token
5. The Claude Agent SDK returned: **"OAuth token has expired. Please obtain a new token or refresh your existing token."**

### Root cause

The token in `~/.claude/.credentials.json` was from `claude login` (interactive login), which produces an **~8-hour access token**. The CLI should have obtained a **1-year token** via the `setup-token` flow instead.

CLAUDE.md correctly stated that `setup-token` produces ~1-year tokens, but the CLI was reading an existing `claude login` token rather than performing its own OAuth flow with a 1-year expiry.

### Evidence

Inspecting `~/.claude/.credentials.json` at the time of investigation:

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",     // OAuth Access Token
    "refreshToken": "sk-ant-ort01-...",     // OAuth Refresh Token
    "expiresAt": 1771650759875,            // ~8 hours from last refresh
    "scopes": ["user:profile", "user:inference", "user:sessions:claude_code", "user:mcp_servers"],
    "subscriptionType": "pro",
    "rateLimitTier": "pro"
  }
}
```

The `expiresAt` field converts to an ~8-hour window — this is a `claude login` token, **not** a `setup-token` token.

---

## Part 2: Token Mechanics (from Source Code Analysis)

All details below were extracted by analyzing the actual Claude Code source files:
- `@anthropic-ai/claude-agent-sdk/cli.js` (v2.1.47, ~11.5MB minified)
- `@anthropic-ai/claude-agent-sdk/sdk.mjs`

### Token Types

| Token Type | Prefix | Lifetime | Source |
|------------|--------|----------|--------|
| **OAuth Access Token (login)** | `sk-ant-oat01-` | ~8 hours | `claude login` (interactive) |
| **OAuth Access Token (setup-token)** | `sk-ant-oat01-` | **~1 year** | `claude setup-token` (requests `expires_in: 31536000`) |
| **OAuth Refresh Token** | `sk-ant-ort01-` | Unknown (long-lived) | Returned alongside access token |
| **API Key (Console)** | `sk-ant-...` | Permanent | `create_api_key` endpoint (Console/API users only) |

The critical distinction: **`claude login` and `claude setup-token` both do OAuth, but `setup-token` requests a 1-year expiry from the server and the server honors it.**

### Production OAuth Configuration

Extracted from the CLI source (production config object `u4A`):

```javascript
{
  BASE_API_URL: "https://api.anthropic.com",
  TOKEN_URL: "https://platform.claude.com/v1/oauth/token",
  API_KEY_URL: "https://api.anthropic.com/api/oauth/claude_cli/create_api_key",
  CLIENT_ID: "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
}
```

Additional config extracted:

```javascript
// Scopes
var wx = "user:inference";                    // inference-only scope
var Nh1 = [wx, "user:profile", ...];         // full scope list for refresh
var g4A = [...];                             // all scopes for login
var V1K = ["org:create_api_key", "user:profile"];  // console scopes

// Approved custom OAuth URLs
var k1K = [...];  // whitelist for CLAUDE_CODE_CUSTOM_OAUTH_URL
```

**Important domain note:** The token endpoint is `platform.claude.com`, NOT `console.anthropic.com`. Our earlier spike (`test-refresh.mjs`) failed because it used the old domain. Anthropic migrated domains at some point; older documentation and libraries still reference the old URL.

### The Token Exchange (Authorization Code → Tokens)

The token exchange function (deobfuscated from `g_A` in `cli.js`):

```javascript
async function exchangeAuthCode(authCode, state, codeVerifier, port, isManual, expiresIn) {
  const payload = {
    grant_type: "authorization_code",
    code: authCode,
    redirect_uri: isManual
      ? "https://platform.claude.com/oauth/code/callback"
      : `http://localhost:${port}/callback`,
    client_id: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
    code_verifier: codeVerifier,
    state: state
  };

  // KEY: setup-token passes expires_in = 31536000 (1 year)
  if (expiresIn !== undefined) payload.expires_in = expiresIn;

  const response = await axios.post(
    "https://platform.claude.com/v1/oauth/token",
    payload,
    { headers: { "Content-Type": "application/json" } }
  );

  return response.data;
  // Returns: { access_token, refresh_token, expires_in, scope }
}
```

**The `expires_in` parameter is a client-side request that the server honors.** When `setup-token` passes `31536000` (1 year in seconds), the server issues a token valid for that duration.

### The `setup-token` Flow (Complete)

Extracted from the `ConsoleOAuthFlow` React component (`q96`) in `cli.js`:

```javascript
// setup-token mode configuration
{
  inferenceOnly: mode === "setup-token",           // only user:inference scope
  expiresIn: mode === "setup-token" ? 31536000 : undefined  // 1 YEAR
}
```

The full flow:

1. **Performs standard OAuth 2.0 Authorization Code + PKCE flow** — opens browser, user clicks Authorize
2. **Exchanges auth code for tokens** with `expires_in: 31536000` (1 year) and `inferenceOnly: true`
3. **Does NOT save to `~/.claude/.credentials.json`** — displays the token in terminal for copy-paste
4. **Does NOT call `create_api_key`** — returns the OAuth access token directly

Key source code proof:
```javascript
if (K === "setup-token")
  J({state: "success", token: u.accessToken});  // Just display token
else {
  let Q = K76(u);  // K76 = save to credentials file
  // ... rest of login flow
}
```

For `setup-token`, the credentials file is NOT modified. The token is shown to the user and that's it. This means **`setup-token` creates an independent OAuth grant that doesn't interfere with the user's existing `claude login` session.**

### The `create_api_key` Endpoint (Console Users Only)

The `create_api_key` endpoint is **NOT** called by `setup-token`. It's only called during regular `claude login` when the user authenticates via the Anthropic Console (API billing) rather than Claude.ai (subscription):

```javascript
// Only called when scopes DON'T include inference (Console login path)
else if (
  J({state: "creating_api_key"}),
  await Et6(u.accessToken).catch(...)   // Et6 = createApiKey
) {
  // Save API key, mark success
}
```

```javascript
async function createApiKey(accessToken) {
  const response = await axios.post(
    "https://api.anthropic.com/api/oauth/claude_cli/create_api_key",
    null,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const rawKey = response.data?.raw_key;
  if (rawKey) {
    await saveApiKey(rawKey);
    return rawKey;
  }
  return null;
}
```

This is irrelevant for PinchPoint — our users are Pro/Max subscribers who log in via Claude.ai, not the Anthropic Console.

### The Refresh Flow

The token refresh function (deobfuscated from `F_A` in `cli.js`):

```javascript
async function refreshOAuthToken(refreshToken) {
  const payload = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
    scope: "user:profile user:inference user:sessions:claude_code user:mcp_servers"
  };

  const response = await axios.post(
    "https://platform.claude.com/v1/oauth/token",
    payload,
    { headers: { "Content-Type": "application/json" } }
  );

  const {
    access_token,
    refresh_token: newRefreshToken = refreshToken,  // defaults to old if not returned
    expires_in
  } = response.data;

  const expiresAt = Date.now() + expires_in * 1000;

  // Save to ~/.claude/.credentials.json
  saveCredentials({ accessToken: access_token, refreshToken: newRefreshToken, expiresAt });

  return { accessToken: access_token, refreshToken: newRefreshToken, expiresAt };
}
```

Key observations:
1. **Standard OAuth 2.0 refresh grant** — nothing proprietary
2. **Default fallback for refresh token** — if the server doesn't return a new refresh token, the old one is reused (`refresh_token: newRefreshToken = refreshToken`)
3. **`expires_in` is in seconds** — multiplied by 1000 for milliseconds
4. **The refresh endpoint does NOT accept a custom `expires_in`** — only the initial token exchange does. Refreshed tokens get the server's default (~8 hours).

### Proactive Refresh Timing

Claude Code proactively refreshes tokens **5 minutes before expiry**:

```javascript
function isTokenExpiringSoon(expiresAt) {
  const bufferMs = 300000; // 5 minutes
  return Date.now() + bufferMs >= expiresAt;
}
```

This means Claude Code checks on every API call whether the token needs refreshing. Users rarely see expired tokens because the CLI handles renewal transparently.

### File Locking During Refresh

Claude Code uses file-level locking on the credentials directory during refresh to prevent race conditions when multiple Claude Code instances are running locally:

```javascript
// Simplified from source
await acquireFileLock('~/.claude/');
try {
  const tokens = await refreshOAuthToken(currentRefreshToken);
  await writeCredentialsFile(tokens);
} finally {
  await releaseFileLock('~/.claude/');
}
```

This prevents two local Claude Code processes from refreshing with the same refresh token simultaneously.

### Refresh Token Rotation

Claude's OAuth server uses **refresh token rotation** — each time you use a refresh token, the server issues a new one and invalidates the old one.

Confirmed by:
- **GitHub Issue #24317** — Users reported that after one instance refreshed, another instance's refresh token became invalid
- **GitHub Issue #22600** — Titled "[Bug] OAuth refresh token race condition in multi-instance scenarios" — explicitly describes Instance A refreshing → Instance B's old refresh token rejected
- **Source code fallback** — The `newRefreshToken = refreshToken` default suggests the server *usually* returns a new refresh token but may not always
- **General OAuth 2.0 best practice** — Rotating refresh tokens is the recommended pattern for public clients (no client secret)

**Important nuance:** Refresh token rotation only affects tokens **from the same OAuth grant**. Independent OAuth authorizations (different logins) produce independent refresh tokens that don't interfere with each other. See Part 3.

### How `CLAUDE_CODE_OAUTH_TOKEN` Is Used

When the Agent SDK (or CLI) receives a token via the `CLAUDE_CODE_OAUTH_TOKEN` environment variable:

```javascript
function getAuthSource() {
  if (process.env.ANTHROPIC_AUTH_TOKEN)
    return { source: "ANTHROPIC_AUTH_TOKEN", hasToken: true };
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN)
    return { source: "CLAUDE_CODE_OAUTH_TOKEN", hasToken: true };
  // ... file descriptor, API key helper, credentials file
}
```

The token is used as-is as a Bearer token. **No refresh is attempted** for env var tokens — the SDK assumes the caller manages token lifecycle. This is the correct behavior for PinchPoint: we provide a valid token, the SDK uses it.

---

## Part 3: Multi-Device / Multi-Grant Independence

### The key insight

Each `claude login` or `claude setup-token` invocation performs a **separate OAuth authorization flow**, producing a **separate OAuth grant** on Anthropic's server. These grants are completely independent:

- **PC-A runs `claude login`** → Grant #1 → Access Token A + Refresh Token A
- **PC-B runs `claude login`** → Grant #2 → Access Token B + Refresh Token B
- **PinchPoint CLI runs its own OAuth flow** → Grant #3 → Access Token C (1-year)

Refreshing Grant #1's tokens has **zero effect** on Grant #2 or Grant #3. They are tracked separately server-side.

### Evidence

1. **Claude Code works on multiple PCs simultaneously** — users routinely run Claude Code on desktop + laptop without issues. This would be impossible if tokens invalidated each other across grants.

2. **GitHub Issue #5976** — "[BUG] CLI 401 OAuth errors. Multiple devices on two Pro accounts" — this bug was about a server-side OAuth outage, NOT cross-device token invalidation. The user had two Pro accounts on two devices, and both failed simultaneously due to an Anthropic service issue.

3. **GitHub Issue #22600** — The refresh token race condition documented here explicitly affects **multiple instances on the SAME machine** sharing the **same `~/.claude/.credentials.json` file**. NOT cross-device.

4. **OAuth 2.0 spec** — Each authorization code exchange creates an independent token grant. This is fundamental to how OAuth works for public clients with PKCE.

### Why the "race condition" analysis was wrong

The earlier analysis (Parts 4 of the original version) described a scenario where PinchPoint refreshing would invalidate the user's local Claude Code token. **This was incorrect** because it assumed PinchPoint would be sharing the user's existing refresh token from `~/.claude/.credentials.json`.

If PinchPoint obtains its **own independent OAuth grant** (via its own authorization flow), there is no shared state and no race condition. Each grant has its own access token and refresh token, managed independently.

The race condition is ONLY relevant when:
- Two processes share the same `~/.claude/.credentials.json` file
- OR two processes use the same refresh token (e.g., CLI reads user's existing refresh token)

Neither applies when PinchPoint does its own OAuth flow.

---

## Part 4: Approaches Evaluated

### Approach A: Read existing `claude login` token from credentials file

**What the CLI currently does.** Reads `~/.claude/.credentials.json` → takes the access token → sends to PinchPoint.

**Problems:**
- Token expires in ~8 hours — guaranteed to fail for scheduled pings
- Shares the user's active OAuth grant — any PinchPoint refresh would invalidate their local Claude Code
- User must re-run `npx pinchpoint connect` every 8 hours

**Verdict:** Broken. This is what caused the incident.

### Approach B: Store refresh token + refresh before each ping

**Concept:** Also read the refresh token from credentials file. Before each ping, refresh to get a new access token.

**Problems:**
- Still shares the user's OAuth grant — refresh token rotation means PinchPoint refreshing invalidates the user's local token (and vice versa)
- User gets forced to re-login to Claude Code after every PinchPoint ping
- Complex error handling for the race condition
- Fundamentally fragile — two systems fighting over the same token chain

**Verdict:** Works technically but terrible UX. User's Claude Code breaks every time PinchPoint pings.

### Approach C: PinchPoint CLI performs its own OAuth flow with 1-year expiry

**Concept:** Instead of reading from the credentials file, the CLI does its own OAuth authorization flow (identical to `claude setup-token`) and requests a 1-year token.

**How it works:**
1. CLI starts a local HTTP server on a random port
2. CLI generates PKCE parameters (code_verifier, code_challenge, state)
3. CLI opens browser to `https://claude.ai/oauth/authorize?...` with:
   - `client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e`
   - `scope=user:inference` (inference-only, same as `setup-token`)
   - `code_challenge=...` (PKCE S256)
   - `redirect_uri=http://localhost:{PORT}/callback`
4. User sees Claude's consent screen ("Claude Code would like to connect...") and clicks Authorize
5. Browser redirects to `http://localhost:{PORT}/callback?code=...&state=...`
6. CLI exchanges auth code for tokens with `expires_in: 31536000` (1 year):
   ```
   POST https://platform.claude.com/v1/oauth/token
   {
     "grant_type": "authorization_code",
     "code": "{AUTH_CODE}",
     "redirect_uri": "http://localhost:{PORT}/callback",
     "client_id": "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
     "code_verifier": "{CODE_VERIFIER}",
     "state": "{STATE}",
     "expires_in": 31536000
   }
   ```
7. Server returns 1-year access token
8. CLI sends token to PinchPoint (via existing polling approval flow)
9. Token encrypted and stored in DO. Done.

**Advantages:**
- **1-year lifetime** — setup once, works for a year
- **Independent grant** — does NOT touch `~/.claude/.credentials.json`, does NOT interfere with user's regular Claude Code on any device
- **No race conditions** — separate OAuth grant means no shared refresh tokens
- **No refresh needed** — 1 year is long enough that refresh is unnecessary
- **Same consent screen** — user sees the same "Authorize" UI they already know from `claude login`
- **Zero dependencies** — uses native Node.js `http`, `crypto`, and `child_process` (for browser open)

**Disadvantages:**
- Requires user to click Authorize in browser (one-time, ~5 seconds)
- Token expires after 1 year — user must re-run `npx pinchpoint connect` annually
- Uses Claude Code's client_id (same ToS considerations as existing architecture)

**Verdict:** Clean, simple, correct. Setup once, done for a year.

### Approach D: Have user manually run `claude setup-token` and paste the token

**Concept:** User runs `claude setup-token` separately, copies the displayed token, pastes into PinchPoint CLI or web UI.

**Advantages:** Simplest to implement — PinchPoint never touches OAuth at all.

**Disadvantages:** Copy-paste is manual and error-prone. Bad UX compared to automated flow.

**Verdict:** Viable fallback if we want to avoid implementing OAuth, but worse UX.

---

## Part 5: Implementation Plan (Approach C — Own OAuth Flow)

### CLI Changes

**File:** `3.0 Build/3.2 Host/cli/bin/pinchpoint.mjs`

Replace `getClaudeToken()` (which reads from credentials file) with a full OAuth flow:

```javascript
async function performOAuthFlow() {
  // 1. Generate PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier).digest('base64url')
  const state = crypto.randomBytes(32).toString('base64url')

  // 2. Start local HTTP server for callback
  const port = await findFreePort()
  const tokenPromise = startCallbackServer(port, state)

  // 3. Open browser to authorize
  const authUrl = new URL('https://claude.ai/oauth/authorize')
  authUrl.searchParams.set('code', 'true')
  authUrl.searchParams.set('client_id', '9d1c250a-e61b-44d9-88ed-5944d1962f5e')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', `http://localhost:${port}/callback`)
  authUrl.searchParams.set('scope', 'user:inference')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)
  openBrowser(authUrl.toString())

  // 4. Wait for callback
  const authCode = await tokenPromise

  // 5. Exchange for 1-year token
  const tokenRes = await fetch('https://platform.claude.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: `http://localhost:${port}/callback`,
      client_id: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
      code_verifier: codeVerifier,
      state: state,
      expires_in: 31536000  // 1 YEAR
    })
  })

  const { access_token } = await tokenRes.json()
  return access_token
}
```

### Worker Changes

None required. The worker already handles the connect flow (start → poll → approve → complete). The only difference is that the CLI sends a 1-year token instead of an 8-hour token. The encryption, storage, and ping logic are all token-lifetime-agnostic.

### Durable Object Changes

None required. The DO stores an encrypted token and uses it for pings. Whether the token lasts 8 hours or 1 year is irrelevant to the DO.

### Ping Service Changes

None required. The ping service receives a transit-encrypted token and uses it. Lifetime is not its concern.

### What to Remove

- `getClaudeToken()` function that reads from `~/.claude/.credentials.json`
- Token fingerprint logic (was based on the credentials file token)
- Any refresh token handling (not needed with 1-year tokens)

### Token Storage Model

No changes to the storage model. The `setupToken` field in the DO stores the encrypted access token — now it just happens to be valid for 1 year instead of 8 hours.

```
DO Storage Key           | Value
-------------------------|------------------------------------------
setupToken               | AES-256-GCM encrypted access token (1-year)
tokenHealth              | "green" | "yellow" | "red"
consecutiveFailures      | number
lastPing                 | { time, success, windowEnds, exact }
```

---

## Part 6: The `setup-token` Internals (Complete)

For reference, here's exactly what `claude setup-token` does internally, as extracted from the source:

### Step 1: OAuth Authorization

```javascript
// setup-token mode forces these options:
{
  loginWithClaudeAi: true,                           // always Claude.ai, not Console
  inferenceOnly: mode === "setup-token",             // user:inference scope only
  expiresIn: mode === "setup-token" ? 31536000 : undefined  // 1 YEAR
}
```

Opens browser to:
```
https://claude.ai/oauth/authorize?
  code=true
  &client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e
  &response_type=code
  &redirect_uri=http://localhost:{PORT}/callback
  &scope=user:inference
  &code_challenge={CHALLENGE}
  &code_challenge_method=S256
  &state={STATE}
```

Note: `setup-token` uses `scope=user:inference` (just inference), while `claude login` uses the full scope list.

### Step 2: Token Exchange

```
POST https://platform.claude.com/v1/oauth/token
{
  "grant_type": "authorization_code",
  "code": "{AUTH_CODE}",
  "redirect_uri": "http://localhost:{PORT}/callback",
  "client_id": "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  "code_verifier": "{CODE_VERIFIER}",
  "state": "{STATE}",
  "expires_in": 31536000        ← THIS IS THE KEY
}
```

Server response:
```json
{
  "access_token": "sk-ant-oat01-...",
  "refresh_token": "sk-ant-ort01-...",
  "expires_in": 31536000,
  "scope": "user:inference"
}
```

### Step 3: Display Token

```javascript
// setup-token: just show the token, DON'T save to credentials file
if (mode === "setup-token")
  setState({ state: "success", token: tokens.accessToken });
// regular login: save to credentials file
else {
  saveCredentials(tokens);  // K76(u)
  // ...
}
```

The token is displayed in the terminal. The user copies it for use as `CLAUDE_CODE_OAUTH_TOKEN` in CI/CD, GitHub Actions, etc.

**Critically:** `setup-token` does NOT modify `~/.claude/.credentials.json`. The user's regular `claude login` session is completely unaffected.

### Step 4: API Key Creation (NOT called by setup-token)

The `create_api_key` endpoint is only called during **Console login** (API billing users), not during `setup-token` or Claude.ai login:

```javascript
// This path is ONLY for Console login, NOT setup-token
if (!hasInferenceScope) {
  setState({ state: "creating_api_key" });
  const apiKey = await createApiKey(tokens.accessToken);  // Et6()
  // ...
}
```

### Scope restriction (GitHub Issue #23703)

Recent Claude Code versions restrict `setup-token` to `user:inference` scope only:
```
v2.1.x and earlier:  Full scopes (user:profile user:inference user:sessions:claude_code user:mcp_servers)
v2.2.x+:             Restricted to user:inference only
```

For PinchPoint, `user:inference` is the only scope we need — it's what allows making API calls (pings).

---

## Part 7: Token Independence — Why Two PCs (or PinchPoint + PC) Don't Conflict

### OAuth grants are independent

In OAuth 2.0, each authorization code exchange creates an independent "grant" on the server. The server tracks:
- Grant #1: access_token_1, refresh_token_1 (from PC-A's `claude login`)
- Grant #2: access_token_2, refresh_token_2 (from PC-B's `claude login`)
- Grant #3: access_token_3 (from PinchPoint's OAuth flow, 1-year)

These are separate entries in Anthropic's token database. Operations on one grant (refresh, revoke) have zero effect on other grants.

### Refresh token rotation scope

The rotation concern documented in GitHub Issues #22600 and #24317 is **per-grant, not per-user**:

- If two Claude Code instances on the **same machine** share `~/.claude/.credentials.json`, they share the **same grant**. One refreshing invalidates the other's copy of the refresh token. This is the documented race condition.
- If Claude Code on PC-A and Claude Code on PC-B each did their own `claude login`, they have **separate grants**. Refreshing on PC-A doesn't touch PC-B's grant.
- If PinchPoint does its own OAuth flow, it gets its **own grant**. It never interferes with any of the user's Claude Code instances.

### Verified behavior

From GitHub Issue #22600 (titled "[Bug] OAuth refresh token race condition in multi-instance scenarios"):

> "It seems like this issue happens intermittently when more than one claude instance is running on this machine. One instance will update the token, continue successful communication, but other instances will try to renew the OAuth token (same as the first one), but the server will reject the renewal as it already happened."

Key phrase: **"on this machine"** — the bug is about shared credentials on one machine, not cross-device.

---

## Part 8: Correcting Previous Documentation

### Items to update in CLAUDE.md:

1. The "~1 year" claim for `setup-token` was **correct** — no correction needed there
2. CLI should NOT read from `~/.claude/.credentials.json` — it should do its own OAuth flow
3. Connect flow description should mention the 1-year token and independent OAuth grant

### Items that were WRONG in the initial version of this document:

1. ~~"setup-token does NOT create a special long-lived token — it generates a standard access token with the same ~8-hour lifetime"~~ → **WRONG.** `setup-token` passes `expires_in: 31536000` and the server honors it. 1-year token.

2. ~~"The '~1 year' claim from community sources was based on manually setting expiresAt"~~ → **WRONG.** The 1-year lifetime is in the official Claude Code source code: `expiresIn: K === "setup-token" ? 31536000 : void 0`

3. ~~"Refresh token rotation means PinchPoint refreshing invalidates the user's local token"~~ → **WRONG for independent grants.** Only applies when sharing the same credentials file / same OAuth grant. PinchPoint doing its own OAuth flow creates an independent grant with no cross-invalidation.

4. ~~"Client can't override expires_in"~~ → **WRONG.** The client passes `expires_in` in the token exchange request and the server honors it. Confirmed by the `setup-token` flow producing actual 1-year tokens.

---

## Appendix A: Source Code References

### File locations (local spike `node_modules`)

| What | File | Search term |
|------|------|-------------|
| Production OAuth config | `cli.js` | `platform.claude.com` |
| Token exchange function | `cli.js` | `grant_type.*authorization_code` |
| Refresh function | `cli.js` | `grant_type.*refresh_token` |
| setup-token 1-year expiry | `cli.js` | `31536000` |
| setup-token mode detection | `cli.js` | `setup-token` (string literal) |
| Expiry check | `cli.js` | `300000` (5-min buffer) |
| create_api_key endpoint | `cli.js` | `create_api_key` |
| CLAUDE_CODE_OAUTH_TOKEN handling | `cli.js` | `CLAUDE_CODE_OAUTH_TOKEN` (18 occurrences) |
| Auth source selection | `cli.js` | `function Xu()` |
| SDK subprocess spawn | `sdk.mjs` | `spawn` |

### Key GitHub Issues

| Issue | Relevance |
|-------|-----------|
| [#22600](https://github.com/anthropics/claude-code/issues/22600) | Refresh token race condition — **same machine only**, not cross-device |
| [#24317](https://github.com/anthropics/claude-code/issues/24317) | Confirms refresh token rotation (single-use tokens within same grant) |
| [#23703](https://github.com/anthropics/claude-code/issues/23703) | Documents `setup-token` scope restriction to `user:inference` |
| [#5976](https://github.com/anthropics/claude-code/issues/5976) | Multiple devices — was a server-side outage, NOT cross-device token invalidation |
| [#12447](https://github.com/anthropics/claude-code/issues/12447) | OAuth token expiration disrupts autonomous workflows — recommends setup-token for long-lived auth |
| [#6536](https://github.com/anthropics/claude-code/issues/6536) | Confirms `CLAUDE_CODE_OAUTH_TOKEN` works with SDK for inference |

### Domain Migration

| Old Domain | New Domain | Used For |
|------------|-----------|----------|
| `console.anthropic.com/api/oauth/token` | `platform.claude.com/v1/oauth/token` | Token exchange & refresh |
| `console.anthropic.com/api/oauth/claude_cli/create_api_key` | `api.anthropic.com/api/oauth/claude_cli/create_api_key` | API key creation (Console users) |

The old domain may still work (redirect), but the canonical endpoint is `platform.claude.com`.

---

## Appendix B: Decision Record

**Date:** 2026-02-21

**Decision:** PinchPoint CLI performs its own OAuth flow requesting a 1-year token (Approach C)

**Rationale:**
1. `setup-token` proves that 1-year tokens are supported and honored by the server
2. Independent OAuth grant means zero interference with user's regular Claude Code on any device
3. No refresh tokens needed — 1 year is sufficient (user re-connects annually)
4. No race conditions — separate grant, separate token chain
5. Clean UX — user runs CLI, clicks Authorize in browser, done for a year
6. Minimal implementation — only the CLI changes, worker/DO/ping service stay the same

**Alternatives rejected:**
- **A: Read from credentials file** — 8-hour token, guaranteed to expire before first ping
- **B: Store refresh token + refresh before ping** — Shares OAuth grant with user's Claude Code, refresh token rotation causes cross-invalidation, complex error handling, fundamentally fragile
- **D: Manual setup-token copy-paste** — Works but poor UX compared to automated flow

**Previous incorrect decision:** The initial version of this document recommended Approach B (refresh token). This was based on incorrect assumptions about `setup-token` lifetime and token independence. After deeper source code analysis, Approach C is clearly superior.

**Risks accepted:**
- Uses Claude Code's OAuth client_id — same ToS considerations as existing architecture
- Anthropic could revoke 1-year tokens or change the `expires_in` behavior (mitigated by health monitoring)
- Token expires after 1 year — user must re-connect (acceptable for a "set it and forget it" product)
