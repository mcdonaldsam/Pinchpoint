import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction D: "Brutalist Editorial"
// Raw, confident, newspaper-inspired. Bold type, stark contrasts,
// visible grid, no rounded corners, thick borders.
// Feels like a zine meets a technical spec sheet.

function MarqueeBar({ text, speed = 30 }) {
  return (
    <div className="overflow-hidden border-y-2 border-[#1a1a1a] bg-[#EDFF00] py-1.5">
      <div
        className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]"
        style={{
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        {Array(8).fill(text).join('  ///  ')}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

function GridStep({ number, title, desc }) {
  return (
    <div className="border-2 border-[#1a1a1a] p-5 hover:bg-[#EDFF00] transition-colors group">
      <div className="text-[64px] font-black leading-none text-[#1a1a1a]/10 group-hover:text-[#1a1a1a]/20 transition-colors mb-2">
        {number}
      </div>
      <h3 className="text-[15px] font-black uppercase tracking-wide text-[#1a1a1a]">{title}</h3>
      <p className="text-[13px] text-[#666] mt-2 leading-relaxed group-hover:text-[#1a1a1a]/70">{desc}</p>
    </div>
  )
}

export default function LandingD() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700&family=Instrument+Serif:ital@0;1&display=swap');

        .landing-d {
          font-family: 'Space Mono', monospace;
        }
        .landing-d .serif {
          font-family: 'Instrument Serif', serif;
        }
      `}</style>

      <div className="landing-d min-h-screen bg-[#F5F0EB] text-[#1a1a1a]">
        {/* Top bar */}
        <div className="border-b-2 border-[#1a1a1a] px-6 py-2 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-[#999]">
          <span>Est. 2026</span>
          <span>Sydney, AU</span>
          <span>v1.0.0</span>
        </div>

        {/* Nav */}
        <nav className="border-b-2 border-[#1a1a1a] flex items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">PINCH<span className="text-[#EDFF00] bg-[#1a1a1a] px-1">POINT</span></span>
          <SignedIn>
            <Link to="/dashboard" className="text-[11px] font-bold uppercase tracking-[0.15em] border-2 border-[#1a1a1a] px-4 py-2 hover:bg-[#1a1a1a] hover:text-[#F5F0EB] transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[11px] font-bold uppercase tracking-[0.15em] border-2 border-[#1a1a1a] px-4 py-2 hover:bg-[#1a1a1a] hover:text-[#F5F0EB] transition-colors cursor-pointer">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="border-b-2 border-[#1a1a1a]">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#999] mb-6">
              For Claude Pro & Max subscribers
            </p>
            <h1 className="text-[48px] sm:text-[72px] lg:text-[88px] font-black leading-[0.95] tracking-tight uppercase">
              Start your
              <br />
              <span className="serif italic normal-case text-[52px] sm:text-[76px] lg:text-[96px]">
                Claude window
              </span>
              <br />
              on schedule
              <span className="inline-block w-3 h-3 bg-[#EDFF00] ml-2 -translate-y-4" />
            </h1>
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-6">
              <p className="text-[13px] text-[#666] max-w-sm leading-relaxed">
                The 5-hour usage window starts when you first message. We ping at your chosen time so it's running before you sit down. Free.
              </p>
              <div className="flex gap-3">
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-block text-[12px] font-bold uppercase tracking-[0.1em] px-6 py-3 bg-[#1a1a1a] text-[#F5F0EB] border-2 border-[#1a1a1a] hover:bg-[#EDFF00] hover:text-[#1a1a1a] transition-colors"
                  >
                    Dashboard &rarr;
                  </Link>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-[12px] font-bold uppercase tracking-[0.1em] px-6 py-3 bg-[#1a1a1a] text-[#F5F0EB] border-2 border-[#1a1a1a] hover:bg-[#EDFF00] hover:text-[#1a1a1a] transition-colors cursor-pointer">
                      Pinch Me &rarr;
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <MarqueeBar text="FREE FOREVER /// NO CREDIT CARD /// ENCRYPTED AT REST /// SET IT AND FORGET IT" />

        {/* How it works */}
        <section className="border-b-2 border-[#1a1a1a]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-baseline justify-between mb-10">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em]">How it works</h2>
              <span className="text-[11px] text-[#999] tracking-[0.1em]">04 steps</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-0 -m-[1px]">
              <GridStep number="01" title="Sign up" desc="Create an account. Ten seconds. No card." />
              <GridStep number="02" title="Connect" desc="Run one command to link your Claude account." />
              <GridStep number="03" title="Schedule" desc="Pick days and times. 15-minute precision." />
              <GridStep number="04" title="Done" desc="We ping daily at your time. Window starts automatically." />
            </div>
          </div>
        </section>

        {/* Features — spec sheet style */}
        <section className="border-b-2 border-[#1a1a1a]">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-10">Specifications</h2>
            <div className="divide-y-2 divide-[#1a1a1a] border-y-2 border-[#1a1a1a]">
              {[
                { label: 'Window timing', value: 'Exact — reads resetsAt from Claude API', tag: 'PRECISE' },
                { label: 'Health monitoring', value: 'Auto-pause on failure + email alerts', tag: 'SMART' },
                { label: 'Schedule', value: 'Per-day, 15-min increments, timezone-aware', tag: 'FLEXIBLE' },
                { label: 'Price', value: '$0/month forever', tag: 'FREE' },
                { label: 'Token storage', value: 'AES-256-GCM, per-token IV, encrypted at rest', tag: 'SECURE' },
              ].map((spec, i) => (
                <div key={i} className="flex items-center justify-between py-4 gap-4">
                  <span className="text-[12px] font-bold uppercase tracking-wide w-40 flex-shrink-0">{spec.label}</span>
                  <span className="text-[13px] text-[#666] flex-1">{spec.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-[#1a1a1a] text-[#EDFF00] px-2 py-1 flex-shrink-0">
                    {spec.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1a1a1a] text-[#F5F0EB] border-b-2 border-[#1a1a1a]">
          <div className="max-w-5xl mx-auto px-6 py-20 text-center">
            <h2 className="text-[32px] sm:text-[48px] font-black uppercase leading-tight">
              Stop wasting
              <br />
              <span className="serif italic normal-case text-[36px] sm:text-[52px]">your morning window</span>
            </h2>
            <div className="mt-8">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-block text-[12px] font-bold uppercase tracking-[0.1em] px-8 py-3 bg-[#EDFF00] text-[#1a1a1a] border-2 border-[#EDFF00] hover:bg-transparent hover:text-[#EDFF00] transition-colors"
                >
                  Open Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-[12px] font-bold uppercase tracking-[0.1em] px-8 py-3 bg-[#EDFF00] text-[#1a1a1a] border-2 border-[#EDFF00] hover:bg-transparent hover:text-[#EDFF00] transition-colors cursor-pointer">
                    Get Started &rarr;
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.15em] text-[#999]">
            <Link to="/privacy" className="hover:text-[#1a1a1a] transition-colors">Privacy</Link>
            <span>/</span>
            <Link to="/terms" className="hover:text-[#1a1a1a] transition-colors">Terms</Link>
          </div>
          <p className="text-[10px] text-[#BBB] uppercase tracking-[0.1em]">
            Not affiliated with Anthropic
          </p>
        </footer>
      </div>
    </>
  )
}
