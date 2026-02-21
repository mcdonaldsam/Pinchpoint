import { Link } from 'react-router-dom'

export default function Security() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
        <Link to="/home" className="text-lg font-semibold tracking-tight">pinchpoint</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        <h1 className="text-3xl font-bold mb-2">Security</h1>
        <p className="text-stone-400 text-sm mb-10">How we protect your Claude token and data</p>

        <div className="space-y-8 text-stone-600 text-[15px] leading-relaxed">
          <Section title="Token encryption at rest">
            <p>
              Your Claude OAuth token is encrypted using <strong>AES-256-GCM</strong> before
              it touches storage. Each user gets a unique encryption key derived via
              <strong> HKDF</strong> (HMAC-based Key Derivation Function) from a master secret
              combined with your user ID. This means:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Every user has a <strong>distinct encryption key</strong> — compromising one key does not affect any other user.</li>
              <li>Each encryption uses a <strong>random IV</strong> (initialization vector), so encrypting the same token twice produces different ciphertext.</li>
              <li>The master secret is stored as a server-side environment variable and is never exposed to the frontend or logged.</li>
            </ul>
          </Section>

          <Section title="Token encryption in transit">
            <p>
              When a scheduled ping executes, your token is <strong>re-encrypted with a
              separate AES-256-GCM key</strong> before being sent to our ping execution service.
              This transit key is independent of the at-rest key — even if one were compromised,
              the other remains secure.
            </p>
            <p className="mt-2">
              Every request to the ping service is also <strong>signed with HMAC-SHA256</strong> over
              the payload, a timestamp, and a unique nonce. The ping service verifies:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Signature validity</strong> — the request wasn't tampered with.</li>
              <li><strong>Timestamp freshness</strong> — the request was sent within the last 60 seconds.</li>
              <li><strong>Nonce uniqueness</strong> — the request can't be replayed.</li>
            </ul>
          </Section>

          <Section title="Three isolated keys">
            <p>
              We use three completely separate secrets, each with a single responsibility:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Encryption key</strong> — encrypts tokens at rest (Worker only).</li>
              <li><strong>Transit encryption key</strong> — encrypts tokens for Worker → ping service transmission.</li>
              <li><strong>Signing key</strong> — HMAC request signing between Worker and ping service.</li>
            </ul>
            <p className="mt-2">
              No single secret can decrypt a token <em>and</em> forge a request. Each key is
              stored only on the services that need it.
            </p>
          </Section>

          <Section title="Per-user isolation (Durable Objects)">
            <p>
              Each user's data lives in its own <strong>Cloudflare Durable Object</strong> — an
              isolated, single-threaded compute instance with its own storage. This means:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>No shared database</strong> — your schedule, token, and ping history are stored in your DO instance, not in a shared table.</li>
              <li><strong>Strong consistency</strong> — reads always reflect the latest write, with no eventual-consistency lag.</li>
              <li><strong>Fault isolation</strong> — an issue with one user's DO cannot affect another user's data or scheduling.</li>
              <li><strong>Independent alarms</strong> — each user's ping schedule runs on its own timer, not a shared cron job.</li>
            </ul>
          </Section>

          <Section title="Authentication">
            <p>
              Dashboard access is protected by <strong>Clerk</strong> with JWT verification:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>JWKS validation</strong> — JWTs are verified against Clerk's public key set, cached for 1 hour with automatic rotation.</li>
              <li><strong>Key ID matching</strong> — each JWT's <code className="bg-stone-100 px-1 py-0.5 rounded text-xs">kid</code> header is matched against the JWKS to prevent key confusion attacks.</li>
              <li><strong>Full claim checks</strong> — audience (<code className="bg-stone-100 px-1 py-0.5 rounded text-xs">aud</code>), authorized party (<code className="bg-stone-100 px-1 py-0.5 rounded text-xs">azp</code>), and not-before (<code className="bg-stone-100 px-1 py-0.5 rounded text-xs">nbf</code>) are all verified.</li>
            </ul>
          </Section>

          <Section title="Connect flow security">
            <p>
              When you link your Claude token via <code className="bg-stone-100 px-1 py-0.5 rounded text-xs">npx pinchpoint connect</code>,
              the CLI performs its own OAuth flow with PKCE. The connect session has multiple safeguards:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Unguessable session ID</strong> — cryptographically random UUID.</li>
              <li><strong>5-minute TTL</strong> — sessions expire quickly and cannot be reused.</li>
              <li><strong>Verification code</strong> — a 4-digit code displayed in the CLI must match the dashboard, bound by SHA-256 hash.</li>
              <li><strong>Token fingerprint</strong> — the CLI computes a fingerprint of the token, so the server can verify integrity without seeing the plaintext.</li>
              <li><strong>Independent OAuth grant</strong> — the token is a separate grant from your regular Claude Code session. It does not touch <code className="bg-stone-100 px-1 py-0.5 rounded text-xs">~/.claude/.credentials.json</code>.</li>
            </ul>
          </Section>

          <Section title="Error sanitization">
            <p>
              Token patterns are <strong>stripped from all log output</strong> on both the Worker
              and the ping service. Crash handlers automatically clear environment variables
              containing secrets before any error reporting runs.
            </p>
          </Section>

          <Section title="HTTP security headers">
            <p>Every response from the API and frontend includes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Content-Security-Policy</strong> — restricts resource loading to trusted origins.</li>
              <li><strong>Strict-Transport-Security</strong> — enforces HTTPS with long max-age.</li>
              <li><strong>X-Frame-Options: DENY</strong> — prevents clickjacking via iframe embedding.</li>
              <li><strong>X-Content-Type-Options: nosniff</strong> — prevents MIME type sniffing.</li>
              <li><strong>Permissions-Policy</strong> — disables unnecessary browser APIs.</li>
            </ul>
          </Section>

          <Section title="CORS and input validation">
            <p>
              The API's CORS policy is locked to the production frontend origin — not <code className="bg-stone-100 px-1 py-0.5 rounded text-xs">*</code>.
              All user input (schedule days, times, timezone) is validated server-side before
              storage. Times must be in 15-minute increments; timezones must be valid IANA identifiers.
            </p>
          </Section>

          <Section title="Data deletion">
            <p>
              When you delete your account or disconnect your token, the data is
              <strong> permanently and immediately erased</strong> from your Durable Object.
              There is no soft-delete, no retention period, and no backups to purge.
              Scheduled alarms are cancelled in the same operation.
            </p>
          </Section>

          <Section title="Questions?">
            <p>
              If you have security questions or want to report a vulnerability,
              email <a href="mailto:security@pinchpoint.dev" className="text-emerald-600 underline">security@pinchpoint.dev</a>.
            </p>
          </Section>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-2">{title}</h2>
      {children}
    </section>
  )
}
