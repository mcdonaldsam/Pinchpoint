import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
        <Link to="/home" className="text-lg font-semibold tracking-tight">pinchpoint</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-stone-400 text-sm mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-stone-600 text-[15px] leading-relaxed">
          <Section title="What we collect">
            <p>When you use pinchpoint, we store:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Email address</strong> — provided via your Clerk account, used for ping notifications and account recovery.</li>
              <li><strong>Claude OAuth token</strong> — provided via <code className="bg-stone-100 px-1 py-0.5 rounded text-xs">npx pinchpoint connect</code>, used solely to execute your scheduled pings.</li>
              <li><strong>Schedule preferences</strong> — which days/times you want pings, your timezone, and pause state.</li>
              <li><strong>Ping history</strong> — success/failure status and window end time for your most recent ping.</li>
            </ul>
          </Section>

          <Section title="How we store it">
            <p>
              Your Claude token is encrypted at rest using AES-256-GCM with a per-user
              derived key (HKDF). Each user's token has its own unique encryption key — there
              is no shared secret. When a ping executes, the token is re-encrypted with a
              separate transit key before being sent to our ping service. Three isolated keys
              are used: at-rest encryption, transit encryption, and request signing.
              All user data is stored in Cloudflare Durable Objects with strong consistency guarantees.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>We use the following services to operate pinchpoint:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Cloudflare</strong> (Workers, Durable Objects, Pages) — hosting, API, and data storage.</li>
              <li><strong>Clerk</strong> — authentication and account management.</li>
              <li><strong>Resend</strong> — email notifications (account and security alerts).</li>
              <li><strong>Fly.io</strong> — runs the ping execution service that contacts Claude on your behalf.</li>
            </ul>
            <p className="mt-2">We do not sell, share, or provide your data to any other third parties.</p>
          </Section>

          <Section title="How we use your token">
            <p>
              Your Claude token is used for one purpose: sending a minimal ping to Claude's API
              at your scheduled times to start your 5-hour usage window. The token is decrypted
              only at the moment of ping execution, transmitted securely to our ping service,
              and never logged or stored in plaintext.
            </p>
          </Section>

          <Section title="Data retention">
            <p>
              Your data is retained for as long as your account exists. When you delete your
              account, all stored data — including your encrypted token, schedule, and ping
              history — is permanently and immediately erased. There is no recovery period.
            </p>
          </Section>

          <Section title="Your rights">
            <p>You can at any time:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Delete your account</strong> from the dashboard, which permanently erases all your data.</li>
              <li><strong>Pause your schedule</strong> to stop pings without deleting your account.</li>
              <li><strong>Disconnect</strong> from the dashboard, which deletes your stored token. You can also revoke the token directly at <a href="https://claude.ai/settings" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">claude.ai/settings</a>.</li>
            </ul>
          </Section>

          <Section title="Contact">
            <p>
              For privacy questions, email <a href="mailto:privacy@pinchpoint.dev" className="text-emerald-600 underline">privacy@pinchpoint.dev</a>.
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
