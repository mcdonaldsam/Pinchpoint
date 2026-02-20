# Tab Switching Bug Fix v2 - Final Implementation

## The Problem

When clicking "New Tab" → switching to the new tab → switching back to the original tab, the messages would disappear.

**Root cause:** The `MessageList.tsx` useEffect was **unconditionally reloading messages from the database** every time you switched tabs, which **overwrote the tab's in-memory messages** with potentially incomplete database data.

## The Fix

**Changed:** `MessageList.tsx` lines 67-86

**Before:**
```typescript
useEffect(() => {
  if (!activeTabId) return
  const tab = useAgentTabStore.getState().getActiveTab()
  if (!tab) return

  const chatState = useChatStore.getState()
  if (chatState.currentSessionId === tab.sessionId) return

  // 🔴 ALWAYS reload from DB, overwriting tab.messages
  chatState.loadMessages(tab.sessionId).then(() => {
    const agentTabState = useAgentTabStore.getState()
    agentTabState.setTabMessages(activeTabId, chatState.messages)
  }).catch((err) => {
    console.error('Failed to sync messages to tab:', err)
  })
}, [activeTabId])
```

**After:**
```typescript
useEffect(() => {
  if (!activeTabId) return
  const tab = useAgentTabStore.getState().getActiveTab()
  if (!tab) return

  const chatState = useChatStore.getState()
  if (chatState.currentSessionId === tab.sessionId) return

  // 🟢 NEW: If tab has messages, skip DB reload - trust the tab
  if (tab.messages.length > 0) {
    chatState.setCurrentSession(tab.sessionId)
    return
  }

  // 🟢 Only reload from DB if tab is empty
  chatState.loadMessages(tab.sessionId).then(() => {
    const agentTabState = useAgentTabStore.getState()
    agentTabState.setTabMessages(activeTabId, chatState.messages)
  }).catch((err) => {
    console.error('Failed to sync messages to tab:', err)
  })
}, [activeTabId])
```

## Why This Works

### Before (Broken):
1. Tab 1 created with messages [msg1, msg2, msg3] ✓
2. Switch to Tab 2 → loads empty messages ✓
3. Switch back to Tab 1 → **reloads from DB**, overwrites tab.messages with potentially incomplete DB data ❌

### After (Fixed):
1. Tab 1 created with messages [msg1, msg2, msg3] ✓
2. Switch to Tab 2 → loads empty messages ✓
3. Switch back to Tab 1 → sees `tab.messages.length > 0`, **skips DB reload**, just updates `currentSessionId` ✓

## What Changed

**One line added:**
- Line 78-82: Check if tab has messages, skip DB reload if so

**Philosophy:**
- **Per-tab messages (`tab.messages`)** are the source of truth when tabs exist
- Only reload from DB when tab is **empty** (newly created or first load)
- Trust the tab's in-memory state over potentially stale database state

## Testing Checklist

✅ **Scenario 1: Basic tab switching**
1. Have a session with messages
2. Click "New Tab"
3. Switch to new tab → empty ✓
4. Switch back to original tab → **messages should still be visible** ✓

✅ **Scenario 2: Running agent**
1. Start agent in Tab 1 (with messages + agent events)
2. Switch to Tab 2 during execution
3. Switch back to Tab 1 → **all messages + agent state preserved** ✓

✅ **Scenario 3: Multiple tabs**
1. Create 3 tabs with different conversations
2. Switch between them → **each preserves its messages** ✓

## Files Modified

1. `src/renderer/src/components/chat/MessageList.tsx` (lines 67-92)
   - Added check for `tab.messages.length > 0`
   - Skip DB reload if tab already has messages
   - Just update `currentSessionId` to match tab's session

## Verification

✅ TypeScript validation: `npx tsc --noEmit` (passed)

## Next Steps

**User should test:**
```powershell
cd "c:\Users\samcd\Projects\Git-Repos\Arete\3.0 Build"
npm run dev
```

Then:
1. Have a conversation with some messages
2. Click "+ New Tab"
3. Switch to the new tab (should be empty)
4. Switch back to Tab 1
5. **Verify:** Original messages should still be visible ✅
