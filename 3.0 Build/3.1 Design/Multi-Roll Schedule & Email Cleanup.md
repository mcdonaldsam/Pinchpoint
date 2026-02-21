# Multi-Roll Schedule & Email Cleanup

## Context

Two changes bundled together:

1. **Multi-roll scheduling**: PinchPoint currently fires ONE ping per active day (5h of 24h usable). Change to 4 rolling pings per day (each 5h apart) = ~20h active + ~4h overnight break.
2. **Remove ping emails**: No emails on ping success/failure. Only keep account-level emails (disconnect with revocation instructions). Dashboard already shows all status info in real-time.

---

## Part A: Email Cleanup

### What's removed

| Function | Trigger | Action |
|----------|---------|--------|
| `sendPingNotification` | Every successful ping | **DELETE** — dashboard shows window countdown |
| `sendTokenWarningNotification` | 3+ consecutive failures | **DELETE** — dashboard shows yellow health badge |
| `sendTokenExpiredNotification` | 5+ failures, auto-paused | **DELETE** — dashboard shows red health badge |

### What stays

| Function | Trigger | Why |
|----------|---------|-----|
| `sendDisconnectNotification` | Token disconnect or account delete | Security — tells user to revoke token at claude.ai |

### Files changed

**`worker/src/email.js`** — Delete `sendPingNotification`, `sendTokenWarningNotification`, `sendTokenExpiredNotification`. Keep `sendDisconnectNotification`.

**`worker/src/user-schedule-do.js`** — Remove all calls to the 3 deleted functions:
- `handlePingResult()` success path: remove `sendPingNotification` call
- `handlePingResult()` failure path (3 failures): remove `sendTokenWarningNotification` call
- `handlePingResult()` failure path (5 failures): remove `sendTokenExpiredNotification` call
- `executePing()` decrypt failure: remove `sendTokenExpiredNotification` call
- Remove unused imports for the 3 deleted functions

---

## Part B: Multi-Roll Scheduling

### Data model change

**Old** (one time per day):
```json
{ "wednesday": "06:00", "monday": null }
```

**New** (4 rolls per active day):
```json
{
  "wednesday": [
    { "time": "06:00", "enabled": true },
    { "time": "11:00", "enabled": true },
    { "time": "16:00", "enabled": true },
    { "time": "21:00", "enabled": true }
  ],
  "monday": null
}
```

- `null` = day off
- Array of 4 rolls = day active
- Each roll: `time` (HH:MM 24h, 15-min increments), `enabled` (boolean)
- Midnight wrap: if roll N's time < roll 1's time, it's the next calendar day
- **Backward compat**: old string format auto-normalizes to 4 rolls at +5h intervals

---

### Task 1: Shared helpers in `validate.js`

**File:** `3.0 Build/3.2 Host/worker/src/validate.js`

Add and export:

```javascript
// Build 4 default rolls from a start time (each +5h apart)
export function buildDefaultRolls(startTime) {
  const [h, m] = startTime.split(':').map(Number)
  return Array.from({ length: 4 }, (_, i) => {
    const totalMin = (h * 60 + m + i * 300) % 1440
    const rh = String(Math.floor(totalMin / 60)).padStart(2, '0')
    const rm = String(totalMin % 60).padStart(2, '0')
    return { time: `${rh}:${rm}`, enabled: true }
  })
}

// Normalize schedule: convert old string format → new rolls format
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
```

Update `validateSchedule()`:
- String value per day → validate as before (backward compat)
- Array value per day → validate: length === 4, each has valid `time` (HH:MM 15-min), each has boolean `enabled`, roll 1 (`[0]`) must be enabled
- `null` → valid (day off)

---

### Task 2: Rewrite scheduling algorithm in DO

**File:** `3.0 Build/3.2 Host/worker/src/user-schedule-do.js`

Import `normalizeSchedule` from `validate.js`.

#### `calculateNextPingTime(schedule, timezone)` — rewrite

```
1. normalizedSchedule = normalizeSchedule(schedule)
2. for offset = -1 to +6:
     checkDate = now + (offset * 86400ms)
     weekday = getLocalTime(checkDate, timezone).weekday
     dayRolls = normalizedSchedule[weekday]
     if !dayRolls → skip

     for each roll in dayRolls:
       if !roll.enabled → skip
       [h, m] = parse roll.time

       // Midnight wrap detection: if this roll's time < roll 1's time,
       // it belongs to the next calendar day
       if rollIndex > 0 AND roll.time < dayRolls[0].time:
         targetDate = buildTargetDate(checkDate + 1 day, h, m, timezone)
       else:
         targetDate = buildTargetDate(checkDate, h, m, timezone)

       if targetDate > now:
         track as candidate (keep soonest)

3. return soonest candidate (or null)
```

The offset=-1 handles midnight-wrapped rolls from the previous day that haven't fired yet.

#### `calculateNextPingInfo(schedule, timezone)` — rewrite

Same algorithm as above, but returns `{ day, time, rollIndex, date }` for display purposes.

#### `scheduleNextAlarm()` — no structural change

Already calls `calculateNextPingTime()` and sets alarm. The rewritten function handles multi-roll automatically.

#### `getStatus()` — minor update

The `nextPing` field now includes `rollIndex` (0-3) so the frontend can show "Roll 2 at 11:00 AM".

---

### Task 3: Rewrite ScheduleGrid frontend

**File:** `web/src/components/ScheduleGrid.jsx`

Complete redesign of the per-day display.

#### Layout: Day enabled

```
[Day Toggle ON]  Wed
  Roll 1    [06:00 AM v]
  Roll 2    [11:00 AM v]   [toggle on/off]
  Roll 3    [04:00 PM v]   [toggle on/off]
  Roll 4    [09:00 PM v]   [toggle on/off]
  Break     02:00 AM → 06:00 AM Thu
```

#### Layout: Day disabled

Entire row greyed out at reduced opacity. Only toggle + day label visible. No "Off" text.

#### Key behaviors

1. **Day toggle**: on/off for entire day. Off = greyed out, no rolls shown.
2. **Roll 1 time picker**: always enabled when day is on. Changing it recalculates rolls 2-4 at +5h intervals (full reset).
3. **Rolls 2-4 time pickers + toggles**:
   - Shifting a roll cascades same delta to all subsequent rolls
   - Disabling a roll doesn't affect other roll times (it's just skipped for pinging)
   - Roll 1 cannot be disabled
4. **Break display**: read-only. Shows gap = last active roll time + 5h → next active day's roll 1.
5. **Cross-day constraints**: Grey out roll 1 times that fall before previous active day's last enabled roll + 5h.
6. **Per-roll constraints**: Grey out times earlier than previous roll + 5h.

#### Cascade logic (frontend-only)

```javascript
function handleRollTimeChange(day, rollIndex, newTime) {
  const rolls = [...schedule[day]]
  const oldMinutes = timeToMinutes(rolls[rollIndex].time)
  const newMinutes = timeToMinutes(newTime)
  const delta = newMinutes - oldMinutes

  rolls[rollIndex] = { ...rolls[rollIndex], time: newTime }

  // Cascade to subsequent rolls
  for (let i = rollIndex + 1; i < 4; i++) {
    const shifted = (timeToMinutes(rolls[i].time) + delta + 1440) % 1440
    rolls[i] = { ...rolls[i], time: minutesToTime(shifted) }
  }

  updateSchedule(day, rolls)
}
```

#### Data flow

- Schedule state: `{ day: null | [{ time, enabled }, ...] }`
- On save: sends new format to `PUT /api/schedule`
- On load: receives schedule from `/api/status` (may be old or new format; frontend normalizes with same `buildDefaultRolls` logic)

#### Timezone picker + save button

No changes needed — existing behavior preserved.

---

### Task 4: Minor StatusPanel update

**File:** `web/src/components/StatusPanel.jsx`

"Next pinch" row shows roll number when available:
- Before: `Wednesday at 06:00 AM AEST`
- After: `Wed roll 2 at 11:00 AM AEST`

Only show roll label when `rollIndex > 0` (roll 1 is implicit).

---

## Implementation Order

```
1. Part A: Email cleanup (smallest, independent)
2. Task 1: validate.js helpers (foundation)
3. Task 2: DO scheduling rewrite (backend multi-roll)
4. Task 3: ScheduleGrid rewrite (frontend multi-roll)
5. Task 4: StatusPanel tweak
6. Deploy worker + frontend
7. End-to-end verification
```

---

## Files Modified

| File | Change |
|------|--------|
| `worker/src/email.js` | Delete 3 of 4 email functions |
| `worker/src/user-schedule-do.js` | Remove email calls, rewrite `calculateNextPingTime`, `calculateNextPingInfo`, update `getStatus` |
| `worker/src/validate.js` | Add `buildDefaultRolls`, `normalizeSchedule`, update `validateSchedule` |
| `web/src/components/ScheduleGrid.jsx` | Complete rewrite for multi-roll |
| `web/src/components/StatusPanel.jsx` | Show roll index in next pinch display |

**Unchanged:** `index.js` (routes), `crypto.js`, `auth.js`, CLI, ping service, Connect page, Dashboard.jsx (props unchanged)

---

## Verification Checklist

1. Save a 4-roll schedule via dashboard → API accepts new format
2. `GET /api/status` → `nextPing` shows correct next roll with `rollIndex`
3. Click "Pinch now" → next alarm advances to roll 2 (not next day)
4. Disable roll 2, save → next alarm skips to roll 3
5. Shift roll 2 later → rolls 3-4 cascade correctly
6. Cross-day: Tuesday 20:00 start → Wednesday greys out times before ~01:00 AM
7. Old-format schedule (existing user) → normalizes to 4 rolls on load
8. No emails sent on ping success/failure
9. Disconnect email still sends with revocation instructions
10. Midnight wrap: set start at 22:00 → rolls 2-4 at 03:00, 08:00, 13:00 (next day for roll 2)
