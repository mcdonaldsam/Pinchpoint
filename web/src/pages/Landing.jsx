import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
        <SignedIn>
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight text-stone-900">pinchpoint</Link>
        </SignedIn>
        <SignedOut>
          <span className="text-lg font-semibold tracking-tight">pinchpoint</span>
        </SignedOut>
        <SignedIn>
          <Link to="/dashboard" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Dashboard
          </Link>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Start your Claude window
          <br />
          <span className="text-emerald-600">exactly when you want it</span>
        </h1>
        <p className="mt-6 text-lg text-stone-500 max-w-xl mx-auto">
          Claude Pro and Max give you a 5-hour usage window. pinchpoint starts it
          at the time you choose, so it's optimised for your schedule, not theirs.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <SignedIn>
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
            >
              Go to dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors cursor-pointer">
                Pinch me
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
        <Steps />
      </section>

      {/* Details */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-stone-200">
        <div className="grid gap-12 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-lg mb-2">Per-day scheduling</h3>
            <p className="text-stone-500">
              Different time on Monday than Thursday? Skip weekends entirely?
              Set each day independently with 15-minute precision.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Token health monitoring</h3>
            <p className="text-stone-500">
              If your token stops working, we'll email you and auto-pause your
              schedule. No wasted pings, no surprises.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">End-to-end encryption</h3>
            <p className="text-stone-500">
              AES-256 encryption with per-user derived keys. Your token is never
              stored in plaintext — re-encrypted on every request.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Free</h3>
            <p className="text-stone-500">
              No subscriptions. No per-ping charges. Just connect your account
              and go.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 border-t border-stone-200 text-center text-sm text-stone-400">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link to="/privacy" className="hover:text-stone-600">Privacy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-stone-600">Terms</Link>
          <span>·</span>
          <Link to="/security" className="hover:text-stone-600">Security</Link>
        </div>
        pinchpoint is not affiliated with Anthropic.
      </footer>
    </div>
  )
}

const STEPS = [
  { title: 'Create an account', desc: 'Sign up in seconds. No credit card, no trial period.' },
  { title: 'Link your Claude token', desc: 'Run npx pinchpoint connect in your terminal. One command, one click.' },
  { title: 'Set your schedule', desc: 'Choose which days and times. Each day can be different.' },
  { title: 'Done', desc: 'We ping Claude at your time. Your window starts automatically, every day.' },
]

function Steps() {
  return (
    <div className="max-w-sm mx-auto">
      {STEPS.map((step, i) => {
        const isLast = i === STEPS.length - 1
        return (
          <div key={i} className="flex gap-5">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                  isLast
                    ? 'bg-stone-900 text-white'
                    : 'border-2 border-stone-300 text-stone-400'
                }`}
              >
                {i + 1}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-stone-200 my-1" />
              )}
            </div>
            {/* Content */}
            <div className={isLast ? 'pt-1 pb-0' : 'pt-1 pb-8'}>
              <h3 className="font-semibold text-stone-900 leading-snug">{step.title}</h3>
              <p className="text-stone-500 text-sm mt-1 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
