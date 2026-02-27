import { Link } from 'react-router-dom'

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
        <Link to="/home" className="text-lg font-semibold tracking-tight">pinchpoint</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        <h1 className="text-3xl font-bold mb-2">Independence & Disclaimer</h1>
        <p className="text-stone-400 text-sm mb-10">What pinchpoint is, what it isn't, and how it relates to Anthropic</p>

        <div className="space-y-8 text-stone-600 text-[15px] leading-relaxed">
          <Section title="We are not affiliated with Anthropic">
            <p>
              pinchpoint is an independent, community-built scheduling tool. We are not
              endorsed by, sponsored by, or affiliated with Anthropic in any way. Claude,
              Claude Code, and the Claude Agent SDK are products of Anthropic, PBC.
            </p>
            <p className="mt-2">
              We do not represent ourselves as an Anthropic product, partner, or authorized
              third party. When you use pinchpoint, you are using a tool built by an
              independent developer to help you manage your own subscription.
            </p>
          </Section>

          <Section title="What pinchpoint actually does">
            <p>
              pinchpoint is a scheduler. You tell it when you'd like your Claude usage
              window to start, and it sends a single, minimal message to Claude at that
              time, the equivalent of you opening Claude Code and typing "hi" at 9:00 AM.
            </p>
            <p className="mt-2">
              That's it. pinchpoint does not do any work on your behalf. It does not
              send prompts, write code, run agents, or interact with Claude in any
              meaningful way. After the ping, your 5-hour window starts and <em>you</em> use
              Claude however you normally would: through Claude Code, claude.ai, or any
              other official Anthropic product.
            </p>
            <p className="mt-2">
              Think of it as a calendar reminder that also presses the "start" button for you.
            </p>
          </Section>

          <Section title="Your token, your account, your control">
            <p>
              When you connect your Claude token to pinchpoint, you are authorizing
              pinchpoint to start your usage window on a schedule you define. The token
              creates an independent OAuth grant and does not touch your local Claude Code
              session or credentials.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>You choose when and how often pings happen.</li>
              <li>You can pause, disconnect, or delete your account at any time.</li>
              <li>You can revoke the token directly at <a href="https://claude.ai/settings" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">claude.ai/settings</a>. pinchpoint can't prevent this.</li>
              <li>Your token is encrypted at rest and in transit. We never see it in plaintext after initial setup.</li>
            </ul>
            <p className="mt-2">
              pinchpoint acts on your behalf, at your direction, using your own credentials.
              It's a tool you set up for yourself, not a service that accesses Claude
              independently of you.
            </p>
          </Section>

          <Section title="What each ping costs">
            <p>
              Each ping sends roughly 50 input tokens and receives about 5 output tokens.
              For context, a single human message on claude.ai typically uses more tokens
              than an entire day of pinchpoint pings. Even at maximum scheduling (4 pings
              per day), your daily token footprint is smaller than saying "hello" once.
            </p>
            <p className="mt-2">
              pinchpoint does not enable you to exceed, share, pool, or resell your rate
              limits. Your subscription usage is entirely your own, consumed through
              Anthropic's official products after the window starts.
            </p>
          </Section>

          <Section title="Not a business">
            <p>
              pinchpoint is a free, open tool. There is no subscription fee, no paid tier,
              and no monetization of your data or Claude usage. It is maintained as a
              community project and funded by voluntary donations only.
            </p>
            <p className="mt-2">
              We do not profit from Anthropic's infrastructure, compete with any Anthropic
              product, or provide an alternative interface for Claude. All real work happens
              through Anthropic's own products. pinchpoint just helps you decide <em>when</em> it
              starts.
            </p>
          </Section>

          <Section title="Anthropic's terms of service">
            <p>
              We encourage all users to review Anthropic's{' '}
              <a href="https://www.anthropic.com/legal/consumer-terms" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">Consumer Terms of Service</a>{' '}
              and make their own informed decision about using pinchpoint. Anthropic's terms
              are broad and subject to change, and we cannot guarantee how they will be
              interpreted or enforced in the future.
            </p>
            <p className="mt-2">
              What we can say is that pinchpoint is just a scheduling tool. It does
              not replace Claude Code, does not route coding workloads through your
              subscription, and does not enable token arbitrage. Each ping is trivial: one
              short message, once per scheduled time, to start the window you're already
              paying for.
            </p>
          </Section>

          <Section title="If anything changes">
            <p>
              You are always in control. From your <Link to="/dashboard" className="text-emerald-600 underline">dashboard</Link> you
              can pause your schedule, disconnect your token, or delete your account entirely.
              Deleting your account erases all stored data: your encrypted token,
              schedule, and any ping history. There is no soft-delete, no retention period, and
              no backup to recover from. Once deleted, it's gone.
            </p>
            <p className="mt-2">
              You can also revoke your token directly at{' '}
              <a href="https://claude.ai/settings" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">claude.ai/settings</a>,
              which invalidates it immediately regardless of whether pinchpoint still has a copy.
            </p>
          </Section>

          <Section title="Questions?">
            <p>
              If you have questions about pinchpoint's relationship with Anthropic or how
              your token is used, email{' '}
              <a href="mailto:sam.mcdonald.dev@gmail.com" className="text-emerald-600 underline">sam.mcdonald.dev@gmail.com</a>.
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
