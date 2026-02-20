import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect, useRef } from 'react'

// Direction E: "Aurora Glass"
// Deep blue/purple backdrop, aurora borealis gradients,
// frosted glass panels, soft glows. Modern, immersive, premium.
// Apple-esque depth with a cosmic twist.

function GlassCard({ children, className = '', delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default function LandingE() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .landing-e * {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        @keyframes pulse-soft {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div className="landing-e min-h-screen relative overflow-hidden text-white"
        style={{
          background: 'linear-gradient(135deg, #0B0E1A 0%, #0F1629 30%, #141B33 60%, #0B0E1A 100%)',
        }}
      >
        {/* Aurora effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-30%] left-[-10%] w-[70%] h-[60%] rounded-full opacity-20 blur-[100px]"
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED, #EC4899)',
              animation: 'float-slow 12s ease-in-out infinite',
            }}
          />
          <div
            className="absolute top-[10%] right-[-20%] w-[50%] h-[50%] rounded-full opacity-15 blur-[120px]"
            style={{
              background: 'linear-gradient(135deg, #06B6D4, #3B82F6, #8B5CF6)',
              animation: 'float-slow 15s ease-in-out 3s infinite',
            }}
          />
          <div
            className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full opacity-10 blur-[80px]"
            style={{
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              animation: 'float-slow 10s ease-in-out 6s infinite',
            }}
          />
        </div>

        {/* Star-like dots */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-px bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.15 + Math.random() * 0.3,
                animation: `pulse-soft ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 5}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white/90">PinchPoint</span>
          </div>
          <SignedIn>
            <Link to="/dashboard" className="text-[13px] font-medium text-white/50 hover:text-white/90 transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[13px] font-medium text-white/50 hover:text-white/90 transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 pt-20 sm:pt-28 pb-20 text-center">
          {/* Live clock badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm mb-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="text-[12px] font-medium text-white/60 tabular-nums">
              {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
            <span className="text-[12px] text-white/30">|</span>
            <span className="text-[12px] text-white/40">Your window could already be running</span>
          </div>

          <h1 className="text-[40px] sm:text-[56px] font-extrabold leading-[1.08] tracking-tight">
            <span className="text-white">Schedule your</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #A78BFA, #EC4899, #F97316)',
                backgroundSize: '200% 200%',
                animation: 'aurora 6s ease infinite',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Claude window
            </span>
          </h1>

          <p className="mt-6 text-[16px] text-white/40 max-w-md mx-auto leading-relaxed">
            Automatically start your 5-hour usage window at the perfect time. Every day. Set it once, forget it forever.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <SignedIn>
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}
              >
                <span>Open dashboard</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}
                >
                  <span>Pinch me</span>
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </SignInButton>
            </SignedOut>
            <span className="text-[13px] text-white/25">Free forever</span>
          </div>
        </section>

        {/* How it works */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-16">
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/30 text-center mb-10">
            How it works
          </p>

          <div className="grid gap-4 max-w-lg mx-auto">
            {[
              { n: '01', title: 'Sign up', desc: 'Create an account in seconds. No credit card.' },
              { n: '02', title: 'Connect Claude', desc: 'One terminal command links your Claude account.' },
              { n: '03', title: 'Set your schedule', desc: 'Pick days and times. Each day can be different.' },
              { n: '04', title: "That's it", desc: 'We ping daily. Your window starts before you wake up.' },
            ].map((step, i) => (
              <GlassCard key={i} delay={200 + i * 100} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="text-[11px] font-bold text-white/20 mt-0.5">{step.n}</span>
                  <div>
                    <h3 className="text-[15px] font-bold text-white/90">{step.title}</h3>
                    <p className="text-[13px] text-white/35 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: '01',
                color: 'from-violet-500/20 to-purple-500/20',
                title: 'Exact window timing',
                desc: "Reads the reset timestamp from Claude's API. Shows the exact minute your window ends.",
              },
              {
                icon: '02',
                color: 'from-cyan-500/20 to-blue-500/20',
                title: 'Health monitoring',
                desc: 'Auto-pause on failure. Email alerts when your token needs attention.',
              },
              {
                icon: '03',
                color: 'from-pink-500/20 to-rose-500/20',
                title: 'Per-day scheduling',
                desc: '15-minute increments. Different times per day. Full timezone support.',
              },
              {
                icon: '04',
                color: 'from-emerald-500/20 to-teal-500/20',
                title: 'Free',
                desc: 'No subscriptions. No limits. Connect your account and go.',
              },
            ].map((f, i) => (
              <GlassCard key={i} delay={400 + i * 100} className="p-6 group hover:bg-white/[0.08] transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                  <span className="text-[11px] font-bold text-white/50">{f.icon}</span>
                </div>
                <h3 className="text-[15px] font-bold text-white/85 group-hover:text-white transition-colors">{f.title}</h3>
                <p className="text-[13px] text-white/30 mt-2 leading-relaxed group-hover:text-white/40 transition-colors">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 max-w-2xl mx-auto px-6 py-20 text-center">
          <GlassCard className="p-10 sm:p-14">
            <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-tight text-white/90 mb-3">
              Ready to take control of your window?
            </h2>
            <p className="text-[14px] text-white/35 mb-8">Two minutes to set up. Runs forever.</p>
            <SignedIn>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white hover:shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}
              >
                Open dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white cursor-pointer hover:shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}
                >
                  Get started free
                </button>
              </SignInButton>
            </SignedOut>
          </GlassCard>
        </section>

        {/* Footer */}
        <footer className="relative z-10 max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-5 text-[12px] text-white/20">
              <Link to="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
            </div>
            <p className="text-[11px] text-white/15">
              Encrypted at rest &middot; Not affiliated with Anthropic
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
