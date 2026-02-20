import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useClerk, UserButton } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import StatusPanel from '../components/StatusPanel'
import ScheduleGrid from '../components/ScheduleGrid'

function RevocationInstructions() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <h3 className="font-semibold text-amber-900 mb-2">Revoke your token for full security</h3>
      <p className="text-amber-700 text-sm mb-3">
        Your encrypted token has been deleted from PinchPoint, but it remains valid at Anthropic until you revoke it.
      </p>
      <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside mb-3">
        <li>Go to <a href="https://claude.ai/settings" target="_blank" rel="noopener noreferrer" className="underline font-medium">claude.ai/settings</a></li>
        <li>Find "Connected apps" or "API keys"</li>
        <li>Revoke the token used with PinchPoint</li>
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
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
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
        <Link to="/" className="text-lg font-semibold tracking-tight text-stone-900">PinchPoint</Link>
        <UserButton />
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {loading && (
          <div className="text-center py-20 text-stone-400">Loading...</div>
        )}

        {/* Stale data warning when poll fails after initial load */}
        {error && status && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
            <span className="text-amber-700 text-sm">Unable to refresh — data may be stale</span>
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
          <div className="space-y-8">
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

            <StatusPanel status={status} onTogglePause={handleTogglePause} onPinchNow={handlePinchNow} pinching={pinching} />
            <ScheduleGrid
              schedule={status.schedule}
              timezone={status.timezone}
              onSave={handleScheduleSave}
            />

            {/* Disconnect token (only when connected) */}
            {status.hasCredentials && (
              <div className="border border-amber-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-amber-900 mb-1">Disconnect Claude token</h3>
                <p className="text-xs text-amber-700/70 mb-4">
                  Remove your stored token and stop all pings. Your schedule will be preserved.
                </p>
                {!showDisconnectConfirm ? (
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="text-sm text-amber-600 font-medium hover:text-amber-700 cursor-pointer"
                  >
                    Disconnect token
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                    >
                      {disconnecting ? 'Disconnecting...' : 'Yes, disconnect'}
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="text-sm text-stone-500 hover:text-stone-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Danger zone */}
            <div className="border border-red-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-red-900 mb-1">Delete account</h3>
              <p className="text-xs text-red-700/70 mb-4">
                Permanently delete your account and all stored data, including your encrypted token.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-600 font-medium hover:text-red-700 cursor-pointer"
                >
                  Delete my account
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete everything'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-sm text-stone-500 hover:text-stone-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
