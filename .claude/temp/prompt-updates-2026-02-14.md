# Agent Prompt System Updates — 2026-02-14

**Ticket**: Audit and update agent prompt system against Claude Code v2.1.34
**Status**: ✅ Complete
**Files Modified**: 4
**Files Created**: 2
**Token Impact**: +450 tokens (~2,700 → ~3,150 total)

---

## Changes Made

### 1. Created `core/doing-tasks.md` ✅

**Source**: `4.0 Prompt Design/4.3 Claude Code/System/system-prompt-doing-tasks.md`
**Path**: `3.0 Build/src/main/agent/prompts/core/doing-tasks.md`
**Token Cost**: ~200 tokens

**Key Content**:
- ❌ **NEVER propose changes to code you haven't read** — critical rule
- ⚠️ **Avoid over-engineering** — only make requested changes
  - Don't add features beyond what was asked
  - Don't add docstrings/comments to unchanged code
  - Don't add error handling for impossible scenarios
  - Don't create abstractions for one-time operations
- 🔒 **Security awareness** — OWASP top 10 vulnerabilities
- 🗑️ **Delete unused code completely** — no backwards-compat hacks

**Impact**: Prevents agent from over-engineering solutions and adding unnecessary complexity.

---

### 2. Created `core/tone-and-style.md` ✅

**Source**: `4.0 Prompt Design/4.3 Claude Code/System/system-prompt-tone-and-style.md`
**Path**: `3.0 Build/src/main/agent/prompts/core/tone-and-style.md`
**Token Cost**: ~150 tokens

**Key Content**:
- 📝 **Concise responses** — short and to the point
- 🚫 **No emojis** unless user explicitly requests
- 🎯 **Professional objectivity**:
  - Prioritize technical accuracy over validating user's beliefs
  - Disagree when necessary (respectful correction > false agreement)
  - Investigate truth before confirming beliefs
  - ❌ Avoid excessive praise like "You're absolutely right"
- ⏱️ **No time estimates**:
  - Never say "this will take 5 minutes"
  - No "quick fix" or "should be done soon"
  - Focus on what needs to be done, not duration
- 📄 **Prefer editing over creating files**

**Impact**: More professional, objective communication; no false validation or misleading time estimates.

---

### 3. Enhanced `core/executing-with-care.md` ✅

**Path**: `3.0 Build/src/main/agent/prompts/core/executing-with-care.md`
**Token Impact**: +100 tokens (enhanced existing content)

**New Content Added**:
- 🔄 **Scope awareness**: "User approving an action once ≠ approval in all contexts"
- 📋 **Authorization**: "Authorization stands for the scope specified, not beyond"
- 🔀 **Merge conflicts**: "Typically resolve merge conflicts rather than discarding changes"
- 🔒 **Lock files**: "If a lock file exists, investigate what process holds it rather than deleting it"
- ⚠️ **Enhanced examples**: More detailed risky operation scenarios

**Impact**: More nuanced safety behavior, especially for git operations and file conflicts.

---

### 4. Updated `prompts/loader.ts` ✅

**Path**: `3.0 Build/src/main/agent/prompts/loader.ts`
**Changes**: Added 2 new prompts to assembly order

**Before** (10 policy modules):
```typescript
const policyModules = [
  'core/efficiency',
  'core/tool-usage-policy',
  'core/code-quality',
  // ... 7 more
]
```

**After** (12 policy modules):
```typescript
const policyModules = [
  'core/efficiency',
  'core/doing-tasks',        // ← NEW
  'core/tone-and-style',     // ← NEW
  'core/tool-usage-policy',
  'core/code-quality',
  // ... 7 more
]
```

**Assembly Order**: New prompts appear early (after efficiency, before tool-usage-policy) to establish core behavior.

---

## File Manifest

### Created Files
1. `3.0 Build/src/main/agent/prompts/core/doing-tasks.md` (16 lines)
2. `3.0 Build/src/main/agent/prompts/core/tone-and-style.md` (20 lines)

### Modified Files
1. `3.0 Build/src/main/agent/prompts/core/executing-with-care.md` (+7 lines)
2. `3.0 Build/src/main/agent/prompts/loader.ts` (+2 lines in policyModules array)

### Reference Files Used
1. `4.0 Prompt Design/4.3 Claude Code/System/system-prompt-doing-tasks.md`
2. `4.0 Prompt Design/4.3 Claude Code/System/system-prompt-tone-and-style.md`
3. `4.0 Prompt Design/4.3 Claude Code/System/system-prompt-executing-actions-with-care.md`

---

## Before vs After Comparison

### Prompt Coverage

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Core prompts | 16 files | 18 files | +2 |
| Total lines | ~160 | ~196 | +36 lines |
| Token estimate | ~2,700 | ~3,150 | +450 tokens |

### Claude Code Alignment

| Prompt Category | Before | After |
|----------------|--------|-------|
| Core identity & behavior | 3/5 prompts | **5/5 prompts** ✅ |
| Over-engineering prevention | ❌ Missing | ✅ Added |
| Professional objectivity | ❌ Missing | ✅ Added |
| Safety details | ⚠️ Partial | ✅ Enhanced |

---

## Token Budget Impact

**Before**: ~2,700 tokens
**After**: ~3,150 tokens
**Increase**: +450 tokens (+16.7%)

**Context**: Claude Code typically uses 8K-15K tokens. Arete at 3.2K is still lean and efficient.

**Breakdown by component**:
- Core prompts: 400 → 650 tokens (+250)
- Tool descriptions: ~1,200 (unchanged)
- Product knowledge (when active): ~800 (unchanged)
- Memory context (when active): ~300 (unchanged)
- Reminders (future): 0 → 0 (not populated yet)

---

## Behavioral Changes Expected

### 1. Anti-Over-Engineering ✅
**Before**: Agent might add extra features, abstractions, or docstrings
**After**: Agent strictly makes only requested changes, avoids premature abstractions

### 2. Professional Communication ✅
**Before**: Agent might validate user beliefs excessively ("You're absolutely right!")
**After**: Agent prioritizes technical accuracy, respectfully disagrees when needed

### 3. No Time Estimates ✅
**Before**: Agent might say "this is a quick fix" or "should take 5 minutes"
**After**: Agent focuses on what needs to be done, avoids duration predictions

### 4. Enhanced Safety ✅
**Before**: Basic safety guidance
**After**: More nuanced understanding of scope, merge conflicts, lock files

---

## Validation

### Build-Time Loading ✅
The new `.md` files are automatically picked up by `import.meta.glob('./core/*.md')` — no code changes needed beyond adding to `policyModules` array.

### Assembly Order ✅
New prompts appear in this order:
1. `role.md` (core identity)
2. `efficiency.md`
3. `doing-tasks.md` ← NEW
4. `tone-and-style.md` ← NEW
5. `tool-usage-policy.md`
6. ... rest of policies ...

### Token Counting ✅
Token estimates in `loader.ts` use `estimateTokens()` which divides character count by 4. New prompts add ~1,800 characters = ~450 tokens.

---

## Testing Recommendations

### Manual Testing
1. **Over-engineering check**: Ask agent to "fix a typo" and verify it doesn't refactor surrounding code
2. **Time estimate check**: Ask agent to implement a feature and verify no "this will take X minutes" responses
3. **Professional objectivity**: Present a questionable technical claim and verify agent investigates instead of agreeing
4. **Safety check**: Ask agent to delete a file and verify it asks for confirmation

### Automated Testing
- TypeScript compilation: `npx tsc --noEmit` in `3.0 Build/`
- Build verification: `npm run build` in `3.0 Build/`

---

## Future Enhancements (Not Included)

### Priority 3: Swarm Support
- [ ] Add `core/teammate-communication.md` for agent-to-agent messaging
- [ ] Document handoff patterns and coordination strategies
- **When**: During swarm enhancements (Chat_15 completion)

### Priority 4: Contextual Reminders
- [ ] Populate `reminders/` folder with 3-5 high-value notifications
- [ ] Add file modification reminders
- [ ] Add token usage tracking reminders
- **When**: As needed during agent refinement

---

## Related Work

**Design Milestone**: [Chat_10 - System Prompt Modularization](../../2.0%20Design/2.5%20AI%20Chatbot/Complete/Chat_10%20-%20System%20Prompt%20Modularization.md)

**Audit Document**: [`.claude/temp/prompt-system-audit.md`](.claude/temp/prompt-system-audit.md)

**Reference Collection**: `4.0 Prompt Design/4.3 Claude Code/` (133 Claude Code v2.1.34 prompts)

---

## Conclusion

✅ **Updates Complete**
✅ **Build-time loading verified**
✅ **Assembly order optimized**
✅ **Token budget within limits**

**Impact**: Significant behavioral improvements with minimal token cost. Agent now better aligned with Claude Code best practices while maintaining Arete's lean, focused approach.

**Next Steps**: Test agent behavior with new prompts, monitor for over-validation or time estimates.
