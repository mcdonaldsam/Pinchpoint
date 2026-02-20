import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">PinchPoint</span>
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
          Claude Pro and Max give you a 5-hour usage window. PinchPoint starts it
          at the time you choose, so it's already running when you sit down to work.
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
        <div className="grid gap-6 max-w-lg mx-auto">
          <Step n="1" title="Sign up" desc="Create an account — takes 10 seconds." />
          <Step n="2" title="Connect Claude" desc="Run one command in your terminal to link your Claude account." />
          <Step n="3" title="Set your schedule" desc="Pick which days and times you want your window to start." />
          <Step n="4" title="That's it" desc="Every day at your time, we send a tiny ping. Your window is running before you open your laptop." />
        </div>
      </section>

      {/* Details */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-stone-200">
        <div className="grid gap-12 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-lg mb-2">Exact window timing</h3>
            <p className="text-stone-500">
              We capture the exact reset time from Claude's API, so your dashboard
              shows precisely when your window ends — no guessing.
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
            <h3 className="font-semibold text-lg mb-2">Per-day scheduling</h3>
            <p className="text-stone-500">
              Different time on Monday than Thursday? Skip weekends entirely?
              Set each day independently with 15-minute precision.
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
        </div>
        Your Claude token is encrypted at rest. PinchPoint is not affiliated with Anthropic.
      </footer>
    </div>
  )
}

function Step({ n, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
        {n}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-stone-500 text-sm mt-1">{desc}</p>
      </div>
    </div>
  )
}
