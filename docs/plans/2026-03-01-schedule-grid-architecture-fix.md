# Schedule Grid Architecture Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize midnight-wrap logic into a single `resolveRolls()` function, fixing 8 bugs in the schedule grid and removing the now-redundant popover.

**Architecture:** One pure function `resolveRolls(rolls)` returns chronologically-ordered, wrap-annotated rolls. All consumers (grid builder, gap validation, cross-day overlap, backend validation, DO scheduler) call this instead of re-deriving wrap logic. The popover is stripped entirely — drag is the only way to move rolls.

**Tech Stack:** React (Vite), Cloudflare Workers, Durable Objects

---

### Task 1: Add `resolveRolls()` to ScheduleGrid.jsx

**Files:**
- Modify: `web/src/components/ScheduleGrid.jsx` — add after `minutesToTime` (line 29)

**Step 1: Add the function**

Insert after the `minutesToTime` function:

```js
/**
 * Resolve a day's rolls into chronological order with wrap annotation.
 * Roll 1 (idx 0) defines the day boundary. Rolls with times earlier
 * than Roll 1 are "wrapped" — they fire on the next calendar day.
 * @param {Array} rolls - [{ time: "HH:00", enabled: bool }, ...]
 * @returns {Array} [{ time, enabled, idx, chronoMinutes, wrapped }, ...] sorted chronologically
 */
function resolveRolls(rolls) {
  if (!rolls || !rolls.length) return []
  const roll1Min = timeToMinutes(rolls[0].time)
  return rolls
    .map((roll, idx) => {
      const min = timeToMinutes(roll.time)
      const wrapped = idx > 0 && min < roll1Min
      return { ...roll, idx, chronoMinutes: min + (wrapped ? 1440 : 0), wrapped }
    })
    .sort((a, b) => a.chronoMinutes - b.chronoMinutes)
}
```

**Step 2: Commit**

```bash
git add web/src/components/ScheduleGrid.jsx
git commit -m "feat: add resolveRolls() centralized wrap-detection helper"
```

---

### Task 2: Rewrite `checkRollGapViolation` using `resolveRolls`

**Files:**
- Modify: `web/src/components/ScheduleGrid.jsx:95-119` — replace entire function

**Step 1: Replace the function**

Replace `checkRollGapViolation` (lines 95-119) with:

```js
function checkRollGapViolation(schedule) {
  for (const day of DAYS) {
    const rolls = schedule[day]
    if (!rolls || !Array.isArray(rolls)) continue
    const resolved = resolveRolls(rolls).filter(r => r.enabled)
    for (let i = 1; i < resolved.length; i++) {
      const gap = resolved[i].chronoMinutes - resolved[i - 1].chronoMinutes
      if (gap > 0 && gap < 300) {
        return { day, rollA: resolved[i - 1].idx + 1, rollB: resolved[i].idx + 1, gapHours: Math.floor(gap / 60) }
      }
    }
    // No same-day wrap-around check — chronoMinutes already linearizes the timeline.
    // Cross-day overlap (last roll's window into next day's Roll 1) is handled by checkCrossDayOverlap.
  }
  return null
}
```

Key change: the old wrap-around gap check (lines 111-116) is removed. `chronoMinutes` already places wrapped rolls after non-wrapped ones, so consecutive gaps are correct without a special wrap case.

**Step 2: Commit**

```bash
git add web/src/components/ScheduleGrid.jsx
git commit -m "fix: rewrite checkRollGapViolation using resolveRolls — fixes false positives on wrapped rolls"
```

---

### Task 3: Rewrite `checkCrossDayOverlap` using `resolveRolls`

**Files:**
- Modify: `web/src/components/ScheduleGrid.jsx:59-89` — replace entire function

**Step 1: Replace the function**

Replace `checkCrossDayOverlap` (lines 59-89) with:

```js
function checkCrossDayOverlap(schedule) {
  const enabledDays = DAYS.filter(d => schedule[d] && Array.isArray(schedule[d]))
  for (let idx = 0; idx < enabledDays.length; idx++) {
    const dayA = enabledDays[idx]
    const dayB = enabledDays[(idx + 1) % enabledDays.length]
    if (dayA === dayB) continue

    const resolvedA = resolveRolls(schedule[dayA]).filter(r => r.enabled)
    if (!resolvedA.length) continue
    const lastRoll = resolvedA[resolvedA.length - 1]
    const windowEnd = lastRoll.chronoMinutes + 300

    const firstMinB = timeToMinutes(schedule[dayB][0].time)
    const idxA = DAYS.indexOf(dayA)
    const idxB = DAYS.indexOf(dayB)
    const dayGap = (idxB - idxA + 7) % 7 || 7
    const firstAbsolute = firstMinB + dayGap * 1440

    if (windowEnd > firstAbsolute) {
      const endMin = windowEnd % 1440
      return { dayA, dayB, endTime: minutesToTime(endMin) }
    }
  }
  return null
}
```

Key change: `resolvedA[resolvedA.length - 1]` is the chronologically last enabled roll (guaranteed by `resolveRolls` sort), replacing the fragile array-position iteration.

**Step 2: Commit**

```bash
git add web/src/components/ScheduleGrid.jsx
git commit -m "fix: rewrite checkCrossDayOverlap using resolveRolls — finds chronologically last roll"
```

---

### Task 4: Rewrite `buildGrid` using `resolveRolls`

**Files:**
- Modify: `web/src/components/ScheduleGrid.jsx:455-519` — replace entire function

**Step 1: Replace the function**

Replace `buildGrid` (lines 455-519) with:

```js
function buildGrid(schedule) {
  const grid = DAYS.map((day, di) => {
    const rolls = schedule[day]
    if (!rolls) return Array.from({ length: 24 }, () => ({ type: 'off', rollIdx: -1, sourceDi: di }))
    return Array.from({ length: 24 }, () => ({ type: 'idle', rollIdx: -1, sourceDi: di }))
  })

  DAYS.forEach((day, di) => {
    const rolls = schedule[day]
    if (!rolls) return
    const resolved = resolveRolls(rolls)

    for (const r of resolved) {
      const h = timeToMinutes(r.time) / 60 | 0
      const renderDi = r.wrapped ? (di + 1) % 7 : di

      if (!r.enabled) {
        if (grid[renderDi][h].type === 'idle') {
          grid[renderDi][h] = { type: 'disabled-ping', rollIdx: r.idx, sourceDi: di }
        }
        continue
      }

      for (let i = 0; i < 5; i++) {
        const absHour = h + i
        if (absHour < 24) {
          if (i === 0) {
            if (grid[renderDi][absHour].type !== 'ping') {
              grid[renderDi][absHour] = { type: 'ping', rollIdx: r.idx, sourceDi: di }
            }
          } else if (grid[renderDi][absHour].type === 'idle' || grid[renderDi][absHour].type === 'off') {
            grid[renderDi][absHour] = { type: 'window', rollIdx: r.idx, sourceDi: di }
          }
        } else {
          // Spillover into next day's column
          const nextDi = (renderDi + 1) % 7
          const nextHour = absHour - 24
          if (grid[nextDi][nextHour].type === 'idle' || grid[nextDi][nextHour].type === 'off') {
            grid[nextDi][nextHour] = { type: 'window', rollIdx: r.idx, sourceDi: di }
          }
          // Visual continuity: paint hour 0 on renderDi (midnight = bottom of grid)
          if (nextHour === 0 && (grid[renderDi][0].type === 'idle' || grid[renderDi][0].type === 'off')) {
            grid[renderDi][0] = { type: 'window', rollIdx: r.idx, sourceDi: di }
          }
        }
      }
    }
  })

  return grid
}
```

Key changes from old `buildGrid`:
1. Uses `resolveRolls` — no inline `ri > 0 && rollMin < roll1Min`
2. No separate disabled-roll loop — handled in same iteration
3. Spillover cells carry correct `rollIdx: r.idx` instead of `-1`
4. `rollMin` inconsistency gone — all timing comes from `resolveRolls`
5. Visual continuity at hour 0 retained (intentional, not a hack — midnight is at grid bottom)

**Step 2: Commit**

```bash
git add web/src/components/ScheduleGrid.jsx
git commit -m "refactor: rewrite buildGrid using resolveRolls — fixes spillover rollIdx and wrap detection"
```

---

### Task 5: Strip popover + fix click handlers

**Files:**
- Modify: `web/src/components/ScheduleGrid.jsx` — multiple sections

**Step 1: Remove RollPopover component**

Delete the entire `RollPopover` function (lines 333-399).

**Step 2: Remove popover state and refs from WeekHeatmap**

In `WeekHeatmap` (starts line 531), remove:
- `const [popover, setPopover] = useState(null)` (line 532)
- `const popoverRef = useRef(null)` (line 536)
- The popover close-on-outside-click `useEffect` (lines 547-560)

**Step 3: Remove handleRollChange**

Delete `handleRollChange` function (lines 718-734).

**Step 4: Strip popover from handleHeaderClick**

In `handleHeaderClick`, remove `setPopover(null)` — it no longer exists.

**Step 5: Strip popover from drag handler**

In `handleCellPointerDown` onMove callback, remove `setPopover(null)`.

**Step 6: Simplify handleCellClick**

Replace `handleCellClick` with (no popover references, no single-tap time picker):

```js
  function handleCellClick(e, dayIndex, hour) {
    if (drag || justDragged.current) return
    const cell = grid[dayIndex][hour]
    const sourceDay = DAYS[cell.sourceDi]

    // Double-tap detection
    const now = Date.now()
    const last = lastTapRef.current
    if (last.dayIndex === cell.sourceDi && last.rollIdx === cell.rollIdx && now - last.time < 400) {
      lastTapRef.current = { dayIndex: -1, rollIdx: -1, time: 0 }

      // Double-tap on idle/window slot of an active day → add a new roll
      if ((cell.type === 'idle' || cell.type === 'window') && schedule[sourceDay]) {
        const rolls = schedule[sourceDay]
        if (rolls.length >= 5) return
        const newRollTime = `${String(hour).padStart(2, '0')}:00`
        onUpdateDay(sourceDay, [...rolls, { time: newRollTime, enabled: true }])
        return
      }

      // Double-tap on ping: toggle enabled/disabled (Roll 1 can't be disabled)
      if (cell.type === 'ping' || cell.type === 'disabled-ping') {
        if (cell.rollIdx === 0) return
        const rolls = schedule[sourceDay]
        if (!rolls) return
        const updated = [...rolls]
        updated[cell.rollIdx] = { ...updated[cell.rollIdx], enabled: !updated[cell.rollIdx].enabled }
        onUpdateDay(sourceDay, updated)
      }
      return
    }
    lastTapRef.current = { dayIndex: cell.sourceDi, rollIdx: cell.rollIdx, time: now }
  }
```

**Step 7: Remove popover rendering from JSX**

Delete the popover JSX block near the bottom of the `WeekHeatmap` return (lines 813-823):
```jsx
{/* Roll edit popover */}
{popover && schedule[DAYS[popover.dayIndex]] && (
  <RollPopover ... />
)}
```

**Step 8: Update InfoTooltip hints**

In the `InfoTooltip` component, replace the hints array with:
```js
{[
  'Drag first pinch to shift the day',
  'Drag other pinches independently',
  'Double-tap to skip/restore a pinch',
  'Double-tap empty to add a pinch',
  'Tap the day to toggle on/off',
].map(hint => (
```

**Step 9: Remove unused TIME_OPTIONS constant**

Delete lines 7-10 (the `TIME_OPTIONS` array) — it was only used by the popover.

**Step 10: Commit**

```bash
git add web/src/components/ScheduleGrid.jsx
git commit -m "refactor: strip popover/time picker — drag-only interaction model"
```

---

### Task 6: Build frontend and verify

**Step 1: Build**

```bash
cd web && npm run build
```

Expected: clean build, no errors.

**Step 2: Dev server smoke test**

```bash
cd web && npm run dev
```

Open http://localhost:5173, sign in, verify:
- Grid renders correctly
- Drag Roll 1 shifts all rolls
- Drag Roll 2+ moves independently
- Double-click empty adds roll
- Double-click Roll 2+ toggles
- Single-click does nothing (no popover)
- Day header toggle works
- No false gap warnings on schedules with wrapped rolls
- Saturday late-night rolls spill correctly into Sunday

**Step 3: Commit build fix if needed**

---

### Task 7: Add `resolveRolls` to backend + rewrite validation

**Files:**
- Modify: `3.0 Build/3.2 Host/worker/src/validate.js` — add function + rewrite validation

**Step 1: Add resolveRolls + helper**

Add after `timeToMinutes` (line 153):

```js
function resolveRolls(rolls) {
  if (!rolls || !rolls.length) return []
  const roll1Min = timeToMinutes(rolls[0].time)
  return rolls
    .map((roll, idx) => {
      const min = timeToMinutes(roll.time)
      const wrapped = idx > 0 && min < roll1Min
      return { ...roll, idx, chronoMinutes: min + (wrapped ? 1440 : 0), wrapped }
    })
    .sort((a, b) => a.chronoMinutes - b.chronoMinutes)
}
```

**Step 2: Rewrite same-day gap validation**

In `validateSchedule`, replace the gap validation block (lines 87-103) with:

```js
      // Enabled rolls must be at least 5h (300min) apart (chronological order)
      const resolved = resolveRolls(value).filter(r => r.enabled)
      for (let i = 1; i < resolved.length; i++) {
        const gap = resolved[i].chronoMinutes - resolved[i - 1].chronoMinutes
        if (gap > 0 && gap < 300) {
          return `${day}: roll ${resolved[i].idx + 1} (${resolved[i].time}) is only ${Math.floor(gap / 60)}h after roll ${resolved[i - 1].idx + 1} (${resolved[i - 1].time}). Must be at least 5h apart`
        }
      }
```

No wrap-around gap check needed — `resolveRolls` linearizes the timeline.

**Step 3: Rewrite cross-day overlap validation**

Replace the cross-day overlap block (lines 112-145) with:

```js
  const normalized = normalizeSchedule(schedule)
  const enabledDays = VALID_DAYS.filter(d => normalized[d] && Array.isArray(normalized[d]))
  for (let idx = 0; idx < enabledDays.length; idx++) {
    const dayA = enabledDays[idx]
    const dayB = enabledDays[(idx + 1) % enabledDays.length]
    if (dayA === dayB) continue

    const resolvedA = resolveRolls(normalized[dayA]).filter(r => r.enabled)
    if (!resolvedA.length) continue
    const lastRoll = resolvedA[resolvedA.length - 1]
    const windowEnd = lastRoll.chronoMinutes + 300

    const firstMinB = timeToMinutes(normalized[dayB][0].time)
    const idxA = VALID_DAYS.indexOf(dayA)
    const idxB = VALID_DAYS.indexOf(dayB)
    const dayGap = (idxB - idxA + 7) % 7 || 7
    const firstAbsolute = firstMinB + dayGap * 1440

    if (windowEnd > firstAbsolute) {
      const endH = Math.floor((windowEnd % 1440) / 60)
      const endM = windowEnd % 60
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      return `${dayB} roll 1 (${normalized[dayB][0].time}) overlaps ${dayA}'s last window (ends ${endTime}). Move ${dayB} to ${endTime} or later`
    }
  }
```

**Step 4: Commit**

```bash
git add "3.0 Build/3.2 Host/worker/src/validate.js"
git commit -m "fix: rewrite backend validation using resolveRolls — matches frontend logic"
```

---

### Task 8: Update DO `calculateNextPingTime`

**Files:**
- Modify: `3.0 Build/3.2 Host/worker/src/user-schedule-do.js:400-434`

**Step 1: Add resolveRolls to user-schedule-do.js**

Add before `calculateNextPingTime` (at line ~399):

```js
function resolveRolls(rolls) {
  if (!rolls || !rolls.length) return []
  const roll1Min = timeToMinutes(rolls[0].time)
  return rolls
    .map((roll, idx) => {
      const min = timeToMinutes(roll.time)
      const wrapped = idx > 0 && min < roll1Min
      return { ...roll, idx, chronoMinutes: min + (wrapped ? 1440 : 0), wrapped }
    })
    .sort((a, b) => a.chronoMinutes - b.chronoMinutes)
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
```

Note: check if `timeToMinutes` already exists in this file. If so, reuse it. If not, add it.

**Step 2: Rewrite the roll loop in calculateNextPingTime**

Replace lines 412-431 with:

```js
    const resolved = resolveRolls(dayRolls)
    for (const r of resolved) {
      if (!r.enabled) continue
      const [h, m] = r.time.split(':').map(Number)

      let target
      if (r.wrapped) {
        const nextDay = new Date(checkDate.getTime() + 86400_000)
        target = buildTargetDate(nextDay, h, m, timezone)
      } else {
        target = buildTargetDate(checkDate, h, m, timezone)
      }

      if (target && target > now) {
        if (!soonest || target < soonest) soonest = target
      }
    }
```

**Step 3: Commit**

```bash
git add "3.0 Build/3.2 Host/worker/src/user-schedule-do.js"
git commit -m "refactor: use resolveRolls in calculateNextPingTime — consistent wrap detection"
```

---

### Task 9: Deploy and verify

**Step 1: Build frontend**

```bash
cd web && npm run build
```

**Step 2: Deploy frontend**

```bash
CLOUDFLARE_API_TOKEN=<from .env.secrets> npx wrangler deploy --config web/wrangler.toml
```

**Step 3: Deploy worker**

```bash
cd "3.0 Build/3.2 Host/worker"
CLOUDFLARE_API_TOKEN=<from .env.secrets> npx wrangler deploy
```

**Step 4: Verify live site**

- Open https://pinchpoint.dev
- Test schedule with wrapped rolls (late-night roll that crosses midnight)
- Confirm no false gap warnings
- Confirm spillover renders on correct column
- Confirm drag and double-click work
- Confirm no popover appears on single click
- Confirm day header toggle works

**Step 5: Final commit (squash if desired)**

```bash
git add -A
git commit -m "feat: schedule grid architecture fix — centralized resolveRolls, strip popover"
```
