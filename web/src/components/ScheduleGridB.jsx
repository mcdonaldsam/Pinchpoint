/**
 * Design B: Inline pill chips
 * Each day shows 4 roll times as small clickable pill badges.
 * Disabled rolls are faded. Click a pill to edit time.
 */
import { useState, useRef, useEffect } from 'react'

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

// Tiny popover for time picking
function TimePillPopover({ time, enabled, isFirst, onTimeChange, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all border ${
          enabled
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-stone-50 text-stone-400 border-stone-200 line-through hover:bg-stone-100'
        }`}
      >
        {fmt(time)}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 p-2 w-36">
          <select
            value={time}
            onChange={e => { onTimeChange(e.target.value); setOpen(false) }}
            className="w-full text-xs border border-stone-200 rounded px-2 py-1 mb-2 bg-white"
          >
            {TIME_OPTIONS.map(t => (
              <option key={t} value={t}>{fmtFull(t)}</option>
            ))}
          </select>
          {!isFirst && (
            <button
              onClick={() => { onToggle(); setOpen(false) }}
              className={`w-full text-xs px-2 py-1 rounded cursor-pointer ${
                enabled
                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {enabled ? 'Disable roll' : 'Enable roll'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ScheduleGridB() {
  const [schedule, setSchedule] = useState(MOCK)

  function toggleDay(day) {
    setSchedule(prev => ({ ...prev, [day]: prev[day] ? null : buildRolls('08:00') }))
  }

  function setRollTime(day, idx, newTime) {
    setSchedule(prev => {
      const rolls = [...prev[day]]
      if (idx === 0) return { ...prev, [day]: buildRolls(newTime) }
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
        <span className="text-xs text-stone-400">Design B: Inline Pills</span>
      </div>

      <div className="space-y-1.5">
        {DAYS.map(day => {
          const rolls = schedule[day]
          const isOn = !!rolls

          return (
            <div
              key={day}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isOn ? 'bg-stone-50/50' : ''
              }`}
            >
              {/* Checkbox toggle */}
              <button
                onClick={() => toggleDay(day)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
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
                  <div className="flex items-center gap-1 flex-1">
                    {rolls.map((r, i) => (
                      <TimePillPopover
                        key={i}
                        time={r.time}
                        enabled={r.enabled}
                        isFirst={i === 0}
                        onTimeChange={t => setRollTime(day, i, t)}
                        onToggle={() => toggleRoll(day, i)}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">
                    break {fmt(minutesToTime((timeToMinutes(rolls.findLast(r => r.enabled)?.time || rolls[0].time) + 300) % 1440))}
                  </span>
                </>
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
