import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'

// Direction M: "One Column"
// Single column. One font. Maximum whitespace.
// Nothing decorative — just well-set text and clear hierarchy.

export default function LandingM() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        .landing-m { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="landing-m min-h-screen bg-white text-neutral-900">
        {/* Nav */}
        <nav className="max-w-xl mx-auto px-6 pt-8 pb-6 flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight">PinchPoint</span>
          <SignedIn>
            <Link to="/dashboard" className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[14px] text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="max-w-xl mx-auto px-6 pt-16 sm:pt-24 pb-20">
          <h1 className="text-[36px] sm:text-[44px] font-bold leading-[1.15] tracking-tight">
            Start your Claude window
            <br />
            before you sit down.
          </h1>
          <p className="mt-6 text-[17px] text-neutral-500 leading-relaxed max-w-md">
            Claude Pro and Max give you a 5-hour usage window that starts
            when you send your first message. PinchPoint sends that first
            message for you, at the time you choose.
          </p>
          <div className="mt-8">
            <SignedIn>
              <Link
                to="/dashboard"
                className="inline-block text-[15px] font-semibold px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-[15px] font-semibold px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer">
                  Get started free
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-xl mx-auto px-6">
          <div className="h-px bg-neutral-200" />
        </div>

        {/* How it works */}
        <section className="max-w-xl mx-auto px-6 py-20">
          <h2 className="text-[13px] font-semibold text-neutral-400 tracking-wide uppercase mb-10">
            How it works
          </h2>
          <ol className="space-y-8">
            {[
              { title: 'Create an account', desc: 'Sign up with your email. Free, no card required.' },
              { title: 'Connect your Claude token', desc: 'Run npx pinchpoint connect in your terminal. One command.' },
              { title: 'Set your schedule', desc: 'Pick which days and what time. 15-minute increments, any timezone.' },
              { title: 'That\'s it', desc: 'PinchPoint pings Claude at your chosen time every day. Your window starts automatically.' },
            ].map((step, i) => (
              <li key={i} className="flex gap-5">
                <span className="text-[14px] font-semibold text-neutral-300 pt-0.5 tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[16px] font-semibold">{step.title}</h3>
                  <p className="mt-1 text-[15px] text-neutral-500 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Divider */}
        <div className="max-w-xl mx-auto px-6">
          <div className="h-px bg-neutral-200" />
        </div>

        {/* Details */}
        <section className="max-w-xl mx-auto px-6 py-20">
          <h2 className="text-[13px] font-semibold text-neutral-400 tracking-wide uppercase mb-10">
            Details
          </h2>
          <dl className="space-y-6">
            {[
              { label: 'Timing', value: 'Reads the exact reset timestamp from Claude\'s API. No guessing.' },
              { label: 'Security', value: 'Your token is encrypted with AES-256-GCM. Never stored in plaintext.' },
              { label: 'Monitoring', value: 'Auto-pauses on repeated failures. Emails you if your token needs attention.' },
              { label: 'Price', value: 'Free. No subscription, no usage fees.' },
            ].map((item, i) => (
              <div key={i}>
                <dt className="text-[15px] font-semibold">{item.label}</dt>
                <dd className="mt-1 text-[15px] text-neutral-500 leading-relaxed">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Divider */}
        <div className="max-w-xl mx-auto px-6">
          <div className="h-px bg-neutral-200" />
        </div>

        {/* CTA */}
        <section className="max-w-xl mx-auto px-6 py-20 text-center">
          <p className="text-[20px] font-semibold">
            Two minutes to set up. Runs every morning after that.
          </p>
          <div className="mt-6">
            <SignedIn>
              <Link
                to="/dashboard"
                className="inline-block text-[15px] font-semibold px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-[15px] font-semibold px-5 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer">
                  Get started free
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-xl mx-auto px-6 py-8 flex items-center justify-between text-[13px] text-neutral-400">
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-neutral-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-neutral-600 transition-colors">Terms</Link>
          </div>
          <span>Not affiliated with Anthropic</span>
        </footer>
      </div>
    </>
  )
}
