// Input validation for schedule and timezone

const VALID_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday',
]
const TIME_REGEX = /^([01]\d|2[0-3]):(00|15|30|45)$/

/**
 * Validate a schedule object.
 * @param {object} schedule - { monday: "08:00" | null, ... }
 * @returns {string|null} Error message or null if valid
 */
export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return 'Schedule must be an object'
  }
  for (const [day, time] of Object.entries(schedule)) {
    if (!VALID_DAYS.includes(day)) return `Invalid day: ${day}`
    if (time !== null && !TIME_REGEX.test(time)) {
      return `Invalid time for ${day}: ${time} (must be HH:MM in 15-min increments)`
    }
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
