import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export default function Connect() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  if (sessionId) {
    return <ApproveSession sessionId={sessionId} />
  }

  return <ManualInstructions />
}

function ApproveSession({ sessionId }) {
  const { getToken } = useAuth()
  const [state, setState] = useState('idle') // idle | approving | approved | error
  const [error, setError] = useState(null)

  async function handleApprove() {
    setState('approving')
    try {
      await apiFetch('/api/connect/approve', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }, getToken)
      setState('approved')
    } catch (e) {
      setError(e.message)
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 max-w-sm w-full text-center">
        {state === 'idle' && (
          <>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">Approve this connection?</h1>
            <p className="text-stone-500 text-sm mb-6">
              A CLI on your machine is requesting to link your Claude account to PinchPoint.
            </p>
            <button
              onClick={handleApprove}
              className="w-full py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Approve
            </button>
          </>
        )}

        {state === 'approving' && (
          <p className="text-stone-500 py-8">Approving...</p>
        )}

        {state === 'approved' && (
          <>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">Connected!</h1>
            <p className="text-stone-500 text-sm mb-6">
              You can close this tab. Check your terminal — it should confirm the connection.
            </p>
            <Link
              to="/dashboard"
              className="inline-block w-full py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors text-center"
            >
              Go to dashboard
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">Connection failed</h1>
            <p className="text-red-600 text-sm mb-6">{error}</p>
            <p className="text-stone-500 text-sm">
              Try running <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">npx pinchpoint connect</code> again.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function ManualInstructions() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 max-w-md w-full">
        <h1 className="text-xl font-bold mb-2">Connect your Claude account</h1>
        <p className="text-stone-500 text-sm mb-6">
          Run this command in your terminal to link your Claude Pro/Max account:
        </p>
        <div className="bg-stone-900 text-emerald-400 rounded-lg p-4 font-mono text-sm mb-6">
          npx pinchpoint connect
        </div>
        <p className="text-stone-400 text-xs">
          This will detect your Claude credentials (or help you set them up),
          then open this page for you to approve the connection. No copy-pasting required.
        </p>
      </div>
    </div>
  )
}
