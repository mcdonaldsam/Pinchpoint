# Icarus Integration into Arete — Options Analysis

## Current State

### Arete (Desktop Workspace)
- **Runtime**: Electron (Node.js main process + Chromium renderer)
- **IPC**: `contextBridge` with typed API (`preload/index.ts` → `ipcRenderer.invoke`)
- **Document flow**: Open → Parse (.docx via jszip) → View (Monaco/DocxViewer) → AI Patches → Apply/Save/Export
- **Existing channels**: `docx:generate-patches`, `docx:apply-patches`, `file:show-save-dialog`
- **MCP planned**: 26 built-in servers including Outlook & Gmail (milestone 9)

### Icarus (Digital Stamp System)
- **Signing**: RSA-2048 PKCS1-SHA256 via Windows TPM
- **Native Host**: C# .NET 8 AOT exe, Chrome Native Messaging protocol (4-byte length prefix + JSON over stdin/stdout)
- **Actions**: `sign` (raw data → signature), `authenticate` (challenge-response), `getPublicKey`, `status`
- **Backend**: Supabase (public key registry, stamp records, verification)
- **Platforms**: Chrome Extension (Gmail), Outlook Plugin, iOS Hub App

---

## Integration Goal

Add a "Stamp" or "Sign" button to Arete that:
1. Takes the current document content (or selected text)
2. Signs it with the user's TPM-backed key
3. Registers the stamp in Supabase
4. Embeds or attaches stamp metadata to the document
5. Allows recipients to verify the stamp

---

## Option 1: Spawn Native Host Directly (Recommended)

**How it works**: Arete's main process spawns `IcarusTPMHost.exe` via `child_process.spawn()`, communicating over the same stdin/stdout protocol the Chrome extension uses.

```
Renderer (Stamp button)
  → IPC → Main Process
  → child_process.spawn("IcarusTPMHost.exe")
  → stdin/stdout (4-byte length + JSON)
  → TPM signs data
  → Response back through same pipe
  → Main process registers stamp in Supabase
  → Returns stamp metadata to renderer
```

### Implementation

**Main process** (`src/main/stamp/tpm-bridge.ts`):
```typescript
import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'

class TPMBridge {
  private process: ChildProcess | null = null

  async connect(): Promise<void> {
    const hostPath = join(
      process.env.LOCALAPPDATA!, 'IcarusTPM', 'IcarusTPMHost.exe'
    )
    this.process = spawn(hostPath, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    // Same 4-byte length + JSON protocol as Chrome Native Messaging
  }

  async sign(data: string): Promise<SignResponse> {
    return this.sendMessage({ action: 'sign', data })
  }
}
```

**Preload** (add to `preload/index.ts`):
```typescript
stampDocument: (req: StampRequest) => ipcRenderer.invoke('stamp:sign-document', req),
verifyStamp: (req: VerifyRequest) => ipcRenderer.invoke('stamp:verify', req),
getStampStatus: () => ipcRenderer.invoke('stamp:status'),
```

### Pros
- **Zero new dependencies** — reuses existing `IcarusTPMHost.exe` binary
- **Same protocol** — Chrome Native Messaging protocol is simple (4-byte length + JSON)
- **Already installed** — if user has Icarus Chrome extension, the host is already at `%LOCALAPPDATA%\IcarusTPM\`
- **Same TPM key** — stamps from Arete and Gmail use the same device key
- **Fastest to implement** — ~2-3 files to add in Arete

### Cons
- **Windows only** — TPM host is Windows-specific (.NET AOT)
- **Requires Icarus installed** — user needs to run installer first
- **Extension ID validation** — host validates `extensionId` field; need to either skip it for Arete or add Arete's identifier to config

### Effort: Small (1 new service file + IPC handlers + UI button)

---

## Option 2: Node.js Crypto with Windows Certificate Store

**How it works**: Instead of spawning the C# host, use Node.js native crypto to access the same TPM-backed certificate directly.

```
Renderer (Stamp button)
  → IPC → Main Process
  → Node.js crypto.sign() with Windows cert store
  → TPM signs data (via Windows CNG)
  → Main process registers stamp in Supabase
```

### Implementation

```typescript
import { createSign } from 'crypto'
// Node.js can access Windows cert store via engine:
// However, Node's built-in crypto does NOT support Windows Certificate Store directly
// Would need: node-windows-certificate or similar native addon
```

### Pros
- **No external process** — everything in-process
- **Faster** — no spawn/pipe overhead

### Cons
- **Node.js can't access Windows cert store natively** — requires native addon (C++ NAPI)
- **Custom native module** — need to build/maintain a C++ addon for Windows CNG/cert store access
- **Different key path** — might not use the same certificate as Icarus unless carefully configured
- **Significant effort** — building a native Node.js module for Windows TPM

### Effort: Large (custom native Node.js addon)

---

## Option 3: .NET Interop via edge.js / edge-js

**How it works**: Call the Icarus signing logic directly from Node.js using edge.js, which lets you run .NET code inline.

```
Renderer → IPC → Main Process → edge.js → .NET CLR → TPM cert → Sign
```

### Pros
- **In-process** — no separate executable to manage
- **Full .NET access** — can reuse all Icarus signing logic

### Cons
- **edge.js is unmaintained** — last major update was years ago, compatibility issues with newer Electron/Node versions
- **Bundles .NET runtime** — adds ~60MB+ to Arete's install size
- **Fragile** — .NET/Node interop is notoriously finicky in Electron
- **AOT incompatible** — Icarus host is compiled as Native AOT, not regular .NET

### Effort: Medium-Large (risky due to compatibility)

---

## Option 4: Local HTTP Bridge

**How it works**: Run a small HTTP server alongside (or within) the Icarus native host that Arete can call via `fetch()`.

```
Renderer → IPC → Main Process → fetch("http://localhost:PORT/sign") → TPM Host → Sign
```

### Pros
- **Language-agnostic** — any process can call HTTP
- **Easy to implement** — standard REST API
- **Could serve Chrome extension too** — replace native messaging with HTTP

### Cons
- **Security risk** — localhost HTTP can be called by any local process/webpage
- **Port management** — need to pick a port, handle conflicts
- **Requires modifying Icarus** — native host doesn't currently have HTTP server
- **Firewall issues** — some enterprise environments block localhost listeners

### Effort: Medium (modify Icarus host + add HTTP server)

---

## Option 5: Supabase-Only (Verification Only)

**How it works**: Arete doesn't sign documents itself — it only verifies stamps created elsewhere. Signing happens in Chrome extension or Outlook plugin.

```
Document with stamp → Arete reads stamp metadata → Fetches public key from Supabase → Verifies signature locally
```

### Pros
- **Zero Icarus dependency** — just needs Supabase API access
- **Cross-platform** — verification works on any OS
- **Simplest implementation** — just HTTP calls + crypto.verify()

### Cons
- **No signing from Arete** — users must sign in Chrome/Outlook first, then open in Arete
- **Limited value** — Arete becomes a viewer, not a stamping tool
- **Awkward workflow** — "go to Gmail to stamp your document, then come back"

### Effort: Small (but limited functionality)

---

## Recommendation

**Option 1 (Spawn Native Host)** is the clear winner:

| Criteria | Opt 1 | Opt 2 | Opt 3 | Opt 4 | Opt 5 |
|----------|-------|-------|-------|-------|-------|
| Implementation effort | Small | Large | Med-Large | Medium | Small |
| Reuses existing Icarus | Full | Partial | Partial | Requires mods | Verify only |
| Same TPM key | Yes | Maybe | Yes | Yes | N/A |
| Reliability | High | Unknown | Low | Medium | High |
| Cross-platform | No (Win) | No (Win) | No (Win) | No (Win) | Yes |
| No new dependencies | Yes | No (NAPI) | No (edge.js) | No (HTTP mod) | Yes |

**Why Option 1:**
1. The protocol is trivial — 4 bytes (length) + JSON. Can implement in ~50 lines of TypeScript.
2. The host binary already exists and is installed.
3. Uses the exact same TPM key, so stamps from Arete and Gmail are from the same identity.
4. Only change needed: make the host accept connections without `extensionId` validation (or add an "Arete" app ID to config).

### Hybrid Approach

Combine Option 1 + Option 5:
- **Option 1** for signing (when on Windows with Icarus installed)
- **Option 5** for verification (always available, any platform)
- Graceful degradation: if host isn't installed, show "Install Icarus to enable document stamping" prompt

---

## Where It Lives in the UI

### Option A: Document Toolbar Button
When viewing/editing a .docx, add a "Stamp" button to the document toolbar (next to existing edit/save controls).

```
[Edit] [Save] [Export] [🔏 Stamp]
```

- Click → hashes document content → signs via TPM → registers in Supabase
- Stamp metadata embedded in .docx custom properties (XML)
- Verification badge shown in document header

### Option B: Right-Click Context Menu
Right-click a file in the file explorer → "Stamp with Icarus"

### Option C: Export-Time Stamping
When exporting/saving a document, option to "Stamp on export" — auto-signs the final version.

### Option D: Chat Integration
In AI chat, after generating content: "Stamp this response" — signs the AI output for provenance tracking.

### Verification Display
When opening a stamped document:
```
┌─────────────────────────────────────────┐
│ ✓ Stamped by Sam M. on Device "Desktop" │
│   Jan 15, 2026 at 2:34 PM              │
│   Verified via Icarus • Document ID: abc123 │
└─────────────────────────────────────────┘
```

---

## Technical Integration Points

### 1. IPC Channels to Add

```typescript
// preload/index.ts
stampDocument: (req: StampDocumentRequest) => ipcRenderer.invoke('stamp:sign-document', req),
verifyStamp: (req: VerifyStampRequest) => ipcRenderer.invoke('stamp:verify', req),
getStampStatus: () => ipcRenderer.invoke('stamp:get-status'),
isIcarusInstalled: () => ipcRenderer.invoke('stamp:is-installed'),
```

### 2. Supabase Integration

Arete already plans MCP servers. The Supabase connection for stamp registration can either:
- Use the existing Supabase MCP server (if generic enough)
- Use direct `@supabase/supabase-js` client (simpler, more reliable)

### 3. .docx Stamp Embedding

Store stamp in .docx custom XML part:
```xml
<icarus:stamp>
  <icarus:documentId>abc-123</icarus:documentId>
  <icarus:signature>base64url...</icarus:signature>
  <icarus:publicKeyId>key-456</icarus:publicKeyId>
  <icarus:algorithm>RSA-PKCS1-SHA256</icarus:algorithm>
  <icarus:timestamp>2026-01-15T14:34:00Z</icarus:timestamp>
  <icarus:contentHash>sha256-hash-of-content</icarus:contentHash>
</icarus:stamp>
```

This is stored as a Custom XML Part in the .docx ZIP, which Word and other readers ignore but Arete can detect and verify.

### 4. PDF Stamp Embedding

For PDF documents, stamp metadata can be stored in PDF metadata/XMP or as a digital signature using the PDF signature standard (though TPM-backed PDF signing is more complex — may want to just store stamp as metadata + verify via Supabase lookup).
