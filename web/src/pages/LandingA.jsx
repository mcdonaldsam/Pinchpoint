import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect, useRef } from 'react'

// Direction A: "Terminal Noir"
// Dark, developer-focused. CRT scan lines, phosphor green glow, monospace typography.
// The landing page itself feels like a terminal session booting up.

function TypewriterText({ text, delay = 0, speed = 35, className = '', onComplete }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(startTimer)
  }, [delay])

  useEffect(() => {
    if (!started) return
    if (displayed.length < text.length) {
      const timer = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1))
      }, speed)
      return () => clearTimeout(timer)
    } else if (onComplete) {
      onComplete()
    }
  }, [displayed, started, text, speed, onComplete])

  return (
    <span className={className}>
      {displayed}
      {started && displayed.length < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-[#4ade80] ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  )
}

function GlowText({ children, className = '' }) {
  return (
    <span className={`relative ${className}`}>
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 blur-md opacity-40 z-0" aria-hidden="true">{children}</span>
    </span>
  )
}

function TerminalCard({ title, children, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`border border-[#2a2a2a] rounded-lg bg-[#0a0a0a]/80 backdrop-blur-sm transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2a2a2a]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[11px] text-[#555] font-mono ml-2">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function LandingA() {
  const [heroReady, setHeroReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] relative overflow-hidden">
      {/* Scan line overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)',
          backgroundSize: '100% 2px',
        }}
      />

      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(74,222,128,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,222,128,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orb top-right */}
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[#4ade80] opacity-[0.03] blur-[120px]" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
          <span className="font-mono text-sm font-bold tracking-wider text-[#4ade80]">PINCHPOINT</span>
        </div>
        <SignedIn>
          <Link to="/dashboard" className="font-mono text-xs text-[#4ade80]/70 hover:text-[#4ade80] transition-colors border border-[#4ade80]/20 px-3 py-1.5 rounded hover:border-[#4ade80]/40 hover:shadow-[0_0_12px_rgba(74,222,128,0.1)]">
            ./dashboard
          </Link>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="font-mono text-xs text-[#888] hover:text-[#4ade80] transition-colors cursor-pointer">
              sign_in
            </button>
          </SignInButton>
        </SignedOut>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-24 pb-20">
        <div className="font-mono text-xs text-[#555] mb-6">
          <TypewriterText text="$ pinchpoint --help" delay={400} speed={50} onComplete={() => {}} />
        </div>

        <h1 className="font-mono text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-0">
          {heroReady && (
            <>
              <span className="text-[#e0e0e0]">Start your Claude window</span>
              <br />
              <GlowText className="text-[#4ade80]">
                exactly when you want it
              </GlowText>
            </>
          )}
        </h1>

        <p className="mt-8 text-[15px] text-[#777] max-w-lg leading-relaxed font-mono">
          Claude Pro and Max give you a 5-hour usage window. pinchpoint starts it
          at the time you choose — your window is already running when you sit down to work.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <SignedIn>
            <Link
              to="/dashboard"
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-[#4ade80] text-[#050505] rounded-lg font-mono text-sm font-bold hover:bg-[#6ee7a0] transition-all hover:shadow-[0_0_30px_rgba(74,222,128,0.3)]"
            >
              <span>./dashboard</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="group relative inline-flex items-center gap-2 px-6 py-3 bg-[#4ade80] text-[#050505] rounded-lg font-mono text-sm font-bold hover:bg-[#6ee7a0] transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(74,222,128,0.3)]">
                <span>pinch_me</span>
                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </button>
            </SignInButton>
          </SignedOut>
          <span className="font-mono text-xs text-[#444]">// free forever</span>
        </div>
      </section>

      {/* How it works — styled as terminal output */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="font-mono text-xs text-[#555] mb-8">
          <span className="text-[#4ade80]">$</span> pinchpoint explain --steps
        </div>

        <div className="space-y-4">
          {[
            { cmd: '01', title: 'Sign up', desc: 'Create an account — takes 10 seconds.' },
            { cmd: '02', title: 'Connect Claude', desc: 'Run one command in your terminal to link your Claude account.' },
            { cmd: '03', title: 'Set your schedule', desc: 'Pick which days and times you want your window to start.' },
            { cmd: '04', title: "That's it", desc: 'Every day at your time, we send a tiny ping. Your window is running before you open your laptop.' },
          ].map((step, i) => (
            <TerminalCard key={i} title={`step_${step.cmd}.sh`} delay={600 + i * 150}>
              <div className="flex items-start gap-4">
                <span className="font-mono text-[#4ade80] text-xs mt-0.5 opacity-60">{step.cmd}</span>
                <div>
                  <h3 className="font-mono font-bold text-[#e0e0e0] text-sm">{step.title}</h3>
                  <p className="font-mono text-xs text-[#666] mt-1.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </TerminalCard>
          ))}
        </div>
      </section>

      {/* Features — terminal-style grid */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="border-t border-[#1a1a1a] pt-16">
          <div className="font-mono text-xs text-[#555] mb-10">
            <span className="text-[#4ade80]">$</span> pinchpoint features --list
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                flag: '--exact-timing',
                title: 'Exact window timing',
                desc: 'We capture the exact reset time from Claude\'s API. Your dashboard shows precisely when your window ends — no guessing.',
              },
              {
                flag: '--health-check',
                title: 'Token health monitoring',
                desc: 'If your token stops working, we email you and auto-pause. No wasted pings, no surprises.',
              },
              {
                flag: '--per-day',
                title: 'Per-day scheduling',
                desc: 'Different time Monday than Thursday? Skip weekends? Set each day independently with 15-minute precision.',
              },
              {
                flag: '--free',
                title: 'Free',
                desc: 'No subscriptions. No per-ping charges. Just connect your account and go.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group border border-[#1a1a1a] rounded-lg p-5 hover:border-[#4ade80]/20 transition-all hover:bg-[#4ade80]/[0.02]"
              >
                <code className="font-mono text-[10px] text-[#4ade80]/50 tracking-wider">{f.flag}</code>
                <h3 className="font-mono font-bold text-sm text-[#ccc] mt-2 group-hover:text-[#e0e0e0] transition-colors">{f.title}</h3>
                <p className="font-mono text-xs text-[#555] mt-2 leading-relaxed group-hover:text-[#666] transition-colors">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="border border-[#1a1a1a] rounded-xl p-10 bg-[#0a0a0a]/60 backdrop-blur-sm">
          <div className="font-mono text-xs text-[#555] mb-4">
            <span className="text-[#4ade80]">$</span> pinchpoint connect
          </div>
          <p className="font-mono text-[#777] text-sm mb-6">Ready to stop wasting your Claude window?</p>
          <SignedIn>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#4ade80] text-[#050505] rounded-lg font-mono text-sm font-bold hover:bg-[#6ee7a0] transition-all hover:shadow-[0_0_30px_rgba(74,222,128,0.3)]"
            >
              Open dashboard &rarr;
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex items-center gap-2 px-8 py-3 bg-[#4ade80] text-[#050505] rounded-lg font-mono text-sm font-bold hover:bg-[#6ee7a0] transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(74,222,128,0.3)]">
                Pinch me &rarr;
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl mx-auto px-6 py-8 border-t border-[#1a1a1a]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 font-mono text-[11px] text-[#444]">
            <Link to="/privacy" className="hover:text-[#4ade80]/70 transition-colors">privacy</Link>
            <span className="text-[#222]">|</span>
            <Link to="/terms" className="hover:text-[#4ade80]/70 transition-colors">terms</Link>
          </div>
          <p className="font-mono text-[10px] text-[#333]">
            Token encrypted at rest &middot; Not affiliated with Anthropic
          </p>
        </div>
      </footer>
    </div>
  )
}
