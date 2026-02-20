import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction B: "Warm & Playful"
// Soft peach/coral/amber palette, rounded shapes, hand-drawn feel.
// Warm gradients, bouncy micro-interactions, friendly voice.
// Font: Satoshi (via CDN) for geometric warmth.

function FloatingShape({ className, delay = 0 }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        animation: `float 8s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  )
}

function StepCard({ number, title, desc, color, delay }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const colors = {
    coral: 'from-[#FF8A80] to-[#FF5252]',
    amber: 'from-[#FFD54F] to-[#FFB300]',
    teal: 'from-[#80CBC4] to-[#26A69A]',
    violet: 'from-[#CE93D8] to-[#AB47BC]',
  }

  return (
    <div
      className={`group relative transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} text-white text-sm font-bold mb-4 shadow-sm`}>
          {number}
        </div>
        <h3 className="text-[#2D2421] font-bold text-[17px] mb-1.5">{title}</h3>
        <p className="text-[#8B7E78] text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function FeatureRow({ icon, title, desc }) {
  return (
    <div className="group flex gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/60 border border-white/50 shadow-sm flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-[#2D2421] text-[15px]">{title}</h3>
        <p className="text-[#8B7E78] text-sm mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function LandingB() {
  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

        .landing-b * {
          font-family: 'DM Sans', sans-serif;
        }

        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-20px) rotate(3deg); }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      <div className="landing-b min-h-screen relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #FFF5F0 0%, #FFEEE4 25%, #FFF8F0 50%, #F0F4FF 100%)',
        }}
      >
        {/* Floating decorative shapes */}
        <FloatingShape className="w-[300px] h-[300px] bg-[#FFD6C7]/20 blur-[80px] top-[-50px] right-[-80px]" delay={0} />
        <FloatingShape className="w-[200px] h-[200px] bg-[#C7E0FF]/25 blur-[60px] top-[40%] left-[-60px]" delay={2} />
        <FloatingShape className="w-[250px] h-[250px] bg-[#FFE5B4]/20 blur-[70px] bottom-[10%] right-[-40px]" delay={4} />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2.5">
            {/* Little pinch icon */}
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF8A65] to-[#FF5722] shadow-[0_2px_8px_rgba(255,87,34,0.3)] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2L12 8M12 16L12 22M2 12L8 12M16 12L22 12" />
                </svg>
              </div>
            </div>
            <span className="text-[17px] font-bold text-[#2D2421] tracking-tight">PinchPoint</span>
          </div>

          <SignedIn>
            <Link to="/dashboard" className="text-sm font-semibold text-[#FF5722] hover:text-[#E64A19] transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm font-medium text-[#8B7E78] hover:text-[#2D2421] transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="relative z-10 max-w-2xl mx-auto px-6 pt-16 sm:pt-24 pb-16 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-white/60 shadow-sm backdrop-blur-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#4CAF50] opacity-75" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4CAF50]" />
            </span>
            <span className="text-xs font-medium text-[#6B5E58]">Free &amp; open — no credit card needed</span>
          </div>

          <h1 className="text-[40px] sm:text-[52px] font-bold text-[#2D2421] leading-[1.1] tracking-tight">
            Your Claude window,{' '}
            <span
              className="relative inline-block"
              style={{
                background: 'linear-gradient(135deg, #FF5722, #FF8A65)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              on your time
              <svg className="absolute -bottom-1 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none" preserveAspectRatio="none">
                <path d="M1 5.5C40 2 80 1 100 3C120 5 160 6 199 2.5" stroke="#FFB74D" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'wiggle 3s ease-in-out infinite' }} />
              </svg>
            </span>
          </h1>

          <p className="mt-7 text-[17px] text-[#8B7E78] max-w-md mx-auto leading-relaxed">
            Claude's 5-hour usage window starts when you first message. PinchPoint
            pings it at your chosen time, so it's already running when you sit down.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <SignedIn>
              <Link
                to="/dashboard"
                className="group px-7 py-3.5 rounded-2xl font-semibold text-white text-[15px] shadow-[0_4px_20px_rgba(255,87,34,0.3)] hover:shadow-[0_6px_28px_rgba(255,87,34,0.4)] transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #FF5722, #FF8A65)' }}
              >
                Go to dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  className="group px-7 py-3.5 rounded-2xl font-semibold text-white text-[15px] shadow-[0_4px_20px_rgba(255,87,34,0.3)] hover:shadow-[0_6px_28px_rgba(255,87,34,0.4)] transition-all cursor-pointer hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #FF5722, #FF8A65)' }}
                >
                  Pinch me &rarr;
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          {/* Terminal preview */}
          <div className="mt-14 max-w-sm mx-auto">
            <div className="bg-[#1E1E1E] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] overflow-hidden border border-[#333]">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#2A2A2A]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                </div>
                <span className="text-[10px] text-[#888] font-mono ml-1">Terminal</span>
              </div>
              <div className="p-4 font-mono text-[13px] leading-relaxed text-left">
                <div className="text-[#888]">$ <span className="text-[#C8E6C9]">npx pinchpoint connect</span></div>
                <div className="text-[#999] mt-2 text-xs">
                  <div>Looking for Claude credentials...</div>
                  <div className="text-[#81C784]">Found token in ~/.claude/.credentials.json</div>
                  <div className="mt-1">Opening PinchPoint in your browser...</div>
                  <div>Waiting for approval... <span className="text-[#81C784]">approved!</span></div>
                  <div className="mt-1 text-[#81C784]">Your Claude account is linked.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#2D2421] text-center mb-3">How it works</h2>
          <p className="text-center text-sm text-[#8B7E78] mb-10">Four steps. Two minutes. Zero hassle.</p>

          <div className="grid gap-4 max-w-lg mx-auto">
            <StepCard number="1" title="Sign up" desc="Create an account — takes 10 seconds." color="coral" delay={100} />
            <StepCard number="2" title="Connect Claude" desc="Run one command in your terminal to link your Claude account." color="amber" delay={200} />
            <StepCard number="3" title="Set your schedule" desc="Pick which days and times you want your window to start." color="teal" delay={300} />
            <StepCard number="4" title="That's it" desc="Every day at your time, we send a tiny ping. Your window is running before you open your laptop." color="violet" delay={400} />
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 max-w-2xl mx-auto px-6 py-16">
          <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-white/60 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8 sm:p-10">
            <h2 className="text-xl font-bold text-[#2D2421] mb-8">Why PinchPoint?</h2>

            <div className="space-y-7">
              <FeatureRow
                icon={<span role="img" aria-label="clock">&#9201;</span>}
                title="Exact window timing"
                desc="We capture the exact reset time from Claude's API, so your dashboard shows precisely when your window ends."
              />
              <FeatureRow
                icon={<span role="img" aria-label="shield">&#128737;</span>}
                title="Token health monitoring"
                desc="If your token stops working, we'll email you and auto-pause your schedule. No wasted pings."
              />
              <FeatureRow
                icon={<span role="img" aria-label="calendar">&#128197;</span>}
                title="Per-day scheduling"
                desc="Different time on Monday than Thursday? Skip weekends? Set each day independently with 15-minute precision."
              />
              <FeatureRow
                icon={<span role="img" aria-label="sparkles">&#10024;</span>}
                title="Completely free"
                desc="No subscriptions. No per-ping charges. Just connect your account and go."
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          <div className="border-t border-[#E8DDD6]/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm text-[#A89E98]">
              <Link to="/privacy" className="hover:text-[#6B5E58] transition-colors">Privacy</Link>
              <span>&middot;</span>
              <Link to="/terms" className="hover:text-[#6B5E58] transition-colors">Terms</Link>
            </div>
            <p className="text-xs text-[#BDB2AB]">
              Your token is encrypted at rest. Not affiliated with Anthropic.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
