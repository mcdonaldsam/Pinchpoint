/**
 * Design C: Start time only (simplest)
 * Just day toggle + start time. Rolls are auto-calculated and shown
 * as a read-only summary. No individual roll editing at all.
 */
import { useState } from 'react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '15', '30', '45']) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${m}`)
  }
}

function fmt(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

function fmtFull(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function buildRolls(start) {
  const [h, m] = start.split(':').map(Number)
  return Array.from({ length: 4 }, (_, i) => {
    const total = (h * 60 + m + i * 300) % 1440
    return {
      time: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
      enabled: true,
    }
  })
}

function minutesToTime(mins) {
  const w = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const MOCK = {
  monday: buildRolls('04:00'),
  tuesday: buildRolls('06:00'),
  wednesday: buildRolls('06:00'),
  thursday: buildRolls('06:00'),
  friday: buildRolls('06:00'),
  saturday: null,
  sunday: null,
}

export default function ScheduleGridC() {
  const [schedule, setSchedule] = useState(MOCK)

  function toggleDay(day) {
    setSchedule(prev => ({ ...prev, [day]: prev[day] ? null : buildRolls('08:00') }))
  }

  function setStart(day, time) {
    setSchedule(prev => ({ ...prev, [day]: buildRolls(time) }))
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-stone-900 text-sm">Schedule</h2>
        <span className="text-xs text-stone-400">Design C: Start Time Only</span>
      </div>

      <div className="space-y-1">
        {DAYS.map(day => {
          const rolls = schedule[day]
          const isOn = !!rolls

          return (
            <div
              key={day}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isOn ? '' : ''}`}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleDay(day)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  isOn
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-stone-300 bg-white hover:border-stone-400'
                }`}
              >
                {isOn && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <span className={`w-8 text-sm font-medium ${isOn ? 'text-stone-900' : 'text-stone-400'}`}>
                {DAY_LABELS[day]}
              </span>

              {isOn && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">First pinch</span>
                    <select
                      value={rolls[0].time}
                      onChange={e => setStart(day, e.target.value)}
                      className="text-xs border border-stone-200 rounded px-1.5 py-1 bg-white text-stone-700 cursor-pointer"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{fmtFull(t)}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs text-stone-400 flex-1 text-right">
                    4 pinches until {fmt(minutesToTime((timeToMinutes(rolls[0].time) + 300 * 3) % 1440))}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Explanation */}
      <div className="mt-4 px-3 py-2.5 bg-stone-50 rounded-lg">
        <p className="text-xs text-stone-500">
          pinchpoint pings Claude 4 times per active day, each 5 hours apart.
          Your usage window stays active for ~20 hours with a ~4-hour overnight break.
        </p>
      </div>

      <div className="mt-5">
        <button className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 cursor-pointer">
          Save schedule
        </button>
      </div>
    </div>
  )
}
