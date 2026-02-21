import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
        <Link to="/home" className="text-lg font-semibold tracking-tight">pinchpoint</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-stone-400 text-sm mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-stone-600 text-[15px] leading-relaxed">
          <Section title="What pinchpoint does">
            <p>
              pinchpoint sends a minimal, scheduled ping to Claude using your OAuth token
              so your 5-hour usage window starts at the time you choose. That's all it does.
            </p>
          </Section>

          <Section title="Not affiliated with Anthropic">
            <p>
              pinchpoint is an independent project. It is not affiliated with, endorsed by,
              or sponsored by Anthropic. Anthropic may change how Claude subscriptions,
              usage windows, or OAuth tokens work at any time, which could affect pinchpoint's
              functionality without notice.
            </p>
          </Section>

          <Section title="Your responsibilities">
            <p>By using pinchpoint, you agree that:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>You are the owner of the Claude account whose token you provide.</li>
              <li>You are responsible for your own compliance with Anthropic's terms of service.</li>
              <li>You understand that automated pinging may not be an intended use of your Claude subscription.</li>
              <li>You will not use pinchpoint to access accounts you do not own.</li>
            </ul>
          </Section>

          <Section title="How we handle your token">
            <p>
              Your Claude token is encrypted with AES-256-GCM using a per-user derived key.
              It is only decrypted at the moment a scheduled ping executes, then re-encrypted
              with a separate transit key for secure transmission. We never log, display, or
              store your token in plaintext. See our <Link to="/privacy" className="text-emerald-600 underline">Privacy Policy</Link> for
              full details.
            </p>
          </Section>

          <Section title="No guarantees">
            <p>
              pinchpoint is provided as-is. We do not guarantee that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Pings will execute at the exact scheduled time (network delays, service outages).</li>
              <li>The service will be available without interruption.</li>
              <li>Anthropic will not change their systems in ways that break pinchpoint.</li>
              <li>Your usage window will behave as expected after a ping.</li>
            </ul>
          </Section>

          <Section title="Limitation of liability">
            <p>
              pinchpoint is not liable for any issues with your Claude account, including
              but not limited to: token revocation, account suspension, rate limit changes,
              or any actions Anthropic takes. Use pinchpoint at your own risk.
            </p>
          </Section>

          <Section title="Account termination">
            <p>
              You can delete your account at any time from the dashboard. All your data will
              be permanently erased immediately. We reserve the right to suspend or terminate
              accounts that abuse the service.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms from time to time. Continued use of pinchpoint after
              changes constitutes acceptance. We'll update the "last updated" date at the top
              when changes are made.
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
