import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction J: "Art Deco"
// Gold on deep black/navy. Geometric patterns, ornamental borders,
// elegant serif typography, 1920s luxury. Think Gatsby meets SaaS.
// Opulent, confident, timeless sophistication.

function GoldRule({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent opacity-40" />
      <div className="w-2 h-2 rotate-45 border border-[#C9A96E]/40" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent opacity-40" />
    </div>
  )
}

function DecoCorners({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Corner ornaments */}
      <svg className="absolute top-0 left-0 w-6 h-6 text-[#C9A96E]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M0 8 L0 0 L8 0" />
        <path d="M0 4 L4 0" />
      </svg>
      <svg className="absolute top-0 right-0 w-6 h-6 text-[#C9A96E]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 0 L24 0 L24 8" />
        <path d="M20 0 L24 4" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-6 h-6 text-[#C9A96E]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M0 16 L0 24 L8 24" />
        <path d="M0 20 L4 24" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-6 h-6 text-[#C9A96E]/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 16 L24 24 L16 24" />
        <path d="M24 20 L20 24" />
      </svg>
      {children}
    </div>
  )
}

function CountUp({ end, duration = 1200, suffix = '' }) {
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
    const t = setTimeout(() => requestAnimationFrame(tick), 600)
    return () => clearTimeout(t)
  }, [end, duration])
  return <>{count}{suffix}</>
}

export default function LandingJ() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Josefin+Sans:wght@100;200;300;400;500;600;700&display=swap');

        .landing-j {
          font-family: 'Josefin Sans', sans-serif;
        }
        .landing-j .display {
          font-family: 'Playfair Display', Georgia, serif;
        }
        .landing-j .elegant {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        @keyframes gold-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .gold-text {
          background: linear-gradient(90deg, #C9A96E 0%, #F0D78C 25%, #C9A96E 50%, #F0D78C 75%, #C9A96E 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gold-shimmer 4s linear infinite;
        }

        @keyframes fade-up-j {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-up-j { animation: fade-up-j 0.8s ease-out forwards; opacity: 0; }

        .deco-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23C9A96E' stroke-width='0.5' opacity='0.06'/%3E%3C/svg%3E");
          background-size: 40px 40px;
        }
      `}</style>

      <div className="landing-j min-h-screen text-[#E8DCC8] relative"
        style={{ background: 'linear-gradient(180deg, #0A0A0F 0%, #0D0D15 50%, #0A0A0F 100%)' }}
      >
        {/* Deco pattern overlay */}
        <div className="fixed inset-0 pointer-events-none deco-pattern" />

        {/* Subtle radial */}
        <div className="fixed inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(201,169,110,0.04) 0%, transparent 70%)' }}
        />

        {/* Nav */}
        <nav className="relative z-10 max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[#C9A96E]/40 rotate-45 flex items-center justify-center">
              <span className="display text-[10px] font-bold text-[#C9A96E] -rotate-45">PP</span>
            </div>
            <span className="text-[13px] font-light tracking-[0.3em] text-[#C9A96E]/80">PINCHPOINT</span>
          </div>
          <SignedIn>
            <Link to="/dashboard" className="text-[11px] tracking-[0.2em] text-[#C9A96E]/50 hover:text-[#C9A96E] transition-colors font-light">
              DASHBOARD
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[11px] tracking-[0.2em] text-[#C9A96E]/50 hover:text-[#C9A96E] transition-colors cursor-pointer font-light">
                ENTER
              </button>
            </SignInButton>
          </SignedOut>
        </nav>

        <GoldRule className="max-w-4xl mx-auto px-6" />

        {/* Hero */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 pt-20 sm:pt-28 pb-16 text-center">
          <div className={visible ? 'fade-up-j' : 'opacity-0'}>
            <p className="text-[11px] tracking-[0.4em] text-[#C9A96E]/60 font-light mb-8">
              FOR THE DISCERNING CLAUDE SUBSCRIBER
            </p>
          </div>

          <div className={visible ? 'fade-up-j' : 'opacity-0'} style={{ animationDelay: '0.15s' }}>
            <h1 className="display text-[44px] sm:text-[64px] lg:text-[76px] font-bold leading-[1.05] tracking-tight">
              <span className="gold-text">Your Window,</span>
              <br />
              <span className="text-[#E8DCC8]">Your </span>
              <em className="text-[#C9A96E]">Schedule</em>
            </h1>
          </div>

          <div className={visible ? 'fade-up-j' : 'opacity-0'} style={{ animationDelay: '0.3s' }}>
            <p className="elegant text-[20px] sm:text-[22px] text-[#E8DCC8]/40 mt-8 max-w-lg mx-auto leading-relaxed font-light italic">
              Claude's five-hour usage window begins at first contact.
              We ensure it begins precisely when you desire.
            </p>
          </div>

          <div className={visible ? 'fade-up-j' : 'opacity-0'} style={{ animationDelay: '0.45s' }}>
            <div className="mt-10 flex items-center justify-center gap-5">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-3 px-8 py-3.5 border border-[#C9A96E]/40 text-[#C9A96E] text-[12px] tracking-[0.2em] font-light hover:bg-[#C9A96E]/10 transition-all"
                >
                  <span>DASHBOARD</span>
                  <span className="text-[#C9A96E]/40 group-hover:text-[#C9A96E] transition-colors">&rarr;</span>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="group inline-flex items-center gap-3 px-8 py-3.5 border border-[#C9A96E]/40 text-[#C9A96E] text-[12px] tracking-[0.2em] font-light hover:bg-[#C9A96E]/10 transition-all cursor-pointer">
                    <span>BEGIN</span>
                    <span className="text-[#C9A96E]/40 group-hover:text-[#C9A96E] transition-colors">&rarr;</span>
                  </button>
                </SignInButton>
              </SignedOut>
              <span className="text-[11px] tracking-[0.15em] text-[#E8DCC8]/20 font-light">COMPLIMENTARY</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-0 max-w-md mx-auto">
            {[
              { val: 5, suffix: 'h', label: 'Window' },
              { val: 15, suffix: 'm', label: 'Precision' },
              { val: 0, suffix: '', label: 'Cost', prefix: '$' },
            ].map((s, i) => (
              <DecoCorners key={i} className="p-6">
                <div className="text-center">
                  <div className="display text-[36px] font-bold gold-text">
                    {s.prefix}<CountUp end={s.val} suffix={s.suffix} />
                  </div>
                  <div className="text-[10px] tracking-[0.3em] text-[#E8DCC8]/30 mt-2 font-light">
                    {s.label.toUpperCase()}
                  </div>
                </div>
              </DecoCorners>
            ))}
          </div>
        </section>

        <GoldRule className="max-w-4xl mx-auto px-6 my-4" />

        {/* How it works */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
          <p className="text-center text-[11px] tracking-[0.4em] text-[#C9A96E]/60 font-light mb-14">
            THE ARRANGEMENT
          </p>

          <div className="space-y-0">
            {[
              { n: 'I', title: 'Establish Your Account', desc: 'A moment of your time. No payment required.' },
              { n: 'II', title: 'Present Your Credentials', desc: 'A single terminal command links your Claude account to our service.' },
              { n: 'III', title: 'Compose Your Schedule', desc: 'Select your preferred days and times. Each day may differ. Quarter-hour precision.' },
              { n: 'IV', title: 'Rest Assured', desc: 'We attend to the rest. Your window commences at the appointed hour, every day.' },
            ].map((step, i) => (
              <div key={i} className="group flex items-start gap-6 py-7 border-b border-[#C9A96E]/10 last:border-0">
                <span className="display text-[28px] font-bold text-[#C9A96E]/20 group-hover:text-[#C9A96E]/40 transition-colors w-12 text-right flex-shrink-0 pt-0.5">
                  {step.n}
                </span>
                <div>
                  <h3 className="display text-[18px] font-semibold text-[#E8DCC8]/80 group-hover:text-[#C9A96E] transition-colors">
                    {step.title}
                  </h3>
                  <p className="elegant text-[16px] text-[#E8DCC8]/30 mt-1.5 leading-relaxed italic font-light">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <GoldRule className="max-w-4xl mx-auto px-6 my-4" />

        {/* Features */}
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
          <p className="text-center text-[11px] tracking-[0.4em] text-[#C9A96E]/60 font-light mb-14">
            DISTINCTIONS
          </p>

          <div className="grid sm:grid-cols-2 gap-8">
            {[
              {
                title: 'Precise Timekeeping',
                desc: "We consult Claude's own reset timestamp. Your dashboard displays the exact minute — no approximations.",
              },
              {
                title: 'Vigilant Monitoring',
                desc: 'Should your token falter, we notify you by post and pause automatically. No silent failures.',
              },
              {
                title: 'Bespoke Scheduling',
                desc: 'Quarter-hour increments. Distinct times for each day. Full timezone accommodation.',
              },
              {
                title: 'Vault-Grade Security',
                desc: 'AES-256-GCM encryption with unique initialization vector per token. Never plaintext. Never logged.',
              },
            ].map((f, i) => (
              <DecoCorners key={i} className="p-7 group">
                <h3 className="display text-[17px] font-semibold text-[#C9A96E] mb-3">{f.title}</h3>
                <p className="elegant text-[15px] text-[#E8DCC8]/30 leading-relaxed italic font-light group-hover:text-[#E8DCC8]/45 transition-colors">
                  {f.desc}
                </p>
              </DecoCorners>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 max-w-3xl mx-auto px-6 py-16">
          <DecoCorners className="p-10 sm:p-14 text-center border border-[#C9A96E]/15 bg-[#C9A96E]/[0.02]">
            <p className="text-[11px] tracking-[0.4em] text-[#C9A96E]/60 font-light mb-4">THE INVITATION</p>
            <h2 className="display text-[26px] sm:text-[32px] font-bold leading-tight">
              <span className="gold-text">Two minutes to arrange.</span>
            </h2>
            <p className="elegant text-[17px] text-[#E8DCC8]/25 mt-3 italic font-light">A lifetime of punctuality thereafter.</p>
            <div className="mt-8">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-3 px-8 py-3.5 bg-[#C9A96E] text-[#0A0A0F] text-[12px] tracking-[0.2em] font-medium hover:bg-[#D4B87A] transition-colors"
                >
                  OPEN DASHBOARD
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center gap-3 px-8 py-3.5 bg-[#C9A96E] text-[#0A0A0F] text-[12px] tracking-[0.2em] font-medium hover:bg-[#D4B87A] transition-colors cursor-pointer">
                    ACCEPT THE INVITATION
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </DecoCorners>
        </section>

        {/* Footer */}
        <GoldRule className="max-w-4xl mx-auto px-6" />
        <footer className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-5 text-[11px] tracking-[0.15em] text-[#C9A96E]/25 font-light">
              <Link to="/privacy" className="hover:text-[#C9A96E]/60 transition-colors">PRIVACY</Link>
              <span className="text-[#C9A96E]/10">&middot;</span>
              <Link to="/terms" className="hover:text-[#C9A96E]/60 transition-colors">TERMS</Link>
            </div>
            <p className="text-[10px] tracking-[0.2em] text-[#C9A96E]/15 font-light">
              NOT AFFILIATED WITH ANTHROPIC
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
