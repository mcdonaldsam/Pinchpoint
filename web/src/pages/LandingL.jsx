import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction L: "Y2K Gradient"
// Bold candy gradients, bubbly shapes, glossy buttons,
// early 2000s web nostalgia with modern execution.
// Think iMac G3, frutiger aero, glossy orbs, playful excess.

function BlobShape({ className = '', color1, color2, size = 200 }) {
  return (
    <div
      className={`absolute rounded-full blur-[60px] opacity-40 pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
      }}
    />
  )
}

function GlossyPill({ children, className = '', gradient = 'from-[#FF6B9D] to-[#C84B8A]' }) {
  return (
    <span className={`inline-block px-3 py-1 text-[11px] font-bold text-white rounded-full bg-gradient-to-b ${gradient} shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] ${className}`}>
      {children}
    </span>
  )
}

function CountUp({ end, duration = 1000, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    const t = setTimeout(() => requestAnimationFrame(tick), 500)
    return () => clearTimeout(t)
  }, [end, duration])
  return <>{prefix}{count}{suffix}</>
}

function GlossyCard({ children, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>
      {/* Glossy top highlight */}
      <div className="absolute top-0 left-0 right-0 h-[50%] bg-gradient-to-b from-white/50 to-transparent pointer-events-none rounded-t-2xl" />
      <div className="relative">{children}</div>
    </div>
  )
}

export default function LandingL() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Fredoka:wght@300;400;500;600;700&display=swap');

        .landing-l {
          font-family: 'Nunito', -apple-system, sans-serif;
        }
        .landing-l .display {
          font-family: 'Fredoka', 'Nunito', sans-serif;
        }

        @keyframes float-y2k {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(2deg); }
          66% { transform: translateY(-6px) rotate(-1deg); }
        }

        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .candy-gradient {
          background: linear-gradient(135deg, #FF6B9D, #C84B8A, #7B68EE, #4FC3F7, #81C784);
          background-size: 300% 300%;
          animation: gradient-shift 8s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes pop-in {
          0% { opacity: 0; transform: scale(0.8) translateY(12px); }
          60% { transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .pop-in { animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; opacity: 0; }
      `}</style>

      <div className="landing-l min-h-screen relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FFF5F8 0%, #F0F0FF 30%, #E8F8FF 60%, #F5FFF5 100%)',
        }}
      >
        {/* Floating blobs */}
        <BlobShape className="top-[-5%] left-[-5%]" color1="#FF9EC6" color2="#FF6B9D" size={300} />
        <BlobShape className="top-[10%] right-[-8%]" color1="#A78BFA" color2="#7C3AED" size={250} />
        <BlobShape className="top-[40%] left-[5%]" color1="#67E8F9" color2="#22D3EE" size={200} />
        <BlobShape className="bottom-[5%] right-[10%]" color1="#86EFAC" color2="#34D399" size={180} />
        <BlobShape className="bottom-[20%] left-[20%]" color1="#FCD34D" color2="#F59E0B" size={150} />

        {/* Decorative spinning shape */}
        <div className="absolute top-20 right-[15%] w-16 h-16 pointer-events-none opacity-20"
          style={{ animation: 'spin-slow 20s linear infinite' }}
        >
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M32 0 L38 26 L64 32 L38 38 L32 64 L26 38 L0 32 L26 26 Z" fill="#C084FC" />
          </svg>
        </div>
        <div className="absolute bottom-40 left-[10%] w-12 h-12 pointer-events-none opacity-15"
          style={{ animation: 'spin-slow 15s linear infinite reverse' }}
        >
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M32 0 L38 26 L64 32 L38 38 L32 64 L26 38 L0 32 L26 26 Z" fill="#FB923C" />
          </svg>
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B9D] to-[#C84B8A] flex items-center justify-center shadow-[0_2px_8px_rgba(255,107,157,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
              <span className="text-white text-[11px] font-bold">P</span>
            </div>
            <span className="display text-[17px] font-semibold text-[#4A3560]">PinchPoint</span>
          </div>
          <SignedIn>
            <Link to="/dashboard" className="text-[13px] font-bold text-[#9B8AB8] hover:text-[#6B4F8A] transition-colors">
              Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[13px] font-bold text-[#9B8AB8] hover:text-[#6B4F8A] transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        {/* Hero */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 pt-16 sm:pt-24 pb-16 text-center">
          <div className={loaded ? 'pop-in' : 'opacity-0'}>
            <GlossyPill gradient="from-[#A78BFA] to-[#7C3AED]">For Claude Pro & Max</GlossyPill>
          </div>

          <div className={loaded ? 'pop-in' : 'opacity-0'} style={{ animationDelay: '0.1s' }}>
            <h1 className="display text-[42px] sm:text-[58px] lg:text-[68px] font-bold leading-[1.1] mt-6">
              <span className="text-[#3D2B52]">Schedule your</span>
              <br />
              <span className="candy-gradient">Claude window!</span>
            </h1>
          </div>

          <div className={loaded ? 'pop-in' : 'opacity-0'} style={{ animationDelay: '0.2s' }}>
            <p className="mt-5 text-[17px] text-[#8B7BA0] max-w-md mx-auto leading-relaxed font-medium">
              Auto-start your 5-hour usage window at the perfect time.
              Set it once and forget it forever~
            </p>
          </div>

          <div className={loaded ? 'pop-in' : 'opacity-0'} style={{ animationDelay: '0.3s' }}>
            <div className="mt-8 flex items-center justify-center gap-4">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(124,58,237,0.3),0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)' }}
                >
                  Dashboard
                  <span className="text-white/60 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all">&rarr;</span>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[15px] font-bold text-white cursor-pointer shadow-[0_4px_16px_rgba(255,107,157,0.3),0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_6px_24px_rgba(255,107,157,0.4)] hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #FF6B9D, #C84B8A)' }}
                  >
                    Pinch me!
                    <span className="text-white/60 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all">&rarr;</span>
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-[13px] text-[#B8AAD0] font-semibold">Free forever!</span>
            </div>
          </div>

          {/* Stats orbs */}
          <div className="mt-14 flex items-center justify-center gap-6 sm:gap-10">
            {[
              { val: 5, suffix: 'h', label: 'Window', from: '#FF6B9D', to: '#C84B8A' },
              { val: 15, suffix: 'm', label: 'Precision', from: '#A78BFA', to: '#7C3AED' },
              { val: 0, suffix: '', label: 'Cost', from: '#4FC3F7', to: '#2196F3', prefix: '$' },
            ].map((s, i) => (
              <div key={i} className={`text-center ${loaded ? 'pop-in' : 'opacity-0'}`} style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.1),inset_0_2px_0_rgba(255,255,255,0.3)] relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
                >
                  {/* Glossy highlight */}
                  <div className="absolute top-0 left-[10%] right-[10%] h-[45%] bg-gradient-to-b from-white/40 to-transparent rounded-full" />
                  <span className="relative display text-[24px] sm:text-[28px] font-bold text-white">
                    <CountUp end={s.val} prefix={s.prefix} suffix={s.suffix} />
                  </span>
                </div>
                <p className="text-[12px] text-[#9B8AB8] mt-2 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-14">
          <h2 className="display text-[28px] font-bold text-[#3D2B52] text-center mb-10">
            How it works <span className="inline-block" style={{ animation: 'float-y2k 3s ease-in-out infinite' }}>✨</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { n: '1', title: 'Sign up', desc: 'Create an account in seconds. No credit card needed!', color: 'from-[#FF6B9D] to-[#F472B6]', emoji: '👋' },
              { n: '2', title: 'Connect Claude', desc: 'Run one command in your terminal to link your account.', color: 'from-[#A78BFA] to-[#8B5CF6]', emoji: '🔗' },
              { n: '3', title: 'Set your schedule', desc: 'Pick days & times. Each day can be different!', color: 'from-[#67E8F9] to-[#22D3EE]', emoji: '📅' },
              { n: '4', title: 'That\'s it!', desc: 'We ping daily. Your window starts before you wake up.', color: 'from-[#86EFAC] to-[#34D399]', emoji: '🎉' },
            ].map((step, i) => (
              <GlossyCard key={i} className="p-5 group hover:scale-[1.02] transition-transform">
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] flex-shrink-0`}>
                    <span className="text-lg">{step.emoji}</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#3D2B52]">{step.title}</h3>
                    <p className="text-[13px] text-[#8B7BA0] mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </GlossyCard>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-14">
          <h2 className="display text-[28px] font-bold text-[#3D2B52] text-center mb-10">
            What you get <span className="inline-block" style={{ animation: 'float-y2k 3s ease-in-out 0.5s infinite' }}>💎</span>
          </h2>

          <GlossyCard className="p-6 sm:p-8">
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'Exact timing', desc: "Reads the real reset timestamp from Claude's API. No guessing!", pill: 'Precise', color: 'from-[#FF6B9D] to-[#C84B8A]' },
                { title: 'Health checks', desc: 'Auto-pause on failure + email alerts. We\'ve got your back.', pill: 'Smart', color: 'from-[#A78BFA] to-[#7C3AED]' },
                { title: 'Per-day control', desc: '15-min precision. Different times per day. Timezone support.', pill: 'Flexible', color: 'from-[#67E8F9] to-[#0EA5E9]' },
                { title: 'Encrypted', desc: 'AES-256-GCM with per-token IV. Your token is super safe.', pill: 'Secure', color: 'from-[#86EFAC] to-[#22C55E]' },
              ].map((f, i) => (
                <div key={i} className="group">
                  <GlossyPill gradient={`${f.color}`} className="mb-2">{f.pill}</GlossyPill>
                  <h3 className="text-[15px] font-bold text-[#3D2B52] mt-2">{f.title}</h3>
                  <p className="text-[13px] text-[#8B7BA0] mt-1 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </GlossyCard>
        </section>

        {/* CTA */}
        <section className="relative z-10 max-w-2xl mx-auto px-6 py-14">
          <GlossyCard className="p-10 sm:p-14 text-center relative overflow-hidden">
            {/* Extra blob inside */}
            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 rounded-full bg-gradient-to-br from-[#FF6B9D]/20 to-[#C84B8A]/10 blur-[40px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 rounded-full bg-gradient-to-br from-[#A78BFA]/20 to-[#7C3AED]/10 blur-[40px] pointer-events-none" />

            <div className="relative">
              <h2 className="display text-[26px] sm:text-[32px] font-bold text-[#3D2B52]">
                Ready to get started?
              </h2>
              <p className="text-[15px] text-[#8B7BA0] mt-2 font-medium">Two minutes to set up. Runs forever after that!</p>
              <div className="mt-7">
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(124,58,237,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:scale-[1.02] transition-all"
                    style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)' }}
                  >
                    Open dashboard
                  </Link>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold text-white cursor-pointer shadow-[0_4px_16px_rgba(255,107,157,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_24px_rgba(255,107,157,0.4)] hover:scale-[1.02] transition-all"
                      style={{ background: 'linear-gradient(135deg, #FF6B9D, #C84B8A)' }}
                    >
                      Let's go! 🚀
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </GlossyCard>
        </section>

        {/* Footer */}
        <footer className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-[12px] text-[#B8AAD0] font-semibold">
              <Link to="/privacy" className="hover:text-[#6B4F8A] transition-colors">Privacy</Link>
              <span className="text-[#D4CCE8]">&bull;</span>
              <Link to="/terms" className="hover:text-[#6B4F8A] transition-colors">Terms</Link>
            </div>
            <p className="text-[11px] text-[#CCC4DE]">
              Not affiliated with Anthropic
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
