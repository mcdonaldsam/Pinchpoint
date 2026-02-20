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

export default function StatusPanel({ status, onTogglePause, onTestPing }) {
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

  function formatTzAbbr(tz) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short',
      }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || tz
    } catch {
      return tz
    }
  }

  const tzAbbr = formatTzAbbr(status.timezone)

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm divide-y divide-stone-100">
      {/* Window countdown — active */}
      {windowActive && (
        <div className="p-6 text-center">
          <p className="text-sm text-stone-500 mb-1">
            {status.lastPing.exact ? 'Resets in' : 'Resets in (estimated)'}
          </p>
          <p className="text-3xl font-bold text-emerald-600 tabular-nums">
            {status.lastPing.exact ? '' : '~'}{formatCountdown(remaining)}
          </p>
          <p className="text-sm text-stone-400 mt-1">
            at {formatTime(status.lastPing.windowEnds, status.timezone)} {tzAbbr}
          </p>
        </div>
      )}

      {/* Window expired */}
      {windowExpired && (
        <div className="p-6 text-center">
          <p className="text-sm text-stone-400 mb-1">Window ended</p>
          <p className="text-2xl font-bold text-stone-400">
            {formatTime(status.lastPing.windowEnds, status.timezone)} {tzAbbr}
          </p>
        </div>
      )}

      {/* Last ping failed — no window info */}
      {status.lastPing && !status.lastPing.success && !windowEndsMs && (
        <div className="p-6 text-center">
          <p className="text-sm text-red-500 mb-1">Last ping failed</p>
          <p className="text-lg font-semibold text-red-600">No active window</p>
        </div>
      )}

      {/* Status rows */}
      <div className="p-6 space-y-4">
        {/* Connection */}
        <Row label="Connection">
          {status.hasCredentials ? (
            <span className="text-emerald-600 font-medium text-sm">Connected</span>
          ) : (
            <span className="text-stone-400 text-sm">Not connected</span>
          )}
        </Row>

        {/* Token health */}
        {status.hasCredentials && health && (
          <Row label="Token health">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${health.bg} ${health.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
              {HEALTH_LABELS[status.tokenHealth]}
            </span>
          </Row>
        )}

        {/* Next ping */}
        {status.nextPing && !status.paused && (
          <Row label="Next ping">
            <span className="text-sm text-stone-600">
              {capitalize(status.nextPing.day)} at {status.nextPing.time} {tzAbbr}
            </span>
          </Row>
        )}

        {/* Last ping */}
        {status.lastPing && (
          <Row label="Last ping">
            <span className={`text-sm ${status.lastPing.success ? 'text-emerald-600' : 'text-red-600'}`}>
              {status.lastPing.success ? 'Success' : 'Failed'}
              {' — '}
              {formatTime(status.lastPing.time, status.timezone)} {tzAbbr}
            </span>
          </Row>
        )}

        {/* Pause toggle */}
        {status.hasCredentials && (
          <Row label="Schedule">
            <button
              onClick={onTogglePause}
              className={`text-sm font-medium cursor-pointer ${
                status.paused ? 'text-emerald-600 hover:text-emerald-700' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {status.paused ? 'Resume' : 'Pause'}
            </button>
          </Row>
        )}

        {/* Test ping */}
        {status.hasCredentials && onTestPing && (
          <Row label="Test">
            <button
              onClick={onTestPing}
              className="text-sm font-medium text-stone-500 hover:text-stone-700 cursor-pointer"
            >
              Send test ping
            </button>
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
