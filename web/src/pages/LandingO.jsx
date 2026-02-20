import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'

// Direction O: "Soft Focus"
// Warm off-white, one blue accent, rounded corners.
// Comfortable to read, feels like a good settings page.
// Nothing flashy — just pleasant and clear.

export default function LandingO() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap');
        .landing-o { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <div className="landing-o min-h-screen bg-[#F7F6F3] text-[#1D1D1F]">
        {/* Nav */}
        <nav className="max-w-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3B6EE6] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">P</span>
            </div>
            <span className="text-[15px] font-semibold">PinchPoint</span>
          </div>
          <SignedIn>
            <Link to="/dashboard" className="text-[14px] font-medium text-[#3B6EE6] hover:text-[#2B5AD6] transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[14px] font-medium text-[#8C8C8E] hover:text-[#1D1D1F] transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="max-w-2xl mx-auto px-6 pt-12 sm:pt-20 pb-16">
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] font-semibold text-[#3B6EE6] mb-4">For Claude Pro & Max</p>
            <h1 className="text-[32px] sm:text-[40px] font-bold leading-[1.15] tracking-tight">
              Start your usage window
              <br />
              at the right time.
            </h1>
            <p className="mt-5 text-[16px] text-[#8C8C8E] leading-relaxed max-w-md">
              Claude gives you a 5-hour usage window that starts on your first
              message. PinchPoint sends that first message for you, at the time
              you choose. Free.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-block text-[14px] font-semibold px-5 py-2.5 bg-[#3B6EE6] text-white rounded-xl hover:bg-[#2B5AD6] transition-colors"
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-[14px] font-semibold px-5 py-2.5 bg-[#3B6EE6] text-white rounded-xl hover:bg-[#2B5AD6] transition-colors cursor-pointer">
                    Get started free
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-[13px] text-[#B5B5B7]">No credit card needed</span>
            </div>

            {/* Inline stats */}
            <div className="mt-10 pt-8 border-t border-[#F0EFEC] grid grid-cols-3 gap-4">
              {[
                { value: '5h', label: 'Window' },
                { value: '15min', label: 'Precision' },
                { value: '$0', label: 'Cost' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-[24px] sm:text-[28px] font-bold tracking-tight">{s.value}</div>
                  <div className="text-[12px] text-[#B5B5B7] font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="max-w-2xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-[20px] font-bold mb-8">How it works</h2>
            <div className="space-y-6">
              {[
                { num: '1', title: 'Create an account', desc: 'Sign up with your email. Free, takes ten seconds.' },
                { num: '2', title: 'Connect your token', desc: 'Run npx pinchpoint connect in your terminal. One command, one click.' },
                { num: '3', title: 'Pick your schedule', desc: 'Choose days and times. 15-minute increments, any timezone.' },
                { num: '4', title: 'You\'re done', desc: 'PinchPoint pings Claude at your chosen time. Window starts automatically.' },
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-7 h-7 rounded-lg bg-[#F0EFEC] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[12px] font-bold text-[#8C8C8E]">{step.num}</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">{step.title}</h3>
                    <p className="mt-1 text-[14px] text-[#8C8C8E] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-2xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-[20px] font-bold mb-8">Details</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'Exact timing', desc: 'Reads the real reset timestamp from Claude\'s API. No estimates.' },
                { title: 'Health checks', desc: 'Auto-pauses on failures. Emails you if your token needs attention.' },
                { title: 'Per-day control', desc: 'Different time for each day. Skip weekends, or vice versa.' },
                { title: 'Encrypted', desc: 'AES-256-GCM encryption. Tokens never stored in plaintext.' },
              ].map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#FAFAF8]">
                  <h3 className="text-[14px] font-semibold mb-1">{f.title}</h3>
                  <p className="text-[13px] text-[#8C8C8E] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-2xl mx-auto px-6 pb-16">
          <div className="text-center py-12">
            <p className="text-[18px] font-semibold">
              Two minutes to set up. Runs every morning.
            </p>
            <div className="mt-5">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-block text-[14px] font-semibold px-5 py-2.5 bg-[#3B6EE6] text-white rounded-xl hover:bg-[#2B5AD6] transition-colors"
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-[14px] font-semibold px-5 py-2.5 bg-[#3B6EE6] text-white rounded-xl hover:bg-[#2B5AD6] transition-colors cursor-pointer">
                    Get started free
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-2xl mx-auto px-6 py-8 flex items-center justify-between text-[13px] text-[#B5B5B7]">
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-[#8C8C8E] transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-[#8C8C8E] transition-colors">Terms</Link>
          </div>
          <span>Not affiliated with Anthropic</span>
        </footer>
      </div>
    </>
  )
}
