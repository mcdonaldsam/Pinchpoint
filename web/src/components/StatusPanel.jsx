import { useState, useEffect } from 'react'

const HEALTH_COLORS = {
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

const HEALTH_LABELS = {
  green: 'Healthy',
  yellow: 'Failing — check your token',
  red: 'Expired — reconnect required',
}

function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function StatusPanel({ status }) {
  const health = status.tokenHealth ? HEALTH_COLORS[status.tokenHealth] : null
  const [now, setNow] = useState(() => Date.now())

  const windowEndsMs = status.lastPing?.success && status.lastPing?.windowEnds
    ? new Date(status.lastPing.windowEnds).getTime()
    : null
  const remaining = windowEndsMs ? windowEndsMs - now : null
  const windowActive = remaining !== null && remaining > 0
  const windowExpired = remaining !== null && remaining <= 0

  // Always-running 1s tick — simpler than conditional start/stop on window state
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  function formatCountdown(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
    return `${m}m ${String(s).padStart(2, '0')}s`
  }

  function formatTime(iso, tz) {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    })
  }

  function formatRelative(iso) {
    const diff = now - new Date(iso).getTime()
    if (diff < 60_000) return 'just now'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
    return `${Math.floor(diff / 86400_000)}d ago`
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm divide-y divide-stone-100">
      {/* Window countdown — active */}
      {windowActive && (
        <div className="p-6 text-center">
          <p className="text-sm text-stone-500 mb-1">
            {status.lastPing.exact ? 'Resets in' : 'Resets in (estimated)'}
          </p>
          <p className="text-5xl font-bold text-emerald-600 tabular-nums tracking-tight">
            {status.lastPing.exact ? '' : '~'}{formatCountdown(remaining)}
          </p>
          <p className="text-sm text-stone-400 mt-1">
            at {formatTime(status.lastPing.windowEnds, status.timezone)}
          </p>
        </div>
      )}

      {/* Window expired */}
      {windowExpired && (
        <div className="p-6 text-center">
          <p className="text-sm text-stone-400 mb-1">Window ended</p>
          <p className="text-2xl font-bold text-stone-400">
            {formatTime(status.lastPing.windowEnds, status.timezone)}
          </p>
        </div>
      )}

      {/* Last ping failed — no window info */}
      {status.lastPing && !status.lastPing.success && !windowEndsMs && (
        <div className="p-6 text-center">
          <p className="text-sm text-red-500 mb-1">Last pinch failed</p>
          <p className="text-lg font-semibold text-red-600">No active window</p>
        </div>
      )}

      {/* Status rows */}
      <div className="p-6 space-y-4">
        {/* Token warning — only shown when unhealthy */}
        {status.hasCredentials && health && status.tokenHealth !== 'green' && (
          <Row label="Token status">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${health.bg} ${health.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
              {HEALTH_LABELS[status.tokenHealth]}
            </span>
          </Row>
        )}

        {/* Last pinch */}
        {status.lastPing && (
          <Row label="Last pinch">
            <span className={`text-sm ${status.lastPing.success ? 'text-emerald-600' : 'text-red-600'}`}>
              {status.lastPing.success ? '' : 'Failed — '}
              {formatTime(status.lastPing.time, status.timezone)}
              <span className="text-stone-400 ml-1">({formatRelative(status.lastPing.time)})</span>
            </span>
          </Row>
        )}

        {/* Next pinch */}
        {status.nextPing && !status.paused && (
          <Row label="Next pinch">
            <span className="text-sm text-stone-600">
              {capitalize(status.nextPing.day)} at {formatTime12(status.nextPing.time)}
            </span>
          </Row>
        )}

        {/* Paused indicator */}
        {status.hasCredentials && status.paused && (
          <Row label="Schedule">
            <span className="text-xs text-amber-600 font-medium">Paused</span>
          </Row>
        )}

      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-500">{label}</span>
      {children}
    </div>
  )
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
