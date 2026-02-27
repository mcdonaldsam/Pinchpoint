import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useClerk, UserButton } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import StatusPanel from '../components/StatusPanel'
import ScheduleGrid from '../components/ScheduleGrid'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function RevocationInstructions() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <h3 className="font-semibold text-amber-900 mb-2">Revoke your token for full security</h3>
      <p className="text-amber-700 text-sm mb-3">
        Your encrypted token has been deleted from pinchpoint, but it remains valid at Anthropic until you revoke it.
      </p>
      <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-3">
        <li>Go to <a href="https://claude.ai/settings" target="_blank" rel="noopener noreferrer" className="underline font-medium">claude.ai/settings</a></li>
        <li>Find "Connected apps" or "API keys"</li>
        <li>Revoke the token used with pinchpoint</li>
      </ol>
      <p className="text-amber-600 text-xs">
        Tokens have a ~1 year lifetime. Revoking ensures no one can use it even if our systems were compromised.
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const [showUnpauseWarning, setShowUnpauseWarning] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch('/api/status', {}, getToken)
      setStatus(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function handleScheduleSave(schedule, timezone) {
    // Error propagates to ScheduleGrid's catch for user-facing feedback
    await apiFetch('/api/schedule', {
      method: 'PUT',
      body: JSON.stringify({ schedule, timezone }),
    }, getToken)
    await fetchStatus()
  }

  const [pinching, setPinching] = useState(false)

  async function handlePinchNow() {
    setPinching(true)
    try {
      await apiFetch('/api/test-ping', { method: 'POST' }, getToken)
      await fetchStatus()
    } catch {
      await fetchStatus()
    } finally {
      setPinching(false)
    }
  }

  async function handleTogglePause() {
    // Warn before unpausing with a likely-expired token
    if (status.paused && status.tokenHealth === 'red' && !showUnpauseWarning) {
      setShowUnpauseWarning(true)
      return
    }
    setShowUnpauseWarning(false)
    try {
      await apiFetch('/api/pause', {
        method: 'POST',
        body: JSON.stringify({ paused: !status.paused }),
      }, getToken)
      await fetchStatus()
    } catch {
      // Refresh to show actual server state
      await fetchStatus()
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await apiFetch('/api/disconnect', { method: 'POST' }, getToken)
      setDisconnected(true)
      setShowDisconnectConfirm(false)
      await fetchStatus()
    } catch {
      setShowDisconnectConfirm(false)
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await apiFetch('/api/account', { method: 'DELETE' }, getToken)
      await signOut()
      navigate('/')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-6 py-6">
        <Link to="/home" className="text-lg font-semibold tracking-tight text-stone-900">pinchpoint</Link>
        <UserButton />
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {loading && (
          <div className="text-center py-20 text-stone-400">Loading...</div>
        )}

        {/* Stale data warning when poll fails after initial load */}
        {error && status && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
            <span className="text-amber-700 text-sm">Unable to refresh. Data may be stale</span>
            <button onClick={fetchStatus} className="text-xs text-amber-600 underline cursor-pointer">Retry</button>
          </div>
        )}

        {error && !status && (
          <div className="text-center py-20">
            <p className="text-red-600 mb-2">{error}</p>
            <button onClick={fetchStatus} className="text-sm text-stone-500 underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {status && (
          <div className="space-y-4">
            {/* Revocation instructions after disconnect */}
            {disconnected && <RevocationInstructions />}

            {/* Connect prompt if no credentials */}
            {!status.hasCredentials && !disconnected && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <h2 className="font-semibold text-amber-900 mb-2">Connect your Claude account</h2>
                <p className="text-amber-700 text-sm mb-4">
                  Run this in your terminal to get started:
                </p>
                <div className="bg-stone-900 text-emerald-400 rounded-lg p-3 font-mono text-sm inline-block">
                  npx pinchpoint connect
                </div>
              </div>
            )}

            <StatusPanel status={status} />

            {/* Unpause warning for expired token */}
            {showUnpauseWarning && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-700 text-sm mb-3">
                  Your token appears expired. Unpausing will likely fail again. Consider reconnecting first.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleTogglePause}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Unpause anyway
                  </button>
                  <button
                    onClick={() => setShowUnpauseWarning(false)}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {status.hasCredentials && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePinchNow}
                  disabled={pinching}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {pinching && <Spinner />}
                  {pinching ? 'Pinching...' : 'Pinch me'}
                </button>
                <button
                  onClick={handleTogglePause}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                    status.paused
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100'
                      : 'bg-stone-100 text-stone-600 border border-stone-200/60 hover:bg-stone-200'
                  }`}
                >
                  {status.paused ? 'Unpause' : 'Pause me'}
                </button>
              </div>
            )}

            <ScheduleGrid
              schedule={status.schedule}
              timezone={status.timezone}
              onSave={handleScheduleSave}
            />

            {/* Disconnect / Delete */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
              {status.hasCredentials && (
                !showDisconnectConfirm ? (
                  <>
                    <button
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="hover:text-amber-600 transition-colors cursor-pointer"
                    >
                      Delete token
                    </button>
                    <span>·</span>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="text-amber-600 font-medium hover:text-amber-700 disabled:opacity-50 cursor-pointer"
                    >
                      {disconnecting ? 'Deleting...' : 'Yes, delete token'}
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="hover:text-stone-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <span>·</span>
                  </>
                )
              )}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="hover:text-red-500 transition-colors cursor-pointer"
                >
                  Delete account
                </button>
              ) : (
                <>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="text-red-600 font-medium hover:text-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="hover:text-stone-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
