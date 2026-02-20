# Agent Settings UI Redesign Proposal

## Current Problems

### Layout Issues
- **Horizontal sprawl**: 3 main cards spread across full width → wastes vertical space
- **Action Log**: Takes up 50%+ of vertical space, often empty
- **Inconsistent**: Memory/RAG settings are more sophisticated, Agent settings feels bare

### Missing Functionality
Agent Settings only shows:
- YOLO Mode toggle
- Auto-Approve (Low/Medium risk toggles)
- Max Iterations slider

But there are many agent-related settings not exposed:
- Which AI model/provider to use for agent
- Narration/verbosity settings
- Memory integration toggle
- RAG integration toggle
- Tool permissions (which tools are enabled/disabled)
- Shell environment settings
- Resource limits (timeout, rate limiting)

### User Feedback
> "UI - agent mode settings can we have the three main ones stacked on top of each other taking up 1/3 of the space then why do we have the action log?"

Clear ask: **stack vertically** + **remove/relocate Action Log**

---

## Design Option A: Simple Stack (Recommended)

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ Agent Settings                          [Toggle: ON/OFF]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ⚡ YOLO Mode                           [Toggle]   │  │
│  │ Auto-approve all tools including bash              │  │
│  │ ⚠️ Use at your own risk                            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🛡️ Auto-Approve                                    │  │
│  │ Low risk                              [Toggle]     │  │
│  │ Medium risk                           [Toggle]     │  │
│  │ High risk always requires approval                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🖥️ Max Iterations                            10    │  │
│  │ ━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │  │
│  │ Tool-call loops before stopping (1-25)             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🤖 Agent Model                                     │  │
│  │ Provider: [Claude ▼]  Model: [Sonnet 4.5 ▼]      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🧠 Context Integration                             │  │
│  │ Memory injection                      [Toggle: ON]│  │
│  │ RAG retrieval                         [Toggle: ON]│  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Key Changes
1. **Vertical stack**: All cards stacked vertically, narrower (max 600px)
2. **Action Log removed**: Move to Chat view or dedicated History panel
3. **New sections added**:
   - Agent Model selector
   - Context Integration toggles (Memory, RAG)
4. **Clean, scannable**: Easy to see all settings at once

### Benefits
- ✅ Addresses user request directly
- ✅ More compact, less scrolling
- ✅ Room to add more settings
- ✅ Simple to implement

---

## Design Option B: Split Layout (Advanced)

### Layout (Similar to Memory Settings)

```
┌──────────────────────┬─────────────────────────────────────┐
│ Categories           │ Details                             │
├──────────────────────┼─────────────────────────────────────┤
│ [🛡️ Permissions]*    │ ⚡ YOLO Mode          [Toggle]     │
│  [⚙️ Performance]     │ Auto-approve all tools              │
│  [🧠 Context]         │ ⚠️ Use at your own risk             │
│  [🔧 Tools]           │                                     │
│  [📋 History]         │ ─────────────────────────────────   │
│                       │                                     │
│                       │ 🛡️ Auto-Approve                     │
│                       │ Low risk              [Toggle: ON] │
│                       │ Medium risk           [Toggle: OFF]│
│                       │ High risk always requires approval  │
│                       │                                     │
└──────────────────────┴─────────────────────────────────────┘
```

### Categories

#### 1. **Permissions** (Default selected)
- YOLO Mode toggle
- Auto-Approve (Low/Medium/High)
- Dangerous commands blocklist

#### 2. **Performance**
- Max Iterations slider
- Agent timeout settings
- Concurrency limits (for parallel agents)
- Rate limiting

#### 3. **Context**
- Agent Model selector (Provider + Model)
- Memory injection toggle
- RAG retrieval toggle
- Narration/verbosity settings

#### 4. **Tools**
- List of all 9 tools with enable/disable toggles
  - ✓ bash (High risk)
  - ✓ read-file (Low risk)
  - ✓ write-file (Medium risk)
  - ✓ edit-file (Medium risk)
  - ✓ list-dir (Low risk)
  - ✓ glob (Low risk)
  - ✓ search (Low risk)
  - ✓ web-search (Low risk)
  - ✓ memory (Low risk)

#### 5. **History** (Action Log)
- Move Action Log here
- Add filters by risk tier, tool, date
- Export functionality

### Benefits
- ✅ Much more comprehensive
- ✅ Scales well with more settings
- ✅ Consistent with Memory Settings pattern
- ✅ Better organization by concern

### Drawbacks
- ⚠️ More complex to implement
- ⚠️ Might be overkill for current feature set
- ⚠️ Takes more horizontal space

---

## Recommendation: Start with Option A

### Rationale
1. **User asked for simple**: "stack on top of each other taking up 1/3 of the space"
2. **Quick win**: Can implement immediately, addresses pain points
3. **Iterative**: Can evolve to Option B later if needed
4. **Consistent enough**: Still matches overall app aesthetic

### Implementation Priority (Option A)

#### Phase 1: Core Layout Changes
1. Change grid-cols-3 → vertical stack (max-w-2xl)
2. Remove Action Log from settings
3. Update card padding/margins for vertical layout

#### Phase 2: Add Missing Settings
4. Add Agent Model selector (provider + model dropdowns)
5. Add Context Integration card (Memory toggle, RAG toggle)
6. Add Narration/Verbosity settings

#### Phase 3: Polish
7. Consider adding Tool Permissions panel (list of tools with risk indicators)
8. Add tooltips with more info
9. Add "Learn More" links to docs

---

## Code Changes Needed (Option A)

### 1. AgentSettings.tsx Layout
```tsx
// Replace grid-cols-3 with vertical stack
<div className="space-y-4 max-w-2xl">
  {/* YOLO Mode */}
  <div className={...}>...</div>

  {/* Auto-Approve */}
  <div className={...}>...</div>

  {/* Max Iterations */}
  <div className={...}>...</div>

  {/* NEW: Agent Model */}
  <div className="rounded-lg border border-border bg-surface-alt/50 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Bot size={14} />
      <div className="text-sm font-medium text-text-secondary">Agent Model</div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-text-muted mb-1.5 block">Provider</label>
        <select className="w-full px-2.5 py-1.5 bg-surface-raised border border-border-strong rounded text-xs">
          <option>Claude</option>
          <option>OpenAI</option>
          <option>Google</option>
          {/* ... */}
        </select>
      </div>
      <div>
        <label className="text-xs text-text-muted mb-1.5 block">Model</label>
        <select className="w-full px-2.5 py-1.5 bg-surface-raised border border-border-strong rounded text-xs">
          <option>Sonnet 4.5</option>
          <option>GPT-4o</option>
          {/* ... */}
        </select>
      </div>
    </div>
  </div>

  {/* NEW: Context Integration */}
  <div className="rounded-lg border border-border bg-surface-alt/50 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Brain size={14} />
      <div className="text-sm font-medium text-text-secondary">Context Integration</div>
    </div>
    <div className="space-y-2">
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs text-text-muted">Memory injection</span>
        <button className="relative w-8 h-4 rounded-full bg-accent">
          {/* toggle */}
        </button>
      </label>
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs text-text-muted">RAG retrieval</span>
        <button className="relative w-8 h-4 rounded-full bg-accent">
          {/* toggle */}
        </button>
      </label>
    </div>
  </div>
</div>

{/* Action Log removed - relocate to chat view or separate panel */}
```

### 2. Store Changes (agent-store.ts)
```typescript
interface AgentState {
  // ... existing ...

  // NEW: Agent model settings
  agentProvider: string | null
  agentModel: string | null

  // NEW: Context integration
  memoryEnabled: boolean
  ragEnabled: boolean
  narrationEnabled: boolean

  // Actions
  setAgentModel: (provider: string, model: string) => void
  setMemoryEnabled: (enabled: boolean) => void
  setRagEnabled: (enabled: boolean) => void
  setNarrationEnabled: (enabled: boolean) => void
}
```

### 3. Backend Integration
- Store agent model preference
- Store memory/RAG integration preferences
- Update orchestrator to use these preferences

---

## Action Log Relocation Options

### Option 1: Chat View Expansion Panel
- Add expandable "Agent Activity" panel below chat
- Shows Action Log when agent is running
- Collapses when idle

### Option 2: Dedicated History Tab
- Add "Agent History" tab in sidebar
- Full-featured log viewer with filters
- Export functionality

### Option 3: Modal/Dialog
- "View Activity Log" button in Agent Settings
- Opens modal with full Action Log
- More detail than settings panel allows

**Recommendation**: Option 1 (Chat View Expansion) — most contextually relevant

---

## Visual Mockup Comparison

### Before (Current)
```
┌─────────────────────────────────────────────────────────┐
│ [  YOLO Mode  ] [  Auto-Approve  ] [ Max Iterations ]  │  ← Horizontal
├─────────────────────────────────────────────────────────┤
│                                                           │
│                    Action Log                            │  ← Takes 50%
│           No agent actions recorded yet.                 │    of space
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### After (Option A)
```
┌────────────────────────────┐
│ [ YOLO Mode            ]  │  ← Stacked
│ [ Auto-Approve         ]  │     vertically
│ [ Max Iterations       ]  │
│ [ Agent Model          ]  │  ← New
│ [ Context Integration  ]  │  ← New
└────────────────────────────┘
```

Much more compact and scannable!

---

## Next Steps

1. **Get user approval** on Option A vs Option B
2. **Implement Phase 1** (layout changes, remove Action Log)
3. **Add missing settings** (Phase 2)
4. **Relocate Action Log** to Chat View
5. **Test and iterate**

## Questions for User

1. Option A (simple stack) or Option B (split layout with categories)?
2. Where should Action Log be relocated? (Chat view, dedicated tab, modal)
3. Which additional settings are most important to expose?
   - Agent Model selector?
   - Memory/RAG integration toggles?
   - Tool permissions?
   - Narration settings?
4. Should we keep the existing SettingsView left sidebar pattern or make Agent Settings self-contained?
