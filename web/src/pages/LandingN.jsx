import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'

// Direction N: "Two Tone"
// Near-black and white. One sans-serif. Big type.
// Bold section breaks. Apple-level restraint.

export default function LandingN() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .landing-n { font-family: 'Outfit', sans-serif; }
      `}</style>

      <div className="landing-n min-h-screen bg-[#FAFAFA] text-[#111]">
        {/* Nav */}
        <nav className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-[16px] font-bold tracking-tight">pinchpoint</span>
          <SignedIn>
            <Link to="/dashboard" className="text-[14px] font-medium text-[#888] hover:text-[#111] transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[14px] font-medium text-[#888] hover:text-[#111] transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="bg-[#111] text-white">
          <div className="max-w-3xl mx-auto px-6 py-24 sm:py-32">
            <h1 className="text-[40px] sm:text-[56px] font-800 leading-[1.05] tracking-tight">
              Your Claude window,
              <br />
              on your schedule.
            </h1>
            <p className="mt-6 text-[18px] font-light text-white/60 leading-relaxed max-w-lg">
              PinchPoint automatically starts your 5-hour Claude Pro/Max
              usage window at the time you pick. Free and takes two minutes.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-block text-[15px] font-semibold px-6 py-3 bg-white text-[#111] rounded-full hover:bg-white/90 transition-colors"
                >
                  Open Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-[15px] font-semibold px-6 py-3 bg-white text-[#111] rounded-full hover:bg-white/90 transition-colors cursor-pointer">
                    Get started
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-[13px] text-white/40 font-medium">Free, no card</span>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="border-b border-[#E5E5E5]">
          <div className="max-w-3xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
            {[
              { value: '5 hours', label: 'Window duration' },
              { value: '15 min', label: 'Schedule precision' },
              { value: '$0/mo', label: 'Price' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-[28px] sm:text-[32px] font-bold tracking-tight">{stat.value}</div>
                <div className="mt-1 text-[13px] text-[#999] font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-3xl mx-auto px-6 py-20">
          <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight mb-12">
            How it works
          </h2>
          <div className="space-y-0 divide-y divide-[#E5E5E5]">
            {[
              { num: '1', title: 'Create account', desc: 'Sign up with email. Ten seconds, no card.' },
              { num: '2', title: 'Connect token', desc: 'Run npx pinchpoint connect. Auto-detects your Claude credentials.' },
              { num: '3', title: 'Set schedule', desc: 'Pick days and times. Different time each day if you want.' },
              { num: '4', title: 'Done', desc: 'Your window starts at your time, every day. No action needed.' },
            ].map((step) => (
              <div key={step.num} className="flex items-baseline gap-6 py-5">
                <span className="text-[14px] font-bold text-[#CCC] tabular-nums w-5 flex-shrink-0">{step.num}</span>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 flex-1">
                  <h3 className="text-[16px] font-semibold sm:w-40 flex-shrink-0">{step.title}</h3>
                  <p className="text-[15px] text-[#777] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-[#111] text-white">
          <div className="max-w-3xl mx-auto px-6 py-20">
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight mb-12">
              Under the hood
            </h2>
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
              {[
                { title: 'Exact timing', desc: 'Reads the resetsAt timestamp from Claude\'s API. Shows the real window end time, not an estimate.' },
                { title: 'Health checks', desc: 'Auto-pauses after repeated failures. Emails you when your token needs attention.' },
                { title: 'Per-day control', desc: '15-minute increments. Different time for each day. Full timezone support.' },
                { title: 'Encrypted tokens', desc: 'AES-256-GCM with per-user keys. Never stored in plaintext, never logged.' },
              ].map((f, i) => (
                <div key={i}>
                  <h3 className="text-[16px] font-semibold mb-2">{f.title}</h3>
                  <p className="text-[14px] text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight">
            Set it once, forget it.
          </h2>
          <p className="mt-3 text-[16px] text-[#999]">
            Two minutes to configure. Runs every morning after that.
          </p>
          <div className="mt-8">
            <SignedIn>
              <Link
                to="/dashboard"
                className="inline-block text-[15px] font-semibold px-6 py-3 bg-[#111] text-white rounded-full hover:bg-[#333] transition-colors"
              >
                Open Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-[15px] font-semibold px-6 py-3 bg-[#111] text-white rounded-full hover:bg-[#333] transition-colors cursor-pointer">
                  Get started free
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-3xl mx-auto px-6 py-8 border-t border-[#E5E5E5] flex items-center justify-between text-[13px] text-[#BBB]">
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-[#666] transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-[#666] transition-colors">Terms</Link>
          </div>
          <span>Not affiliated with Anthropic</span>
        </footer>
      </div>
    </>
  )
}
