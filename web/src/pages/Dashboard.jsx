import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, UserButton } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import StatusPanel from '../components/StatusPanel'
import ScheduleGrid from '../components/ScheduleGrid'

export default function Dashboard() {
  const { getToken } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    await apiFetch('/api/schedule', {
      method: 'PUT',
      body: JSON.stringify({ schedule, timezone }),
    }, getToken)
    await fetchStatus()
  }

  async function handleTogglePause() {
    await apiFetch('/api/pause', {
      method: 'POST',
      body: JSON.stringify({ paused: !status.paused }),
    }, getToken)
    await fetchStatus()
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
            {/* Connect prompt if no credentials */}
            {!status.hasCredentials && (
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

            <StatusPanel status={status} onTogglePause={handleTogglePause} />
            <ScheduleGrid
              schedule={status.schedule}
              timezone={status.timezone}
              onSave={handleScheduleSave}
            />
          </div>
        )}
      </main>
    </div>
  )
}
