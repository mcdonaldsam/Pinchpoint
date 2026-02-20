---
name: plan-chunker
description: Extract milestone-specific implementation files from large plans to reduce context window usage and improve focus
tags: [planning, optimization, context-efficiency, milestones]
---

# Plan Chunker

Extract focused, milestone-specific implementation files from large planning documents to avoid loading 15-20K tokens repeatedly during implementation.

## The Problem This Solves

**Large planning documents waste context:**
- Loading full PLAN.md (18-20K tokens) every time you need implementation details
- Increased latency from processing irrelevant milestones
- Harder for AI to focus on immediately relevant work
- Paying for repeated loading of static information

**This skill creates lightweight implementation files (2-4K tokens) that contain only what's needed for the current milestone.**

## Usage

This skill helps you:
- **Extract milestones** from large plan documents into focused files
- **Reduce context usage** by 80-90% during implementation
- **Improve AI focus** on current work instead of future milestones
- **Maintain clean separation** between planning and implementation
- **Speed up iteration** with smaller, faster-to-process files

## What This Skill Does

### 1. 📖 Read the Master Plan
- Locate and read the master plan document (PLAN.md, spec.md, etc.)
- Identify all milestones, features, or major work items
- Understand the overall architecture and dependencies

### 2. 🎯 Extract Milestone Content
For each milestone you specify, create a focused implementation file containing:
- **Milestone goals**: What this milestone achieves
- **Task breakdown**: Specific subtasks with checkboxes
- **Dependencies**: What must be complete first
- **Key files**: Files to create/modify during this milestone
- **Architecture references**: Links back to master plan for shared context
- **Definition of Done**: Clear completion criteria

### 3. 🔗 Link Back to Master
Implementation files reference the master plan for:
- Overall architecture (avoid duplicating)
- Shared libraries and conventions
- Other milestones (for context)
- Full project structure

### 4. 📂 Organize Output
Creates a clean directory structure:
```
2.0 Research/
├── PLAN.md                          # Master plan (18-20K tokens)
├── implementation/
│   ├── milestone-4-chat.md          # 2-4K tokens
│   ├── milestone-5-routing.md       # 2-4K tokens
│   ├── milestone-6-editing.md       # 2-4K tokens
│   └── completed/                   # Archive finished milestones
│       └── milestone-1-skeleton.md
```

## Process

When you invoke this skill:

1. **Identify the milestone** to extract (e.g., "Milestone 4 — AI Chat")
2. **Read master plan** to get milestone details
3. **Extract relevant content**:
   - Milestone header and goals
   - All subtasks for this milestone
   - Dependencies list
   - Definition of Done
   - Critical context (but not entire architecture)
4. **Add references** to master plan for shared architecture
5. **Create implementation file** at `implementation/milestone-X-name.md`
6. **Provide usage guidance** on when to use this file vs. master plan

## Output Format

Generated implementation files follow this structure:

```markdown
# Milestone X — [Name] Implementation

> **Source:** PLAN.md § [Section Number]
> **For full architecture:** See PLAN.md § 2.[Letter]
> **Created:** [Date]

## Goal

[What this milestone achieves - copied from master plan]

## Prerequisites

- [ ] Milestone A must be complete ✅
- [ ] Milestone B must be complete ✅
- [ ] Feature C from Milestone D ❌ (blocking)

## Tasks

### X.1 [Component Name]
**What to build:** [Brief description]

- [ ] **X.1.1** [Specific subtask]
  - File: `path/to/file.ts`
  - Action: [What to do]

- [ ] **X.1.2** [Specific subtask]
  - Files: `file1.ts`, `file2.ts`
  - Action: [What to do]

### X.2 [Component Name]
- [ ] **X.2.1** [Subtask]
- [ ] **X.2.2** [Subtask]

[Continue for all tasks in this milestone]

## Architecture References

For full context, see master plan:
- **Overall system architecture:** PLAN.md § 2.[Letter]
- **Technology stack:** PLAN.md § 4
- **Security guidelines:** PLAN.md § 6
- **Libraries used:** PLAN.md § 4 (Key Libraries table)

## Definition of Done

- [ ] [Success criteria 1]
- [ ] [Success criteria 2]
- [ ] [Success criteria 3]
- [ ] All tests passing
- [ ] No regressions in existing features

## Next Steps

After completing this milestone:
1. Mark tasks complete in master PLAN.md
2. Archive this file to `implementation/completed/`
3. Create implementation file for next milestone

---

💡 **Using this file:** Load this 2-4K token file instead of the 18-20K token master plan during implementation. Reference master plan links only when you need shared architecture details.
```

## When to Use This Skill

Use this skill when:

- **Starting a new milestone** and want focused implementation context
- **Context window is filling up** with irrelevant plan details
- **AI is loading full plan repeatedly** during implementation
- **Want to improve focus** on current work vs. future plans
- **Working on large projects** with 10+ milestones
- **Optimizing token costs** during lengthy implementation sessions

## Workflow

### Before Implementation

```bash
# You're about to start Milestone 4
/plan-chunker

Extract Milestone 4 from PLAN.md into a focused implementation file
```

The skill will:
1. Read PLAN.md
2. Find Milestone 4 section
3. Extract tasks, DoD, dependencies
4. Create `implementation/milestone-4-chat.md`
5. Add architecture references back to master plan

### During Implementation

```bash
# Instead of loading 18K tokens:
Read PLAN.md

# Load just 2.5K tokens:
Read implementation/milestone-4-chat.md
```

### After Completion

```bash
# Archive the implementation file
mv implementation/milestone-4-chat.md implementation/completed/

# Update master PLAN.md with checkmarks
Edit PLAN.md
[Mark Milestone 4 tasks as complete]
```

## Example Invocation

```
/plan-chunker milestone-4

Please extract Milestone 4 from PLAN.md and create a focused implementation file.
```

Or for multiple milestones:

```
/plan-chunker next-3

Extract the next 3 incomplete milestones into separate implementation files.
```

## Benefits

| Metric | Without Chunking | With Chunking | Savings |
|--------|------------------|---------------|---------|
| Tokens loaded per query | 18,000-20,000 | 2,000-4,000 | 80-90% |
| Focus on relevant tasks | Mixed (all milestones) | Focused (one milestone) | ✅ Clear |
| Implementation speed | Slower (process full plan) | Faster (small file) | 2-3x faster |
| Cognitive load | High (scan 11 milestones) | Low (one milestone) | ✅ Reduced |

## Best Practices

### ✅ Do This

- **Create implementation files** before starting each milestone
- **Archive completed files** to `implementation/completed/`
- **Keep master PLAN.md updated** with completion status
- **Use implementation files** during active development
- **Reference master plan** only for shared architecture
- **Delete/archive** implementation files after milestone completion

### ❌ Don't Do This

- **Don't duplicate architecture** — link back to master plan instead
- **Don't create implementation files** for completed milestones
- **Don't edit implementation files** — update master plan instead
- **Don't load full plan** when implementation file exists
- **Don't keep stale files** — archive after completion

## Anti-Patterns

```markdown
❌ Loading full plan repeatedly:
AI: "Let me read PLAN.md..."
[18,000 tokens loaded]
AI: "Let me check the tasks again..."
[18,000 tokens loaded again]

✅ Using focused implementation file:
AI: "Let me read milestone-4-chat.md..."
[2,500 tokens loaded]
AI: "For architecture details, checking PLAN.md § 2.E..."
[Only reads specific section]
```

## Advanced Usage

### Extracting Multiple Milestones

```
/plan-chunker all-incomplete

Extract all incomplete milestones from PLAN.md into separate implementation files.
```

### Custom Naming

```
/plan-chunker milestone-4 --output="sprint-3-tasks.md"

Use a custom filename for the implementation file.
```

### Dependency Analysis

```
/plan-chunker next-with-deps

Extract next milestone AND all its dependencies into implementation files.
```

## Integration with Other Skills

Works well with:
- **plan-reviewer**: Generate status report, then chunk incomplete milestones
- **feature-dev**: Use chunked files as focused context for feature implementation
- **typescript-audit**: After completing milestone, audit the changed files

## Notes

- **Based on System Prompts.md § Implementation Chunking Strategy**
- Designed for projects with **comprehensive planning documents**
- Maximum value when plan is **10,000+ tokens**
- Works with any markdown plan structure (PLAN.md, spec.md, README.md)
- Implementation files are **throwaway artifacts** — master plan is source of truth
- Can be re-run if master plan changes during implementation

## Files Created

This skill creates files in:
```
2.0 Research/implementation/
├── milestone-[number]-[name].md     # Active implementation files
└── completed/
    └── milestone-[number]-[name].md # Archived completed work
```

Directory is created automatically if it doesn't exist.
