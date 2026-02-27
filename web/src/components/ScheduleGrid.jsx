import { useState, useEffect, useRef, useMemo } from 'react'
import { Info } from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
}

const HOUR_LABELS = { 0: '12am', 3: '3am', 6: '6am', 9: '9am', 12: '12pm', 15: '3pm', 18: '6pm', 21: '9pm' }

function formatTime12(time24) {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const wrapped = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

function buildDefaultRolls(startTime) {
  const [h, m] = startTime.split(':').map(Number)
  return Array.from({ length: 4 }, (_, i) => {
    const totalMin = (h * 60 + m + i * 300) % 1440
    return {
      time: `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`,
      enabled: true,
    }
  })
}

function normalizeSchedule(schedule) {
  if (!schedule) return {}
  const out = {}
  for (const [day, value] of Object.entries(schedule)) {
    if (value === null) out[day] = null
    else if (typeof value === 'string') out[day] = buildDefaultRolls(value)
    else if (Array.isArray(value)) out[day] = value
    else out[day] = null
  }
  return out
}

/**
 * Check for cross-day overlap: does the last enabled roll's 5h window
 * on one day bleed into the next enabled day's first roll?
 * Returns { dayA, dayB, endTime } or null if no overlap.
 */
function checkCrossDayOverlap(schedule) {
  const enabledDays = DAYS.filter(d => schedule[d] && Array.isArray(schedule[d]))
  for (let idx = 0; idx < enabledDays.length; idx++) {
    const dayA = enabledDays[idx]
    const dayB = enabledDays[(idx + 1) % enabledDays.length]
    if (dayA === dayB) continue

    const rollsA = schedule[dayA]
    const rollsB = schedule[dayB]
    const roll1A = timeToMinutes(rollsA[0].time)

    let lastEnabledA = rollsA[0]
    for (const r of rollsA) { if (r.enabled) lastEnabledA = r }
    const lastMinA = timeToMinutes(lastEnabledA.time)
    const isWrapped = lastMinA < roll1A
    const lastAbsolute = lastMinA + (isWrapped ? 1440 : 0)

    const firstMinB = timeToMinutes(rollsB[0].time)
    const idxA = DAYS.indexOf(dayA)
    const idxB = DAYS.indexOf(dayB)
    const dayGap = (idxB - idxA + 7) % 7 || 7
    const firstAbsolute = firstMinB + dayGap * 1440

    if (lastAbsolute + 300 > firstAbsolute) {
      const endMin = (lastAbsolute + 300) % 1440
      const endTime = minutesToTime(endMin)
      return { dayA, dayB, endTime }
    }
  }
  return null
}

// ─── Timezone helpers ─────────────────────────────────────────

const TIMEZONE_LIST = [
  { tz: 'Pacific/Midway',                    label: '(UTC-11:00) Midway Island, Samoa' },
  { tz: 'Pacific/Honolulu',                  label: '(UTC-10:00) Hawaii' },
  { tz: 'America/Anchorage',                 label: '(UTC-09:00) Alaska' },
  { tz: 'America/Los_Angeles',               label: '(UTC-08:00) Pacific Time (US & Canada)' },
  { tz: 'America/Tijuana',                   label: '(UTC-08:00) Baja California' },
  { tz: 'America/Phoenix',                   label: '(UTC-07:00) Arizona' },
  { tz: 'America/Denver',                    label: '(UTC-07:00) Mountain Time (US & Canada)' },
  { tz: 'America/Chihuahua',                 label: '(UTC-07:00) Chihuahua, La Paz, Mazatlan' },
  { tz: 'America/Chicago',                   label: '(UTC-06:00) Central Time (US & Canada)' },
  { tz: 'America/Mexico_City',               label: '(UTC-06:00) Guadalajara, Mexico City' },
  { tz: 'America/Regina',                    label: '(UTC-06:00) Saskatchewan' },
  { tz: 'America/Guatemala',                 label: '(UTC-06:00) Central America' },
  { tz: 'America/New_York',                  label: '(UTC-05:00) Eastern Time (US & Canada)' },
  { tz: 'America/Bogota',                    label: '(UTC-05:00) Bogota, Lima, Quito' },
  { tz: 'America/Indianapolis',              label: '(UTC-05:00) Indiana (East)' },
  { tz: 'America/Caracas',                   label: '(UTC-04:30) Caracas' },
  { tz: 'America/Halifax',                   label: '(UTC-04:00) Atlantic Time (Canada)' },
  { tz: 'America/Santiago',                  label: '(UTC-04:00) Santiago' },
  { tz: 'America/La_Paz',                    label: '(UTC-04:00) Georgetown, La Paz' },
  { tz: 'America/Asuncion',                  label: '(UTC-04:00) Asuncion' },
  { tz: 'America/St_Johns',                  label: '(UTC-03:30) Newfoundland' },
  { tz: 'America/Sao_Paulo',                 label: '(UTC-03:00) Brasilia' },
  { tz: 'America/Argentina/Buenos_Aires',    label: '(UTC-03:00) Buenos Aires' },
  { tz: 'America/Godthab',                   label: '(UTC-03:00) Greenland' },
  { tz: 'America/Montevideo',                label: '(UTC-03:00) Montevideo' },
  { tz: 'Atlantic/South_Georgia',            label: '(UTC-02:00) Mid-Atlantic' },
  { tz: 'Atlantic/Azores',                   label: '(UTC-01:00) Azores' },
  { tz: 'Atlantic/Cape_Verde',               label: '(UTC-01:00) Cape Verde Islands' },
  { tz: 'Europe/London',                     label: '(UTC+00:00) London, Dublin, Lisbon' },
  { tz: 'Africa/Casablanca',                 label: '(UTC+00:00) Casablanca' },
  { tz: 'Africa/Monrovia',                   label: '(UTC+00:00) Monrovia, Reykjavik' },
  { tz: 'Europe/Berlin',                     label: '(UTC+01:00) Amsterdam, Berlin, Rome, Vienna' },
  { tz: 'Europe/Paris',                      label: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris' },
  { tz: 'Europe/Budapest',                   label: '(UTC+01:00) Belgrade, Budapest, Prague' },
  { tz: 'Europe/Warsaw',                     label: '(UTC+01:00) Sarajevo, Warsaw, Zagreb' },
  { tz: 'Africa/Lagos',                      label: '(UTC+01:00) West Central Africa' },
  { tz: 'Africa/Cairo',                      label: '(UTC+02:00) Cairo' },
  { tz: 'Europe/Athens',                     label: '(UTC+02:00) Athens, Bucharest' },
  { tz: 'Europe/Helsinki',                   label: '(UTC+02:00) Helsinki, Kyiv, Riga, Tallinn' },
  { tz: 'Asia/Jerusalem',                    label: '(UTC+02:00) Jerusalem' },
  { tz: 'Asia/Beirut',                       label: '(UTC+02:00) Beirut' },
  { tz: 'Africa/Johannesburg',               label: '(UTC+02:00) Harare, Pretoria' },
  { tz: 'Europe/Istanbul',                   label: '(UTC+03:00) Istanbul' },
  { tz: 'Europe/Moscow',                     label: '(UTC+03:00) Moscow, St. Petersburg' },
  { tz: 'Asia/Kuwait',                       label: '(UTC+03:00) Kuwait, Riyadh' },
  { tz: 'Africa/Nairobi',                    label: '(UTC+03:00) Nairobi' },
  { tz: 'Asia/Baghdad',                      label: '(UTC+03:00) Baghdad' },
  { tz: 'Asia/Tehran',                       label: '(UTC+03:30) Tehran' },
  { tz: 'Asia/Dubai',                        label: '(UTC+04:00) Abu Dhabi, Muscat' },
  { tz: 'Asia/Baku',                         label: '(UTC+04:00) Baku' },
  { tz: 'Asia/Tbilisi',                      label: '(UTC+04:00) Tbilisi' },
  { tz: 'Asia/Yerevan',                      label: '(UTC+04:00) Yerevan' },
  { tz: 'Asia/Kabul',                        label: '(UTC+04:30) Kabul' },
  { tz: 'Asia/Karachi',                      label: '(UTC+05:00) Islamabad, Karachi' },
  { tz: 'Asia/Tashkent',                     label: '(UTC+05:00) Tashkent' },
  { tz: 'Asia/Yekaterinburg',                label: '(UTC+05:00) Yekaterinburg' },
  { tz: 'Asia/Kolkata',                      label: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
  { tz: 'Asia/Colombo',                      label: '(UTC+05:30) Sri Lanka' },
  { tz: 'Asia/Kathmandu',                    label: '(UTC+05:45) Kathmandu' },
  { tz: 'Asia/Almaty',                       label: '(UTC+06:00) Astana' },
  { tz: 'Asia/Dhaka',                        label: '(UTC+06:00) Dhaka' },
  { tz: 'Asia/Rangoon',                      label: '(UTC+06:30) Yangon (Rangoon)' },
  { tz: 'Asia/Bangkok',                      label: '(UTC+07:00) Bangkok, Hanoi, Jakarta' },
  { tz: 'Asia/Novosibirsk',                  label: '(UTC+07:00) Novosibirsk' },
  { tz: 'Asia/Shanghai',                     label: '(UTC+08:00) Beijing, Chongqing, Hong Kong' },
  { tz: 'Asia/Singapore',                    label: '(UTC+08:00) Kuala Lumpur, Singapore' },
  { tz: 'Asia/Taipei',                       label: '(UTC+08:00) Taipei' },
  { tz: 'Australia/Perth',                   label: '(UTC+08:00) Perth' },
  { tz: 'Asia/Ulaanbaatar',                  label: '(UTC+08:00) Ulaanbaatar' },
  { tz: 'Asia/Irkutsk',                      label: '(UTC+08:00) Irkutsk' },
  { tz: 'Asia/Tokyo',                        label: '(UTC+09:00) Osaka, Sapporo, Tokyo' },
  { tz: 'Asia/Seoul',                        label: '(UTC+09:00) Seoul' },
  { tz: 'Asia/Yakutsk',                      label: '(UTC+09:00) Yakutsk' },
  { tz: 'Australia/Adelaide',                label: '(UTC+09:30) Adelaide' },
  { tz: 'Australia/Darwin',                  label: '(UTC+09:30) Darwin' },
  { tz: 'Australia/Sydney',                  label: '(UTC+10:00) Canberra, Melbourne, Sydney' },
  { tz: 'Australia/Brisbane',                label: '(UTC+10:00) Brisbane' },
  { tz: 'Australia/Hobart',                  label: '(UTC+10:00) Hobart' },
  { tz: 'Pacific/Guam',                      label: '(UTC+10:00) Guam, Port Moresby' },
  { tz: 'Asia/Vladivostok',                  label: '(UTC+10:00) Vladivostok' },
  { tz: 'Pacific/Guadalcanal',               label: '(UTC+11:00) Solomon Islands' },
  { tz: 'Pacific/Auckland',                  label: '(UTC+12:00) Auckland, Wellington' },
  { tz: 'Pacific/Fiji',                      label: '(UTC+12:00) Fiji' },
  { tz: 'Asia/Magadan',                      label: '(UTC+12:00) Magadan' },
  { tz: 'Pacific/Tongatapu',                 label: "(UTC+13:00) Nuku'alofa" },
  { tz: 'Pacific/Apia',                      label: '(UTC+13:00) Samoa' },
]

function findTzEntry(tz) {
  const direct = TIMEZONE_LIST.find(t => t.tz === tz)
  if (direct) return direct
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || ''
    return TIMEZONE_LIST.find(t => {
      const tParts = new Intl.DateTimeFormat('en-US', { timeZone: t.tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())
      return tParts.find(p => p.type === 'timeZoneName')?.value === offset
    })
  } catch {
    return null
  }
}

function formatButtonLabel(tz) {
  const entry = findTzEntry(tz)
  const cities = entry ? entry.label.replace(/^\(UTC[^)]*\)\s*/, '') : tz.split('/').pop().replace(/_/g, ' ')
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())
    const offset = (parts.find(p => p.type === 'timeZoneName')?.value || '').replace('GMT', 'UTC')
    return `${cities} (${offset})`
  } catch {
    return cities
  }
}

// ─── TimezonePicker ───────────────────────────────────────────

function TimezonePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = useMemo(() => {
    if (!search) return TIMEZONE_LIST
    const q = search.toLowerCase()
    return TIMEZONE_LIST.filter(({ tz, label }) =>
      label.toLowerCase().includes(q) || tz.toLowerCase().replace(/_/g, ' ').includes(q)
    )
  }, [search])

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [open])

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

  useEffect(() => {
    if (open && listRef.current && !search) {
      const el = listRef.current.querySelector('[data-selected="true"]')
      if (el) el.scrollIntoView({ block: 'center' })
    }
  }, [open, search])

  function select(tz) { onChange(tz); setOpen(false); setSearch('') }

  const selectedTz = TIMEZONE_LIST.find(t => t.tz === value)?.tz || findTzEntry(value)?.tz

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 bg-white hover:border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <span>{formatButtonLabel(value)}</span>
        <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-72 max-w-[calc(100vw-2.5rem)] bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-stone-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search timezone..."
              className="w-full text-sm px-3 py-1.5 border border-stone-200 rounded-lg outline-none focus:border-stone-400 placeholder:text-stone-300"
            />
          </div>
          <div ref={listRef} className="max-h-72 overflow-y-auto">
            {filtered.length === 0
              ? <div className="px-3 py-4 text-sm text-stone-400 text-center">No timezones found</div>
              : filtered.map(({ tz, label }) => (
                <button
                  key={tz}
                  data-selected={tz === selectedTz}
                  onClick={() => select(tz)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 cursor-pointer ${
                    tz === selectedTz ? 'bg-stone-50 font-medium text-stone-900' : 'text-stone-600'
                  }`}
                >
                  {label}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RollPopover ──────────────────────────────────────────────

function RollPopover({ rollIdx, rolls, position, popoverRef, onRollChange }) {
  const roll = rolls[rollIdx]
  const listRef = useRef(null)

  // Scroll selected time into view on open
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('[data-selected="true"]')
    if (el) el.scrollIntoView({ block: 'center' })
  }, [])

  function nudge(dir) {
    if (listRef.current) listRef.current.scrollBy({ top: dir * 36, behavior: 'smooth' })
  }

  return (
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 200 }}
      className="bg-white border border-stone-200 rounded-lg shadow-lg w-36 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-stone-100">
        <span className="text-xs font-medium text-stone-600">Pinch {rollIdx + 1}</span>
      </div>

      {/* Up arrow */}
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={() => nudge(-1)}
        className="w-full py-1 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-50 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Scrollable time list */}
      <div ref={listRef} style={{ maxHeight: '180px', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        {TIME_OPTIONS.map(t => (
          <button
            key={t}
            data-selected={t === roll.time}
            onClick={() => onRollChange(rollIdx, t)}
            className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors ${
              t === roll.time
                ? 'bg-stone-900 text-white font-medium'
                : 'text-stone-700 hover:bg-stone-50'
            }`}
          >
            {formatTime12(t)}
          </button>
        ))}
      </div>

      {/* Down arrow */}
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={() => nudge(1)}
        className="w-full py-1 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-50 border-t border-stone-100 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}

// ─── InfoTooltip ──────────────────────────────────────────────

function InfoTooltip() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer leading-none"
        aria-label="How to use the schedule"
      >
        <Info size={14} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-stone-900 text-white rounded-lg px-3 py-2.5 z-50 w-56 shadow-lg">
          {[
            'Drag a pinch to move it',
            'Tap once to edit time',
            'Tap twice to skip/restore',
            'Tap the day to toggle/reset it',
          ].map(hint => (
            <div key={hint} className="flex items-start gap-2 py-0.5">
              <span className="text-stone-500 mt-px text-xs">·</span>
              <span className="text-[11px] text-stone-200">{hint}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── WeekHeatmap ──────────────────────────────────────────────

// Cell types: 'off' | 'idle' | 'ping' | 'window' | 'disabled-ping'
// 'disabled-ping' = marker for a disabled roll (so user can click to re-enable)

function buildGrid(schedule) {
  // Initialize all day grids first
  const grid = DAYS.map(day => {
    const rolls = schedule[day]
    if (!rolls) return Array(24).fill({ type: 'off', rollIdx: -1 })
    return Array.from({ length: 24 }, () => ({ type: 'idle', rollIdx: -1 }))
  })

  // Process each day — enabled rolls with cross-day spillover
  DAYS.forEach((day, di) => {
    const rolls = schedule[day]
    if (!rolls) return

    for (let ri = 0; ri < rolls.length; ri++) {
      const roll = rolls[ri]
      if (!roll.enabled) continue
      const [h] = roll.time.split(':').map(Number)
      for (let i = 0; i < 5; i++) {
        const absHour = h + i
        if (absHour < 24) {
          // Same day
          if (i === 0) grid[di][absHour] = { type: 'ping', rollIdx: ri }
          else if (grid[di][absHour].type !== 'ping') grid[di][absHour] = { type: 'window', rollIdx: ri }
        } else {
          // Spill into next day's column
          const nextDi = (di + 1) % 7
          const nextHour = absHour - 24
          if (grid[nextDi][nextHour].type !== 'ping') {
            grid[nextDi][nextHour] = { type: 'window', rollIdx: -1 }
          }
        }
      }
    }

    // Disabled rolls — faint marker
    for (let ri = 0; ri < rolls.length; ri++) {
      const roll = rolls[ri]
      if (roll.enabled) continue
      const [h] = roll.time.split(':').map(Number)
      if (grid[di][h].type === 'idle') grid[di][h] = { type: 'disabled-ping', rollIdx: ri }
    }
  })

  return grid
}

const CELL_COLORS = {
  ping:           '#1aab6b',  // malachite
  window:         '#8ee8be',  // malachite light
  'disabled-ping':'#d6d3d1',  // stone-300
  idle:           '#f0efed',  // stone-100ish
  off:            '#fafaf9',  // stone-50
}

const HOUR_ORDER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0]

function WeekHeatmap({ schedule, onUpdateDay }) {
  const [popover, setPopover] = useState(null) // { dayIndex, rollIdx, top, left }
  const [drag, setDrag] = useState(null) // { dayIndex, rollIdx, startHour }
  const [dragHour, setDragHour] = useState(null)
  const gridRef = useRef(null)
  const popoverRef = useRef(null)
  const cellRefs = useRef({}) // key: `${di}-${hour}` → element
  const justDragged = useRef(false)
  const lastTapRef = useRef({ dayIndex: -1, rollIdx: -1, time: 0 })
  const dragHourRef = useRef(null)
  const scheduleRef = useRef(schedule)
  scheduleRef.current = schedule

  const grid = useMemo(() => buildGrid(schedule), [schedule])

  // Close popover when clicking outside both the grid and the popover
  useEffect(() => {
    if (!popover) return
    function handler(e) {
      const inGrid = gridRef.current?.contains(e.target)
      const inPopover = popoverRef.current?.contains(e.target)
      if (!inGrid && !inPopover) setPopover(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [popover])

  // Drag: track pointer movement and handle drop (Pointer Events — works on iOS + desktop)
  // Uses refs for dragHour/schedule to avoid re-registering listeners on every state change
  useEffect(() => {
    if (!drag) return

    function handleMove(e) {
      if (!gridRef.current) return
      const clientY = e.clientY
      let closestHour = null
      let closestDist = Infinity
      for (const hour of HOUR_ORDER) {
        const key = `${drag.dayIndex}-${hour}`
        const el = cellRefs.current[key]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2
        const dist = Math.abs(clientY - centerY)
        if (dist < closestDist) {
          closestDist = dist
          closestHour = hour
        }
      }
      dragHourRef.current = closestHour
      setDragHour(closestHour)
    }

    function handleUp() {
      const currentDragHour = dragHourRef.current
      if (currentDragHour !== null && currentDragHour !== drag.startHour) {
        const day = DAYS[drag.dayIndex]
        const rolls = scheduleRef.current[day]
        if (rolls) {
          const newTime = `${String(currentDragHour).padStart(2, '0')}:00`
          const delta = timeToMinutes(newTime) - timeToMinutes(rolls[drag.rollIdx].time)
          const updated = rolls.map(r => ({ ...r, time: minutesToTime(timeToMinutes(r.time) + delta) }))
          onUpdateDay(day, updated)
        }
      }
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 0)
      setDrag(null)
      setDragHour(null)
      dragHourRef.current = null
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }
  }, [drag, onUpdateDay])

  function handleHeaderClick(dayIndex) {
    const day = DAYS[dayIndex]
    setPopover(null)
    onUpdateDay(day, schedule[day] ? null : buildDefaultRolls('05:00'))
  }

  function handleCellPointerDown(e, dayIndex, hour) {
    const cell = grid[dayIndex][hour]
    if (cell.type !== 'ping') return
    if (e.button && e.button !== 0) return // ignore right-click
    const startY = e.clientY
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)

    function onMove(ev) {
      if (Math.abs(ev.clientY - startY) > 4) {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.releasePointerCapture(ev.pointerId)
        setPopover(null)
        setDrag({ dayIndex, rollIdx: cell.rollIdx, startHour: hour })
        setDragHour(hour)
      }
    }
    function onUp() {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  function handleCellClick(e, dayIndex, hour) {
    if (drag || justDragged.current) return
    const day = DAYS[dayIndex]
    const cell = grid[dayIndex][hour]

    // Double-tap detection — must be first so it's not blocked by popover toggle
    const now = Date.now()
    const last = lastTapRef.current
    if (last.dayIndex === dayIndex && last.rollIdx === cell.rollIdx && now - last.time < 400) {
      lastTapRef.current = { dayIndex: -1, rollIdx: -1, time: 0 }
      if (cell.type === 'ping' || cell.type === 'disabled-ping') {
        const rolls = schedule[day]
        if (!rolls) return
        const updated = [...rolls]
        updated[cell.rollIdx] = { ...updated[cell.rollIdx], enabled: !updated[cell.rollIdx].enabled }
        onUpdateDay(day, updated)
        setPopover(null)
      }
      return
    }
    lastTapRef.current = { dayIndex, rollIdx: cell.rollIdx, time: now }

    // Toggle same popover closed
    if (popover?.dayIndex === dayIndex && popover?.rollIdx === cell.rollIdx &&
        (cell.type === 'ping' || cell.type === 'window' || cell.type === 'disabled-ping')) {
      setPopover(null)
      return
    }

    // Idle or off: activate day
    if (cell.type === 'idle' || cell.type === 'off') {
      setPopover(null)
      onUpdateDay(day, buildDefaultRolls(`${String(hour).padStart(2, '0')}:00`))
      return
    }

    // Single tap: open time picker
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover({
      dayIndex,
      rollIdx: cell.rollIdx,
      top: Math.min(rect.bottom + 6, window.innerHeight - 260),
      left: Math.max(4, Math.min(rect.left, window.innerWidth - 144)),
    })
  }

  function handleRollChange(rollIdx, newTime) {
    if (!popover) return
    const day = DAYS[popover.dayIndex]
    const rolls = schedule[day]
    if (!rolls) return
    const delta = timeToMinutes(newTime) - timeToMinutes(rolls[rollIdx].time)
    const updated = rolls.map(r => ({ ...r, time: minutesToTime(timeToMinutes(r.time) + delta) }))
    onUpdateDay(day, updated)
    setPopover(null)
  }

  return (
    <div ref={gridRef} className="px-5 py-4" style={{ userSelect: drag ? 'none' : 'auto', WebkitUserSelect: drag ? 'none' : 'auto' }}>
      {/* Day column headers — click to toggle day on/off */}
      <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', gap: '3px', marginBottom: '6px' }}>
        <div />
        {DAYS.map((day, di) => {
          const isActive = !!schedule[day]
          return (
            <button
              key={day}
              onClick={() => handleHeaderClick(di)}
              className={`text-xs font-medium py-0.5 rounded transition-colors cursor-pointer ${
                isActive ? 'text-stone-600 hover:text-stone-900' : 'text-stone-300 hover:text-stone-500'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          )
        })}
      </div>

      {/* Hour rows — 1am..11pm, 12am (midnight at bottom so late-night windows are contiguous) */}
      {HOUR_ORDER.map(hour => (
        <div key={hour} style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', gap: '3px', marginBottom: '2px' }}>
          <div className="flex items-center justify-end pr-1">
            {HOUR_LABELS[hour] !== undefined && (
              <span style={{ fontSize: '10px', lineHeight: 1 }} className="text-stone-300 whitespace-nowrap">
                {HOUR_LABELS[hour]}
              </span>
            )}
          </div>
          {grid.map((dayGrid, di) => {
            const cell = dayGrid[hour]
            const isPing = cell.type === 'ping'
            const pingLabel = isPing && schedule[DAYS[di]]?.[cell.rollIdx]
              ? formatTime12(schedule[DAYS[di]][cell.rollIdx].time).replace(/ [AP]M$/, '')
              : null
            const isDragging = drag && drag.dayIndex === di && drag.rollIdx === cell.rollIdx && isPing
            const isDragTarget = drag && drag.dayIndex === di && dragHour === hour && !isPing
            return (
              <div
                key={di}
                ref={el => { cellRefs.current[`${di}-${hour}`] = el }}
                onPointerDown={e => handleCellPointerDown(e, di, hour)}
                onClick={e => handleCellClick(e, di, hour)}
                style={{
                  height: '22px',
                  borderRadius: '2px',
                  backgroundColor: isDragTarget ? '#1aab6b80' : CELL_COLORS[cell.type],
                  cursor: isPing ? (drag ? 'grabbing' : 'grab') : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  opacity: isDragging ? 0.5 : 1,
                  outline: isDragTarget ? '2px solid #1aab6b' : 'none',
                  outlineOffset: '-1px',
                  transition: drag ? 'none' : 'opacity 0.15s',
                  touchAction: isPing ? 'none' : 'auto',
                }}
                className={drag ? '' : 'hover:opacity-70 active:opacity-50'}
              >
                {pingLabel && (
                  <span style={{ fontSize: '11px', lineHeight: 1, color: '#fff', fontWeight: 600, letterSpacing: '-0.02em' }}>
                    {pingLabel}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}


      {/* Roll edit popover */}
      {popover && schedule[DAYS[popover.dayIndex]] && (
        <RollPopover
          rollIdx={popover.rollIdx}
          rolls={schedule[DAYS[popover.dayIndex]]}
          position={{ top: popover.top, left: popover.left }}
          popoverRef={popoverRef}
          onRollChange={handleRollChange}
        />
      )}
    </div>
  )
}

// ─── Main ScheduleGrid ────────────────────────────────────────

export default function ScheduleGrid({ schedule: initialSchedule, timezone: initialTz, onSave }) {
  const [schedule, setSchedule] = useState(() => {
    const normalized = normalizeSchedule(initialSchedule)
    const s = {}
    for (const day of DAYS) s[day] = normalized[day] || null
    return s
  })
  const [timezone, setTimezone] = useState(
    initialTz || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError] = useState(null)
  const [dirty, setDirty] = useState(false)
  const saveTimer = useRef(null)
  const latestRef = useRef({ schedule: null, timezone: null })

  // Only sync from server when user has no unsaved local changes
  useEffect(() => {
    if (!initialSchedule || dirty) return
    const normalized = normalizeSchedule(initialSchedule)
    const s = {}
    for (const day of DAYS) s[day] = normalized[day] || null
    setSchedule(s)
  }, [initialSchedule, dirty])

  useEffect(() => {
    if (initialTz && !dirty) setTimezone(initialTz)
  }, [initialTz, dirty])

  // Auto-save: debounce 800ms after any change (skip if cross-day overlap)
  useEffect(() => {
    if (!dirty) return
    if (checkCrossDayOverlap(schedule)) return
    latestRef.current = { schedule, timezone }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const { schedule: s, timezone: tz } = latestRef.current
      setSaveStatus('saving')
      setSaveError(null)
      try {
        await onSave(s, tz)
        setDirty(false)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 2000)
      } catch (e) {
        setSaveStatus('error')
        setSaveError(e.message || 'Failed to save')
      }
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [schedule, timezone, dirty, onSave])

  function updateDay(day, value) {
    setSchedule(prev => ({ ...prev, [day]: value }))
    setDirty(true)
  }

  const activeDays = DAYS.filter(d => schedule[d]).length
  const totalPings = DAYS.reduce((sum, d) => {
    if (!schedule[d]) return sum
    return sum + schedule[d].filter(r => r.enabled).length
  }, 0)
  const overlap = useMemo(() => checkCrossDayOverlap(schedule), [schedule])

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-stone-900 text-sm tracking-wide uppercase">Weekly Schedule</h2>
            <InfoTooltip />
          </div>
          <div className="flex items-center gap-4">
            {[
              { color: CELL_COLORS.ping, label: 'pinch' },
              { color: CELL_COLORS.idle, label: 'rest' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: color }} />
                <span style={{ fontSize: '10px' }} className="text-stone-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-stone-400 mt-2">Claude rounds windows to the nearest hour, so slots are hourly.</p>
      </div>

      {/* Heatmap — the only editing surface */}
      <WeekHeatmap schedule={schedule} onUpdateDay={updateDay} />

      {/* Cross-day overlap warning */}
      {overlap && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-[11px] text-amber-700">
            <span className="font-semibold capitalize">{overlap.dayB}</span>'s first pinch overlaps <span className="capitalize">{overlap.dayA}</span>'s last 5h window (ends {formatTime12(overlap.endTime)}). Move <span className="capitalize">{overlap.dayB}</span> to {formatTime12(overlap.endTime)} or later.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-400" style={{ minWidth: '60px' }}>
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && <span className="text-emerald-600">Saved</span>}
            {saveStatus === 'error' && <span className="text-red-600">{saveError}</span>}
          </span>
        </div>
        <TimezonePicker
          value={timezone}
          onChange={tz => { setTimezone(tz); setDirty(true) }}
        />
      </div>
    </div>
  )
}
