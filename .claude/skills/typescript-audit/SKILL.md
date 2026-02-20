---
name: typescript-audit
description: Audit TypeScript code for memory leaks, dead code, race conditions, performance issues, and security vulnerabilities
tags: [typescript, debugging, code-quality, memory-leaks, performance]
---

# TypeScript Code Audit

Perform comprehensive code quality audits on TypeScript codebases, focusing on browser extensions and SPAs.

## Usage

This skill audits code across 9 major categories and provides actionable fixes with severity ratings.

## Audit Categories

### 1. 🧠 Memory Leaks
- **Event Listeners & Subscriptions**: Unremoved listeners, ignored unsubscribe callbacks
- **DOM References in Maps**: `Map<string, HTMLElement>` instead of WeakMap
- **Observers**: MutationObserver/IntersectionObserver never disconnected
- **Timers**: `setInterval()`/`setTimeout()` without cleanup

### 2. 🗑️ Dead Code
- **Unused Files**: Files never imported anywhere
- **Unused Functions**: Methods never called
- **Duplicate Systems**: Two implementations of same functionality

### 3. ⚡ Concurrency & Race Conditions
- **Missing Deduplication**: Duplicate async operations for same resource
- **Mutex/Lock Issues**: Not released in finally blocks, missing cleanup
- **UI Race Conditions**: Async updates without context validation

### 4. 💾 Cache Management
- **Unbounded Caches**: No size limits or LRU eviction
- **Missing TTL**: No expiration for stale data
- **Cache Invalidation**: Stale cache after mutations

### 5. 🔌 Chrome Extension Specific
- **Context Invalidation**: Missing `chrome.runtime?.id` checks
- **Lifecycle Issues**: No cleanup on navigation/reload
- **Message Handlers**: Missing async response handling

### 6. 🚀 Performance Issues
- **Rate Limiting**: Burst API requests without throttling
- **DOM Queries**: Excessive `querySelectorAll()` in loops
- **Observer Debouncing**: MutationObserver without debouncing

### 7. 🔒 Type Safety
- **Type Assertions**: Unchecked `as any` or type casts
- **Null Checks**: Missing validation of optional properties
- **Runtime Validation**: No type guards at API boundaries

### 8. ⚠️ Error Handling
- **Silent Failures**: Empty catch blocks, logged but not handled
- **Missing Propagation**: Errors swallowed that should bubble up
- **No User Feedback**: Failures not communicated to user

### 9. 🛡️ Security Issues
- **Input Validation**: XSS via innerHTML, missing email regex
- **Injection Vulnerabilities**: CRLF injection, command injection
- **Sanitization**: User input not escaped/sanitized

## Search Patterns

Quick grep patterns to find common anti-patterns:

```bash
# Ignored subscriptions
grep -r "\.subscribe(" --include="*.ts" | grep -v "const.*="

# Uncleaned intervals
grep -r "setInterval(" --include="*.ts" | grep -v "clear"

# Unremoved listeners
grep -r "addEventListener(" --include="*.ts" | grep -v "remove"

# Undisconnected observers
grep -r "new MutationObserver" --include="*.ts" | grep -v "disconnect"

# DOM elements in Map (should use WeakMap)
grep -r "Map<.*HTMLElement>" --include="*.ts"

# Dangerous type assertions
grep -r "as any" --include="*.ts"

# Empty catch blocks
grep -r "catch.*{}" --include="*.ts"
```

## Output Format

For each issue, provide:

```markdown
### [HIGH/MEDIUM/LOW] Category - Description

**Location:** `file.ts:123`

**Issue:**
[Explanation]

**Current Code:**
\`\`\`typescript
// Bad code
\`\`\`

**Fix:**
\`\`\`typescript
// Fixed code
\`\`\`

**Impact:** [Consequences if not fixed]
```

## Priority Guide

- **HIGH**: Memory leaks, security vulnerabilities, data corruption
- **MEDIUM**: Dead code (>100 lines), unbounded caches, missing rate limiting
- **LOW**: Small dead code, micro-optimizations, style issues

## Example Fixes

### Memory Leak - Subscription
```typescript
// BAD
service.subscribe((data) => { /* ... */ });

// GOOD
const unsubscribe = service.subscribe((data) => { /* ... */ });
LifecycleManager.registerAbortController({
  abort: () => unsubscribe()
} as AbortController);
```

### Dead Code Detection
```bash
# Check if file is imported
grep -r "verification-state-manager" src/
# If only the file itself appears → DELETE IT
```

### Race Condition Fix
```typescript
// BAD
async function verify(id: string) {
  const result = await verifyEmail(id);
  updateUI(result); // May show wrong email!
}

// GOOD
async function verify(id: string) {
  const result = await verifyEmail(id);
  if (getCurrentId() === id) updateUI(result);
}
```

### Unbounded Cache Fix
```typescript
// BAD
cache.set(key, data);

// GOOD
cache.set(key, { data, timestamp: Date.now() });
if (cache.size > MAX_SIZE) {
  const firstKey = cache.keys().next().value;
  cache.delete(firstKey);
}
```

## Browser Extension Checklist

- [ ] All MutationObservers registered with lifecycle manager
- [ ] WeakMaps used for DOM element storage
- [ ] `chrome.runtime.sendMessage` has error handling
- [ ] Content scripts clean up on navigation
- [ ] Background script handles reload gracefully
- [ ] Message listeners return `true` for async responses

## When to Use

Use this skill to:
- **Audit new codebases** before production deployment
- **Debug memory leaks** in long-running applications
- **Clean up legacy code** with dead code removal
- **Performance optimization** by finding bottlenecks
- **Security review** before releases
- **Refactoring validation** to catch introduced issues

## Notes

This skill is based on real production issues found in TypeScript browser extensions, including:
- Subscription memory leaks (unused unsubscribe returns)
- Uncleaned intervals (30s repair intervals)
- Dead code files (292-line unused modules)
- Race conditions in SPA navigation
- Unbounded caches in long sessions
- Chrome extension context invalidation
