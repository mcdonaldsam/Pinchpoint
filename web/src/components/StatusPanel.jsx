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

export default function StatusPanel({ status, onTogglePause }) {
  const health = HEALTH_COLORS[status.tokenHealth] || HEALTH_COLORS.green
  const windowActive = status.lastPing?.success && status.lastPing?.windowEnds &&
    new Date(status.lastPing.windowEnds) > new Date()

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
      {/* Window status */}
      {windowActive && (
        <div className="p-6 text-center">
          <p className="text-sm text-stone-500 mb-1">
            {status.lastPing.exact ? 'Window ends' : 'Estimated window end'}
          </p>
          <p className="text-3xl font-bold text-emerald-600">
            {status.lastPing.exact ? '' : '~'}
            {formatTime(status.lastPing.windowEnds, status.timezone)} {tzAbbr}
          </p>
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
        {status.hasCredentials && (
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
