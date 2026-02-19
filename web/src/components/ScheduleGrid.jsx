import { useState } from 'react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

// Generate time options in 15-min increments
const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '15', '30', '45']) {
    const hh = String(h).padStart(2, '0')
    TIME_OPTIONS.push(`${hh}:${m}`)
  }
}

function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function ScheduleGrid({ schedule: initialSchedule, timezone: initialTz, onSave }) {
  const [schedule, setSchedule] = useState(() => {
    const s = {}
    for (const day of DAYS) {
      s[day] = initialSchedule?.[day] || null
    }
    return s
  })
  const [timezone, setTimezone] = useState(initialTz || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleDay(day) {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day] ? null : '08:00',
    }))
    setSaved(false)
  }

  function setTime(day, time) {
    setSchedule(prev => ({ ...prev, [day]: time }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(schedule, timezone)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-stone-900">Schedule</h2>
        <select
          value={timezone}
          onChange={e => { setTimezone(e.target.value); setSaved(false) }}
          className="text-sm text-stone-500 border border-stone-200 rounded-lg px-2 py-1.5 bg-white"
        >
          {Intl.supportedValuesOf('timeZone').map(tz => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {DAYS.map(day => (
          <div key={day} className="flex items-center gap-4">
            {/* Toggle */}
            <button
              onClick={() => toggleDay(day)}
              className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                schedule[day] ? 'bg-emerald-500' : 'bg-stone-200'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                schedule[day] ? 'left-[18px]' : 'left-0.5'
              }`} />
            </button>

            {/* Day label */}
            <span className={`w-10 text-sm font-medium ${schedule[day] ? 'text-stone-900' : 'text-stone-400'}`}>
              {DAY_LABELS[day]}
            </span>

            {/* Time picker */}
            {schedule[day] ? (
              <select
                value={schedule[day]}
                onChange={e => setTime(day, e.target.value)}
                className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-700"
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{formatTime12(t)}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-stone-300">Off</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save schedule'}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600">Saved</span>
        )}
      </div>
    </div>
  )
}
