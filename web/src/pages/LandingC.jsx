import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect, useRef } from 'react'

// Direction C: "Premium Minimal"
// Ultra-clean. Near-monochrome with one sharp accent.
// Generous whitespace, refined typography, every pixel considered.
// Inspired by Vercel/Linear — restraint as a feature.

function FadeIn({ children, delay = 0, className = '' }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function TimelineStep({ number, title, desc, isLast }) {
  return (
    <div className="flex gap-6 group">
      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E5E5E5] group-hover:border-[#171717] flex items-center justify-center text-xs font-semibold text-[#999] group-hover:text-[#171717] transition-all duration-300">
          {number}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-[#E5E5E5] to-transparent mt-2" />
        )}
      </div>

      {/* Content */}
      <div className="pb-10">
        <h3 className="text-[15px] font-semibold text-[#171717] tracking-tight">{title}</h3>
        <p className="text-[14px] text-[#888] mt-1 leading-relaxed max-w-sm">{desc}</p>
      </div>
    </div>
  )
}

export default function LandingC() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function handleMove(e) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');

        .landing-c * {
          font-family: 'Instrument Sans', -apple-system, sans-serif;
        }

        .landing-c h1,
        .landing-c h2 {
          letter-spacing: -0.03em;
        }

        .gradient-text {
          background: linear-gradient(135deg, #171717 30%, #666 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .shimmer-border {
          position: relative;
        }
        .shimmer-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: conic-gradient(from var(--angle, 0deg), transparent 60%, rgba(0,0,0,0.08) 70%, transparent 80%);
          animation: shimmer 6s linear infinite;
          z-index: -1;
        }

        @keyframes shimmer {
          to { --angle: 360deg; }
        }

        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>

      <div className="landing-c min-h-screen bg-[#FAFAFA] text-[#171717] relative overflow-hidden">
        {/* Subtle radial gradient that follows cursor */}
        <div
          className="fixed inset-0 pointer-events-none opacity-30 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.015), transparent)`,
          }}
        />

        {/* Very subtle top grain */}
        <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            backgroundSize: '128px 128px',
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between max-w-3xl mx-auto px-6 py-6">
          <span className="text-[15px] font-semibold tracking-tight text-[#171717]">PinchPoint</span>
          <SignedIn>
            <Link
              to="/dashboard"
              className="text-[13px] font-medium text-[#666] hover:text-[#171717] transition-colors"
            >
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[13px] font-medium text-[#999] hover:text-[#171717] transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 pt-24 sm:pt-32 pb-20">
          <FadeIn>
            <p className="text-[13px] font-medium text-[#999] tracking-wide uppercase mb-6">
              For Claude Pro &amp; Max subscribers
            </p>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="text-[44px] sm:text-[64px] font-bold leading-[1.05] tracking-tight">
              <span className="gradient-text">
                Start your window
              </span>
              <br />
              <span className="gradient-text">
                before you start working.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="mt-8 text-[17px] text-[#888] max-w-md leading-[1.7]">
              Schedule a daily ping so your 5-hour Claude window is
              already running when you sit down. Set it and forget it.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="mt-10 flex items-center gap-5">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-[#171717] text-white rounded-full text-[14px] font-medium hover:bg-[#333] transition-all hover:shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.12)]"
                >
                  <span>Open dashboard</span>
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="group inline-flex items-center gap-2 px-6 py-3 bg-[#171717] text-white rounded-full text-[14px] font-medium hover:bg-[#333] transition-all cursor-pointer hover:shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.12)]">
                    <span>Pinch me</span>
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-[13px] text-[#CCC]">Free</span>
            </div>
          </FadeIn>
        </section>

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-[#E5E5E5] to-transparent" />
        </div>

        {/* How it works — vertical timeline */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
          <FadeIn>
            <h2 className="text-[28px] font-bold tracking-tight mb-12">How it works</h2>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="max-w-md">
              <TimelineStep
                number="1"
                title="Create an account"
                desc="Sign up in seconds. No credit card, no trial period."
              />
              <TimelineStep
                number="2"
                title="Link your Claude token"
                desc="Run npx pinchpoint connect in your terminal. One command, one click."
              />
              <TimelineStep
                number="3"
                title="Set your schedule"
                desc="Choose which days and times. Each day can be different."
              />
              <TimelineStep
                number="4"
                title="Done"
                desc="We ping Claude at your time. Your window starts automatically, every day."
                isLast
              />
            </div>
          </FadeIn>
        </section>

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-[#E5E5E5] to-transparent" />
        </div>

        {/* Features — clean 2-col grid */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
          <FadeIn>
            <h2 className="text-[28px] font-bold tracking-tight mb-12">Details</h2>
          </FadeIn>

          <div className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
            {[
              {
                title: 'Exact timing',
                desc: "We read the reset timestamp from Claude's API. Your dashboard shows the exact minute your window ends.",
              },
              {
                title: 'Health monitoring',
                desc: 'If your token fails, we email you and pause automatically. No silent failures.',
              },
              {
                title: 'Per-day control',
                desc: '15-minute increments. Different times per day. Skip weekends. Your schedule, your rules.',
              },
              {
                title: 'Free',
                desc: 'No subscriptions. No usage fees. No catch. Connect and go.',
              },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="group">
                  <h3 className="text-[15px] font-semibold text-[#171717] mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-[14px] text-[#888] leading-[1.7]">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Minimal CTA band */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
          <FadeIn>
            <div className="bg-[#171717] rounded-2xl p-10 sm:p-14 text-center">
              <h2 className="text-white text-[24px] sm:text-[28px] font-bold tracking-tight mb-3">
                Stop losing your morning window.
              </h2>
              <p className="text-[#888] text-[15px] mb-8">
                Two minutes to set up. Runs every day after that.
              </p>
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#171717] rounded-full text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors"
                >
                  Go to dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#171717] rounded-full text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors cursor-pointer">
                    Get started
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </FadeIn>
        </section>

        {/* Footer */}
        <footer className="relative z-10 max-w-3xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-5 text-[13px] text-[#BBB]">
              <Link to="/privacy" className="hover:text-[#666] transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-[#666] transition-colors">Terms</Link>
            </div>
            <p className="text-[12px] text-[#CCC]">
              Encrypted at rest &middot; Not affiliated with Anthropic
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
