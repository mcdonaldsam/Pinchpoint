# Tab Switching Bug - Root Cause Analysis

## Bug Description
When clicking "New Tab" → switching to the new tab → switching back to the original tab, the original view (messages) disappears and shows "Where should we begin?" screen instead.

## Root Cause

**The tab system has a critical design flaw:**

1. **agent-tab-store.ts** stores messages PER TAB:
   - Each `AgentTab` has `messages: ChatMessage[]` field (line 25)
   - When adopting current session as Tab 1, it copies messages: `adoptedTab.messages = chatState.messages` (line 131)

2. **MessageList.tsx** reads from GLOBAL chat store, NOT from tab state:
   ```typescript
   const messages = useChatStore((s) => s.messages)  // Line 26 — GLOBAL store
   ```

3. **When switching tabs**, MessageList's useEffect (lines 64-75) calls:
   ```typescript
   chatState.loadMessages(tab.sessionId)  // Loads from DB, ignores tab.messages!
   ```

4. **The problem flow:**
   - Tab 1 (adopted): `tab.messages = [msg1, msg2, msg3]` (in memory)
   - Tab 2 (new): Empty session
   - Switch to Tab 2: `loadMessages(6)` → global `messages = []`
   - Switch to Tab 1: `loadMessages(5)` → loads from DB
   - **If messages weren't persisted to DB yet, OR if DB has fewer messages than in-memory state, they're lost!**

5. **Why the adopted tab messages are lost:**
   - The `tab.messages` field is populated but **NEVER READ** by MessageList
   - MessageList always reads from global `chatStore.messages`
   - When switching tabs, it reloads from DB via `loadMessages()`
   - The in-memory messages that were copied to `tab.messages` are ignored

## Evidence

**agent-tab-store.ts:131** — Messages are copied to tab state:
```typescript
adoptedTab.messages = chatState.messages  // Copied but never used!
```

**MessageList.tsx:26** — Reads from global store:
```typescript
const messages = useChatStore((s) => s.messages)  // Should read from active tab!
```

**MessageList.tsx:74** — Reloads from DB, ignoring tab.messages:
```typescript
chatState.loadMessages(tab.sessionId)  // Ignores adoptedTab.messages!
```

## The Fix

**Option 1: Use tab messages instead of global messages (recommended)**

MessageList should check if there's an active tab and use its messages:

```typescript
// MessageList.tsx
const activeTab = useAgentTabStore((s) => s.getActiveTab())
const globalMessages = useChatStore((s) => s.messages)

// Use tab messages if tab exists, otherwise use global messages
const messages = activeTab ? activeTab.messages : globalMessages
```

Then when switching tabs, update the tab's messages instead of global:

```typescript
// MessageList.tsx useEffect
useEffect(() => {
  if (!activeTabId) return
  const tab = useAgentTabStore.getState().getActiveTab()
  if (!tab) return

  const chatState = useChatStore.getState()
  if (chatState.currentSessionId === tab.sessionId) return

  // Load messages and update BOTH global and tab state
  chatState.loadMessages(tab.sessionId).then(() => {
    const messages = chatState.messages
    useAgentTabStore.getState().setTabMessages(tab.id, messages)
  })
}, [activeTabId])
```

**Option 2: Remove tab.messages field (simpler but loses tab-scoped state)**

If tabs always reload from DB, remove the `messages` field from `AgentTab` since it's not being used.

## Additional Issues Found

1. **ChatView conditional rendering** (line 64) hides MessageList when `messages.length === 0`:
   ```typescript
   {currentSessionId && hasMessages ? <MessageList /> : <div>Where should we begin?</div>}
   ```
   This causes the empty screen when messages haven't loaded yet.

2. **loadMessages is async** — there's a brief moment where messages = [] before the load completes, which triggers the wrong view to show.

3. **No loading state** — user sees "Where should we begin?" during the async load, which looks like messages are gone.

## Recommended Fix Strategy

1. Make MessageList read from active tab messages when tab exists
2. Keep tab messages in sync with global messages (or eliminate global messages in tab mode)
3. Add a loading state to prevent showing "Where should we begin?" during async loads
4. Consider: should tabs have independent message state, or should they all share global state?
