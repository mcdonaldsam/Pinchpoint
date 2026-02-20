import { useState, useRef, useEffect, useMemo } from 'react'

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

// Industry-standard timezone list (Windows/Microsoft format)
// Used by Google Calendar, Outlook, Slack, etc.
// Source: https://github.com/dmfilipenko/timezones.json
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
  { tz: 'Pacific/Tongatapu',                 label: '(UTC+13:00) Nuku\'alofa' },
  { tz: 'Pacific/Apia',                      label: '(UTC+13:00) Samoa' },
]

// Map IANA timezone to its list entry (or best match by offset)
function findTzEntry(tz) {
  // Direct match
  const direct = TIMEZONE_LIST.find(t => t.tz === tz)
  if (direct) return direct
  // Fallback: match by UTC offset
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || ''
    return TIMEZONE_LIST.find(t => {
      const tParts = new Intl.DateTimeFormat('en-US', {
        timeZone: t.tz,
        timeZoneName: 'shortOffset',
      }).formatToParts(new Date())
      return tParts.find(p => p.type === 'timeZoneName')?.value === offset
    })
  } catch {
    return null
  }
}

// Button display: uses list label's city names, e.g. "Canberra, Melbourne, Sydney (GMT+11)"
function formatButtonLabel(tz) {
  const entry = findTzEntry(tz)
  // Extract city names from label: "(UTC+10:00) Canberra, Melbourne, Sydney" → "Canberra, Melbourne, Sydney"
  const cities = entry ? entry.label.replace(/^\(UTC[^)]*\)\s*/, '') : tz.split('/').pop().replace(/_/g, ' ')
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || ''
    return `${cities} (${offset})`
  } catch {
    return cities
  }
}

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
      label.toLowerCase().includes(q) ||
      tz.toLowerCase().replace(/_/g, ' ').includes(q)
    )
  }, [search])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  // Scroll to selected
  useEffect(() => {
    if (open && listRef.current && !search) {
      const el = listRef.current.querySelector('[data-selected="true"]')
      if (el) el.scrollIntoView({ block: 'center' })
    }
  }, [open, search])

  function select(tz) {
    onChange(tz)
    setOpen(false)
    setSearch('')
  }

  // Determine which tz in the list is "selected" (may not be exact match)
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
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
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
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-stone-400 text-center">No timezones found</div>
            ) : (
              filtered.map(({ tz, label }) => (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScheduleGrid({ schedule: initialSchedule, timezone: initialTz, onSave }) {
  const [schedule, setSchedule] = useState(() => {
    const s = {}
    for (const day of DAYS) {
      s[day] = initialSchedule?.[day] || null
    }
    return s
  })
  const [timezone, setTimezone] = useState(
    initialTz || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
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
        <div className="flex items-center gap-2">
          <TimezonePicker
            value={timezone}
            onChange={tz => { setTimezone(tz); setSaved(false) }}
          />
          <button
            onClick={() => {
              const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
              // Map to a list entry if possible, otherwise keep raw IANA
              const match = findTzEntry(detected)
              setTimezone(match ? match.tz : detected)
              setSaved(false)
            }}
            title="Auto-detect timezone"
            className="text-xs text-stone-400 hover:text-stone-600 border border-stone-200 rounded-lg px-2 py-1.5 hover:border-stone-300 transition-colors cursor-pointer"
          >
            Detect
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {DAYS.map(day => (
          <div key={day} className="flex items-center gap-4">
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

            <span className={`w-10 text-sm font-medium ${schedule[day] ? 'text-stone-900' : 'text-stone-400'}`}>
              {DAY_LABELS[day]}
            </span>

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
