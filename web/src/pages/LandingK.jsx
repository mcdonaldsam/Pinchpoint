import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

// Direction K: "The Daily Pinch — Newspaper"
// Broadsheet newspaper layout. Multi-column, serif headlines,
// dateline, byline, classified-ad sections, pull quotes.
// Ink on newsprint. Information-dense, editorial authority.

function Dateline() {
  const [now] = useState(new Date())
  const day = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="text-center border-b border-[#2A2520] pb-2">
      <p className="text-[10px] tracking-[0.3em] text-[#8B8070] mb-1">
        ESTABLISHED 2026 &bull; SYDNEY, AUSTRALIA &bull; FREE OF CHARGE
      </p>
      <p className="text-[11px] text-[#8B8070]">{day}</p>
    </div>
  )
}

function PullQuote({ children }) {
  return (
    <blockquote className="border-t-2 border-b-2 border-[#2A2520] py-4 my-6">
      <p className="headline text-[22px] sm:text-[26px] leading-tight text-center italic text-[#2A2520]">
        &ldquo;{children}&rdquo;
      </p>
    </blockquote>
  )
}

export default function LandingK() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Crimson+Pro:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500&display=swap');

        .landing-k {
          font-family: 'Crimson Pro', 'Georgia', serif;
          color: #2A2520;
        }
        .landing-k .headline {
          font-family: 'Libre Baskerville', 'Georgia', serif;
        }
        .landing-k .subhead {
          font-family: 'Lora', 'Georgia', serif;
        }

        .landing-k .drop-cap::first-letter {
          font-family: 'Libre Baskerville', serif;
          float: left;
          font-size: 3.5em;
          line-height: 0.8;
          padding-right: 8px;
          padding-top: 4px;
          font-weight: 700;
          color: #2A2520;
        }

        .newsprint-bg {
          background: #F5F0E8;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="landing-k min-h-screen newsprint-bg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Masthead */}
          <header className="text-center mb-2">
            <div className="border-t-4 border-b border-[#2A2520] pt-3 pb-2 mb-2">
              <SignedIn>
                <div className="flex justify-end mb-1">
                  <Link to="/dashboard" className="text-[11px] text-[#8B8070] hover:text-[#2A2520] transition-colors underline">
                    Go to Dashboard
                  </Link>
                </div>
              </SignedIn>
              <SignedOut>
                <div className="flex justify-end mb-1">
                  <SignInButton mode="modal">
                    <button className="text-[11px] text-[#8B8070] hover:text-[#2A2520] transition-colors cursor-pointer underline">
                      Sign In
                    </button>
                  </SignInButton>
                </div>
              </SignedOut>
              <h1 className="headline text-[48px] sm:text-[72px] lg:text-[84px] font-bold leading-none tracking-tight">
                The Daily Pinch
              </h1>
              <p className="text-[13px] text-[#8B8070] mt-1 italic">
                All the Claude news that's fit to schedule
              </p>
            </div>
            <Dateline />
          </header>

          {/* Lead story */}
          <article className="mt-6">
            <div className="border-b-2 border-[#2A2520] pb-1 mb-4">
              <h2 className="headline text-[32px] sm:text-[44px] font-bold leading-[1.1] tracking-tight">
                New Service Promises to Start Your Claude Window Before You Wake Up
              </h2>
              <p className="subhead text-[18px] sm:text-[20px] text-[#6B6055] mt-2 italic leading-snug">
                Free tool automates the five-hour usage window for Pro and Max subscribers;
                supporters say it could change how people use Claude every morning
              </p>
            </div>

            <div className="flex gap-2 items-baseline text-[12px] text-[#8B8070] mb-4">
              <span className="font-bold text-[#2A2520] not-italic">By PinchPoint Staff</span>
              <span>&bull;</span>
              <span>5 min read</span>
            </div>

            {/* Two column article */}
            <div className="sm:columns-2 gap-8 text-[16px] leading-[1.75] text-[#3D3630]">
              <p className="drop-cap mb-4">
                PinchPoint, a new scheduling service launched this week, addresses a peculiar
                problem faced by Claude Pro and Max subscribers: the five-hour usage window
                that begins the moment you send your first message.
              </p>
              <p className="mb-4">
                For many users, this means the window starts when they sit down at their desk —
                not when they actually need it. Hours can be wasted before the working day begins
                in earnest, and the window closes just as momentum builds.
              </p>
              <p className="mb-4">
                The service works by sending an automated ping to Claude at a user-specified time,
                ensuring the window is already running when they're ready to work. Configuration
                takes roughly two minutes.
              </p>
              <p className="mb-4">
                &ldquo;We read the exact reset timestamp from Claude's API,&rdquo; a spokesperson
                said. &ldquo;The dashboard shows the precise minute your window ends — no estimates.&rdquo;
              </p>
              <p className="mb-4">
                The service is free, requires no credit card, and supports per-day scheduling
                with 15-minute precision across all timezones. Tokens are encrypted with AES-256-GCM
                and never stored in plaintext.
              </p>
            </div>
          </article>

          <PullQuote>Set it once. Forget it forever.</PullQuote>

          {/* How it works - sidebar style */}
          <div className="grid sm:grid-cols-[1fr_280px] gap-8 mt-8">
            <div>
              <div className="border-t-2 border-b border-[#2A2520] py-1 mb-4">
                <h3 className="headline text-[13px] font-bold tracking-[0.1em]">HOW IT WORKS</h3>
              </div>
              <div className="space-y-5">
                {[
                  { title: 'Create an Account', desc: 'Sign up with your email address. No credit card is required, and there is no trial period. The process takes approximately ten seconds.' },
                  { title: 'Connect Your Claude Token', desc: 'Run a single command in your terminal: npx pinchpoint connect. The CLI automatically detects your existing Claude credentials.' },
                  { title: 'Set Your Schedule', desc: 'Choose which days and times you\'d like the ping to fire. Each day can have a different time. Supports 15-minute increments with full timezone support.' },
                  { title: 'Relax', desc: 'PinchPoint handles the rest. Your Claude usage window will start at your chosen time, every scheduled day, without any further action required.' },
                ].map((step, i) => (
                  <div key={i}>
                    <h4 className="subhead text-[16px] font-bold text-[#2A2520] mb-1">
                      <span className="text-[#8B8070]">{i + 1}.</span> {step.title}
                    </h4>
                    <p className="text-[15px] text-[#6B6055] leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <aside>
              <div className="border-t-2 border-b border-[#2A2520] py-1 mb-4">
                <h3 className="headline text-[13px] font-bold tracking-[0.1em]">AT A GLANCE</h3>
              </div>

              <div className="space-y-4">
                <div className="border-b border-[#D5CCBE] pb-4">
                  <div className="headline text-[36px] font-bold text-[#2A2520] leading-none">5 hours</div>
                  <p className="text-[13px] text-[#8B8070] mt-1">Claude window duration</p>
                </div>
                <div className="border-b border-[#D5CCBE] pb-4">
                  <div className="headline text-[36px] font-bold text-[#2A2520] leading-none">15 min</div>
                  <p className="text-[13px] text-[#8B8070] mt-1">Schedule precision</p>
                </div>
                <div className="border-b border-[#D5CCBE] pb-4">
                  <div className="headline text-[36px] font-bold text-[#2A2520] leading-none">$0</div>
                  <p className="text-[13px] text-[#8B8070] mt-1">Monthly subscription</p>
                </div>
                <div>
                  <div className="headline text-[36px] font-bold text-[#2A2520] leading-none">AES-256</div>
                  <p className="text-[13px] text-[#8B8070] mt-1">Token encryption</p>
                </div>
              </div>

              {/* Classified-style CTA */}
              <div className="mt-6 border-2 border-[#2A2520] p-4 bg-[#EDE8DD]">
                <p className="headline text-[11px] font-bold tracking-[0.15em] text-center mb-2">
                  — CLASSIFIED —
                </p>
                <p className="text-[14px] text-[#2A2520] text-center leading-snug mb-3">
                  <strong>WANTED:</strong> Claude subscribers who are tired
                  of wasting their morning window. Free service, no obligations.
                </p>
                <div className="text-center">
                  <SignedIn>
                    <Link
                      to="/dashboard"
                      className="inline-block text-[12px] font-bold text-[#2A2520] border-2 border-[#2A2520] px-4 py-2 hover:bg-[#2A2520] hover:text-[#F5F0E8] transition-colors"
                    >
                      OPEN DASHBOARD
                    </Link>
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="text-[12px] font-bold text-[#2A2520] border-2 border-[#2A2520] px-4 py-2 hover:bg-[#2A2520] hover:text-[#F5F0E8] transition-colors cursor-pointer">
                        RESPOND TO AD
                      </button>
                    </SignInButton>
                  </SignedOut>
                </div>
              </div>
            </aside>
          </div>

          {/* Features as "continued coverage" */}
          <div className="mt-10 border-t-2 border-[#2A2520] pt-1 mb-4">
            <h3 className="headline text-[13px] font-bold tracking-[0.1em]">TECHNICAL SPECIFICATIONS</h3>
          </div>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { title: 'Exact Timing', desc: 'Reads the resetsAt timestamp directly from Claude\'s API. Shows the real window end time.' },
              { title: 'Health Checks', desc: 'Auto-pause on consecutive failures. Email alerts when your token needs attention.' },
              { title: 'Per-Day Control', desc: '15-minute increments with different times per day. Full timezone support.' },
              { title: 'Encryption', desc: 'AES-256-GCM with per-token random IV. Never stored in plaintext, never logged.' },
            ].map((f, i) => (
              <div key={i} className="border-t border-[#D5CCBE] pt-3">
                <h4 className="subhead text-[14px] font-bold text-[#2A2520] mb-1">{f.title}</h4>
                <p className="text-[13px] text-[#8B8070] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 border-t-4 border-b-4 border-[#2A2520] py-8 text-center">
            <h2 className="headline text-[28px] sm:text-[36px] font-bold leading-tight">
              Extra! Extra!
            </h2>
            <p className="subhead text-[18px] text-[#6B6055] italic mt-2">
              Two minutes to configure. Runs every morning thereafter.
            </p>
            <div className="mt-6">
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-block headline text-[13px] font-bold tracking-[0.1em] px-8 py-3 bg-[#2A2520] text-[#F5F0E8] hover:bg-[#4A4035] transition-colors"
                >
                  READ MORE (DASHBOARD)
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="headline text-[13px] font-bold tracking-[0.1em] px-8 py-3 bg-[#2A2520] text-[#F5F0E8] hover:bg-[#4A4035] transition-colors cursor-pointer">
                    SUBSCRIBE FREE
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-[11px] text-[#8B8070]">
              <Link to="/privacy" className="hover:text-[#2A2520] transition-colors underline">Privacy Policy</Link>
              <span>&bull;</span>
              <Link to="/terms" className="hover:text-[#2A2520] transition-colors underline">Terms of Service</Link>
            </div>
            <p className="text-[10px] text-[#B5AA9A] italic">
              Not affiliated with Anthropic &bull; &copy; 2026 The Daily Pinch
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
