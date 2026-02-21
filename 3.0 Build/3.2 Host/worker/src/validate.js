// Input validation for schedule and timezone

const VALID_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday',
]
const TIME_REGEX = /^([01]\d|2[0-3]):(00|15|30|45)$/

/**
 * Build 4 default rolls from a start time (each +5h apart).
 * @param {string} startTime - "HH:MM" in 24h format
 * @returns {Array<{time: string, enabled: boolean}>}
 */
export function buildDefaultRolls(startTime) {
  const [h, m] = startTime.split(':').map(Number)
  return Array.from({ length: 4 }, (_, i) => {
    const totalMin = (h * 60 + m + i * 300) % 1440
    const rh = String(Math.floor(totalMin / 60)).padStart(2, '0')
    const rm = String(totalMin % 60).padStart(2, '0')
    return { time: `${rh}:${rm}`, enabled: true }
  })
}

/**
 * Normalize schedule: convert old string format → new rolls format.
 * Old: { day: "HH:MM" | null }
 * New: { day: null | [{ time, enabled }, ...] }
 */
export function normalizeSchedule(schedule) {
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
 * Validate a schedule object.
 * Supports both old format (string per day) and new format (array of rolls per day).
 * @param {object} schedule - { day: "HH:MM" | null | [{ time, enabled }, ...] }
 * @returns {string|null} Error message or null if valid
 */
export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return 'Schedule must be an object'
  }
  for (const [day, value] of Object.entries(schedule)) {
    if (!VALID_DAYS.includes(day)) return `Invalid day: ${day}`

    if (value === null) continue

    // Old format: string time
    if (typeof value === 'string') {
      if (!TIME_REGEX.test(value)) {
        return `Invalid time for ${day}: ${value} (must be HH:MM in 15-min increments)`
      }
      continue
    }

    // New format: array of 4 rolls
    if (Array.isArray(value)) {
      if (value.length !== 4) {
        return `${day} must have exactly 4 rolls`
      }
      for (let i = 0; i < value.length; i++) {
        const roll = value[i]
        if (!roll || typeof roll !== 'object') {
          return `${day} roll ${i + 1} must be an object`
        }
        if (!TIME_REGEX.test(roll.time)) {
          return `${day} roll ${i + 1}: invalid time ${roll.time} (must be HH:MM in 15-min increments)`
        }
        if (typeof roll.enabled !== 'boolean') {
          return `${day} roll ${i + 1}: enabled must be a boolean`
        }
      }
      // Roll 1 must be enabled
      if (!value[0].enabled) {
        return `${day}: roll 1 must be enabled`
      }
      continue
    }

    return `Invalid value for ${day}: must be null, a time string, or an array of rolls`
  }
  return null
}

/**
 * Validate an IANA timezone string.
 * @param {string} tz - IANA timezone (e.g., "America/New_York")
 * @returns {string|null} Error message or null if valid
 */
export function validateTimezone(tz) {
  if (!tz || typeof tz !== 'string') return 'Timezone must be a string'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return null
  } catch {
    return `Invalid timezone: ${tz}`
  }
}
