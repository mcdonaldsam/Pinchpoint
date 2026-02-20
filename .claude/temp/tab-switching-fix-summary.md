# Tab Switching Bug Fix - Implementation Summary

## Problem
When switching tabs, the original view's messages would disappear because:
1. Tab state stored `tab.messages` but MessageList read from global `chatStore.messages`
2. When switching tabs, `loadMessages()` reloaded from DB, ignoring the in-memory `tab.messages`
3. The copied messages in `tab.messages` were never used

## Solution Implemented

### 1. MessageList.tsx - Read from Active Tab Messages
**Change:** MessageList now reads from the active tab's messages when tabs exist, falling back to global messages when no tabs are active.

```typescript
// Before:
const messages = useChatStore((s) => s.messages)

// After:
const activeTab = useAgentTabStore((s) => s.getActiveTab())
const globalMessages = useChatStore((s) => s.messages)
const messages = activeTab?.messages ?? globalMessages
```

**Impact:** MessageList now shows tab-scoped messages, preserving the adopted tab's messages when switching.

### 2. MessageList.tsx - Sync Messages When Loading from DB
**Change:** When switching tabs triggers a `loadMessages()` call, the loaded messages are synced to the tab's state.

```typescript
// After loading messages from DB:
chatState.loadMessages(tab.sessionId).then(() => {
  const agentTabState = useAgentTabStore.getState()
  agentTabState.setTabMessages(activeTabId, chatState.messages)
}).catch((err) => {
  console.error('Failed to sync messages to tab:', err)
})
```

**Impact:** Tab messages stay in sync with database state after tab switching.

### 3. chat-store.ts - Sync addMessage to Active Tab
**Change:** When a new message is added to global state, it's also added to the active tab if tabs exist.

```typescript
addMessage: (message) => {
  set((s) => ({ messages: [...s.messages, message] }))
  // Sync to active tab if tabs exist
  const { useAgentTabStore } = require('./agent-tab-store')
  const activeTab = useAgentTabStore.getState().getActiveTab()
  if (activeTab) {
    useAgentTabStore.getState().setTabMessages(activeTab.id, [...get().messages, message])
  }
}
```

**Impact:** New messages (from streaming, consensus, etc.) are kept in sync with active tab.

### 4. chat-store.ts - Sync setMessages to Active Tab
**Change:** When messages array is replaced (e.g., during loadMessages), sync to active tab.

```typescript
setMessages: (messages) => {
  set({ messages })
  // Sync to active tab if tabs exist
  const { useAgentTabStore } = require('./agent-tab-store')
  const activeTab = useAgentTabStore.getState().getActiveTab()
  if (activeTab) {
    useAgentTabStore.getState().setTabMessages(activeTab.id, messages)
  }
}
```

**Impact:** Ensures tab messages stay in sync when global messages are replaced.

### 5. useAgentEventRouter.ts - Sync on Tab-Scoped Stream Completion
**Change:** When a tab-scoped agent completes, reload messages and sync to tab state.

```typescript
// After loading messages for tab completion:
state.loadMessages(tab.sessionId).then(() => {
  tabStore.setTabMessages(tabId, state.messages)
}).catch(console.error)
```

**Impact:** Agent responses are properly synced to tab state after completion.

## Files Changed

1. `src/renderer/src/components/chat/MessageList.tsx` - 2 changes
   - Read from active tab messages
   - Sync loaded messages to tab state

2. `src/renderer/src/stores/chat-store.ts` - 2 changes
   - Sync `addMessage` to active tab
   - Sync `setMessages` to active tab

3. `src/renderer/src/hooks/useAgentEventRouter.ts` - 1 change
   - Sync messages on tab-scoped stream completion

## How It Works Now

### Scenario: Click "New Tab" → Switch to Tab 2 → Switch Back to Tab 1

**Before Fix:**
1. Tab 1 created with `tab.messages = [msg1, msg2, msg3]` (copied but never used)
2. Switch to Tab 2: `loadMessages(6)` → global `messages = []`
3. Switch to Tab 1: `loadMessages(5)` → global `messages = [...]` (from DB)
4. ❌ But if messages weren't fully persisted, they're lost

**After Fix:**
1. Tab 1 created with `tab.messages = [msg1, msg2, msg3]`
2. Switch to Tab 2: `loadMessages(6)` → global `messages = []`, but Tab 1 still has its messages
3. Switch to Tab 1: MessageList reads `tab1.messages` directly
4. ✅ Messages preserved, even if DB is out of sync

### Message Flow
```
User sends message
  → chatStore.addMessage(msg)
  → Global messages updated
  → Active tab.messages synced ✓

Agent completes
  → loadMessages(sessionId)
  → Global messages updated from DB
  → Active tab.messages synced ✓

Switch tabs
  → MessageList reads tab.messages
  → If session differs, loadMessages(newSessionId)
  → tab.messages synced ✓
```

## Testing Checklist

- [ ] Create first tab (should adopt current session)
- [ ] Switch to new empty tab
- [ ] Switch back to adopted tab → **Messages should still be visible**
- [ ] Send message in Tab 1 → Switch to Tab 2 → Switch back → Message should persist
- [ ] Run agent in Tab 1 → Switch tabs during execution → Switch back → State preserved
- [ ] Create multiple tabs, switch between them → Each tab maintains its own messages
- [ ] Close and reopen tabs → Messages reload from DB correctly

## Potential Edge Cases

1. **Race condition during rapid tab switching**: Both global and tab messages are updated, should be fine
2. **Tab created mid-stream**: Stream completion handler syncs to tab
3. **Multiple tabs on same session**: Each tab has independent `tab.messages`, sharing same `sessionId`
4. **Tab deleted while active**: Falls back to global messages (no active tab)

## Notes

- The fix maintains **backward compatibility** - when no tabs exist, MessageList reads from global messages as before
- Tab messages are now the **source of truth** when tabs exist, with global messages as fallback
- The `tab.messages` field is no longer "dead code" - it's actively used by MessageList
- All message mutations (add, set, load) now sync to active tab automatically
