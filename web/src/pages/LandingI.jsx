import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction I: "Swiss Modernist"
// International Typographic Style. Strict grid, Helvetica-inspired,
// bold red accent, asymmetric layout, clean rules, numbered sections.
// Josef Müller-Brockmann meets SaaS. Information-dense yet beautiful.

function NumberedSection({ number, children }) {
  return (
    <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] gap-0">
      <div className="border-r-2 border-[#E30613] pr-4 pt-1">
        <span className="text-[48px] sm:text-[64px] font-black leading-none text-[#E30613]/15">
          {number}
        </span>
      </div>
      <div className="pl-6 sm:pl-8">
        {children}
      </div>
    </div>
  )
}

function TickerBar() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <div className="bg-[#E30613] text-white py-1.5 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] font-medium tracking-[0.05em]">
        <span>PINCHPOINT &mdash; CLAUDE WINDOW SCHEDULER</span>
        <span className="tabular-nums hidden sm:block">
          {now.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          {' UTC'}{now.getTimezoneOffset() > 0 ? '-' : '+'}{Math.abs(Math.floor(now.getTimezoneOffset() / 60))}
        </span>
      </div>
    </div>
  )
}

export default function LandingI() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&display=swap');

        .landing-i {
          font-family: 'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        .landing-i h1,
        .landing-i h2,
        .landing-i h3 {
          letter-spacing: -0.02em;
        }

        @keyframes rule-extend {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }

        .rule-animate {
          animation: rule-extend 0.8s ease-out forwards;
          transform-origin: left;
        }
      `}</style>

      <div className="landing-i min-h-screen bg-white text-[#1A1A1A]">
        <TickerBar />

        {/* Nav */}
        <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between border-b border-[#1A1A1A]">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-[#E30613] flex items-center justify-center">
              <span className="text-white text-[11px] font-black tracking-tight">PP</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#999] font-medium tracking-wide">
              <span>V1.0</span>
              <span className="w-1 h-1 rounded-full bg-[#DDD]" />
              <span>2026</span>
            </div>
          </div>
          <SignedIn>
            <Link
              to="/dashboard"
              className="text-[12px] font-bold tracking-[0.05em] text-[#E30613] hover:text-[#1A1A1A] transition-colors"
            >
              DASHBOARD &rarr;
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[12px] font-bold tracking-[0.05em] text-[#999] hover:text-[#1A1A1A] transition-colors cursor-pointer">
                SIGN IN
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-[1fr_300px] lg:grid-cols-[1fr_380px] gap-8 sm:gap-12 pt-16 sm:pt-24 pb-16">
            {/* Left: headline */}
            <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p className="text-[12px] font-bold text-[#E30613] tracking-[0.15em] mb-6">
                FOR CLAUDE PRO & MAX
              </p>
              <h1 className="text-[44px] sm:text-[56px] lg:text-[72px] font-black leading-[0.95] tracking-tight">
                Start your
                <br />
                window<span className="text-[#E30613]">.</span>
                <br />
                <span className="text-[#E30613]">On time</span>,
                <br />
                every day.
              </h1>

              <div className="h-0.5 bg-[#1A1A1A] mt-8 mb-8 rule-animate" />

              <p className="text-[16px] text-[#666] leading-[1.7] max-w-md">
                Claude's 5-hour usage window starts when you first message.
                pinchpoint sends an automatic ping at your chosen time, so
                the window is running before you sit down.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-block px-6 py-3 bg-[#E30613] text-white text-[13px] font-bold tracking-[0.05em] hover:bg-[#C00510] transition-colors"
                  >
                    OPEN DASHBOARD
                  </Link>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-6 py-3 bg-[#E30613] text-white text-[13px] font-bold tracking-[0.05em] hover:bg-[#C00510] transition-colors cursor-pointer">
                      GET STARTED
                    </button>
                  </SignInButton>
                </SignedOut>
                <span className="text-[12px] text-[#BBB] font-medium">Free, no card</span>
              </div>
            </div>

            {/* Right: data panel */}
            <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="border-2 border-[#1A1A1A] divide-y-2 divide-[#1A1A1A]">
                <div className="p-5">
                  <div className="text-[10px] font-bold text-[#999] tracking-[0.15em] mb-1">WINDOW</div>
                  <div className="text-[40px] font-black leading-none">5<span className="text-[24px] text-[#E30613] ml-0.5">h</span></div>
                </div>
                <div className="p-5">
                  <div className="text-[10px] font-bold text-[#999] tracking-[0.15em] mb-1">PRECISION</div>
                  <div className="text-[40px] font-black leading-none">15<span className="text-[24px] text-[#E30613] ml-0.5">min</span></div>
                </div>
                <div className="p-5">
                  <div className="text-[10px] font-bold text-[#999] tracking-[0.15em] mb-1">MONTHLY COST</div>
                  <div className="text-[40px] font-black leading-none text-[#E30613]">$0</div>
                </div>
                <div className="p-5 bg-[#F8F8F8]">
                  <div className="text-[10px] font-bold text-[#999] tracking-[0.15em] mb-1">STATUS</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00C853]" />
                    <span className="text-[13px] font-bold">OPERATIONAL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Thick rule */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-1 bg-[#1A1A1A]" />
        </div>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-[200px_1fr] gap-8 sm:gap-12">
            <div>
              <h2 className="text-[12px] font-bold text-[#999] tracking-[0.15em] sticky top-6">
                HOW IT WORKS
              </h2>
            </div>
            <div className="space-y-12">
              <NumberedSection number="01">
                <h3 className="text-[20px] font-black mb-2">Create an account</h3>
                <p className="text-[15px] text-[#666] leading-relaxed max-w-md">
                  Sign up with your email. No credit card. No trial period. Takes ten seconds.
                </p>
              </NumberedSection>

              <NumberedSection number="02">
                <h3 className="text-[20px] font-black mb-2">Connect your Claude token</h3>
                <p className="text-[15px] text-[#666] leading-relaxed max-w-md">
                  Run <code className="text-[13px] bg-[#F5F5F5] px-1.5 py-0.5 border border-[#E5E5E5] font-medium">npx pinchpoint connect</code> in your terminal. One command, one click in your browser.
                </p>
              </NumberedSection>

              <NumberedSection number="03">
                <h3 className="text-[20px] font-black mb-2">Set your schedule</h3>
                <p className="text-[15px] text-[#666] leading-relaxed max-w-md">
                  Choose which days and times. Each day can be different. 15-minute increments with full timezone support.
                </p>
              </NumberedSection>

              <NumberedSection number="04">
                <h3 className="text-[20px] font-black mb-2">Done</h3>
                <p className="text-[15px] text-[#666] leading-relaxed max-w-md">
                  We ping Claude at your time. Your usage window starts automatically, every day. No manual intervention.
                </p>
              </NumberedSection>
            </div>
          </div>
        </section>

        {/* Thin rule */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-px bg-[#E5E5E5]" />
        </div>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-[200px_1fr] gap-8 sm:gap-12">
            <div>
              <h2 className="text-[12px] font-bold text-[#999] tracking-[0.15em] sticky top-6">
                SPECIFICATIONS
              </h2>
            </div>
            <div>
              <div className="border-t-2 border-[#1A1A1A]">
                {[
                  {
                    label: 'Timing',
                    value: "Reads resetsAt from Claude's API. Exact window end time — no estimates.",
                    tag: 'PRECISE',
                  },
                  {
                    label: 'Monitoring',
                    value: 'Auto-pause on consecutive failures. Email alerts for token issues.',
                    tag: 'SMART',
                  },
                  {
                    label: 'Scheduling',
                    value: 'Per-day control, 15-minute increments, timezone-aware. Skip any day.',
                    tag: 'FLEXIBLE',
                  },
                  {
                    label: 'Security',
                    value: 'AES-256-GCM encryption with per-token IV. Never stored in plaintext, never logged.',
                    tag: 'ENCRYPTED',
                  },
                  {
                    label: 'Price',
                    value: '$0/month. No subscriptions. No usage fees. No catch.',
                    tag: 'FREE',
                  },
                ].map((spec, i) => (
                  <div key={i} className="grid grid-cols-[100px_1fr_auto] sm:grid-cols-[140px_1fr_auto] gap-4 items-baseline py-4 border-b border-[#E5E5E5]">
                    <span className="text-[12px] font-bold text-[#1A1A1A] tracking-wide">{spec.label}</span>
                    <span className="text-[14px] text-[#666] leading-relaxed">{spec.value}</span>
                    <span className="text-[10px] font-black tracking-[0.15em] bg-[#E30613] text-white px-2 py-0.5 flex-shrink-0">
                      {spec.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1A1A1A] text-white">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="grid sm:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <h2 className="text-[32px] sm:text-[44px] font-black leading-[1] tracking-tight">
                  Two minutes to<br />configure<span className="text-[#E30613]">.</span>
                </h2>
                <p className="text-[15px] text-white/40 mt-3">Runs every day after that.</p>
              </div>
              <div>
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-block px-8 py-4 bg-[#E30613] text-white text-[13px] font-bold tracking-[0.05em] hover:bg-[#FF1A2B] transition-colors"
                  >
                    OPEN DASHBOARD &rarr;
                  </Link>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-8 py-4 bg-[#E30613] text-white text-[13px] font-bold tracking-[0.05em] hover:bg-[#FF1A2B] transition-colors cursor-pointer">
                      GET STARTED FREE &rarr;
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E5E5E5]">
          <div className="flex items-center gap-4 text-[11px] font-bold tracking-[0.1em] text-[#999]">
            <Link to="/privacy" className="hover:text-[#1A1A1A] transition-colors">PRIVACY</Link>
            <span className="text-[#DDD]">/</span>
            <Link to="/terms" className="hover:text-[#1A1A1A] transition-colors">TERMS</Link>
          </div>
          <p className="text-[10px] text-[#CCC] tracking-[0.1em] font-medium">
            NOT AFFILIATED WITH ANTHROPIC
          </p>
        </footer>
      </div>
    </>
  )
}
