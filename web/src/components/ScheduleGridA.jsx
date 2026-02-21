/**
 * Design A: Compact rows + expandable detail
 * Each day = one tight row with day toggle, start time picker, roll preview.
 * Chevron expands to show individual roll controls.
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
  const ampm = h >= 12 ? 'p' : 'a'
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

export default function ScheduleGridA() {
  const [schedule, setSchedule] = useState(MOCK)
  const [expanded, setExpanded] = useState(null)

  function toggleDay(day) {
    setSchedule(prev => ({ ...prev, [day]: prev[day] ? null : buildRolls('08:00') }))
    if (expanded === day) setExpanded(null)
  }

  function setRoll1(day, time) {
    setSchedule(prev => ({ ...prev, [day]: buildRolls(time) }))
  }

  function setRollTime(day, idx, newTime) {
    setSchedule(prev => {
      const rolls = [...prev[day]]
      const delta = timeToMinutes(newTime) - timeToMinutes(rolls[idx].time)
      rolls[idx] = { ...rolls[idx], time: newTime }
      for (let i = idx + 1; i < 4; i++) {
        rolls[i] = { ...rolls[i], time: minutesToTime((timeToMinutes(rolls[i].time) + delta + 1440) % 1440) }
      }
      return { ...prev, [day]: rolls }
    })
  }

  function toggleRoll(day, idx) {
    setSchedule(prev => {
      const rolls = [...prev[day]]
      rolls[idx] = { ...rolls[idx], enabled: !rolls[idx].enabled }
      return { ...prev, [day]: rolls }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-stone-900 text-sm">Schedule</h2>
        <span className="text-xs text-stone-400">Design A: Compact + Expand</span>
      </div>

      <div className="space-y-1">
        {DAYS.map(day => {
          const rolls = schedule[day]
          const isOn = !!rolls
          const isExpanded = expanded === day

          return (
            <div key={day}>
              {/* Main row */}
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isOn ? 'hover:bg-stone-50' : ''
                }`}
              >
                {/* Day toggle — clickable dot */}
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

                {/* Day label */}
                <span className={`w-8 text-sm font-medium ${isOn ? 'text-stone-900' : 'text-stone-400'}`}>
                  {DAY_LABELS[day]}
                </span>

                {isOn ? (
                  <>
                    {/* Start time picker */}
                    <select
                      value={rolls[0].time}
                      onChange={e => setRoll1(day, e.target.value)}
                      className="text-xs border border-stone-200 rounded px-1.5 py-1 bg-white text-stone-700 cursor-pointer"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{fmtFull(t)}</option>
                      ))}
                    </select>

                    {/* Roll preview */}
                    <div className="flex items-center gap-1 text-xs text-stone-400 flex-1 min-w-0">
                      {rolls.map((r, i) => (
                        <span key={i} className={`${r.enabled ? 'text-stone-500' : 'text-stone-300 line-through'}`}>
                          {i > 0 && <span className="text-stone-300 mx-0.5">&rarr;</span>}
                          {fmt(r.time)}
                        </span>
                      ))}
                    </div>

                    {/* Expand chevron */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : day)}
                      className="p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-stone-300 flex-1" />
                )}
              </div>

              {/* Expanded detail */}
              {isOn && isExpanded && (
                <div className="ml-16 pl-3 border-l-2 border-stone-100 py-2 space-y-1.5 mb-1">
                  {rolls.slice(1).map((roll, idx) => {
                    const i = idx + 1
                    return (
                      <div key={i} className={`flex items-center gap-2 ${!roll.enabled ? 'opacity-40' : ''}`}>
                        <span className="text-xs text-stone-400 w-10">Roll {i + 1}</span>
                        <select
                          value={roll.time}
                          onChange={e => setRollTime(day, i, e.target.value)}
                          disabled={!roll.enabled}
                          className="text-xs border border-stone-200 rounded px-1.5 py-0.5 bg-white text-stone-600 disabled:opacity-50"
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{fmtFull(t)}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => toggleRoll(day, i)}
                          className={`w-6 h-3.5 rounded-full relative cursor-pointer transition-colors ${
                            roll.enabled ? 'bg-emerald-500' : 'bg-stone-200'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${
                            roll.enabled ? 'left-[11px]' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    )
                  })}
                  <div className="text-xs text-stone-400 pt-1">
                    Break from {fmt(minutesToTime((timeToMinutes(rolls.findLast(r => r.enabled)?.time || rolls[0].time) + 300) % 1440))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5">
        <button className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 cursor-pointer">
          Save schedule
        </button>
      </div>
    </div>
  )
}
