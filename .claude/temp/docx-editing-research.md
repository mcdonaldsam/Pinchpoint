# DOCX Editing Research for Arete

> Comprehensive analysis of Word document viewing, editing, and AI integration options

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Requirements](#requirements)
3. [How DOCX Files Work](#how-docx-files-work)
4. [Solution Options Explored](#solution-options-explored)
5. [Track Changes Deep Dive](#track-changes-deep-dive)
6. [Complex Formatting & Round-Trip Fidelity](#complex-formatting--round-trip-fidelity)
7. [Build vs Buy Analysis](#build-vs-buy-analysis)
8. [Recommendations](#recommendations)
9. [Implementation Paths](#implementation-paths)
10. [Resources & Links](#resources--links)

---

## Executive Summary

Arete needs Word document editing with:
- User typing/editing capabilities
- AI-generated edits
- Track changes for both sources
- Nice rendered view
- Complex formatting preservation

**Key Finding:** The hardest part is DOCX import with full fidelity. Export and track changes are manageable. AI integration is straightforward once you have an editor.

**Recommendation:**
- **For existing docs:** Continue with XML patch system (preserves 100% formatting)
- **For new docs/AI drafts:** Build a TipTap editor with track changes
- **If full WYSIWYG required:** License SuperDoc commercial

---

## Requirements

### Core Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| User can type and edit | High | Not just AI - users need to make changes |
| AI can make edits | High | Same mechanism as user edits |
| All changes tracked | High | Both user and AI changes with author attribution |
| Nice rendered view | High | Ideally WYSIWYG, acceptable if read-only render |
| Complex formatting preserved | High | Tables, images, headers, styles must survive |
| Export with track changes | High | Output valid .docx that Word can open |

### Ideal UX (Based on Screenshot Reference)

The target UX shows:
- Original text with deletions highlighted (red/strikethrough)
- New text with insertions highlighted (green)
- Accept/Reject controls for each change
- Clean diff visualization

---

## How DOCX Files Work

### Structure

A `.docx` file is a ZIP archive containing XML files:

```
document.docx (ZIP)
├── [Content_Types].xml        # MIME type mappings
├── _rels/
│   └── .rels                  # Root relationships
├── word/
│   ├── document.xml           # Main document content ← PRIMARY EDIT TARGET
│   ├── styles.xml             # Style definitions
│   ├── numbering.xml          # List/numbering definitions
│   ├── settings.xml           # Document settings
│   ├── fontTable.xml          # Font mappings
│   ├── header1.xml            # Header content (if present)
│   ├── footer1.xml            # Footer content (if present)
│   ├── comments.xml           # Comments (if present)
│   ├── media/                 # Embedded images
│   │   └── image1.png
│   └── _rels/
│       └── document.xml.rels  # Document relationships
└── docProps/
    ├── app.xml                # Application metadata
    └── core.xml               # Core metadata (author, dates)
```

### Key Insight

**When you unpack → edit XML → repack:**
- Everything you don't touch survives perfectly
- Tables, images, headers, footnotes, styles = all preserved
- You're only modifying specific `<w:t>` text nodes

### Text Representation Complexity

Text in Word can be split across multiple runs:

```xml
<!-- "Hello World" might be stored as: -->
<w:p>
  <w:r><w:t>Hel</w:t></w:r>
  <w:r><w:t>lo Wo</w:t></w:r>
  <w:r><w:t>rld</w:t></w:r>
</w:p>
```

This happens due to:
- Spell check boundaries
- Formatting changes mid-word
- Edit history artifacts
- Bookmarks and field codes

**Solution:** The `unpack.py` script merges adjacent runs with identical formatting.

---

## Solution Options Explored

### Option A: XML-Centric Editor (Simple)

```
.docx → Unpack → Monaco XML Editor → Repack → .docx
                      ↓
              Live HTML Preview
```

- User edits raw XML with syntax highlighting
- Side panel shows rendered preview
- Track changes by manually adding XML elements

**Pros:** Full control, perfect formatting preservation
**Cons:** Not user-friendly, requires XML knowledge

---

### Option B: WYSIWYG-ish Editor (Complex)

```
.docx → Unpack → Parse XML → React Components → Edit → Diff → Track Changes → Repack
```

- Render document as editable React components
- Track user edits in memory
- Generate `<w:ins>`/`<w:del>` by diffing original vs edited

**Pros:** Better UX
**Cons:** Massive engineering effort, formatting loss risk

---

### Option C: AI Patch System (Current Arete Approach)

```
.docx → Unpack → Styled HTML View (read-only)
                      ↓
              AI suggests edits → Generate XML patches → Repack
```

- View is rendered HTML (not true WYSIWYG editing)
- AI generates the actual XML modifications
- All changes come through as tracked changes
- User accepts/rejects in the UI

**Pros:** Working now, perfect formatting preservation, AI-native
**Cons:** Users can't type directly in rendered view

---

### Option D: SuperDoc (Open Source)

**Website:** https://www.superdoc.dev/
**GitHub:** https://github.com/superdoc-dev/superdoc

SuperDoc is an open-source DOCX editor with real-time collaboration.

| Aspect | Details |
|--------|---------|
| Track Changes | ✅ Full support - "suggesting" mode auto-tracks |
| Real-time Collab | ✅ Built-in multiplayer editing |
| Framework Support | React, Vue, Vanilla JS |
| Self-hostable | ✅ Yes |
| License | **AGPLv3** (free) or Commercial |
| Import/Export | Preserves Word formatting |

```bash
npm install @harbour-enterprises/superdoc
```

**Pros:** Purpose-built, open source, active development, track changes built-in
**Cons:** AGPLv3 requires open-sourcing your app OR buying commercial license

---

### Option E: ONLYOFFICE DocumentServer

**GitHub:** https://github.com/ONLYOFFICE/DocumentServer
**API Docs:** https://api.onlyoffice.com/

Full Microsoft Office-compatible suite as a Docker container.

| Aspect | Details |
|--------|---------|
| Track Changes | ✅ Full Word-compatible |
| Fidelity | ~99% Word rendering accuracy |
| Architecture | Docker container + iframe embed |
| License | AGPL (Community) or Commercial |

```javascript
new DocsAPI.DocEditor("editor", {
  documentType: "word",
  document: { url: "http://localhost/document.docx" },
  editorConfig: { callbackUrl: "http://your-app/callback" }
});
```

**Pros:** Most complete Word emulation, production-ready, collaborative
**Cons:** Heavyweight (Docker), requires document storage service, AGPL

---

### Option F: Collabora Online (LibreOffice-Based)

**GitHub:** https://github.com/CollaboraOnline/online
**Website:** https://www.collaboraonline.com/

LibreOffice-based web office suite.

| Aspect | Details |
|--------|---------|
| Track Changes | ✅ Full support |
| Fidelity | High (LibreOffice core) |
| Self-hosted | ✅ Docker or native |
| Desktop Apps | iOS, Android, Windows, Mac, Linux |
| License | MPL 2.0 |

**Pros:** LibreOffice's mature rendering engine, multi-platform
**Cons:** Server-based architecture, heavier than pure JS

---

### Option G: ZetaOffice / LibreOffice WASM

**Wiki:** https://wiki.documentfoundation.org/Development/WASM

LibreOffice compiled to WebAssembly, runs directly in browser.

| Aspect | Details |
|--------|---------|
| Track Changes | ✅ Full LibreOffice support |
| Fidelity | 100% LibreOffice |
| Architecture | Pure WASM, no server needed |
| Status | Beta (ZetaOffice public beta Nov 2024) |

**Pros:** True LibreOffice in browser, no backend required, pixel-perfect
**Cons:** Experimental, large WASM bundle (~100MB+), performance concerns

---

### Option H: TipTap + Conversion Service

**Docs:** https://tiptap.dev/docs/guides/legacy-conversion

ProseMirror-based editor with DOCX import/export.

| Aspect | Details |
|--------|---------|
| Track Changes | ⚠️ Limited - Word track changes NOT preserved on import |
| Editor | Modern ProseMirror-based rich text |
| Conversion | REST API for DOCX ↔ JSON |
| License | MIT (editor) + paid conversion service |

**Pros:** Excellent editing UX, modern architecture, React-native
**Cons:** Track changes not preserved from Word imports, conversion costs money

---

### Option I: Commercial Solutions (Apryse/Nutrient)

**Apryse:** https://apryse.com/capabilities/docx-editor
**Nutrient:** https://www.nutrient.io/sdk/javascript-docx-editor/

WebAssembly-powered commercial editors.

| Aspect | Details |
|--------|---------|
| Track Changes | ✅ Full support |
| Fidelity | High (native WASM rendering) |
| Architecture | Client-side WASM, no backend |
| License | Commercial (expensive) |

**Pros:** Professional support, no server, excellent fidelity
**Cons:** Expensive licensing

---

## Track Changes Deep Dive

### XML Structure

Track changes in OOXML use `<w:ins>` and `<w:del>` elements:

#### Insertion
```xml
<w:ins w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:t>inserted text</w:t></w:r>
</w:ins>
```

#### Deletion
```xml
<w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
```

**Note:** Inside `<w:del>`, use `<w:delText>` instead of `<w:t>`.

### Minimal Edits Pattern

Only mark what changes:

```xml
<!-- Change "30 days" to "60 days" -->
<w:r><w:t>The term is </w:t></w:r>
<w:del w:id="1" w:author="Claude" w:date="...">
  <w:r><w:delText>30</w:delText></w:r>
</w:del>
<w:ins w:id="2" w:author="Claude" w:date="...">
  <w:r><w:t>60</w:t></w:r>
</w:ins>
<w:r><w:t> days.</w:t></w:r>
```

### Author Attribution

Both user and AI changes can have different authors:

```xml
<!-- User change -->
<w:ins w:author="Sam" w:date="2026-02-05T10:30:00Z">
  <w:r><w:t>user typed this</w:t></w:r>
</w:ins>

<!-- AI change -->
<w:ins w:author="AI Assistant" w:date="2026-02-05T10:31:00Z">
  <w:r><w:t>AI suggested this</w:t></w:r>
</w:ins>
```

### Deleting Entire Paragraphs

When removing ALL content from a paragraph, mark the paragraph mark as deleted:

```xml
<w:p>
  <w:pPr>
    <w:rPr>
      <w:del w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z"/>
    </w:rPr>
  </w:pPr>
  <w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
    <w:r><w:delText>Entire paragraph being deleted...</w:delText></w:r>
  </w:del>
</w:p>
```

---

## Complex Formatting & Round-Trip Fidelity

### The Core Problem

```
Original Doc → Import → Editor Model → Export → Output Doc
     ↓                      ↓
   Complex               Simplified
   100 features          30 features modeled
                         70 features LOST
```

WYSIWYG editors can only represent what they model. Anything unmapped is lost.

### What XML Editing Preserves

| Element | XML Edit | WYSIWYG Editor |
|---------|----------|----------------|
| Tables | ✅ Perfect | ⚠️ May simplify |
| Images | ✅ Perfect | ⚠️ May lose positioning |
| Headers/Footers | ✅ Perfect | ⚠️ Often unsupported |
| Footnotes | ✅ Perfect | ⚠️ Often unsupported |
| Styles | ✅ Perfect | ⚠️ May flatten |
| Track Changes | ✅ Perfect | ⚠️ May not import existing |
| Comments | ✅ Perfect | ⚠️ Variable support |
| Field Codes | ✅ Perfect | ❌ Usually lost |
| Complex Numbering | ✅ Perfect | ⚠️ May simplify |

### Rezipping Complexity

**Question:** Is rezipping complicated with complex formatting?

**Answer:** No. Rezipping is simple:

```typescript
import JSZip from 'jszip';

const zip = await JSZip.loadAsync(originalDocx);
zip.file('word/document.xml', modifiedXml);
const newDocx = await zip.generateAsync({ type: 'blob' });
```

The complexity is in **generating valid XML edits**, not in zip/unzip.

### When Complexity Arises

Rezipping gets complex only when:

1. **Adding new images** - Need to add to `word/media/`, update relationships, update `[Content_Types].xml`
2. **Adding new sections** - May need new header/footer files
3. **Invalid XML** - Malformed edits break the document

For pure text edits with track changes, it's straightforward.

---

## Build vs Buy Analysis

### Component Difficulty Matrix

| Component | Difficulty | Existing Solutions | Build Effort |
|-----------|------------|-------------------|--------------|
| Rich text editor core | Medium | TipTap/ProseMirror | Use existing |
| DOCX → Editor import | **VERY HARD** | Partial (TipTap Conversion) | Major effort |
| Editor → DOCX export | Medium | prosemirror-docx | Moderate |
| Track changes | Hard | TipTap Pro ($) or custom | Significant |
| Complex formatting | **VERY HARD** | Limited | Major effort |
| AI integration | Easy-Medium | You'd build this | Straightforward |

### Why DOCX Import is Hard

Word documents can have:

- Split runs (text fragmented across elements)
- 200+ formatting properties
- Nested tables within tables
- Floating images with text wrap anchors
- Headers/footers with section-specific breaks
- Footnotes and endnotes
- Existing track changes to preserve
- Comments with threaded replies
- Numbering defined in separate XML file
- Style inheritance chains
- Field codes (TOC, page numbers, cross-references)
- Bookmarks, hyperlinks
- Embedded objects (charts, equations)

### Build Effort Estimates

| Goal | Effort | Path |
|------|--------|------|
| Basic TipTap + AI + new docs only | 2-4 weeks | Build it |
| Edit existing docs, basic formatting | 1-2 months | Build with TipTap Conversion API ($) |
| Edit existing docs, full fidelity | 3-6+ months | License SuperDoc OR build import layer |
| Match SuperDoc completely | 1-2+ years | You're building a company |

### License Considerations

| Solution | License | Commercial Use |
|----------|---------|----------------|
| SuperDoc | AGPLv3 / Commercial | Must open-source OR pay |
| ONLYOFFICE | AGPL / Commercial | Must open-source OR pay |
| Collabora | MPL 2.0 | OK with attribution |
| TipTap | MIT | Free, conversion API costs |
| ProseMirror | MIT | Free |
| docx-preview | MIT | Free |

---

## Recommendations

### Decision Matrix

| Your Situation | Recommendation |
|----------------|----------------|
| AI-first, users accept/reject suggestions | **Option C** (current XML patch system) |
| Users need to type, new docs only | **Build TipTap editor** |
| Users need to type in existing docs, budget available | **License SuperDoc commercial** |
| Full Office replacement | **ONLYOFFICE or Collabora** |
| Experimental/future-focused | **Watch ZetaOffice WASM** |

### For Arete Specifically

#### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  For EXISTING docs:            │  For NEW docs / AI drafts:    │
│  ─────────────────────         │  ──────────────────────────   │
│  XML patch system              │  TipTap editor (build this)   │
│  (already works!)              │  + AI integration             │
│  ↓                             │  ↓                            │
│  Preserves ALL formatting      │  Modern editing UX            │
│  Track changes via XML         │  Track changes via marks      │
│  docx-preview for viewing      │  Export to clean .docx        │
└─────────────────────────────────────────────────────────────────┘
```

#### Phase 1: Enhance Current System (Now)

1. Add `docx-preview` for better document rendering
2. Build structured edit panel (select text → type replacement)
3. Both user and AI edits generate XML patches
4. Perfect formatting preservation

```bash
npm install docx-preview
```

```typescript
import { renderAsync } from 'docx-preview';

const container = document.getElementById('docx-viewer');
await renderAsync(docxBlob, container);
```

#### Phase 2: Add TipTap for New Docs (Later)

1. Build TipTap editor with track changes
2. Use for AI-generated drafts, new documents
3. Export to .docx via prosemirror-docx

#### Phase 3: Evaluate WYSIWYG (If Needed)

1. If users demand typing in existing docs
2. Evaluate SuperDoc commercial license cost vs engineering time
3. Make business decision

---

## Implementation Paths

### Path A: Structured Edit Panel (Recommended First Step)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Arete Editor                            │
├───────────────────────────────┬─────────────────────────────────┤
│                               │                                 │
│    Document View              │      Edit Panel                 │
│    (docx-preview)             │                                 │
│                               │   ┌─────────────────────────┐   │
│    ┌─────────────────────┐    │   │ Selected: "has an"      │   │
│    │ This symmetry is    │    │   │ Replace: "features an"  │   │
│    │ exact but non-      │    │   │                         │   │
│    │ geometric...        │◄───┼───│ [User types here]       │   │
│    │                     │    │   │                         │   │
│    │ [Click to select    │    │   │ ☑ Track as my change    │   │
│    │  text regions]      │    │   │ [Apply Change]          │   │
│    └─────────────────────┘    │   └─────────────────────────┘   │
│                               │                                 │
│                               │   AI Suggestions                │
│                               │   ┌─────────────────────────┐   │
│                               │   │ "has" → "features"      │   │
│                               │   │ [Accept] [Reject]       │   │
│                               │   └─────────────────────────┘   │
└───────────────────────────────┴─────────────────────────────────┘
```

**Workflow:**
1. User selects text in rendered view (or via search)
2. Types replacement in edit panel
3. System generates XML patch with track changes
4. Repack and re-render

### Path B: TipTap Editor for New Docs

```typescript
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Mark } from '@tiptap/core';

// Custom track changes marks
const TrackInsert = Mark.create({
  name: 'trackInsert',
  addAttributes() {
    return {
      author: { default: 'User' },
      timestamp: { default: () => new Date().toISOString() },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['ins', { class: 'track-insert', ...HTMLAttributes }, 0];
  },
});

const TrackDelete = Mark.create({
  name: 'trackDelete',
  addAttributes() {
    return {
      author: { default: 'User' },
      timestamp: { default: () => new Date().toISOString() },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['del', { class: 'track-delete', ...HTMLAttributes }, 0];
  },
});

// Editor setup
const editor = new Editor({
  extensions: [
    StarterKit,
    TrackInsert,
    TrackDelete,
  ],
});

// AI injects tracked change
function aiSuggestEdit(editor: Editor, from: number, to: number, newText: string) {
  editor.chain()
    .focus()
    .setTextSelection({ from, to })
    .setMark('trackDelete', { author: 'AI Assistant' })
    .setTextSelection({ from: to, to })
    .insertContent(newText)
    .setMark('trackInsert', { author: 'AI Assistant' })
    .run();
}
```

### Path C: SuperDoc Integration (If Licensed)

```typescript
import { SuperDoc } from '@harbour-enterprises/superdoc';

// Initialize editor
const editor = new SuperDoc({
  element: document.getElementById('editor'),
  document: existingDocxArrayBuffer,
  mode: 'suggesting', // Auto track changes
  user: {
    name: 'Sam',
    color: '#4a90d9'
  }
});

// AI injects changes
async function aiEdit(prompt: string) {
  const selection = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(selection.from, selection.to);

  const suggestion = await callAI(prompt, selectedText);

  // Switch to AI user temporarily
  editor.setUser({ name: 'AI Assistant', color: '#10b981' });

  editor.chain()
    .setTextSelection(selection)
    .deleteSelection()
    .insertContent(suggestion)
    .run();

  // Switch back to human user
  editor.setUser({ name: 'Sam', color: '#4a90d9' });
}

// Export with track changes
const docxBlob = await editor.exportDocx();
```

---

## Resources & Links

### Libraries

| Library | Purpose | Link |
|---------|---------|------|
| docx-preview | Render .docx as HTML | https://www.npmjs.com/package/docx-preview |
| docx | Create .docx files | https://www.npmjs.com/package/docx |
| prosemirror-docx | Export ProseMirror to .docx | https://github.com/curvenote/prosemirror-docx |
| jszip | Unpack/repack ZIP files | https://www.npmjs.com/package/jszip |
| TipTap | Rich text editor | https://tiptap.dev/ |
| ProseMirror | Editor framework | https://prosemirror.net/ |

### Solutions

| Solution | Type | Link |
|----------|------|------|
| SuperDoc | Open Source / Commercial | https://www.superdoc.dev/ |
| ONLYOFFICE | Open Source / Commercial | https://github.com/ONLYOFFICE/DocumentServer |
| Collabora Online | Open Source | https://github.com/CollaboraOnline/online |
| ZetaOffice | Experimental | https://wiki.documentfoundation.org/Development/WASM |
| TipTap Conversion | Paid Service | https://tiptap.dev/docs/guides/legacy-conversion |
| Apryse | Commercial | https://apryse.com/capabilities/docx-editor |
| Nutrient | Commercial | https://www.nutrient.io/sdk/javascript-docx-editor/ |

### Documentation

| Resource | Link |
|----------|------|
| OOXML Specification | https://docs.microsoft.com/en-us/openspecs/office_standards |
| ProseMirror Guide | https://prosemirror.net/docs/guide/ |
| TipTap Docs | https://tiptap.dev/docs |
| SuperDoc Docs | https://docs.superdoc.dev/ |
| ONLYOFFICE API | https://api.onlyoffice.com/ |

---

## Conclusion

For Arete's AI-first writing tool:

1. **Keep the XML patch system** for editing existing documents - it's the only way to guarantee 100% formatting preservation

2. **Add docx-preview** for better rendering

3. **Build a structured edit panel** so users can type replacements without full WYSIWYG

4. **Consider TipTap** for new document creation where round-trip isn't needed

5. **Only license SuperDoc** if user testing reveals strong demand for true WYSIWYG editing of existing docs

The AI is the primary editor in your vision - users are reviewers who accept/reject and occasionally modify. This architecture works well with the XML patch approach.
