import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction G: "Retro OS"
// Classic operating system aesthetic — title bars, window chrome,
// draggable windows, pixel-perfect borders, system fonts.
// Nostalgic yet functional. Think classic Mac OS meets Windows 95.

function WindowFrame({ title, children, className = '', variant = 'default' }) {
  const [minimized, setMinimized] = useState(false)

  const colors = variant === 'active'
    ? 'bg-[#000080]'
    : 'bg-[#808080]'

  return (
    <div className={`border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] bg-[#C0C0C0] shadow-[2px_2px_0_#000] ${className}`}>
      {/* Title bar */}
      <div className={`${colors} px-2 py-[3px] flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border border-t-white border-l-white border-r-[#404040] border-b-[#404040] bg-[#C0C0C0] flex items-center justify-center">
            <span className="text-[8px] leading-none">■</span>
          </div>
          <span className="text-[11px] text-white font-bold select-none" style={{ fontFamily: '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, sans-serif' }}>
            {title}
          </span>
        </div>
        <div className="flex gap-[2px]">
          <button
            onClick={() => setMinimized(!minimized)}
            className="w-4 h-3.5 border border-t-white border-l-white border-r-[#404040] border-b-[#404040] bg-[#C0C0C0] flex items-center justify-end pr-[1px] cursor-pointer"
          >
            <span className="text-[9px] leading-none font-bold">▼</span>
          </button>
          <div className="w-4 h-3.5 border border-t-white border-l-white border-r-[#404040] border-b-[#404040] bg-[#C0C0C0] flex items-center justify-center">
            <span className="text-[9px] leading-none font-bold">□</span>
          </div>
        </div>
      </div>
      {/* Content */}
      {!minimized && (
        <div className="border-t border-t-[#404040]">
          {children}
        </div>
      )}
    </div>
  )
}

function ProgressBar({ value = 100, label = '', animated = false }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!animated) { setCurrent(value); return }
    const start = Date.now()
    const duration = 1200
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setCurrent(Math.round(progress * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    const t = setTimeout(() => requestAnimationFrame(tick), 300)
    return () => clearTimeout(t)
  }, [animated, value])

  return (
    <div>
      {label && <p className="text-[11px] mb-1" style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>{label}</p>}
      <div className="h-4 border-2 border-t-[#404040] border-l-[#404040] border-r-white border-b-white bg-white">
        <div
          className="h-full bg-[#000080] transition-all duration-100"
          style={{ width: `${current}%` }}
        />
      </div>
    </div>
  )
}

function RetroButton({ children, onClick, primary = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1 text-[12px] font-bold cursor-pointer select-none
        border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040]
        active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white
        ${primary ? 'bg-[#C0C0C0] shadow-[0_0_0_1px_#000]' : 'bg-[#C0C0C0]'}
        ${className}
      `}
      style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}
    >
      {children}
    </button>
  )
}

export default function LandingG() {
  const [bootDone, setBootDone] = useState(false)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const i = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <>
      <style>{`
        .landing-g {
          font-family: 'MS Sans Serif', 'Microsoft Sans Serif', 'Tahoma', 'Geneva', sans-serif;
          image-rendering: pixelated;
        }
        .landing-g * {
          font-family: inherit;
        }
        .landing-g .mono {
          font-family: 'Courier New', 'Courier', monospace;
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes boot-fade {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .boot-in {
          animation: boot-fade 0.3s ease-out forwards;
        }
      `}</style>

      <div className="landing-g min-h-screen" style={{ background: '#008080' }}>
        {/* Taskbar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 h-8 bg-[#C0C0C0] border-t-2 border-t-white flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <button className="h-6 px-2 border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] bg-[#C0C0C0] flex items-center gap-1.5 cursor-pointer active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white">
              <span className="text-[11px] font-bold">⊞ Start</span>
            </button>
            <div className="w-px h-5 bg-[#808080] ml-1" />
            <div className="h-6 px-2 border border-t-[#404040] border-l-[#404040] border-r-white border-b-white bg-[#C0C0C0] flex items-center">
              <span className="text-[11px]">📌 pinchpoint</span>
            </div>
          </div>
          <div className="h-6 px-2 border-2 border-t-[#404040] border-l-[#404040] border-r-white border-b-white flex items-center gap-2">
            <span className="text-[11px]">🔔</span>
            <span className="text-[11px] tabular-nums">
              {clock.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        {/* Desktop */}
        <div className="min-h-screen pb-10 p-4 sm:p-8">
          {/* Desktop icons */}
          <div className="absolute top-4 right-4 flex flex-col gap-4 z-0">
            <SignedIn>
              <Link to="/dashboard" className="flex flex-col items-center gap-1 w-16 group">
                <div className="text-2xl">📊</div>
                <span className="text-[11px] text-white text-center leading-tight group-hover:bg-[#000080] group-hover:text-white px-1">
                  Dashboard
                </span>
              </Link>
            </SignedIn>
            <div className="flex flex-col items-center gap-1 w-16">
              <div className="text-2xl">📁</div>
              <span className="text-[11px] text-white text-center leading-tight px-1">My Schedule</span>
            </div>
            <div className="flex flex-col items-center gap-1 w-16">
              <div className="text-2xl">🗑️</div>
              <span className="text-[11px] text-white text-center leading-tight px-1">Recycle Bin</span>
            </div>
          </div>

          {/* Main window */}
          <div className={`max-w-2xl mx-auto mt-4 sm:mt-8 ${bootDone ? 'boot-in' : 'opacity-0'}`}>
            <WindowFrame title="pinchpoint — Welcome" variant="active">
              {/* Menu bar */}
              <div className="bg-[#C0C0C0] px-1 py-[2px] flex gap-3 border-b border-[#808080]">
                <span className="text-[11px] hover:bg-[#000080] hover:text-white px-1 cursor-pointer"><u>F</u>ile</span>
                <span className="text-[11px] hover:bg-[#000080] hover:text-white px-1 cursor-pointer"><u>E</u>dit</span>
                <span className="text-[11px] hover:bg-[#000080] hover:text-white px-1 cursor-pointer"><u>V</u>iew</span>
                <span className="text-[11px] hover:bg-[#000080] hover:text-white px-1 cursor-pointer"><u>H</u>elp</span>
              </div>

              {/* Content area */}
              <div className="p-5 sm:p-8 bg-white">
                {/* Header with icon */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-4xl flex-shrink-0">📌</div>
                  <div>
                    <h1 className="text-[22px] font-bold text-[#000080] leading-tight">
                      Start your Claude window on schedule
                    </h1>
                    <p className="text-[12px] text-[#808080] mt-1">
                      For Claude Pro & Max subscribers — Version 1.0
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[#C0C0C0] mb-5" />

                <p className="text-[13px] text-[#333] leading-relaxed mb-6">
                  The 5-hour usage window begins when you first message Claude. pinchpoint
                  sends an automatic ping at your chosen time, so the window is already running
                  when you sit down to work.
                </p>

                {/* Stats in a "system properties" style */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="border-2 border-t-[#404040] border-l-[#404040] border-r-white border-b-white p-3 bg-[#F0F0F0]">
                    <div className="text-[20px] font-bold text-[#000080] mono">5h</div>
                    <div className="text-[10px] text-[#808080] mt-0.5">Window length</div>
                  </div>
                  <div className="border-2 border-t-[#404040] border-l-[#404040] border-r-white border-b-white p-3 bg-[#F0F0F0]">
                    <div className="text-[20px] font-bold text-[#000080] mono">15m</div>
                    <div className="text-[10px] text-[#808080] mt-0.5">Precision</div>
                  </div>
                  <div className="border-2 border-t-[#404040] border-l-[#404040] border-r-white border-b-white p-3 bg-[#F0F0F0]">
                    <div className="text-[20px] font-bold text-[#008000] mono">$0</div>
                    <div className="text-[10px] text-[#808080] mt-0.5">Per month</div>
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="flex items-center gap-3 mb-2">
                  <SignedIn>
                    <Link to="/dashboard">
                      <RetroButton primary>Open Dashboard</RetroButton>
                    </Link>
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <RetroButton primary>Pinch Me</RetroButton>
                    </SignInButton>
                  </SignedOut>
                  <span className="text-[11px] text-[#808080]">Free, always.</span>
                </div>
              </div>
            </WindowFrame>
          </div>

          {/* How it works window */}
          <div className={`max-w-2xl mx-auto mt-5 ${bootDone ? 'boot-in' : 'opacity-0'}`} style={{ animationDelay: '0.15s' }}>
            <WindowFrame title="Setup Wizard — How It Works">
              <div className="p-5 sm:p-8 bg-white">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-3xl flex-shrink-0">🧙</div>
                  <div>
                    <h2 className="text-[16px] font-bold text-[#000080]">pinchpoint Setup Wizard</h2>
                    <p className="text-[12px] text-[#808080] mt-0.5">Follow these steps to configure your schedule</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: '1️⃣', title: 'Create an account', desc: 'Sign up with your email. No credit card required.', progress: 100 },
                    { icon: '2️⃣', title: 'Connect your Claude token', desc: 'Run npx pinchpoint connect in your terminal.', progress: 100 },
                    { icon: '3️⃣', title: 'Set your schedule', desc: 'Choose days and times. Each day can be different. 15-minute precision.', progress: 100 },
                    { icon: '4️⃣', title: 'Done!', desc: 'We ping daily at your time. Your window starts automatically.', progress: 100 },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-lg flex-shrink-0 mt-0.5">{step.icon}</span>
                      <div className="flex-1">
                        <h3 className="text-[13px] font-bold text-[#333]">{step.title}</h3>
                        <p className="text-[12px] text-[#808080] mt-0.5">{step.desc}</p>
                        <div className="mt-2">
                          <ProgressBar value={step.progress} animated />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <RetroButton>{'< Back'}</RetroButton>
                  <SignedIn>
                    <Link to="/dashboard">
                      <RetroButton primary>{'Next >'}</RetroButton>
                    </Link>
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <RetroButton primary>{'Next >'}</RetroButton>
                    </SignInButton>
                  </SignedOut>
                </div>
              </div>
            </WindowFrame>
          </div>

          {/* Features window */}
          <div className={`max-w-2xl mx-auto mt-5 ${bootDone ? 'boot-in' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <WindowFrame title="System Properties — Features">
              <div className="p-5 sm:p-8 bg-white">
                {/* Tab bar */}
                <div className="flex mb-5 -mt-1">
                  {['General', 'Security', 'Schedule', 'About'].map((tab, i) => (
                    <div
                      key={tab}
                      className={`px-3 py-1 text-[11px] border border-b-0 cursor-pointer ${
                        i === 0
                          ? 'bg-white border-[#808080] font-bold -mb-px z-10 relative'
                          : 'bg-[#D4D0C8] border-[#808080] text-[#808080]'
                      }`}
                    >
                      {tab}
                    </div>
                  ))}
                </div>

                <div className="border border-[#808080] p-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      {
                        icon: '⏱️',
                        title: 'Exact window timing',
                        desc: "Reads the reset timestamp from Claude's API. Shows the exact minute your window ends.",
                      },
                      {
                        icon: '🛡️',
                        title: 'Health monitoring',
                        desc: 'Auto-pause on failure. Email alerts when your token needs attention.',
                      },
                      {
                        icon: '📅',
                        title: 'Per-day scheduling',
                        desc: '15-minute increments. Different times per day. Full timezone support.',
                      },
                      {
                        icon: '🔒',
                        title: 'Encrypted storage',
                        desc: 'AES-256-GCM encryption. Per-token random IV. Never stored in plaintext.',
                      },
                    ].map((f, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <span className="text-lg flex-shrink-0">{f.icon}</span>
                        <div>
                          <h3 className="text-[12px] font-bold text-[#333]">{f.title}</h3>
                          <p className="text-[11px] text-[#808080] mt-0.5 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                  <SignedIn>
                    <Link to="/dashboard">
                      <RetroButton primary>OK</RetroButton>
                    </Link>
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <RetroButton primary>OK</RetroButton>
                    </SignInButton>
                  </SignedOut>
                  <RetroButton>Cancel</RetroButton>
                </div>
              </div>
            </WindowFrame>
          </div>

          {/* Terminal window */}
          <div className={`max-w-2xl mx-auto mt-5 ${bootDone ? 'boot-in' : 'opacity-0'}`} style={{ animationDelay: '0.45s' }}>
            <WindowFrame title="C:\WINDOWS\system32\cmd.exe">
              <div className="bg-black p-4 mono text-[12px] text-[#C0C0C0] leading-relaxed">
                <p>Microsoft Windows [Version 10.0.26200]</p>
                <p className="text-[#808080]">(c) pinchpoint Corporation. All rights reserved.</p>
                <p className="mt-3">C:\Users\you{'>'} <span className="text-[#00FF00]">npx pinchpoint connect</span></p>
                <p className="mt-2 text-white">  Looking for Claude credentials...</p>
                <p className="text-white">  Found token in ~/.claude/.credentials.json</p>
                <p className="mt-1 text-white">  Opening pinchpoint in your browser...</p>
                <p className="text-[#FFFF00]">  Waiting for approval... </p>
                <p className="text-[#00FF00]">  ✓ Connected!</p>
                <p className="mt-2 text-white">  Set your schedule → https://pinchpoint.dev/dashboard</p>
                <p className="mt-3">C:\Users\you{'>'} <span className="inline-block w-2 h-3.5 bg-[#C0C0C0]" style={{ animation: 'blink-cursor 1s step-end infinite' }} /></p>
              </div>
            </WindowFrame>
          </div>

          {/* Footer */}
          <footer className="max-w-2xl mx-auto mt-8 mb-12 text-center">
            <div className="flex items-center justify-center gap-4 text-[11px] text-white/60">
              <Link to="/privacy" className="hover:text-white transition-colors underline">Privacy</Link>
              <span>|</span>
              <Link to="/terms" className="hover:text-white transition-colors underline">Terms</Link>
              <span>|</span>
              <span>Not affiliated with Anthropic</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
