---
name: plan-reviewer
description: Review implementation plans, identify completed/incomplete work, and expand into comprehensive step-by-step implementation guides with subtasks
tags: [planning, project-management, implementation, task-breakdown]
---

# Plan Reviewer & Expander

Analyze project plans to determine implementation status and create detailed, actionable implementation guides with clear subtasks and build sequences.

## Usage

This skill helps you:
- **Audit progress** against a plan document
- **Identify gaps** between planned vs. completed work
- **Expand high-level tasks** into detailed implementation steps
- **Create build sequences** that respect dependencies
- **Generate subtask breakdowns** for each milestone/feature

## What This Skill Does

### 1. 📊 Status Analysis
- Review the plan document to understand all planned work
- Compare against actual codebase/progress to identify what's complete
- Flag incomplete, partially done, and not-started items
- Generate a status summary with completion percentages

### 2. 🔍 Gap Identification
- Highlight missing implementations
- Identify partial implementations that need completion
- Detect dependencies that block progress
- Flag risks or blockers

### 3. 📝 Implementation Expansion
For each incomplete/upcoming item, create:
- **Clear objective**: What needs to be built and why
- **Prerequisites**: What must be done first
- **Step-by-step breakdown**: Detailed subtasks in logical order
- **File changes**: Specific files to create/modify
- **Testing criteria**: How to verify it works
- **Definition of Done**: Clear completion criteria

### 4. 🔗 Dependency Mapping
- Identify which tasks depend on others
- Suggest optimal build order
- Highlight parallel-execution opportunities
- Flag circular dependencies

## Process

When you invoke this skill:

1. **Read the plan document** (e.g., PLAN.md, README, project spec)
2. **Scan the codebase** to determine what exists vs. what's planned
3. **Generate status report**:
   ```markdown
   ## Implementation Status

   ### ✅ Completed (X%)
   - Feature A: Fully implemented
   - Feature B: Implemented and tested

   ### 🚧 In Progress (Y%)
   - Feature C: 60% complete (missing tests)
   - Feature D: 30% complete (core logic done, UI pending)

   ### ❌ Not Started (Z%)
   - Feature E
   - Feature F
   ```

4. **Expand each incomplete item** into implementation guide:
   ```markdown
   ## Feature E — Detailed Implementation

   ### Objective
   Build a user authentication system with JWT tokens.

   ### Prerequisites
   - Database schema must be defined (Feature A) ✅
   - API routing framework must be set up (Feature B) ✅

   ### Implementation Steps

   #### 1. Create Auth Database Tables
   - [ ] 1.1 Define `users` table schema
   - [ ] 1.2 Define `sessions` table schema
   - [ ] 1.3 Create migration file
   - [ ] 1.4 Run migration and verify

   **Files to modify:**
   - `src/database/schema.ts` — Add user and session tables
   - `src/database/migrations/003_auth.ts` — Create migration

   #### 2. Build Authentication Service
   - [ ] 2.1 Create `AuthService` class
   - [ ] 2.2 Implement `login(email, password)` method
   - [ ] 2.3 Implement `logout(sessionId)` method
   - [ ] 2.4 Implement `validateToken(token)` method

   **Files to create:**
   - `src/services/auth/AuthService.ts`
   - `src/services/auth/types.ts`

   #### 3. Add API Endpoints
   - [ ] 3.1 POST /auth/login
   - [ ] 3.2 POST /auth/logout
   - [ ] 3.3 GET /auth/verify

   **Files to modify:**
   - `src/api/routes/auth.ts`

   #### 4. Testing
   - [ ] 4.1 Unit tests for AuthService
   - [ ] 4.2 Integration tests for login flow
   - [ ] 4.3 Test token expiration
   - [ ] 4.4 Test invalid credentials

   ### Definition of Done
   - [ ] Users can register with email/password
   - [ ] Users can log in and receive JWT token
   - [ ] Protected routes verify tokens correctly
   - [ ] Sessions expire after configured TTL
   - [ ] All tests passing
   - [ ] No security vulnerabilities (SQL injection, XSS)
   ```

## Output Format

The skill generates a comprehensive implementation guide with:

```markdown
# [Project Name] — Implementation Guide

## Executive Summary
- Total features: X
- Completed: Y (Z%)
- Remaining: W items
- Estimated complexity: [High/Medium/Low]

## Status Dashboard

### ✅ Completed Work
[List with references to code]

### 🚧 In Progress
[List with completion % and blockers]

### ❌ Not Started
[Prioritized list]

## Detailed Implementation Plans

### [Feature/Milestone Name]

**Status:** Not Started | In Progress (X%) | Completed
**Priority:** High | Medium | Low
**Complexity:** High | Medium | Low
**Estimated effort:** X hours/days

#### Prerequisites
- Dependency A ✅
- Dependency B ❌ (blocked)

#### Implementation Steps
[Detailed step-by-step with checkboxes]

#### Files to Create/Modify
- `path/to/file.ts` — [What changes]

#### Testing Strategy
[How to verify it works]

#### Definition of Done
- [ ] Criteria 1
- [ ] Criteria 2

---

## Build Sequence Recommendation

1. Feature A (no dependencies)
2. Feature B (depends on A)
3. Features C + D in parallel (both depend on B)
4. Feature E (depends on C, D)
```

## When to Use This Skill

Use this skill when:

- **Starting a new project phase** and need clarity on what to build next
- **Onboarding new developers** who need to understand the implementation roadmap
- **Stuck on priorities** and need help deciding what to build first
- **Auditing progress** against original plan
- **Expanding high-level specs** into actionable tasks
- **Planning sprints** and need task breakdown
- **Reviewing legacy plans** that need updating

## Best Practices

### For Plan Documents
- Have a clear plan document (PLAN.md, spec.md, or similar)
- Include milestones, features, or major components
- Mark completed items with checkboxes `[x]` or status indicators

### For Implementation Guides
- Break tasks into 30-minute to 2-hour chunks
- Include file paths for all changes
- Specify test criteria for each feature
- Note dependencies explicitly
- Provide Definition of Done for each milestone

### For Team Collaboration
- Use this skill to generate sprint plans
- Share implementation guides with team members
- Update plan document as work progresses
- Re-run skill periodically to track drift

## Example Invocation

```
/plan-reviewer

Please review the PLAN.md file and:
1. Analyze what's been completed vs. what remains
2. Expand incomplete milestones into detailed implementation steps
3. Suggest optimal build order based on dependencies
4. Provide comprehensive subtask breakdowns for the next 3 priorities
```

## Notes

- This skill works best with **structured plan documents** (markdown with sections)
- For maximum value, ensure your plan has **clear milestones or features**
- The skill will **scan your codebase** to verify claimed completion status
- Output is designed to be **copy-pasteable** into project management tools
- Can be used iteratively as the project evolves

## Anti-Patterns to Avoid

❌ **Don't** run this on projects with no plan document — create one first
❌ **Don't** expect it to define product requirements — it expands existing plans
❌ **Don't** ignore dependency warnings — they'll cause build failures
❌ **Don't** skip the testing criteria — untested code will break later

✅ **Do** keep your plan document up to date as work progresses
✅ **Do** use the generated subtasks as your daily work checklist
✅ **Do** re-run periodically to catch scope drift
✅ **Do** share the output with your team for alignment
