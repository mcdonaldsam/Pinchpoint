import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction F: "Soft Machine"
// Muted sage/olive palette, organic shapes, soft shadows,
// paper-like texture. Calm, trustworthy, almost physical.
// Think Notion meets a well-designed print manual.

function CountUp({ end, duration = 1500, suffix = '' }) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!started) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, end, duration])

  return <>{count}{suffix}</>
}

export default function LandingF() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,500&family=Geist:wght@400;500;600;700&display=swap');

        .landing-f {
          font-family: 'Geist', -apple-system, sans-serif;
        }
        .landing-f .display {
          font-family: 'Source Serif 4', Georgia, serif;
        }
      `}</style>

      <div className="landing-f min-h-screen text-[#2C3028]"
        style={{
          background: 'linear-gradient(180deg, #F4F2ED 0%, #EBE8E0 100%)',
        }}
      >
        {/* Subtle paper texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            backgroundSize: '200px 200px',
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#7C8C6E]" />
            <span className="text-[15px] font-semibold tracking-tight">PinchPoint</span>
          </div>
          <SignedIn>
            <Link to="/dashboard" className="text-[13px] font-medium text-[#7C8C6E] hover:text-[#2C3028] transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[13px] font-medium text-[#999] hover:text-[#2C3028] transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 pt-20 sm:pt-28 pb-16">
          <div className="max-w-xl">
            <p className="text-[13px] font-medium text-[#7C8C6E] mb-5 tracking-wide">
              For Claude Pro & Max
            </p>
            <h1 className="display text-[40px] sm:text-[56px] font-semibold leading-[1.1] tracking-tight text-[#2C3028]">
              Start your window
              <br />
              <em className="text-[#7C8C6E]">before you start work</em>
            </h1>
            <p className="mt-6 text-[16px] text-[#8A8578] leading-relaxed max-w-md">
              Claude's 5-hour usage window begins when you first message.
              PinchPoint pings at your chosen time, so it's running before you sit down.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2.5 px-6 py-3 bg-[#2C3028] text-[#F4F2ED] rounded-xl text-[14px] font-medium hover:bg-[#3D4438] transition-all shadow-[0_2px_8px_rgba(44,48,40,0.15)]"
                >
                  Dashboard
                  <svg className="w-4 h-4 opacity-40 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="group inline-flex items-center gap-2.5 px-6 py-3 bg-[#2C3028] text-[#F4F2ED] rounded-xl text-[14px] font-medium hover:bg-[#3D4438] transition-all cursor-pointer shadow-[0_2px_8px_rgba(44,48,40,0.15)]">
                    Pinch me
                    <svg className="w-4 h-4 opacity-40 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-[13px] text-[#BBB3A8]">Free, always</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-md">
            <div>
              <div className="display text-[32px] font-semibold text-[#2C3028]">
                <CountUp end={5} suffix="h" />
              </div>
              <p className="text-[12px] text-[#8A8578] mt-1">Window duration</p>
            </div>
            <div>
              <div className="display text-[32px] font-semibold text-[#2C3028]">
                <CountUp end={15} suffix="m" />
              </div>
              <p className="text-[12px] text-[#8A8578] mt-1">Schedule precision</p>
            </div>
            <div>
              <div className="display text-[32px] font-semibold text-[#7C8C6E]">
                $<CountUp end={0} />
              </div>
              <p className="text-[12px] text-[#8A8578] mt-1">Per month</p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-px bg-[#D5D0C8]" />
        </div>

        {/* How it works */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-[200px_1fr] gap-10">
            <div>
              <h2 className="display text-[24px] font-semibold text-[#2C3028] sticky top-6">How it works</h2>
            </div>
            <div className="space-y-0">
              {[
                { title: 'Sign up', desc: 'Create an account. Just an email — nothing more.' },
                { title: 'Connect Claude', desc: 'Run npx pinchpoint connect. We detect your token automatically.' },
                { title: 'Set your schedule', desc: 'Choose days, times, timezone. Each day can be different.' },
                { title: 'Relax', desc: 'We handle the rest. Your window starts at your time, every day.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 py-6 border-b border-[#D5D0C8]/60 last:border-0 group">
                  <span className="display text-[24px] font-semibold text-[#D5D0C8] group-hover:text-[#7C8C6E] transition-colors w-8 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#2C3028]">{step.title}</h3>
                    <p className="text-[14px] text-[#8A8578] mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-px bg-[#D5D0C8]" />
        </div>

        {/* Features */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-[200px_1fr] gap-10">
            <div>
              <h2 className="display text-[24px] font-semibold text-[#2C3028] sticky top-6">Details</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-8">
              {[
                {
                  title: 'Exact timing',
                  desc: "We read the precise reset timestamp from Claude's API. No estimates — your dashboard shows the real window end time.",
                },
                {
                  title: 'Health checks',
                  desc: 'Token failures trigger email alerts and auto-pause. You only hear from us when something needs attention.',
                },
                {
                  title: 'Per-day control',
                  desc: 'Monday at 6 AM, Thursday at 9 AM, weekends off. 15-minute precision with full timezone support.',
                },
                {
                  title: 'Encrypted storage',
                  desc: 'AES-256-GCM with per-token random IV. Your Claude token is never stored in plaintext, never logged.',
                },
              ].map((f, i) => (
                <div key={i} className="group">
                  <h3 className="text-[15px] font-semibold text-[#2C3028] mb-2">{f.title}</h3>
                  <p className="text-[14px] text-[#8A8578] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
          <div className="bg-[#2C3028] rounded-2xl p-10 sm:p-14 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="display text-[24px] font-semibold text-[#F4F2ED]">
                Two minutes to set up.
              </h2>
              <p className="text-[14px] text-[#F4F2ED]/40 mt-1">Runs every day after that.</p>
            </div>
            <SignedIn>
              <Link
                to="/dashboard"
                className="flex-shrink-0 px-6 py-3 bg-[#7C8C6E] text-[#F4F2ED] rounded-xl text-[14px] font-medium hover:bg-[#8D9D7E] transition-colors"
              >
                Open dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex-shrink-0 px-6 py-3 bg-[#7C8C6E] text-[#F4F2ED] rounded-xl text-[14px] font-medium hover:bg-[#8D9D7E] transition-colors cursor-pointer">
                  Get started free
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          <div className="h-px bg-[#D5D0C8] mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-5 text-[13px] text-[#BBB3A8]">
              <Link to="/privacy" className="hover:text-[#2C3028] transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-[#2C3028] transition-colors">Terms</Link>
            </div>
            <p className="text-[12px] text-[#CCC5BB]">
              Not affiliated with Anthropic
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
