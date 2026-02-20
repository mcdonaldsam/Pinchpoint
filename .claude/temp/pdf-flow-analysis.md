# PDF Chunking Flow - Root Cause Analysis

## Current Observed Behavior
- ✅ PDF detected (129 pages)
- ✅ 13 chunks extracted
- ✅ All batches processed (1/5, 2/5, etc.)
- ✅ "Converted pages 1-10, 11-20..." logs appear
- ❌ AI says: "I don't see the actual PDF content"

## The Complete Flow (As Implemented)

```
User: Attach PDF + "Convert to markdown"
  ↓
chat-handlers.ts:handleChatMessage()
  ↓ (line 67) Store user message in DB
  ↓ (line 86) Call orchestrateChat()
  ↓
chat-orchestrator.ts:orchestrateChat()
  ↓ (line 291) Check: options.attachments for PDF >5 pages
  ↓ (line 293) IF FOUND → handleChunkedPdfConversion() [EARLY RETURN]
  ↓
handleChunkedPdfConversion()
  ↓ (line 138) extractPdfChunked(filePath, pageCount, 10)
  ↓
pdf-extractor.ts:extractPdfChunked()
  ↓ (line 76) pageData.getTextContent()
  ↓ (line 77) content.items.map(item => item.str).join(' ')
  ↓ (line 80) Store in pageTexts[pageNum-1]
  ↓ (line 90) Group into chunks with join('\n\n')
  ↓ RETURN chunks[]
  ↓
BACK TO handleChunkedPdfConversion()
  ↓ (line 162-202) For each batch:
      ├─ Create prompt: "Convert pages X-Y to markdown: {chunk.text}"
      ├─ Call adapter.chat()
      └─ Store response.content in allMarkdown[]
  ↓
  ↓ (line 206) finalMarkdown = allMarkdown.join('\n\n---\n\n')
  ↓
  ↓ (line 220) Create analysisPrompt:
      "User asked: {userPrompt}
       Here is PDF content: {finalMarkdown}
       Please respond."
  ↓
  ↓ (line 230) adapter.chat(analysisPrompt)
  ↓
  ↓ (line 266) RETURN { content: analysisResponse.content }
  ↓
BACK TO chat-handler.ts
  ↓ (line 168) Store assistant message with result.content
  ↓ (line 205) Send 'chat:stream-complete' event
  ↓
UI: Display assistant message
```

## Hypothesis: Where Is Text Being Lost?

### Hypothesis 1: Extraction Returns Empty Text
**Symptom:** pageData.getTextContent() returns items array with empty .str properties

**Why This Could Happen:**
- PDF uses scanned images (no text layer)
- PDF uses custom fonts/encoding
- pdf-parse getTextContent() doesn't work as documented

**Test:** Add logging at line 77 in pdf-extractor.ts:
```typescript
const pageText = content.items.map((item: any) => item.str).join(' ')
console.log(`[PDF] Page ${pageData.pageNum}: extracted ${pageText.length} chars`)
```

### Hypothesis 2: Chunk Text Is Empty
**Symptom:** chunks[] array has objects with empty .text properties

**Why This Could Happen:**
- pageTexts array wasn't populated correctly
- Array slicing is wrong (off-by-one error)

**Test:** Add logging at line 145 in chat-orchestrator.ts:
```typescript
onStep('pdf-chunk', `Extracted ${chunks.length} chunks (${chunkSize} pages each)`)
console.log('[PDF CHUNK] First chunk sample:', chunks[0].text.substring(0, 500))
```

### Hypothesis 3: AI Conversion Returns Empty Markdown
**Symptom:** API calls succeed but response.content is empty/whitespace

**Why This Could Happen:**
- Prompt doesn't work with the selected model
- chunk.text is empty (see hypothesis 2)
- Model refuses to convert (safety filter?)

**Test:** Add logging at line 174 in chat-orchestrator.ts:
```typescript
console.log(`[PDF CHUNK] Completed pages ${chunk.startPage}-${chunk.endPage} (${response.tokensOut} tokens out)`)
console.log(`[PDF CHUNK] Response sample:`, response.content.substring(0, 300))
```

### Hypothesis 4: finalMarkdown Assembly Fails
**Symptom:** allMarkdown[] array is populated but join() produces empty string

**Why This Could Happen:**
- allMarkdown array is empty
- All elements in array are empty strings

**Test:** Add logging at line 206 in chat-orchestrator.ts:
```typescript
const finalMarkdown = allMarkdown.join('\n\n---\n\n')
console.log(`[PDF CHUNK] Final markdown: ${finalMarkdown.length} chars`)
console.log(`[PDF CHUNK] First 1000 chars:`, finalMarkdown.substring(0, 1000))
```

### Hypothesis 5: Analysis Prompt Construction Fails
**Symptom:** analysisPrompt doesn't include the markdown

**Why This Could Happen:**
- Template literal doesn't interpolate finalMarkdown correctly
- finalMarkdown is empty (see hypothesis 4)

**Test:** Already logged at line 236

## Most Likely Root Cause

Based on the symptoms:
- Console shows "Converted pages X-Y" (so API calls complete)
- AI in screenshot says "I don't see the actual PDF content" (specific, not generic error)
- AI response is ABOUT the PDF (mentions "pages 1-10", "Acquisition Finance Handbook")

**Most Likely:** The extracted text IS empty, but the AI sees the PROMPT structure and tries to help.

The analysis prompt includes:
```
Here is the PDF content (Acquisition Finance Handbook.pdf, 129 pages) converted to clean markdown:

[EMPTY OR WHITESPACE]

Please respond to the user's request based on this content.
```

So the AI sees:
- Filename: ✅ "Acquisition Finance Handbook.pdf"
- Page count: ✅ 129 pages
- Content: ❌ Empty

And responds: "I don't see the actual PDF content"

## Fix Strategy

**Step 1: Add Diagnostic Logging** (3 key points)
- Log chunk text length after extraction
- Log markdown response length after conversion
- Log final assembled markdown length

**Step 2: Identify Which Stage Produces Empty Text**
- If chunk text is empty → Problem in pdf-parse extraction
- If markdown response is empty → Problem in AI conversion prompt
- If final markdown is empty → Problem in array assembly

**Step 3: Fix Based on Diagnosis**
- If extraction fails → Use different PDF library (pdf.js, pdfjs-dist)
- If conversion fails → Fix the conversion prompt
- If assembly fails → Debug the join logic

## Expected Console Output (If Working)

```
[PDF CHUNK] Extracting PDF chunks...
[PDF] Page 1: extracted 2847 chars
[PDF] Page 2: extracted 3102 chars
...
[PDF CHUNK] Extraction complete: 13 chunks
[PDF CHUNK] First chunk sample: "# Acquisition Finance Handbook\n\n## Chapter 1..."
[PDF CHUNK] Processing batch 1/5
[PDF CHUNK] Converting pages 1-10...
[PDF CHUNK] Completed pages 1-10 (8423 tokens out)
[PDF CHUNK] Response sample: "# Acquisition Finance Handbook\n\n## Chapter 1: Overview..."
[PDF CHUNK] Final markdown: 487234 chars
[PDF CHUNK] First 1000 chars: "# Acquisition Finance Handbook\n\n## Chapter 1..."
[PDF CHUNK] Now feeding converted markdown to AI
[PDF CHUNK] AI analysis complete: 4821 tokens out
```

## Action Plan

1. Add the 4 diagnostic log points above
2. Re-run the PDF conversion
3. Check console to see which stage produces empty text
4. Fix the failing stage
5. Verify end-to-end flow works
