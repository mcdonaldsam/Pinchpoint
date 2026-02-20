# Tab Switching Bug - Root Cause Analysis v2

## The Bug (Verified)

When you have a running session with messages, then click "New Tab" → switch to new tab → switch back to original tab, the messages disappear.

## The Root Cause

**The problem is in MessageList.tsx useEffect (lines 69-86).**

When switching tabs, we **unconditionally reload messages from the database**, which **overwrites** the tab's in-memory messages with potentially stale/incomplete database data.

### Step-by-Step Flow

**Initial State:**
- No tabs yet
- Session 5 active with messages [msg1, msg2, msg3] in global `chatStore.messages`

**1. User clicks "New Tab"**

agent-tab-store.ts `createTab()` runs:
```typescript
// Line 120: First tab? Adopt current session
if (tabs.length === 0) {
  adoptedTab = createEmptyTab(uuid, 5, "Chat 1")
  adoptedTab.messages = chatState.messages  // [msg1, msg2, msg3] ✓
}

// Line 135: Create new empty tab
newTab = createEmptyTab(uuid2, 6)  // Empty session

// Line 141: Keep adopted tab active
activeId = adoptedTab.id

// Result: Two tabs created, Tab 1 stays active
tabs = [
  Tab1 (sessionId=5, messages=[msg1,msg2,msg3]),
  Tab2 (sessionId=6, messages=[])
]
activeTabId = Tab1.id
```

**2. User switches to Tab 2**

- `setActiveTab(Tab2.id)` updates `activeTabId = Tab2.id`
- MessageList useEffect triggers:
  ```typescript
  // Line 77: Sessions differ
  if (chatState.currentSessionId !== tab.sessionId)  // 5 !== 6

  // Line 80: Load messages from DB for session 6
  loadMessages(6)  // Loads empty messages

  // Global state updated:
  currentSessionId = 6
  messages = []
  ```

**3. User switches back to Tab 1 — THIS IS WHERE THE BUG HAPPENS**

- `setActiveTab(Tab1.id)` updates `activeTabId = Tab1.id`
- **First render**: MessageList shows `Tab1.messages = [msg1,msg2,msg3]` ✓ (messages are visible!)
- **Then useEffect runs:**
  ```typescript
  // Line 77: Sessions differ again
  if (chatState.currentSessionId !== tab.sessionId)  // 6 !== 5

  // Line 80: 🔴 UNCONDITIONALLY reload from DB 🔴
  loadMessages(5)

  // This overwrites global messages with DB data
  // Then line 82: setTabMessages(Tab1.id, chatState.messages)
  // 🔴 This OVERWRITES Tab1.messages with DB data 🔴
  ```

## Why This Causes Lost Messages

The database might not have all the messages that were in memory:

1. **Optimistic user messages** - added to UI before DB confirmation
2. **Streaming messages** - shown in UI before finalization
3. **Recent messages** - added to UI but not yet persisted

When we reload from DB, we replace the tab's **complete in-memory state** with potentially **incomplete database state**.

## The Architectural Flaw

We're maintaining dual sources of truth:
- `tab.messages` - supposed to be the per-tab source of truth
- `chatStore.messages` - global state

But then we **unconditionally overwrite** `tab.messages` with DB data every time we switch, which defeats the entire purpose of having per-tab message storage!

## The Fix

**Only reload from DB if the tab is empty. If the tab has messages, trust them.**

```typescript
useEffect(() => {
  if (!activeTabId) return
  const tab = useAgentTabStore.getState().getActiveTab()
  if (!tab) return

  const chatState = useChatStore.getState()
  // Already showing this tab's session — skip
  if (chatState.currentSessionId === tab.sessionId) return

  // 🟢 NEW: If tab already has messages, just update currentSessionId
  // Don't reload from DB - tab messages are the source of truth
  if (tab.messages.length > 0) {
    chatState.setCurrentSession(tab.sessionId)
    return
  }

  // Tab is empty, load from DB and sync to tab
  chatState.loadMessages(tab.sessionId).then(() => {
    const agentTabState = useAgentTabStore.getState()
    agentTabState.setTabMessages(activeTabId, chatState.messages)
  }).catch((err) => {
    console.error('Failed to sync messages to tab:', err)
  })
}, [activeTabId])
```

### Why This Works

1. **First tab creation**: Tab 1 gets `messages = [msg1,msg2,msg3]` ✓
2. **Switch to Tab 2**: Tab 2 is empty, so we load from DB → empty messages ✓
3. **Switch back to Tab 1**:
   - Tab 1 has `messages.length > 0` → **skip DB reload** ✓
   - Just update `currentSessionId = 5` for sending new messages ✓
   - **Tab 1 keeps its original messages** ✓

## Testing

**Scenario 1: Basic tab switching**
1. Have session with messages
2. Click "New Tab" (creates Tab 1 with current session + Tab 2 empty)
3. Switch to Tab 2 → should be empty ✓
4. Switch back to Tab 1 → **messages should still be visible** ✓

**Scenario 2: Running agent**
1. Start agent in Tab 1 (messages + agent events)
2. Switch to Tab 2 during execution
3. Switch back to Tab 1 → **all messages + agent state preserved** ✓

**Scenario 3: Multiple tabs**
1. Create 3 tabs with different sessions
2. Switch between them → **each preserves its messages** ✓
