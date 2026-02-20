import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect, useRef } from 'react'

// Direction H: "Neon Cyberpunk"
// Hot pink + cyan on deep black. Grid lines, glitch effects,
// scanlines, neon glow. Blade Runner meets Tokyo nightlife.
// High energy, futuristic, unapologetically bold.

function GlitchText({ children, className = '' }) {
  return (
    <span className={`glitch-text relative inline-block ${className}`} data-text={children}>
      {children}
    </span>
  )
}

function NeonBadge({ children, color = 'pink' }) {
  const colors = {
    pink: { text: '#FF2D78', shadow: 'rgba(255,45,120,0.5)', border: 'rgba(255,45,120,0.3)' },
    cyan: { text: '#00F0FF', shadow: 'rgba(0,240,255,0.5)', border: 'rgba(0,240,255,0.3)' },
    yellow: { text: '#FFE600', shadow: 'rgba(255,230,0,0.5)', border: 'rgba(255,230,0,0.3)' },
  }
  const c = colors[color]
  return (
    <span
      className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] border"
      style={{
        color: c.text,
        borderColor: c.border,
        textShadow: `0 0 8px ${c.shadow}`,
      }}
    >
      {children}
    </span>
  )
}

function ScanLines() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 opacity-[0.04]"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
      }}
    />
  )
}

function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.06]">
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}

export default function LandingH() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap');

        .landing-h {
          font-family: 'Rajdhani', sans-serif;
        }
        .landing-h .display {
          font-family: 'Orbitron', sans-serif;
        }

        @keyframes glitch-1 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          20% { clip-path: inset(20% 0 40% 0); transform: translate(-2px, 1px); }
          40% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
          60% { clip-path: inset(30% 0 50% 0); transform: translate(-1px, 2px); }
          80% { clip-path: inset(70% 0 5% 0); transform: translate(1px, -2px); }
        }

        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .glitch-text::before {
          color: #FF2D78;
          animation: glitch-1 3s infinite linear;
          opacity: 0.5;
        }
        .glitch-text::after {
          color: #00F0FF;
          animation: glitch-1 3s infinite linear reverse;
          opacity: 0.5;
        }

        @keyframes neon-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes line-scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fade-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .neon-border-pink {
          box-shadow: 0 0 10px rgba(255,45,120,0.15), inset 0 0 10px rgba(255,45,120,0.05);
          border: 1px solid rgba(255,45,120,0.2);
        }
        .neon-border-cyan {
          box-shadow: 0 0 10px rgba(0,240,255,0.15), inset 0 0 10px rgba(0,240,255,0.05);
          border: 1px solid rgba(0,240,255,0.2);
        }
      `}</style>

      <div className="landing-h min-h-screen relative overflow-hidden text-white" style={{ background: '#080010' }}>
        <ScanLines />
        <GridBackground />

        {/* Horizontal scan line */}
        <div
          className="fixed left-0 right-0 h-px pointer-events-none z-40 opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)',
            animation: 'line-scan 4s linear infinite',
          }}
        />

        {/* Ambient glow blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20 blur-[120px]"
          style={{ background: '#FF2D78' }}
        />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full opacity-15 blur-[100px]"
          style={{ background: '#00F0FF' }}
        />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border border-[#FF2D78]/40"
              style={{ boxShadow: '0 0 12px rgba(255,45,120,0.3)' }}
            >
              <span className="display text-[10px] font-bold text-[#FF2D78]">PP</span>
            </div>
            <span className="display text-[14px] font-bold tracking-wider"
              style={{ color: '#FF2D78', textShadow: '0 0 10px rgba(255,45,120,0.5)' }}
            >
              PINCHPOINT
            </span>
          </div>
          <SignedIn>
            <Link to="/dashboard" className="text-[13px] font-semibold text-[#00F0FF]/60 hover:text-[#00F0FF] transition-colors tracking-wide">
              DASHBOARD
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[13px] font-semibold text-white/40 hover:text-[#00F0FF] transition-colors cursor-pointer tracking-wide">
                SIGN IN
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 sm:pt-28 pb-20 text-center">
          <div className={loaded ? 'fade-up' : 'opacity-0'}>
            <NeonBadge color="cyan">For Claude Pro & Max</NeonBadge>
          </div>

          <div className={loaded ? 'fade-up' : 'opacity-0'} style={{ animationDelay: '0.1s' }}>
            <h1 className="display text-[36px] sm:text-[52px] lg:text-[64px] font-black leading-[1.05] tracking-tight mt-8">
              <span className="text-white">SCHEDULE YOUR</span>
              <br />
              <GlitchText className="text-[#FF2D78]" style={{ textShadow: '0 0 30px rgba(255,45,120,0.5)' }}>
                CLAUDE WINDOW
              </GlitchText>
            </h1>
          </div>

          <div className={loaded ? 'fade-up' : 'opacity-0'} style={{ animationDelay: '0.2s' }}>
            <p className="mt-6 text-[16px] text-white/35 max-w-md mx-auto leading-relaxed font-medium">
              Auto-start your 5-hour usage window at the exact time you choose.
              Set it once. Forget it forever.
            </p>
          </div>

          <div className={loaded ? 'fade-up' : 'opacity-0'} style={{ animationDelay: '0.3s' }}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="group display inline-flex items-center gap-2.5 px-7 py-3.5 text-[13px] font-bold tracking-wider text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #FF2D78, #FF0055)',
                    boxShadow: '0 0 20px rgba(255,45,120,0.3), 0 0 60px rgba(255,45,120,0.1)',
                  }}
                >
                  <span>DASHBOARD</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    className="group display inline-flex items-center gap-2.5 px-7 py-3.5 text-[13px] font-bold tracking-wider text-white cursor-pointer transition-all hover:shadow-[0_0_40px_rgba(255,45,120,0.4)]"
                    style={{
                      background: 'linear-gradient(135deg, #FF2D78, #FF0055)',
                      boxShadow: '0 0 20px rgba(255,45,120,0.3), 0 0 60px rgba(255,45,120,0.1)',
                    }}
                  >
                    <span>JACK IN</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-[12px] text-white/20 tracking-wider font-semibold">FREE // FOREVER</span>
            </div>
          </div>

          {/* Stats */}
          <div className={`mt-16 flex items-center justify-center gap-8 sm:gap-14 ${loaded ? 'fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            {[
              { val: '5H', label: 'WINDOW', color: '#FF2D78' },
              { val: '15M', label: 'PRECISION', color: '#00F0FF' },
              { val: '$0', label: 'COST', color: '#FFE600' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="display text-[28px] sm:text-[36px] font-black" style={{ color: s.color, textShadow: `0 0 20px ${s.color}40` }}>
                  {s.val}
                </div>
                <div className="text-[10px] text-white/30 tracking-[0.2em] font-semibold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #FF2D78, #00F0FF, transparent)' }} />
        </div>

        {/* How it works */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
          <h2 className="display text-[11px] font-bold tracking-[0.3em] text-[#00F0FF] text-center mb-12"
            style={{ textShadow: '0 0 10px rgba(0,240,255,0.5)' }}
          >
            // INITIALIZATION SEQUENCE
          </h2>

          <div className="space-y-1">
            {[
              { n: '01', title: 'CREATE ACCOUNT', desc: 'Sign up in seconds. No payment. No trial.', color: '#FF2D78' },
              { n: '02', title: 'CONNECT CLAUDE', desc: 'One terminal command. Auto-detects your token.', color: '#00F0FF' },
              { n: '03', title: 'SET SCHEDULE', desc: 'Pick days and times. 15-min precision. Per-day control.', color: '#FFE600' },
              { n: '04', title: 'EXECUTE', desc: 'Daily auto-ping. Window starts before you wake up.', color: '#FF2D78' },
            ].map((step, i) => (
              <div
                key={i}
                className="group flex items-center gap-5 p-5 transition-all hover:bg-white/[0.02] neon-border-pink"
                style={{ borderColor: `${step.color}15` }}
              >
                <span className="display text-[11px] font-bold tracking-widest w-8 flex-shrink-0"
                  style={{ color: step.color, textShadow: `0 0 8px ${step.color}80` }}
                >
                  {step.n}
                </span>
                <div className="flex-1">
                  <h3 className="display text-[14px] font-bold tracking-wide text-white/80 group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-white/25 mt-0.5 font-medium group-hover:text-white/40 transition-colors">{step.desc}</p>
                </div>
                <svg className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: 'EXACT TIMING',
                desc: "Reads resetsAt from Claude's API. Shows the exact minute your window ends.",
                color: '#FF2D78',
                tag: 'PRECISE',
              },
              {
                title: 'HEALTH MONITOR',
                desc: 'Auto-pause on failure. Email alerts when your token needs attention.',
                color: '#00F0FF',
                tag: 'SMART',
              },
              {
                title: 'PER-DAY SCHEDULE',
                desc: 'Different times each day. Skip weekends. Full timezone support.',
                color: '#FFE600',
                tag: 'FLEXIBLE',
              },
              {
                title: 'AES-256 ENCRYPTED',
                desc: 'Your token is encrypted at rest with per-token IV. Never plaintext.',
                color: '#FF2D78',
                tag: 'SECURE',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-5 group transition-all hover:bg-white/[0.02]"
                style={{
                  border: `1px solid ${f.color}15`,
                  boxShadow: `0 0 10px ${f.color}08`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <NeonBadge color={f.color === '#FF2D78' ? 'pink' : f.color === '#00F0FF' ? 'cyan' : 'yellow'}>
                    {f.tag}
                  </NeonBadge>
                </div>
                <h3 className="display text-[14px] font-bold text-white/80 tracking-wide group-hover:text-white transition-colors">
                  {f.title}
                </h3>
                <p className="text-[13px] text-white/25 mt-2 leading-relaxed font-medium group-hover:text-white/40 transition-colors">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-16">
          <div className="p-10 sm:p-14 text-center neon-border-pink relative overflow-hidden">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#FF2D78]/40" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#FF2D78]/40" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#FF2D78]/40" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#FF2D78]/40" />

            <h2 className="display text-[22px] sm:text-[28px] font-black tracking-tight text-white/90">
              READY TO <span style={{ color: '#FF2D78', textShadow: '0 0 20px rgba(255,45,120,0.5)' }}>OPTIMIZE</span> YOUR WINDOW?
            </h2>
            <p className="text-[14px] text-white/25 mt-3 font-medium">Two minutes to set up. Runs every day after that.</p>

            <div className="mt-8">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="display inline-flex items-center gap-2 px-7 py-3.5 text-[13px] font-bold tracking-wider text-white transition-all hover:shadow-[0_0_40px_rgba(0,240,255,0.3)]"
                  style={{
                    background: 'linear-gradient(135deg, #00B4D8, #00F0FF)',
                    boxShadow: '0 0 20px rgba(0,240,255,0.2)',
                  }}
                >
                  OPEN DASHBOARD
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    className="display inline-flex items-center gap-2 px-7 py-3.5 text-[13px] font-bold tracking-wider text-white cursor-pointer transition-all hover:shadow-[0_0_40px_rgba(0,240,255,0.3)]"
                    style={{
                      background: 'linear-gradient(135deg, #00B4D8, #00F0FF)',
                      boxShadow: '0 0 20px rgba(0,240,255,0.2)',
                    }}
                  >
                    JACK IN
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 max-w-5xl mx-auto px-6 py-8">
          <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,45,120,0.2), transparent)' }} />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-5 text-[12px] text-white/20 font-semibold tracking-wide">
              <Link to="/privacy" className="hover:text-[#FF2D78] transition-colors">PRIVACY</Link>
              <span className="text-white/10">//</span>
              <Link to="/terms" className="hover:text-[#FF2D78] transition-colors">TERMS</Link>
            </div>
            <p className="text-[11px] text-white/10 tracking-wider font-semibold">
              NOT AFFILIATED WITH ANTHROPIC
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
