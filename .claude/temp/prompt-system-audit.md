# Agent Prompt System Audit — Claude Code v2.1.34 Comparison

**Date**: 2026-02-14
**Current Arete Version**: Based on Claude Code v2.1.34 (simplified)
**Reference**: `4.0 Prompt Design/4.3 Claude Code/` (downloaded 2026-02-07)

---

## Executive Summary

✅ **Architecture: CORRECT** — Arete uses the same modular prompt architecture as Claude Code
⚠️ **Content: GAPS IDENTIFIED** — Missing 5 important Claude Code system prompts
📊 **Coverage**: 16 core prompts vs Claude Code's 29 system prompts (55% coverage)

**Recommendation**: Add 5 missing prompts to improve agent behavior and align with latest Claude Code best practices.

---

## Current State

### Arete's Core Prompts (16 files, ~160 lines)

Located in `3.0 Build/src/main/agent/prompts/core/`:

| File | Lines | Claude Code Equivalent | Status |
|------|-------|------------------------|--------|
| `role.md` | 8 | `system-prompt-main-system-prompt.md` | ✅ Adapted (simplified) |
| `efficiency.md` | 5 | N/A | ✅ Arete-specific |
| `tool-usage-policy.md` | 10 | `system-prompt-tool-usage-policy.md` | ✅ Adapted |
| `code-quality.md` | 16 | Part of `doing-tasks.md` | ⚠️ Partial coverage |
| `file-system-guidelines.md` | 7 | N/A | ✅ Arete-specific |
| `memory.md` | 14 | `system-prompt-agent-memory-instructions.md` | ✅ Adapted |
| `problem-solving.md` | 7 | N/A | ✅ Arete-specific |
| `executing-with-care.md` | 10 | `system-prompt-executing-actions-with-care.md` | ⚠️ Missing detail |
| `troubleshooting.md` | 8 | N/A | ✅ Arete-specific |
| `documentation.md` | 5 | N/A | ✅ Arete-specific |
| `links-references.md` | 8 | N/A | ✅ Arete-specific |
| `windows-powershell.md` | 17 | N/A | ✅ Arete-specific |
| `version-control.md` | 7 | `system-prompt-git-status.md` | ✅ Adapted |
| `version-control-none.md` | 3 | N/A | ✅ Arete-specific |
| `pull-requests.md` | 6 | Part of `bash-git-commit-and-pr-creation` | ✅ Adapted |
| `capabilities.md` | 29 | N/A | ✅ Arete-specific |

### Claude Code System Prompts (29 files)

Full list in `4.0 Prompt Design/4.3 Claude Code/System/`:

**Core Identity & Behavior** (5 files):
- `system-prompt-main-system-prompt.md` — ✅ Covered by `role.md`
- `system-prompt-doing-tasks.md` — ❌ **MISSING**
- `system-prompt-tone-and-style.md` — ❌ **MISSING**
- `system-prompt-executing-actions-with-care.md` — ⚠️ Partially covered
- `system-prompt-tool-usage-policy.md` — ✅ Covered

**Task Management** (2 files):
- `system-prompt-task-management.md` — ❌ **MISSING** (but Arete has no TodoWrite yet)
- `system-prompt-tool-use-summary-generation.md` — ❌ MISSING (not applicable)

**Learning & Insights** (6 files):
- `system-prompt-learning-mode.md` — ❌ MISSING (not applicable)
- `system-prompt-learning-mode-insights.md` — ❌ MISSING (not applicable)
- `system-prompt-insights-*.md` (4 files) — ❌ MISSING (not applicable)

**Memory & Session** (4 files):
- `system-prompt-agent-memory-instructions.md` — ✅ Covered by `memory.md`
- `system-prompt-agent-summary-generation.md` — ❌ MISSING (not applicable)
- `system-prompt-accessing-past-sessions.md` — ❌ MISSING (not applicable)
- `system-prompt-skillify-current-session.md` — ❌ MISSING (not applicable)

**Collaboration** (1 file):
- `system-prompt-teammate-communication.md` — ❌ **MISSING** (relevant for swarm)

**Tool Permissions** (3 files):
- `system-prompt-tool-permission-mode.md` — ❌ MISSING (Arete uses ask_user instead)
- `system-prompt-tool-execution-denied.md` — ❌ MISSING (not applicable)
- `system-prompt-parallel-tool-call-note-*.md` — ✅ Covered in tool-usage-policy

**Integration** (6 files):
- `system-prompt-git-status.md` — ✅ Covered by `version-control.md`
- `system-prompt-mcp-cli.md` — ❌ MISSING (MCP not implemented yet)
- `system-prompt-scratchpad-directory.md` — ✅ Covered (implicit in file-system-guidelines)
- `system-prompt-hooks-configuration.md` — ❌ MISSING (not applicable)
- `system-prompt-chrome-browser-mcp-tools.md` — ❌ MISSING (not applicable)
- `system-prompt-claude-in-chrome-browser-automation.md` — ❌ MISSING (not applicable)

**Security** (1 file):
- `system-prompt-censoring-assistance-with-malicious-activities.md` — ✅ Implied in role.md

---

## Critical Missing Prompts

### 1. ❌ `system-prompt-doing-tasks.md` (HIGH PRIORITY)

**Why it matters**: Defines core software engineering philosophy

**Key content Arete is missing**:
- "NEVER propose changes to code you haven't read" — critical rule
- Avoid over-engineering (don't add features beyond what was asked)
- No docstrings/comments on unchanged code
- Don't add error handling for scenarios that can't happen
- No helpers/utilities for one-time operations
- Delete unused code completely (no backwards-compat hacks)

**Impact**: Without this, agents might over-engineer solutions or add unnecessary abstractions.

**Current coverage**: `code-quality.md` has some overlap but misses the philosophy.

### 2. ❌ `system-prompt-tone-and-style.md` (HIGH PRIORITY)

**Why it matters**: Defines communication style and professionalism

**Key content Arete is missing**:
```markdown
# Professional objectivity
Prioritize technical accuracy and truthfulness over validating the user's beliefs.
Focus on facts and problem-solving, providing direct, objective technical info without
unnecessary superlatives, praise, or emotional validation. It is best for the user if
Claude honestly applies the same rigorous standards to all ideas and disagrees when
necessary, even if it may not be what the user wants to hear. Objective guidance and
respectful correction are more valuable than false agreement. Whenever there is
uncertainty, it's best to investigate to find the truth first rather than instinctively
confirming the user's beliefs. Avoid using over-the-top validation or excessive praise
when responding to users such as "You're absolutely right" or similar phrases.

# No time estimates
Never give time estimates or predictions for how long tasks will take, whether for
your own work or for users planning their projects. Avoid phrases like "this will
take me a few minutes," "should be done in about 5 minutes," "this is a quick fix,"
"this will take 2-3 weeks," or "we can do this later." Focus on what needs to be
done, not how long it might take.
```

**Impact**: Agents might give excessive validation or make time estimates (anti-pattern).

**Current coverage**: `role.md` is concise but doesn't cover these nuances.

### 3. ⚠️ `system-prompt-executing-actions-with-care.md` (MEDIUM PRIORITY)

**Why it matters**: More detailed safety guidance

**Key content Arete is missing** (compared to current `executing-with-care.md`):
- "A user approving an action once does NOT mean they approve it in all contexts"
- "Authorization stands for the scope specified, not beyond"
- "Match the scope of your actions to what was actually requested"
- "For example, typically resolve merge conflicts rather than discarding changes"
- "Similarly, if a lock file exists, investigate what process holds it rather than deleting it"
- More detailed examples of risky operations

**Impact**: More nuanced safety behavior, especially around git operations.

**Current coverage**: Arete has the basics but less detail.

### 4. ❌ `system-prompt-teammate-communication.md` (MEDIUM PRIORITY for swarm)

**Why it matters**: Arete has swarm orchestration but no team coordination prompt

**Key content**:
- How agents should communicate with each other
- Message passing protocols
- Handoff patterns
- Coordination strategies

**Impact**: Swarm agents might not coordinate optimally.

**Current coverage**: None — this is entirely missing but highly relevant given `src/main/swarm/`.

### 5. ❌ `system-prompt-task-management.md` (LOW PRIORITY)

**Why it matters**: TodoWrite-style task tracking guidance

**Key content**:
- When to create task lists
- How to structure tasks
- When to mark complete vs in-progress
- Best practices for task breakdown

**Impact**: Agents don't have explicit guidance on task management (though `ask_user` can handle this).

**Current coverage**: None — but Arete doesn't have a TodoWrite tool yet, so lower priority.

---

## Recommendations

### Immediate Actions (Add 2 High-Priority Prompts)

1. **Create `core/doing-tasks.md`**
   - Copy from `4.0 Prompt Design/4.3 Claude Code/System/system-prompt-doing-tasks.md`
   - Strip YAML frontmatter and variable placeholders
   - Add to assembly order in `loader.ts` (after `role.md`, before `code-quality.md`)

2. **Create `core/tone-and-style.md`**
   - Copy from `4.0 Prompt Design/4.3 Claude Code/System/system-prompt-tone-and-style.md`
   - Strip YAML frontmatter and variable placeholders
   - Add to assembly order in `loader.ts` (after `doing-tasks.md`)

### Short-Term Actions (Enhance existing)

3. **Enhance `core/executing-with-care.md`**
   - Add missing details from Claude Code version (scope, merge conflicts, lock files)
   - Keep concise but add the critical examples

### Medium-Term Actions (Swarm support)

4. **Create `core/teammate-communication.md`**
   - Copy from Claude Code or write custom based on swarm needs
   - Add agent-to-agent messaging guidelines
   - Document handoff patterns

### Long-Term Actions (When features added)

5. **Task management prompt** — Add when/if Arete implements TodoWrite-style features
6. **MCP integration prompt** — Add when Chat_6 (MCP Integration) milestone is implemented
7. **Learning mode prompts** — Consider if insight generation features are desired

---

## Architectural Validation

✅ **Modular Assembly**: Arete uses the same `import.meta.glob` pattern as Claude Code
✅ **Dynamic Inclusion**: Conditionally includes prompts based on context (platform, git, tools)
✅ **Variable Substitution**: Supports `${VARIABLE}` placeholders
✅ **Tool Descriptions**: Separate `.md` files for each tool (11 in `tools/`)
✅ **Product Knowledge**: Dynamic topic detection and injection (Chat_14)
✅ **Memory Context**: Pre-fetched and injected
✅ **Reminders**: Placeholder system (currently empty `reminders/` folder)

---

## File Structure Comparison

### Claude Code
```
System/          # 29 system prompts
Tools/           # 27 tool descriptions
Reminders/       # 42 contextual reminders
Agents/          # 29 agent prompts
Data/            # 3 templates
Skills/          # 3 skill prompts
```

### Arete
```
core/            # 16 core system prompts
tools/           # 11 tool descriptions
product/         # 13 product knowledge prompts
reminders/       # (empty — potential for expansion)
```

**Gap**: Arete doesn't need agent/data/skills folders (different architecture), but could benefit from populated `reminders/`.

---

## Next Steps

### Priority 1: Add Missing Core Prompts
- [ ] Add `core/doing-tasks.md` (copy from Claude Code, adapt)
- [ ] Add `core/tone-and-style.md` (copy from Claude Code, adapt)
- [ ] Update `loader.ts` to include them in assembly order

### Priority 2: Enhance Existing
- [ ] Enhance `core/executing-with-care.md` with missing details
- [ ] Test assembled prompt token count (currently ~2,500 tokens, will grow to ~3,000)

### Priority 3: Swarm Support
- [ ] Add `core/teammate-communication.md` for swarm agent coordination
- [ ] Document inter-agent messaging patterns

### Priority 4: Contextual Reminders
- [ ] Add reminders for file modifications (already in loader, just needs .md files)
- [ ] Add reminders for token usage tracking
- [ ] Populate `reminders/` folder with 3-5 high-value notifications

---

## Token Budget Analysis

| Component | Current Tokens | After Updates | Notes |
|-----------|----------------|---------------|-------|
| Core prompts | ~400 | ~650 | +2 new prompts, 1 enhanced |
| Tool descriptions | ~1,200 | ~1,200 | No change |
| Product knowledge (when active) | ~800 | ~800 | No change |
| Memory context (when active) | ~300 | ~300 | No change |
| Reminders (future) | 0 | ~200 | 3-5 reminders |
| **Total** | **~2,700** | **~3,150** | +450 tokens |

**Impact**: Still well within budget. Claude Code typically uses 8K-15K tokens; Arete at ~3.2K is lean and efficient.

---

## Conclusion

**Status**: ✅ Architecture is correct, ⚠️ content gaps identified

**Critical Updates Needed**:
1. Add `doing-tasks.md` — Prevents over-engineering
2. Add `tone-and-style.md` — Professional objectivity, no time estimates

**Recommended Updates**:
3. Enhance `executing-with-care.md` — Better safety guidance
4. Add `teammate-communication.md` — Swarm coordination

**Impact**: ~450 token increase, significant behavior improvements, better alignment with Claude Code best practices.

**Timeline**:
- Priority 1-2: Implement now (30 minutes)
- Priority 3-4: Implement with swarm enhancements (1 hour)

---

## Reference Files

**Arete Agent System**:
- [system-prompt.ts](../../3.0%20Build/src/main/agent/system-prompt.ts)
- [prompts/loader.ts](../../3.0%20Build/src/main/agent/prompts/loader.ts)
- [prompts/core/](../../3.0%20Build/src/main/agent/prompts/core/)

**Claude Code Reference**:
- [4.0 Prompt Design/4.3 Claude Code/README.md](../../4.0%20Prompt%20Design/4.3%20Claude%20Code/README.md)
- [4.0 Prompt Design/4.3 Claude Code/System/](../../4.0%20Prompt%20Design/4.3%20Claude%20Code/System/)

**Design Milestone**:
- [Chat_10 - System Prompt Modularization](../../2.0%20Design/2.5%20AI%20Chatbot/Complete/Chat_10%20-%20System%20Prompt%20Modularization.md)
