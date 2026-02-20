
**Created:** 2026-02-14
**Source:** Claude, Gemini, and GPT reviews of Chat/Agent/Swarm systems
**Scope:** Fix all correctly identified issues from `6.0 Reviews/`

---

## Executive Summary

This plan addresses **20 verified issues** across 5 categories:
- **Critical** (4 issues) — System integrity, data corruption risks
- **High** (6 issues) — Functionality gaps, reliability problems
- **Medium** (5 issues) — Code quality, maintainability
- **Low** (3 issues) — Documentation, polish
- **Cleanup** (2 issues) — Dead code, file hygiene

**Estimated Effort:** 12-16 hours over 4 phases
**Risk Level:** Low (mostly additive changes with clear rollback paths)

---

## Phase 1: Critical Fixes (P0) — 2-3 hours

### 1.1 Delete Windows-Reserved Filenames
**Severity:** Critical
**Files:** `3.0 Build/nul`, `3.0 Build/src/main/ai/artifacts/NUL`
**Issue:** These files break tooling on Windows (grep, ripgrep, indexers, CI)
**Impact:** Developer experience, CI reliability

**Implementation:**
```powershell
# Delete both files
rm "C:\Users\samcd\Projects\Git-Repos\Arete\3.0 Build\nul"
rm "C:\Users\samcd\Projects\Git-Repos\Arete\3.0 Build\src\main\ai\artifacts\NUL"

# Verify deletion
ls "C:\Users\samcd\Projects\Git-Repos\Arete\3.0 Build\nul" 2>&1  # Should fail
ls "C:\Users\samcd\Projects\Git-Repos\Arete\3.0 Build\src\main\ai\artifacts\NUL" 2>&1  # Should fail
```

**Verification:** Run `rg "test"` across codebase without errors

**Rollback:** None needed (empty files with no references)

---

### 1.2 Fix Swarm Agent Type Enforcement
**Severity:** Critical
**File:** `src/main/swarm/task-graph.ts`
**Issue:** `claimTask()` doesn't validate agent type matches task type → any agent can claim any task
**Impact:** Swarm specialization (researcher/coder/reviewer) is not enforced

**Current Code:**
```typescript
// Line 95: task-graph.ts
async claimTask(taskId: string, agentId: string): Promise<boolean> {
  // No type checking!
  const task = await this.getTask(taskId)
  if (!task) return false
  // ... claims task regardless of type compatibility
}
```

**Fix:**
```typescript
// src/main/swarm/task-graph.ts
async claimTask(
  taskId: string,
  agentId: string,
  agentType: string  // NEW: pass agent's type
): Promise<boolean> {
  ensureSwarmTables()
  const db = getRawDatabase()

  const task = await this.getTask(taskId)
  if (!task) return false

  // NEW: Validate agent type matches task type
  if (task.agentType && task.agentType !== agentType) {
    console.warn(`Agent type mismatch: task requires ${task.agentType}, agent is ${agentType}`)
    return false
  }

  // Check if blocked
  if (task.blockedBy?.length) {
    const blockers = await this.getTasks(task.blockedBy)
    const allComplete = blockers.every(b => b.status === 'completed')
    if (!allComplete) return false
  }

  // Rest of claim logic unchanged...
}
```

**Update Callers:**
```typescript
// src/main/swarm/agent-pool.ts - Line 127
const claimed = await taskGraph.claimTask(taskId, agentId, agentType)  // Pass type
```

**Verification:**
1. Unit test: researcher agent attempts to claim coder task → returns false
2. Integration test: parallel swarm with mixed types → each agent only claims matching tasks

**Rollback:** Revert to single-signature `claimTask(taskId, agentId)`

---

### 1.3 Fix Swarm Dependency Deadlock
**Severity:** Critical
**File:** `src/main/swarm/task-graph.ts`
**Issue:** Failed tasks don't cascade to dependents → blocked tasks wait forever
**Impact:** One failure can deadlock entire swarm until timeout

**Current Behavior:**
```
Task A (fails) → Task B (blocked by A) → stays "pending" forever
```

**Fix:**
```typescript
// src/main/swarm/task-graph.ts
async markFailed(taskId: string, error: string): Promise<void> {
  ensureSwarmTables()
  const db = getRawDatabase()

  const now = Date.now()
  db.prepare(`
    UPDATE agent_tasks
    SET status = 'failed', error = ?, updated_at = ?
    WHERE id = ?
  `).run(error, now, taskId)

  // NEW: Cascade failure to dependent tasks
  await this.cascadeFailure(taskId, error)
}

// NEW METHOD
private async cascadeFailure(failedTaskId: string, rootError: string): Promise<void> {
  const db = getRawDatabase()

  // Find all tasks that depend on this one
  const allTasks = await this.getAllTasks()
  const dependents = allTasks.filter(t =>
    t.blockedBy?.includes(failedTaskId) &&
    t.status === 'pending'
  )

  for (const task of dependents) {
    const cascadeError = `Blocked by failed task: ${failedTaskId}. Root cause: ${rootError}`
    await this.markFailed(task.id, cascadeError)  // Recursive cascade
  }
}
```

**Verification:**
1. Create swarm: Task A → Task B (depends on A) → Task C (depends on B)
2. Fail Task A
3. Verify Tasks B and C marked failed with cascade error message

**Rollback:** Remove `cascadeFailure()` call and method

---

### 1.4 Fix Swarm Timeout Agent Cleanup
**Severity:** Critical
**File:** `src/main/swarm/orchestrator.ts`
**Issue:** Timeout path rejects without cleaning up agents → orphaned agents
**Impact:** Resource leaks, pool capacity exhaustion

**Current Code:**
```typescript
// Line 198: orchestrator.ts
const timeoutId = setTimeout(() => {
  cleanup()  // Only clears event listeners, not agents!
  reject(new Error('Swarm execution timed out after 5 minutes'))
}, timeout)
```

**Fix:**
```typescript
// src/main/swarm/orchestrator.ts - Line 198
const timeoutId = setTimeout(async () => {
  cleanup()

  // NEW: Clean up all spawned agents
  for (const agentId of spawnedAgentIds) {
    try {
      await agentPool.terminateAgent(agentId)
    } catch (err) {
      console.error(`Failed to terminate agent ${agentId} on timeout:`, err)
    }
  }

  reject(new Error('Swarm execution timed out after 5 minutes'))
}, timeout)
```

**Verification:**
1. Create slow swarm that exceeds 5 minutes
2. Check agent pool after timeout → all agents terminated
3. Verify no memory leaks in agent-pool active sessions

**Rollback:** Remove agent termination loop

---

## Phase 2: High Priority Fixes (P1) — 4-5 hours

### 2.1 Implement Swarm JSON Parsing with Zod
**Severity:** High
**File:** `src/main/swarm/orchestrator.ts`
**Issue:** Regex-based JSON extraction is fragile → LLM formatting drift breaks planning
**Impact:** Swarm reliability

**Current Code:**
```typescript
// Line 77: orchestrator.ts
const jsonMatch = completion.match(/\{[\s\S]*\}/)
const plan = JSON.parse(jsonMatch![0])  // Brittle!
```

**Fix:**
```typescript
// NEW: src/main/swarm/schemas.ts
import { z } from 'zod'

export const SwarmPlanSchema = z.object({
  strategy: z.enum(['parallel', 'sequential', 'handoff']),
  tasks: z.array(z.object({
    description: z.string().min(1),
    agentType: z.enum(['researcher', 'coder', 'reviewer', 'general']),
    blockedBy: z.array(z.number()).optional()
  }))
})

export type SwarmPlan = z.infer<typeof SwarmPlanSchema>
```

```typescript
// src/main/swarm/orchestrator.ts
import { generateObject } from 'ai'
import { SwarmPlanSchema, type SwarmPlan } from './schemas'

async function generatePlan(
  request: SwarmRequest,
  adapter: ProviderAdapter
): Promise<SwarmPlan> {
  const model = getAiSdkModel(adapter.provider, 'sonnet-4.5')  // Use Sonnet for planning

  const { object } = await generateObject({
    model,
    schema: SwarmPlanSchema,
    prompt: `You are a task planning AI. Given the user request, create an execution plan.

User Request: ${request.userMessage}

Output ONLY valid JSON matching this structure:
{
  "strategy": "parallel" | "sequential" | "handoff",
  "tasks": [
    {
      "description": "Task description",
      "agentType": "researcher" | "coder" | "reviewer" | "general",
      "blockedBy": [0, 1] // Optional: indices of tasks this depends on
    }
  ]
}

Rules:
- Use "parallel" for independent tasks
- Use "sequential" for ordered dependencies
- Use "handoff" for single-agent simple tasks
- Limit to 5 tasks maximum
- blockedBy indices must reference earlier tasks`
  })

  return object  // Already validated by Zod!
}
```

**Verification:**
1. Test with malformed LLM output → throws Zod validation error (not JSON.parse error)
2. Test with valid plan → parses correctly
3. Check error messages are user-friendly

**Rollback:** Revert to regex parsing

---

### 2.2 Make Swarm Timeout Configurable
**Severity:** High
**File:** `src/main/swarm/orchestrator.ts`
**Issue:** Hardcoded 5-minute timeout too short for research/coding tasks
**Impact:** Legitimate swarms fail prematurely

**Fix:**
```typescript
// src/shared/schemas/agent.ts
export const AgentConfigSchema = z.object({
  // ... existing fields
  swarmTimeoutMs: z.number().min(60_000).max(3_600_000).default(600_000)  // 10 min default, 1 hour max
})
```

```typescript
// src/main/swarm/orchestrator.ts
import { settingsStore } from '../storage/settings-store'

async function monitorSwarmCompletion(/* ... */): Promise<void> {
  return new Promise((resolve, reject) => {
    let completedCount = 0
    let failedCount = 0

    // Get timeout from settings (default 10 minutes)
    const settings = settingsStore.get('agent') ?? {}
    const timeout = settings.swarmTimeoutMs ?? 600_000

    console.log(`Swarm timeout set to ${timeout}ms (${timeout / 60_000} minutes)`)

    const timeoutId = setTimeout(async () => {
      // ... cleanup logic from 1.4
    }, timeout)

    // ... rest unchanged
  })
}
```

**UI Integration:**
```typescript
// src/renderer/src/components/settings/AgentSettingsPanel.tsx
<div className="setting-row">
  <label>Swarm Timeout (minutes)</label>
  <input
    type="number"
    min={1}
    max={60}
    value={settings.swarmTimeoutMs / 60_000}
    onChange={e => updateSetting('swarmTimeoutMs', e.target.value * 60_000)}
  />
  <span className="hint">Maximum time for swarm execution (1-60 minutes)</span>
</div>
```

**Verification:**
1. Set timeout to 2 minutes in settings
2. Run slow swarm → times out after 2 minutes
3. Verify setting persists across app restarts

**Rollback:** Remove setting, hardcode 600_000 (10 min)

---

### 2.3 Integrate Rate Limiter into Request Paths
**Severity:** High
**File:** `src/main/ai/rate-limiter.ts` (exists but unused)
**Issue:** Rate limiter implemented but not integrated → no RPM protection
**Impact:** API rate limit errors, IP bans

**Current State:**
```typescript
// rate-limiter.ts exists with full implementation
// But no callers in chat-handler, agent-loop, or swarm orchestrator
```

**Fix:**
```typescript
// src/main/ai/rate-limiter.ts - Add factory function
import { settingsStore } from '../storage/settings-store'

const limiters = new Map<string, RateLimiter>()

export function getRateLimiter(provider: Provider): RateLimiter {
  if (!limiters.has(provider)) {
    const settings = settingsStore.get('ai')?.rateLimits?.[provider] ?? { rpm: 60, tpm: 100_000 }
    limiters.set(provider, new RateLimiter(settings.rpm, settings.tpm))
  }
  return limiters.get(provider)!
}
```

```typescript
// src/main/ai/chat-orchestrator.ts - Line ~150 (before adapter.chat call)
import { getRateLimiter } from './rate-limiter'

async function orchestrateChat(/* ... */): Promise<ChatResponse> {
  // ... existing logic

  // NEW: Check rate limit before request
  const limiter = getRateLimiter(modelConfig.provider)
  const estimatedTokens = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0) / 4

  const canProceed = await limiter.checkLimit(estimatedTokens)
  if (!canProceed) {
    throw new Error(`Rate limit exceeded for ${modelConfig.provider}. Please wait before retrying.`)
  }

  // Make request
  const response = await adapter.chat({ model, messages, stream, onChunk })

  // NEW: Record actual usage
  if (response.usage) {
    limiter.recordUsage(response.usage.totalTokens)
  }

  return response
}
```

**Integration Points:**
- `chat-orchestrator.ts` — Before adapter.chat()
- `agent-loop.ts` — Before ToolLoopAgent.run()
- `swarm/agent-pool.ts` — Before task execution

**Verification:**
1. Set OpenAI limit to 5 RPM
2. Send 10 rapid requests → 6th request throws rate limit error
3. Wait 60 seconds → next request succeeds

**Rollback:** Remove checkLimit() calls

---

### 2.4 Fix Swarm Cost Aggregation
**Severity:** High
**File:** `src/main/swarm/orchestrator.ts`
**Issue:** Returns hardcoded `totalCost: 0` → no swarm cost tracking
**Impact:** Budget controls ineffective, cost reporting wrong

**Current Code:**
```typescript
// Line 324: orchestrator.ts
return {
  // ... results
  totalCost: 0,  // TODO(cost-tracking): Aggregate from cost tracker
  mode: 'swarm'
}
```

**Fix:**
```typescript
// src/main/swarm/orchestrator.ts
import { getCostSummary } from '../shared/monitoring/cost-tracker'

async function finalizeSwarm(/* ... */): Promise<SwarmResponse> {
  // ... synthesis logic

  // NEW: Aggregate costs for this session
  const costSummary = await getCostSummary()
  const sessionCosts = costSummary.entries.filter(e =>
    e.conversationId === request.conversationId.toString()
  )
  const totalCost = sessionCosts.reduce((sum, e) => sum + e.cost, 0)

  console.log(`Swarm completed. Total cost: $${totalCost.toFixed(4)}`)

  return {
    synthesis,
    tasks: completedTasks.map(t => ({
      taskId: t.id,
      description: t.description,
      result: t.result,
      agentType: t.agentType ?? 'general'
    })),
    totalCost,  // Real aggregated cost
    mode: 'swarm'
  }
}
```

**Task-Level Cost Tracking:**
```typescript
// src/main/swarm/agent-pool.ts - After task execution
import { trackUsage } from '../ai/usage-tracker'

async function executeTaskInternal(/* ... */): Promise<void> {
  // ... execute task

  // NEW: Track cost for this specific task
  if (result.usage) {
    await trackUsage({
      conversationId: sessionId.toString(),
      provider: adapter.provider,
      model: modelId,
      usage: result.usage,
      metadata: { taskId, agentId, agentType }
    })
  }

  // ... mark completed
}
```

**Verification:**
1. Run swarm with 3 tasks
2. Check cost summary → see 3+ entries (tasks + synthesis)
3. Verify totalCost matches sum of entries

**Rollback:** Return `totalCost: 0`

---

### 2.5 Fix Agent Mode Message Duplication
**Severity:** High
**File:** `src/main/ipc/handlers/conversation-handlers.ts`, `src/main/agent/orchestrator.ts`
**Issue:** User message persisted, loaded in history, then appended again → duplicate in context
**Impact:** Token waste, degraded prompt quality

**Current Flow:**
```
1. Line 120: conversation-handlers.ts → Save user message to DB
2. Line 129: Load full history (including that message)
3. orchestrator.ts:129 → Append user message again to messages array
```

**Fix Option A: Don't persist before agent run**
```typescript
// src/main/ipc/handlers/conversation-handlers.ts
ipcMain.handle('conversation:send', async (event, request) => {
  // ... validation

  if (request.mode === 'agent') {
    // NEW: Don't persist user message yet (agent orchestrator will do it)
    const history = await getConversationHistory(request.conversationId, 50)

    return handler.handleAgentMode({
      ...request,
      history,
      userMessage: request.message  // Pass message separately
    })
  } else {
    // Chat mode: persist before processing
    await saveMessage({
      conversationId: request.conversationId,
      role: 'user',
      content: request.message
    })
    // ... rest of chat handling
  }
})
```

```typescript
// src/main/agent/orchestrator.ts - Line 129
async function runAgent(/* ... */): Promise<AgentResponse> {
  // NEW: Append user message to history (not duplicated)
  const messages = [
    ...context.history,
    { role: 'user' as const, content: request.userMessage }
  ]

  // NEW: Persist user message before starting agent loop
  await saveMessage({
    conversationId: request.conversationId,
    role: 'user',
    content: request.userMessage
  })

  // ... rest unchanged
}
```

**Fix Option B: Skip user message if already in history**
```typescript
// src/main/agent/orchestrator.ts - Line 129
const lastMessage = context.history[context.history.length - 1]
const messages = lastMessage?.role === 'user' && lastMessage.content === request.userMessage
  ? [...context.history]  // Already in history, don't duplicate
  : [...context.history, { role: 'user' as const, content: request.userMessage }]
```

**Recommended:** Option A (cleaner separation of concerns)

**Verification:**
1. Send agent request "What is 2+2?"
2. Check DB → user message saved once
3. Check agent context → user message appears once
4. Verify token count matches single message

**Rollback:** Revert to original flow

---

### 2.6 Fix Parallel Agent Queue Functionality
**Severity:** High
**Files:** `src/main/agent/parallel-manager.ts`, `src/main/ipc/handlers/agent-handlers.ts`
**Issue:** Queue returns next tab but callers ignore it → queued tabs never resume
**Impact:** Queue UI misleads users

**Current Code:**
```typescript
// parallel-manager.ts:90
unregister(sessionId: string): string | undefined {
  this.sessions.delete(sessionId)

  // Return next queued tab, but no one uses this!
  return this.queue.shift()
}

// agent-handlers.ts:160 - caller ignores return value
await parallelManager.unregister(sessionId)  // Return value discarded
```

**Fix:**
```typescript
// src/main/ipc/handlers/agent-handlers.ts
ipcMain.handle('agent:run', async (event, request) => {
  try {
    // Check capacity
    if (!parallelManager.canStart(request.tabId)) {
      // NEW: Enqueue and return queued status (don't throw)
      parallelManager.enqueue(request.tabId)

      emitEvent(win, request.tabId, {
        type: 'agent-queued',
        message: `Agent queued. Position: ${parallelManager.getQueuePosition(request.tabId)}`,
        metadata: { queueLength: parallelManager.getQueueLength() }
      })

      return { status: 'queued' }  // Don't throw error
    }

    // ... rest of agent run
  } catch (err) {
    // ... error handling
  }
})

// NEW: Handle agent completion with queue processing
ipcMain.handle('agent:cancel', async (event, sessionId) => {
  await cancelAgentSession(sessionId)

  // NEW: Get next queued tab and auto-start it
  const nextTabId = await parallelManager.unregister(sessionId)
  if (nextTabId) {
    emitEvent(win, nextTabId, {
      type: 'agent-queue-ready',
      message: 'Your agent is now starting...'
    })

    // Auto-resume queued tab (get request from queue)
    const queuedRequest = parallelManager.getQueuedRequest(nextTabId)
    if (queuedRequest) {
      // Recursive call to handle the queued request
      await orchestrateAgent(queuedRequest, win)
    }
  }

  return { status: 'cancelled' }
})
```

**Data Structure Changes:**
```typescript
// src/main/agent/parallel-manager.ts
export class ParallelAgentManager {
  private sessions = new Map<string, string>()  // sessionId → tabId
  private queue: Array<{ tabId: string; request: AgentRequest }> = []  // Store full request

  enqueue(tabId: string, request: AgentRequest): void {
    this.queue.push({ tabId, request })
  }

  getQueuedRequest(tabId: string): AgentRequest | undefined {
    const idx = this.queue.findIndex(q => q.tabId === tabId)
    if (idx === -1) return undefined
    return this.queue.splice(idx, 1)[0].request
  }

  getQueuePosition(tabId: string): number {
    return this.queue.findIndex(q => q.tabId === tabId) + 1
  }

  getQueueLength(): number {
    return this.queue.length
  }
}
```

**Verification:**
1. Start 3 agent tabs (hit capacity limit)
2. Start 4th tab → gets queued with position indicator
3. Cancel tab 1 → tab 4 auto-starts
4. Verify queue position updates in UI

**Rollback:** Revert to throwing error on capacity hit

---

## Phase 3: Medium Priority Fixes (P2) — 3-4 hours

### 3.1 Move MAX_APPROVAL_CYCLES to Configuration
**Severity:** Medium
**File:** `src/main/agent/agent-loop.ts`
**Issue:** Hardcoded limit can interrupt legitimate long tasks
**Impact:** User control, flexibility

**Fix:**
```typescript
// src/shared/schemas/agent.ts
export const AgentConfigSchema = z.object({
  // ... existing
  maxApprovalCycles: z.number().min(5).max(100).default(20)
})
```

```typescript
// src/main/agent/agent-loop.ts - Line 245
import { settingsStore } from '../storage/settings-store'

const settings = settingsStore.get('agent') ?? {}
const MAX_APPROVAL_CYCLES = settings.maxApprovalCycles ?? 20

console.log(`Agent approval cycle limit: ${MAX_APPROVAL_CYCLES}`)

for (let approvalCycle = 0; approvalCycle < MAX_APPROVAL_CYCLES; approvalCycle++) {
  // ... loop body
}

if (approvalCycle >= MAX_APPROVAL_CYCLES) {
  return {
    response: `Agent stopped: exceeded maximum approval cycles (${MAX_APPROVAL_CYCLES}). You can increase this limit in Settings → Agent.`,
    cost: totalCost,
    usage: totalUsage,
    model: modelId
  }
}
```

**UI:**
```tsx
// AgentSettingsPanel.tsx
<div className="setting-row">
  <label>Max Approval Cycles</label>
  <input
    type="number"
    min={5}
    max={100}
    value={settings.maxApprovalCycles ?? 20}
    onChange={e => updateSetting('maxApprovalCycles', parseInt(e.target.value))}
  />
  <span className="hint">Maximum iterations before agent stops (5-100)</span>
</div>
```

**Verification:**
1. Set to 5 in settings
2. Run agent that needs 10 iterations → stops at 5 with friendly message
3. Increase to 50 → agent completes

**Rollback:** Hardcode to 20

---

### 3.2 Refactor handleRedoBetterModel Duplication
**Severity:** Medium
**File:** `src/main/ai/chat-handler.ts`
**Issue:** Duplicates orchestration logic → maintenance burden, inconsistency risk
**Impact:** Code quality

**Current:**
```typescript
// chat-handler.ts has ~150 lines duplicating chat-orchestrator.ts logic
```

**Fix:**
```typescript
// src/main/ai/chat-handler.ts
async function handleRedoBetterModel(request: RedoRequest): Promise<ChatResponse> {
  // Build redo-specific request
  const redoRequest: ChatRequest = {
    conversationId: request.conversationId,
    message: request.originalMessage,
    mode: 'chat',
    modelOverride: {
      provider: request.targetProvider,
      modelId: request.targetModel,
      tier: 3  // "Better model" always uses Tier 3
    },
    skipClassification: true  // Don't re-classify, just use override
  }

  // Reuse orchestrator (DRY!)
  return orchestrateChat(redoRequest, request.history, onStep, onChunk)
}
```

**Remove:** Lines 223-375 in chat-handler.ts (duplicated logic)

**Verification:**
1. Send message → get response
2. Click "Redo with better model" → verify uses Tier 3 model
3. Check response quality matches original redo behavior

**Rollback:** Restore deleted lines

---

### 3.3 Migrate Swarm Schema to Drizzle
**Severity:** Medium
**File:** `src/main/swarm/task-graph.ts`
**Issue:** Imperative SQL bypasses migration system → schema drift risk
**Impact:** Database consistency, maintainability

**Fix:**
```typescript
// src/main/database/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const agentTasks = sqliteTable('agent_tasks', {
  id: text('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull(),  // 'pending' | 'in_progress' | 'completed' | 'failed'
  agentId: text('agent_id'),
  agentType: text('agent_type'),
  blockedBy: text('blocked_by'),  // JSON array
  result: text('result'),  // JSON
  error: text('error'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const agentMessages = sqliteTable('agent_messages', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull()
})
```

**Generate Migration:**
```bash
cd "3.0 Build"
npx drizzle-kit generate:sqlite
```

**Update task-graph.ts:**
```typescript
// Remove ensureSwarmTables() - handled by migrations
// Update all SQL queries to use Drizzle ORM

import { db } from '../database'
import { agentTasks, agentMessages } from '../database/schema'
import { eq, and } from 'drizzle-orm'

async createTask(task: TaskInput): Promise<string> {
  const id = generateTaskId()
  const now = Date.now()

  await db.insert(agentTasks).values({
    id,
    sessionId: task.sessionId,
    description: task.description,
    status: 'pending',
    agentType: task.agentType ?? null,
    blockedBy: task.blockedBy ? JSON.stringify(task.blockedBy) : null,
    createdAt: now,
    updatedAt: now
  })

  return id
}
```

**Verification:**
1. Delete agent_tasks and agent_messages tables
2. Run migrations → tables recreated
3. Run swarm → tasks persist correctly
4. Check schema matches Drizzle definition

**Rollback:** Keep imperative SQL, skip migration

---

### 3.4 Implement Swarm Cancellation
**Severity:** Medium
**Files:** `src/renderer/src/components/chat/ChatInput.tsx`, `src/main/ipc/handlers/conversation-handlers.ts`
**Issue:** Stop button doesn't cancel swarm → UX shows "stopped" but swarm continues
**Impact:** User control, clarity

**Fix:**
```typescript
// src/main/swarm/orchestrator.ts - Add cancellation support
const activeSwarms = new Map<number, AbortController>()  // sessionId → controller

export function cancelSwarm(sessionId: number): void {
  const controller = activeSwarms.get(sessionId)
  if (controller) {
    controller.abort()
    activeSwarms.delete(sessionId)
  }
}

export async function orchestrateSwarm(/* ... */): Promise<SwarmResponse> {
  const abortController = new AbortController()
  activeSwarms.set(request.sessionId, abortController)

  try {
    // Pass signal to all async operations
    const plan = await generatePlan(request, adapter, abortController.signal)

    // Monitor with cancellation support
    await monitorSwarmCompletion(/* ... */, abortController.signal)

    // ... rest
  } finally {
    activeSwarms.delete(request.sessionId)
  }
}
```

```typescript
// src/main/ipc/handlers/conversation-handlers.ts
ipcMain.handle('conversation:cancel', async (event, sessionId) => {
  const activeConv = activeConversations.get(sessionId)

  if (activeConv?.mode === 'swarm') {
    cancelSwarm(sessionId)  // Cancel swarm
  } else if (activeConv?.mode === 'agent') {
    cancelAgentSession(sessionId)  // Cancel agent
  } else {
    cancelStream(sessionId)  // Cancel chat stream
  }

  return { status: 'cancelled' }
})
```

**UI Update:**
```tsx
// ChatInput.tsx - Line 99
const handleStop = () => {
  if (mode === 'agent' || mode === 'swarm') {
    window.api.conversation.cancel(conversationId)  // Unified cancel
  } else {
    chatStore.cancelStream()
  }
}
```

**Verification:**
1. Start swarm
2. Click stop after 30 seconds
3. Verify all agents terminate
4. Check no orphaned tasks remain

**Rollback:** Keep separate cancel paths

---

### 3.5 Document History Sanitization Implications
**Severity:** Medium
**File:** `src/main/ai/chat-handler.ts`
**Issue:** Merging consecutive messages can alter conversation semantics
**Impact:** Agent reasoning quality (subtle)

**Fix:** Add comprehensive documentation (not code change)

```typescript
// src/main/ai/chat-handler.ts - Line 579
/**
 * Sanitize conversation history for API compatibility.
 *
 * IMPORTANT BEHAVIOR:
 * - Merges consecutive messages from same role (required by Anthropic/Perplexity APIs)
 * - Example: ["user: A", "user: B"] → ["user: A\n\nB"]
 *
 * IMPLICATIONS:
 * - Multi-turn agent conversations may lose turn granularity
 * - Affects prompt caching boundaries (merged messages = different cache key)
 * - Changes token distribution across messages
 *
 * WHY THIS IS NECESSARY:
 * - Anthropic API rejects adjacent same-role messages
 * - Perplexity has similar constraint
 * - OpenAI/Google/DeepSeek allow it but Anthropic is primary provider
 *
 * MITIGATION:
 * - Agent mode uses separate conversation thread (minimal impact)
 * - Chat mode rarely has consecutive user messages
 * - Swarm synthesis is single assistant message (no merging needed)
 *
 * @param history - Raw conversation history
 * @returns Sanitized history with no consecutive same-role messages
 */
function sanitizeHistory(history: Message[]): Message[] {
  // ... existing implementation
}
```

**Add Unit Tests:**
```typescript
// src/main/ai/chat-handler.test.ts (NEW FILE)
describe('sanitizeHistory', () => {
  it('merges consecutive user messages', () => {
    const input = [
      { role: 'user', content: 'First' },
      { role: 'user', content: 'Second' }
    ]
    const output = sanitizeHistory(input)
    expect(output).toEqual([
      { role: 'user', content: 'First\n\nSecond' }
    ])
  })

  it('preserves alternating roles', () => {
    const input = [
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B' },
      { role: 'user', content: 'C' }
    ]
    const output = sanitizeHistory(input)
    expect(output).toEqual(input)  // No change
  })
})
```

**Verification:** Review in code review, test edge cases

**Rollback:** None (documentation only)

---

## Phase 4: Documentation & Cleanup (P3) — 2-3 hours

### 4.1 Update Milestone Status Documentation
**Severity:** Low
**Files:** Multiple in `2.0 Design/2.5 Chat/`
**Issue:** Chat_10, Chat_12, Chat_14 marked incomplete but fully built
**Impact:** Documentation accuracy

**Actions:**

1. **Move to Complete/ folder:**
```bash
mv "2.0 Design/2.5 Chat/Chat_10 - System Prompt Modularization.md" "2.0 Design/2.5 Chat/Complete/"
mv "2.0 Design/2.5 Chat/Chat_12 - Interactive Agent Response.md" "2.0 Design/2.5 Chat/Complete/"
mv "2.0 Design/2.5 Chat/Chat_14 - Arete Self-Knowledge.md" "2.0 Design/2.5 Chat/Complete/"
```

2. **Update file headers:**

**Chat_10:**
```markdown
# Chat_10 — System Prompt Modularization (Claude Code Architecture)

> **Workstream:** 3.1.4 AI Chatbot
> **Status:** ✅ COMPLETE (was: PLANNED)
> **Completed:** 2026-02-08
> **Prerequisite:** Chat_5 (Dynamic System Prompts Phase 1) — ✅ COMPLETE
```

**Chat_12:**
```markdown
# Chat_12 - Interactive Agent Response

**Status**: ✅ COMPLETE (was: Design)
**Completed:** 2026-02-09
**Dependencies**: Chat_1 (AI Chat), Chat_2 (Agent System)
```

**Chat_14:**
```markdown
# Chat_14 — Arete Self-Knowledge System

**Status:** ✅ COMPLETE (was: Proposed)
**Completed:** 2026-02-10
**Prerequisite**: Chat_10 (System Prompt Modularization) — ✅ COMPLETE
```

3. **Update features.md:**
```markdown
### 40 Agent Prompts (was: 26)
- 16 core prompts (role, efficiency, tool-usage, code-quality, file-system, memory, etc.)
- 11 tool prompts (bash, readFile, writeFile, editFile, listDirectory, search, glob, webSearch, manageMemory, search_documents, ask_user)
- 13 product prompts (overview, file-explorer, word-viewer, ai-chat, consensus, agent-mode, rag, memory, knowledge-base, prompt-studio, keyboard-shortcuts, settings)

### 5 Thinking Animations (was: 21)
BrailleShimmer, DotsEllipsis, Shimmer, Wave, Braille — in `components/chat/thinking-animations/`
```

**Verification:** Review files in Complete/ folder, check headers

---

### 4.2 Remove Dead Code
**Severity:** Low
**File:** `src/main/ai/pipeline.ts`
**Issue:** processMessageMultiPart referenced but commented out
**Impact:** Code clarity

**Remove:**
```typescript
// Line 13: pipeline.ts - Remove from JSDoc
- * Returns the primary (first) part. For multi-part, use processMessageMultiPart().

// Line 106: Remove TODO comment
- // TODO(multi-part): Multi-part pipeline (processMessageMultiPart) removed as dead code.
```

**Search & Remove All References:**
```bash
rg "processMessageMultiPart|multi-part|MultiPart" "3.0 Build/src" --type ts
```

**Files to Update:**
- `pipeline.ts` — Remove comments
- `MultiPartResponse.tsx` — Delete file or add "// Unused: reserved for future multi-part UI"

**Verification:** No references to multi-part remain

---

### 4.3 Review Error Suppression in search_documents
**Severity:** Low
**File:** `src/main/agent/tool-registry.ts`
**Issue:** Errors returned as strings instead of thrown → may hide failures
**Impact:** Agent reasoning quality (edge case)

**Current:**
```typescript
// tool-registry.ts - search_documents tool
try {
  const results = await searchDocuments(query, limit)
  return JSON.stringify(results)
} catch (error) {
  return `Error searching documents: ${error.message}`  // Agent sees error as result
}
```

**Analysis:** This is actually intentional and correct behavior:
- Agent can reason about search failures (empty index, query errors)
- Throwing would crash the agent loop
- Alternative: special error object with `isError: true` flag

**Recommendation:** Keep as-is but add documentation

**Fix:**
```typescript
/**
 * Search documents tool with graceful error handling.
 *
 * DESIGN DECISION: Errors are returned as text results, not thrown.
 * This allows the agent to reason about search failures and adapt.
 *
 * Example: If RAG index is empty, agent sees:
 * "Error searching documents: No documents indexed"
 * ...and can respond: "I don't have access to indexed documents yet."
 *
 * If we threw instead, the entire agent loop would crash.
 */
search_documents: tool({
  // ... rest unchanged
})
```

**Verification:** None needed (documentation only)

---

## Summary of Phases

| Phase | Priority | Issues | Hours | Risk |
|-------|----------|--------|-------|------|
| **Phase 1** | Critical (P0) | 4 | 2-3 | Low |
| **Phase 2** | High (P1) | 6 | 4-5 | Medium |
| **Phase 3** | Medium (P2) | 5 | 3-4 | Low |
| **Phase 4** | Low (P3) | 3 | 2-3 | Very Low |
| **Total** | - | **20** | **12-16** | Low |

---

## Testing Strategy

### Unit Tests (New)
```typescript
// src/main/swarm/task-graph.test.ts
describe('claimTask with type enforcement', () => {
  it('rejects wrong agent type', async () => {
    const taskId = await taskGraph.createTask({
      sessionId: 1,
      description: 'Code review',
      agentType: 'reviewer'
    })

    const claimed = await taskGraph.claimTask(taskId, 'agent-123', 'coder')
    expect(claimed).toBe(false)
  })
})

// src/main/swarm/orchestrator.test.ts
describe('generatePlan with Zod', () => {
  it('validates plan schema', async () => {
    // Mock LLM returns invalid plan
    const invalidPlan = { strategy: 'invalid', tasks: [] }

    await expect(generatePlan(request, adapter))
      .rejects.toThrow(ZodError)
  })
})
```

### Integration Tests
```typescript
// Swarm dependency cascade
test('failed task cascades to dependents', async () => {
  const swarm = await orchestrateSwarm({
    userMessage: 'Task A → Task B → Task C',
    strategy: 'sequential'
  })

  // Manually fail Task A
  await taskGraph.markFailed(taskAId, 'Test failure')

  // Verify B and C also failed
  const taskB = await taskGraph.getTask(taskBId)
  const taskC = await taskGraph.getTask(taskCId)

  expect(taskB.status).toBe('failed')
  expect(taskC.status).toBe('failed')
  expect(taskC.error).toContain('Blocked by failed task')
})
```

### Manual Testing Checklist
- [ ] Delete nul/NUL files → verify tooling works
- [ ] Run swarm with type enforcement → verify agents only claim matching tasks
- [ ] Trigger dependency failure → verify cascade
- [ ] Timeout swarm → verify agents cleaned up
- [ ] Exceed rate limit → verify friendly error
- [ ] Run 10-task swarm → verify cost aggregation
- [ ] Set custom timeout → verify respected
- [ ] Queue 5 agents → verify auto-resume
- [ ] Cancel swarm mid-execution → verify clean termination

---

## Rollback Plan

Each fix includes a rollback strategy. If issues arise:

1. **Git branching strategy:**
   ```bash
   git checkout -b fix/review-issues-phase-1
   # Implement Phase 1 fixes
   git commit -m "Phase 1: Critical fixes"
   git push
   # Test thoroughly
   # If OK: merge to main
   # If not: git checkout main (discard branch)
   ```

2. **Feature flags for risky changes:**
   ```typescript
   const ENABLE_TYPE_ENFORCEMENT = process.env.ENABLE_SWARM_TYPE_ENFORCEMENT === 'true'

   if (ENABLE_TYPE_ENFORCEMENT && task.agentType && task.agentType !== agentType) {
     return false
   }
   ```

3. **Incremental deployment:**
   - Phase 1 → Test 2 days → Phase 2 → Test 2 days → etc.

---

## Success Metrics

- [ ] TypeScript builds cleanly (already passing)
- [ ] All 20 issues marked as resolved
- [ ] No new regressions introduced
- [ ] Test coverage >80% for new code
- [ ] User-facing error messages are clear
- [ ] Settings UI reflects new configurability
- [ ] Documentation updated (CLAUDE.md, features.md)
- [ ] Git history shows atomic commits per fix

---

## Notes

- **Non-goals:** Performance optimization, new features, UI redesign
- **Out of scope:** MCP integration, Local AI, PDF viewer (correctly not built yet)
- **Follow-up work:** Consider Chat_15 completion (remaining 60%) as separate project
