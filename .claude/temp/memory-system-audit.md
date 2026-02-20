# Memory System — Complete Workflow Audit

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RENDERER                                      │
│                                                                         │
│  chat-store.ts ──sendMessage()──► workspacePath = explorerStore.rootPath │
│       │                                                                 │
│       ├── chatMode='agent' ──► agentRun({workspacePath})                │
│       └── chatMode='chat'  ──► sendMessage({workspacePath})             │
│                                                                         │
│  MemorySettings.tsx ──► memoryGetAll/Search/Delete/Toggle               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ IPC
┌────────────────────────────────▼────────────────────────────────────────┐
│                         MAIN PROCESS                                    │
│                                                                         │
│  ┌─── EXTRACTION (store memories) ──────────────────────────────────┐   │
│  │                                                                   │   │
│  │  chat-handler.ts streamResponse() ──► extractFactsDebounced()     │   │
│  │  chat-handler.ts consensus path   ──► extractFactsDebounced()     │   │
│  │  orchestrator.ts agent path       ──► extractFactsDebounced()     │   │
│  │         │                                                         │   │
│  │         ▼                                                         │   │
│  │  fact-extractor.ts ──► routeMessage() → cheapest Tier 1 model    │   │
│  │         │               LLM extracts facts from exchange          │   │
│  │         ▼                                                         │   │
│  │  memory-store.ts addMemory() ──► agent_memories + embeddings      │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─── INJECTION (recall memories) ──────────────────────────────────┐   │
│  │                                                                   │   │
│  │  chat-handler.ts handleChatMessage() ──► getMemoryContext()       │   │
│  │  system-prompt.ts buildAgentSystemPrompt() ──► getMemoryContext() │   │
│  │         │                                                         │   │
│  │         ▼                                                         │   │
│  │  context-injector.ts ──► searchMemories() → format → inject       │   │
│  │         │                                                         │   │
│  │         ▼                                                         │   │
│  │  memory-store.ts searchMemories() ──► vec_distance_cosine query   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─── MANAGEMENT (settings UI) ─────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  memory-handlers.ts ──► getAllMemories/search/delete/toggle        │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## All 19 Memory Files

| # | File | Role | Status |
|---|------|------|--------|
| 1 | `main/agent/memory/memory-store.ts` | Core CRUD + vector search | Fixed (3 bugs) |
| 2 | `main/agent/memory/fact-extractor.ts` | LLM fact extraction | Fixed (1 bug) |
| 3 | `main/agent/memory/context-injector.ts` | Format + inject into prompts | Fixed (1 bug) |
| 4 | `main/agent/memory/index.ts` | Barrel re-exports | OK |
| 5 | `main/agent/system-prompt.ts` | Agent prompt builder (injects memory) | OK |
| 6 | `main/agent/orchestrator.ts` | Agent orchestrator (triggers extraction) | OK |
| 7 | `main/ai/chat-handler.ts` | Chat flow (injects + extracts) | Fixed (3 bugs) |
| 8 | `main/ipc/handlers/memory-handlers.ts` | IPC handlers (7 endpoints) | Fixed (1 bug) |
| 9 | `main/database/index.ts` | Table creation (agent_memories + memory_embeddings) | OK |
| 10 | `main/database/schema.ts` | Drizzle ORM schema | OK |
| 11 | `main/database/queries.ts` | getPreference/setPreference | OK |
| 12 | `shared/schemas/memory.ts` | Shared types (MemoryEntry, etc.) | OK |
| 13 | `shared/schemas/index.ts` | Schema barrel exports | OK |
| 14 | `shared/types/ipc.ts` | AreteApi interface (7 memory methods) | OK |
| 15 | `preload/index.ts` | IPC bridge (7 memory methods) | OK |
| 16 | `renderer/components/settings/MemorySettings.tsx` | Settings panel UI | OK |
| 17 | `renderer/components/memory/MemoryManagementView.tsx` | Main content wrapper | OK |
| 18 | `renderer/components/shared/MainContent.tsx` | Routes 'memory' ActiveView | OK |
| 19 | `renderer/components/shared/Sidebar.tsx` | Brain icon in nav | OK |

## Extraction Paths (3 paths → fact-extractor)

### Path 1: Normal Chat (streamResponse)
```
chat-store.ts sendMessage()
  → workspacePath = explorerStore.rootPath ?? undefined
  → sendMessage({..., workspacePath})
  → IPC → handleChatMessage(options)
  → step 2c: getMemoryContext(content, options.workspacePath)  ← INJECTION
  → streamResponse(..., options.workspacePath)
  → extractFactsDebounced(originalContent, response.content, workspacePath)
  → fact-extractor.ts → addMemory(fact, category, {workspaceId})
```

### Path 2: Consensus Mode
```
chat-store.ts sendMessage() with consensusMode=true
  → sendMessage({..., workspacePath})
  → IPC → handleChatMessage(options)
  → step 2c: getMemoryContext(content, options.workspacePath)  ← INJECTION
  → getConsensus(...)
  → extractFactsDebounced(content, result.synthesis, options.workspacePath)
  → fact-extractor.ts → addMemory(fact, category, {workspaceId})
```

### Path 3: Agent Mode
```
chat-store.ts sendMessage() with chatMode='agent'
  → agentRun({..., workspacePath})
  → IPC → orchestrate(options)
  → PromptContext.userQuery = message
  → buildAgentSystemPrompt(promptContext)
    → getMemoryContext(userQuery, workspacePath)  ← INJECTION
  → runAgentLoop(...)
  → extractFactsDebounced(message, result.textContent, workspacePath)
  → fact-extractor.ts → addMemory(fact, category, {workspaceId})
```

## Injection Paths (2 paths → context-injector)

### Path A: Chat (new — added in this session)
```
handleChatMessage(options)
  → step 2c: getMemoryContext(content, options.workspacePath)
  → context-injector: searchMemories(query, {workspaceId})
  → chatHistory.unshift({role: 'system', content: memoryBlock})
```

### Path B: Agent System Prompt
```
buildAgentSystemPrompt(promptContext)
  → getMemoryContext(promptContext.userQuery, promptContext.workspacePath)
  → context-injector: searchMemories(query, {workspaceId})
  → memorySection inserted into system prompt XML
```

## Bugs Found and Fixed

### Session 1 (previous review): 7 bugs
1. `getPreference()` destructuring in fact-extractor.ts
2. `getPreference()` destructuring in context-injector.ts
3. `getPreference()` result handling in memory-handlers.ts
4. `getPreference()` destructuring in chat-handler.ts (workspace)
5. Float32Array not converted to Buffer in addMemory()
6. Float32Array not converted to Buffer in searchMemories()
7. SQL column alias in WHERE clause

### Session 2 (this review): 4 bugs

**BUG 8: Chat missing memory injection entirely**
- Location: `chat-handler.ts` handleChatMessage()
- Problem: RAG context was injected (step 2b) but memory context was not
- Impact: Chat mode never saw stored memories — only agent mode did
- Fix: Added step 2c calling `getMemoryContext()` and unshifting a system message

**BUG 9: Workspace search excluded global memories** (ROOT CAUSE of inconsistency)
- Location: `memory-store.ts` searchMemories() line 77
- Problem: When workspace is set, filter was `workspace_id = ?` which excluded
  global memories (workspace_id IS NULL). Memories stored without a workspace
  (the common case) were invisible when any folder was open.
- Impact: "What's my name" returned empty when a workspace folder was open,
  even though "The user's name is Sam" was stored as a global memory.
- Fix: Changed to `(workspace_id = ? OR workspace_id IS NULL)`

**BUG 10: streamResponse didn't receive workspacePath**
- Location: `chat-handler.ts` streamResponse() line 691
- Problem: Function read `getPreference('current:workspace')` for extraction,
  but this preference is NEVER SET anywhere in the codebase. Always returns null.
  The renderer-provided `options.workspacePath` was available but not passed.
- Impact: Facts extracted from normal chat always stored as global (workspace_id NULL)
  regardless of which folder was open. Not a crash, but wrong workspace attribution.
- Fix: Added `workspacePath` param to streamResponse, passed from handleChatMessage,
  removed dead `getPreference('current:workspace')` call.

**BUG 11: No isVecLoaded guard in memory store**
- Location: `memory-store.ts` addMemory() and searchMemories()
- Problem: RAG code checks `isVecLoaded()` before using vec0 virtual tables,
  but memory store didn't. If sqlite-vec extension fails to load, the
  `memory_embeddings` table doesn't exist and all memory operations crash.
- Impact: Potential crash on systems where sqlite-vec fails to load
- Fix: Added `isVecLoaded()` check — throws in addMemory, returns [] in searchMemories

## Dead Code / Unused References

| Item | Location | Status |
|------|----------|--------|
| `getPreference('current:workspace')` | chat-handler.ts:691 | **Removed** — was never set anywhere |
| `filteredMemories` alias | MemorySettings.tsx:112 | Harmless — `const filteredMemories = memories` (identity alias, no filtering logic) |

## WorkspaceId Flow Summary (after fixes)

```
Renderer (explorerStore.rootPath)
  ↓ undefined if no folder open, "C:\path" if folder open
  ↓
IPC payload.workspacePath
  ↓
handleChatMessage/orchestrate
  ├── Injection: getMemoryContext(query, workspacePath)
  │     └── searchMemories(query, {workspaceId: workspacePath})
  │           └── WHERE (workspace_id = 'C:\path' OR workspace_id IS NULL)
  │               or no filter if workspacePath undefined
  │
  └── Extraction: extractFactsDebounced(user, assistant, workspacePath)
        └── addMemory(fact, category, {workspaceId: workspacePath})
              └── INSERT workspace_id = 'C:\path' or NULL
```

## Architecture Assessment

### Strengths
- Clean separation: store/extractor/injector/handlers
- Reuses existing RAG infrastructure (embedder, sqlite-vec)
- Cost-efficient: cheapest Tier 1 model for extraction
- Debounced extraction prevents rapid-fire during streaming
- Dedup threshold (0.92) prevents near-duplicate memories
- Settings UI is functional with search, delete, toggle

### Remaining Design Notes
- `filteredMemories` alias in MemorySettings.tsx does nothing (line 112). Could add
  client-side category filtering in the future, or just remove the alias.
- Memory search in Settings UI doesn't pass workspaceId, so it searches all memories.
  This is intentional — the settings panel should show everything.
