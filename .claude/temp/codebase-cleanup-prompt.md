# Comprehensive Codebase Cleanup Prompt

Use this prompt with Claude Code to systematically clean up your codebase by removing unnecessary comments, dead code, and improving overall code quality.

---

## Cleanup Prompt

Please perform a comprehensive codebase cleanup focusing on the Chrome extension source code in `3.0 Build/3.1 Chrome/3.1.5 Chrome Build/src/`. Follow these steps systematically:

### Phase 1: Comment Analysis & Cleanup

1. **Identify verbose comments** that explain what was changed (belongs in git history):
   - Multi-line explanations of bug fixes
   - Change justifications that don't explain architecture
   - Obvious comments that just restate the code

2. **Keep essential comments** that provide value:
   - Non-obvious business logic explanations
   - Gmail API quirks and workarounds
   - Security considerations and validation rationale
   - Performance optimization reasoning (when non-obvious)
   - Edge case handling explanations

3. **Consolidate comment patterns**:
   - Replace verbose multi-line comments with concise single-line versions
   - Remove redundant JSDoc descriptions that just restate function names
   - Keep JSDoc for complex function signatures and public APIs

### Phase 2: Dead Code Detection

1. **Find unused imports**:
   - Scan all TypeScript files for imports that are never referenced
   - Remove unused import statements

2. **Identify unused functions/variables**:
   - Look for exported functions that are never imported elsewhere
   - Find private class methods that are never called
   - Locate variables that are declared but never used

3. **Remove commented-out code**:
   - Delete any code blocks that have been commented out
   - Remove old implementation alternatives left in comments

4. **Check for unreachable code**:
   - Code after `return`, `throw`, or `break` statements
   - Conditions that can never be true
   - Branches that are impossible to reach

### Phase 3: Code Quality Improvements

1. **Consolidate duplicate logic**:
   - Identify similar code patterns that could be extracted to a helper
   - Look for copy-pasted validation logic
   - Find repeated error handling patterns

2. **Simplify complex conditions**:
   - Extract complex boolean expressions to named variables
   - Simplify nested ternaries
   - Replace magic numbers with named constants

3. **Remove unnecessary complexity**:
   - Simplify overly defensive null checks (when type system guarantees safety)
   - Remove redundant type assertions
   - Eliminate unnecessary intermediate variables

### Phase 4: File Size Review

Review files exceeding 400 lines and assess whether they should be split based on **cohesion** (not line count):

**Files to review**:
- `background/index.ts` (2535 lines) - Main background script
- `content/VerificationService.ts` (if large)
- `content/InboxIndicators.ts` (if large)

**Split only if**:
- You can't summarize the file's purpose in one sentence
- The file contains multiple unrelated responsibilities
- Finding related code requires jumping around the file

**Don't split if**:
- The file is a cohesive single feature (even if 500+ lines)
- It's configuration, constants, or types
- Splitting would just move code around without reducing coupling

### Phase 5: Documentation Cleanup

1. **Remove stale documentation**:
   - TODOs that have been completed
   - Comments referring to old implementations
   - Outdated architectural notes

2. **Update existing docs** to be concise:
   - Trim verbose explanations
   - Remove redundant information
   - Focus on the "why" not the "what"

### Phase 6: Build & Verify

After each phase:

1. **Build the extension**:
   ```bash
   cd "3.0 Build/3.1 Chrome/3.1.5 Chrome Build" && npm run build
   ```

2. **Check for TypeScript errors**:
   - Ensure no type errors were introduced
   - Verify all imports still resolve correctly

3. **Test critical paths**:
   - Extension loads without errors
   - Background service worker initializes
   - Content scripts inject properly

### Execution Strategy

**Recommended approach**:
1. Work on 1-2 files at a time
2. Review changes carefully before committing
3. Create meaningful commit messages for each cleanup phase
4. Test the extension after significant changes

**What to avoid**:
- Don't remove comments that explain non-obvious logic
- Don't delete code that looks unused but may be called dynamically
- Don't consolidate code if it would harm readability
- Don't split files mechanically based on line count alone

### Success Criteria

✅ Net reduction in comment bloat (verbose explanations removed)
✅ No unused imports or dead code
✅ All TypeScript files build successfully
✅ Extension still functions correctly
✅ Codebase is more maintainable and easier to understand
✅ Comments that remain provide genuine architectural value

### Example Commands to Use

Search for potential issues:
```
"Find all unused imports in the src/ directory"
"Identify commented-out code blocks"
"Find functions that are never called"
"Show me files with more than 50% comment density"
"Locate duplicate code patterns that could be consolidated"
```

Cleanup commands:
```
"Remove all unused imports from [file]"
"Clean up verbose comments in [file] while keeping architectural guidance"
"Delete dead code from [file]"
"Consolidate duplicate validation logic in [files]"
```

---

## Final Notes

- **Prioritize readability**: Code should be self-documenting where possible
- **Context matters**: Some "obvious" comments are valuable for onboarding
- **Test frequently**: Small, tested changes are safer than large refactors
- **Commit often**: Atomic commits make it easier to revert if needed

**Remember**: The goal is to make the codebase easier to maintain, not just to reduce line count. Quality over quantity.
