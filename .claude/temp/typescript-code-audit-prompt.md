# TypeScript Code Audit & Cleanup Prompt

Use this prompt to perform comprehensive code quality audits on TypeScript codebases, particularly browser extensions and SPAs.

---

## 🎯 AUDIT INSTRUCTIONS

Please perform a thorough code audit focusing on the following categories. For each issue found, provide:
1. **Location** (file:line)
2. **Issue type** (Memory Leak, Dead Code, Race Condition, etc.)
3. **Severity** (HIGH/MEDIUM/LOW)
4. **Concrete fix** with code snippet

---

## 🔍 AUDIT CATEGORIES

### 1. MEMORY LEAKS

#### A. Event Listeners & Subscriptions
**Look for:**
- Event listeners added but never removed
- Subscription functions that return unsubscribe callbacks that are ignored
- `addEventListener()` without corresponding `removeEventListener()`
- Observable/PubSub subscriptions without cleanup
- `setInterval()` / `setTimeout()` not cleared on component unmount

**Check:**
```typescript
// BAD: Subscription return value ignored
service.subscribe((data) => { /* ... */ });

// GOOD: Store and cleanup
const unsubscribe = service.subscribe((data) => { /* ... */ });
cleanup(() => unsubscribe());
```

**Common patterns to audit:**
- `.subscribe()` calls - verify return value is stored and called
- `.addEventListener()` calls - verify lifecycle cleanup exists
- `setInterval()` - verify `clearInterval()` in cleanup
- Chrome extension listeners - verify proper cleanup on navigation

#### B. DOM References in Regular Maps
**Look for:**
- `Map<string, HTMLElement>` - should be `WeakMap<HTMLElement, any>`
- Storing DOM elements without WeakMap allows memory leaks
- Arrays/Sets holding DOM element references indefinitely

**Check:**
```typescript
// BAD: DOM elements won't be garbage collected
private elementMap = new Map<string, HTMLElement>();

// GOOD: Use WeakMap (if lookup by element) or manual cleanup
private elementMap = new WeakMap<HTMLElement, string>();
// OR: Implement periodic cleanup for Map<string, HTMLElement>
```

#### C. Observers Without Lifecycle Management
**Look for:**
- `MutationObserver`, `IntersectionObserver`, `ResizeObserver` created but never disconnected
- Observers not registered with lifecycle manager
- Missing `observer.disconnect()` calls

**Check:**
```typescript
// BAD: Observer never disconnected
const observer = new MutationObserver(callback);
observer.observe(element, options);

// GOOD: Register with lifecycle manager
const observer = new MutationObserver(callback);
observer.observe(element, options);
LifecycleManager.registerObserver(observer, 'ObserverName');
```

#### D. Intervals and Timers
**Look for:**
- `setInterval()` without `clearInterval()`
- Long-running timers not registered for cleanup
- Timers that outlive component lifecycle

---

### 2. DEAD CODE

#### A. Unused Files
**Look for:**
- Files that are never imported anywhere
- Use grep/search to verify: `grep -r "import.*filename" src/`
- Legacy files that were replaced but not deleted

**Check:**
```bash
# Search for imports of suspicious file
grep -r "verification-state-manager" src/
# If only the file itself appears, it's dead code
```

#### B. Unused Functions/Methods
**Look for:**
- Public methods never called externally
- Private methods never called internally
- Functions with TODO/FIXME comments suggesting they're incomplete

**Check:**
- Search for all invocations of the method name
- If only the definition appears, it's dead code
- Special attention to methods like `clear*()`, `cleanup*()` - often defined but never called

#### C. Duplicate Systems
**Look for:**
- Two files implementing the same functionality
- Similar class names (e.g., `VerificationService` vs `VerificationStateManager`)
- Copy-pasted code blocks with minor variations

**Verify:**
- Check which implementation is actually imported/used
- Delete the unused one entirely (don't just comment out)

---

### 3. CONCURRENCY & RACE CONDITIONS

#### A. Missing Deduplication
**Look for:**
- Async operations that can be triggered multiple times for the same resource
- No queue/promise tracking to prevent duplicate requests
- API calls without request deduplication

**Check:**
```typescript
// BAD: Multiple clicks trigger multiple requests
async function fetchData(id: string) {
  return await api.get(id);
}

// GOOD: Deduplicate with promise cache
private requests = new Map<string, Promise<Data>>();
async function fetchData(id: string) {
  if (this.requests.has(id)) {
    return await this.requests.get(id)!;
  }
  const promise = api.get(id);
  this.requests.set(id, promise);
  try {
    return await promise;
  } finally {
    this.requests.delete(id);
  }
}
```

#### B. Mutex/Lock Issues
**Look for:**
- Mutexes acquired but not released in finally blocks
- Missing `hasWaiters()` check before mutex cleanup
- Mutexes never cleaned up from global collections

**Check:**
```typescript
// BAD: Exception leaves mutex locked forever
await mutex.acquire();
await dangerousOperation();
mutex.release();

// GOOD: Always release in finally
await mutex.acquire();
try {
  await dangerousOperation();
} finally {
  mutex.release();
}
```

#### C. Race Conditions in UI Updates
**Look for:**
- Async operations that update UI without checking if context changed
- Missing message ID verification before updating (SPA navigation)
- No cancellation of in-flight requests on navigation

**Check:**
```typescript
// BAD: May update wrong email after navigation
async function verify(messageId: string) {
  const result = await verifyEmail(messageId);
  updateUI(result); // Might be showing different email now!
}

// GOOD: Verify still on same message
async function verify(messageId: string) {
  const result = await verifyEmail(messageId);
  const currentId = getCurrentMessageId();
  if (currentId === messageId) {
    updateUI(result);
  }
}
```

---

### 4. CACHE MANAGEMENT

#### A. Unbounded Caches
**Look for:**
- `Map()` or object caches with no size limit
- Caches that grow indefinitely (common in long-running SPAs)
- No LRU eviction or TTL expiration

**Check:**
```typescript
// BAD: Cache grows forever
private cache = new Map<string, Data>();

// GOOD: Limit size with LRU eviction
private cache = new Map<string, Data>();
if (cache.size > MAX_SIZE) {
  const firstKey = cache.keys().next().value;
  cache.delete(firstKey);
}
```

#### B. Missing TTL/Expiration
**Look for:**
- Cached data without timestamps
- No expiration logic for stale data
- Caches that should expire based on trust state/type

**Check:**
```typescript
// BAD: Data cached forever
cache.set(key, data);

// GOOD: Cache with TTL
cache.set(key, { data, timestamp: Date.now() });
// Later:
const cached = cache.get(key);
if (cached && Date.now() - cached.timestamp < TTL) {
  return cached.data;
}
```

#### C. Cache Invalidation
**Look for:**
- Operations that modify data but don't invalidate cache
- Missing `cache.clear()` calls after mutations
- Stale cache after Create/Update/Delete operations

---

### 5. CHROME EXTENSION SPECIFIC

#### A. Extension Context Invalidation
**Look for:**
- `chrome.runtime.sendMessage()` without try/catch
- No validation that `chrome.runtime?.id` exists
- Missing "Extension context invalidated" error handling

**Check:**
```typescript
// BAD: Will throw on extension reload
await chrome.runtime.sendMessage({ action: 'verify' });

// GOOD: Check context validity
if (!chrome.runtime?.id) {
  throw new Error('Extension context invalidated');
}
try {
  await chrome.runtime.sendMessage({ action: 'verify' });
} catch (err) {
  if (err.message.includes('Extension context invalidated')) {
    // Show refresh banner
  }
}
```

#### B. Content Script Lifecycle
**Look for:**
- No cleanup on `beforeunload` or SPA navigation
- Resources not cleaned up when user navigates away
- Global state persisting across page navigations

---

### 6. PERFORMANCE ISSUES

#### A. Rate Limiting
**Look for:**
- Burst requests to external APIs (Gmail, etc.)
- No rate limiter or queue system
- Parallel Promise.all() for API calls that should be sequential

**Check:**
```typescript
// BAD: 50 parallel API requests = quota exceeded
await Promise.all(ids.map(id => fetchMessage(id)));

// GOOD: Sequential with rate limiting
for (const id of ids) {
  await rateLimiter.execute(() => fetchMessage(id));
}
```

#### B. Excessive DOM Queries
**Look for:**
- `querySelectorAll()` in tight loops
- Repeated DOM queries for same element
- No element caching

**Check:**
```typescript
// BAD: Query on every iteration
for (let i = 0; i < 100; i++) {
  document.querySelector('.container').appendChild(item);
}

// GOOD: Cache element reference
const container = document.querySelector('.container');
for (let i = 0; i < 100; i++) {
  container.appendChild(item);
}
```

#### C. MutationObserver Without Debouncing
**Look for:**
- MutationObserver callback called on every mutation
- No debouncing/throttling for high-frequency changes
- Processing all mutations instead of filtering relevant ones

**Check:**
```typescript
// BAD: Process every mutation immediately
observer = new MutationObserver((mutations) => {
  processRows(); // Called hundreds of times
});

// GOOD: Debounce processing
observer = new MutationObserver((mutations) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => processRows(), 150);
});
```

---

### 7. TYPE SAFETY ISSUES

#### A. Unchecked Type Assertions
**Look for:**
- `as any` or excessive type assertions
- No runtime validation at boundaries
- Assuming API responses match TypeScript types

**Check:**
```typescript
// BAD: Assume response structure
const data = response.data as UserData;

// GOOD: Validate runtime structure
if (!response.data || typeof response.data.email !== 'string') {
  throw new Error('Invalid response structure');
}
const data = response.data as UserData;
```

#### B. Missing Null Checks
**Look for:**
- Optional chaining (`?.`) followed by non-null assertion (`!`)
- Accessing properties without checking existence
- Array/Map access without validation

---

### 8. ERROR HANDLING

#### A. Silent Failures
**Look for:**
- Empty catch blocks: `catch (e) {}`
- Errors logged but not handled
- No user feedback on failures

**Check:**
```typescript
// BAD: Error disappears silently
try {
  await operation();
} catch (e) {
  console.error(e);
}

// GOOD: Handle error appropriately
try {
  await operation();
} catch (e) {
  console.error('Operation failed:', e);
  showErrorToUser(e.message);
  return fallbackValue;
}
```

#### B. No Error Propagation
**Look for:**
- Services catching errors they can't handle
- Missing `throw` in catch blocks that should propagate
- Swallowing errors that caller needs to know about

---

### 9. SECURITY ISSUES

#### A. Input Validation
**Look for:**
- User input used in innerHTML without sanitization
- Email addresses without regex validation
- CRLF injection in headers (missing `\r\n\0` removal)

**Check:**
```typescript
// BAD: XSS vulnerability
element.innerHTML = userInput;

// GOOD: Sanitize HTML entities
element.textContent = sanitize(userInput);
```

#### B. Command Injection
**Look for:**
- User input concatenated into shell commands
- No escaping/validation of parameters to exec/spawn

---

## 📋 AUDIT OUTPUT FORMAT

For each issue found, provide:

```markdown
### [SEVERITY] Issue Type - Short Description

**Location:** `path/to/file.ts:123`

**Issue:**
[Detailed explanation of the problem]

**Current Code:**
\`\`\`typescript
// Problematic code snippet
\`\`\`

**Fix:**
\`\`\`typescript
// Fixed code snippet with explanation
\`\`\`

**Impact:** [What happens if not fixed]
```

---

## 🎯 PRIORITIZATION GUIDE

**HIGH Priority (Fix immediately):**
- Memory leaks in long-running processes
- Security vulnerabilities (XSS, injection)
- Extension context invalidation without handling
- Race conditions causing data corruption

**MEDIUM Priority (Fix soon):**
- Dead code files (>100 lines)
- Unbounded caches
- Missing rate limiting on external APIs
- Duplicate systems causing confusion

**LOW Priority (Nice to have):**
- Small dead code blocks (<20 lines)
- Performance micro-optimizations
- Type safety improvements in internal code
- Code style inconsistencies

---

## 🔧 SPECIAL CHECKS FOR BROWSER EXTENSIONS

1. **Verify all MutationObservers are registered with lifecycle manager**
2. **Check that WeakMaps are used for DOM element storage**
3. **Validate chrome.runtime.sendMessage has error handling**
4. **Ensure content scripts clean up on navigation**
5. **Verify background script handles extension reload gracefully**
6. **Check that message listeners return `true` for async responses**

---

## 💡 COMMON ANTI-PATTERNS TO SEARCH FOR

```typescript
// Anti-pattern search queries:
grep -r "\.subscribe(" --include="*.ts" | grep -v "const.*=" // Ignored subscriptions
grep -r "setInterval(" --include="*.ts" | grep -v "clear" // Uncleaned intervals
grep -r "addEventListener(" --include="*.ts" | grep -v "remove" // Unremoved listeners
grep -r "new MutationObserver" --include="*.ts" | grep -v "disconnect" // Undisconnected observers
grep -r "Map<.*HTMLElement>" --include="*.ts" // DOM elements in regular Map
grep -r "as any" --include="*.ts" // Dangerous type assertions
grep -r "catch.*{}" --include="*.ts" // Empty catch blocks
```

---

## ✅ VALIDATION CHECKLIST

After fixes, verify:
- [ ] All memory leaks addressed
- [ ] Dead code removed (not just commented)
- [ ] Build succeeds without errors
- [ ] Bundle size reduced (if dead code removed)
- [ ] No new TypeScript errors introduced
- [ ] All async cleanup registered with lifecycle manager
- [ ] Extension reloads gracefully
- [ ] Long sessions don't accumulate memory

---

## 📚 REFERENCES

This prompt is based on real issues found in production TypeScript browser extensions:
- Subscription memory leaks (VerificationService.subscribe)
- Uncleaned intervals (InboxIndicators repair interval)
- Dead code files (verification-state-manager.ts, 292 lines)
- Unused methods (messageIdToRowMap system, 20 lines)
- Mutex cleanup patterns (registrationMutexes Map)
- Extension context invalidation handling
- MutationObserver lifecycle management
- Cache size limits and TTL expiration
- Race conditions in SPA navigation

---

**Last Updated:** 2026-01-18
**Version:** 1.0
