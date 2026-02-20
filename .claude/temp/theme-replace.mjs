// Batch replace hardcoded zinc classes with semantic theme tokens
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const SRC = 'c:\\Users\\samcd\\Projects\\Git-Repos\\Arete\\3.0 Build\\src\\renderer\\src'

// Order matters: longer/more specific patterns first to avoid partial matches
const replacements = [
  // Background colors with opacity variants
  ['bg-zinc-950', 'bg-surface'],
  ['bg-zinc-900/80', 'bg-surface-alt/80'],
  ['bg-zinc-900/50', 'bg-surface-alt/50'],
  ['bg-zinc-900', 'bg-surface-alt'],
  ['bg-zinc-800/50', 'bg-surface-raised/50'],
  ['bg-zinc-800/30', 'bg-surface-raised/30'],
  ['bg-zinc-800', 'bg-surface-raised'],
  ['bg-zinc-700/50', 'bg-surface-highlight/50'],
  ['bg-zinc-700', 'bg-surface-highlight'],

  // Hover backgrounds
  ['hover:bg-zinc-800/50', 'hover:bg-surface-raised/50'],
  ['hover:bg-zinc-800/30', 'hover:bg-surface-raised/30'],
  ['hover:bg-zinc-800', 'hover:bg-surface-raised'],
  ['hover:bg-zinc-700', 'hover:bg-surface-highlight'],

  // Borders
  ['border-zinc-800', 'border-border'],
  ['border-zinc-700', 'border-border-strong'],
  ['border-zinc-600', 'border-border-strong'],

  // Focus borders
  ['focus:border-zinc-600', 'focus:border-border-strong'],
  ['focus:border-zinc-500', 'focus:border-border-strong'],

  // Text colors
  ['text-zinc-100', 'text-text-primary'],
  ['text-zinc-200', 'text-text-secondary'],
  ['text-zinc-300', 'text-text-tertiary'],
  ['text-zinc-400', 'text-text-quaternary'],
  ['text-zinc-500', 'text-text-muted'],
  ['text-zinc-600', 'text-text-faint'],

  // Hover text
  ['hover:text-zinc-100', 'hover:text-text-primary'],
  ['hover:text-zinc-200', 'hover:text-text-secondary'],
  ['hover:text-zinc-300', 'hover:text-text-tertiary'],
  ['hover:text-zinc-400', 'hover:text-text-quaternary'],

  // Disabled text
  ['disabled:text-zinc-600', 'disabled:text-text-faint'],
  ['disabled:text-zinc-500', 'disabled:text-text-muted'],

  // Divide
  ['divide-zinc-800', 'divide-border'],
  ['divide-zinc-700', 'divide-border-strong'],

  // Placeholder
  ['placeholder-zinc-500', 'placeholder-text-muted'],
  ['placeholder:text-zinc-500', 'placeholder:text-text-muted'],

  // Ring
  ['ring-zinc-700', 'ring-border-strong'],

  // From (gradients)
  ['from-zinc-900', 'from-surface-alt'],
  ['from-zinc-800', 'from-surface-raised'],
]

function walkDir(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...walkDir(full))
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      results.push(full)
    }
  }
  return results
}

const files = walkDir(SRC)
let totalChanges = 0

for (const filePath of files) {
  let content = readFileSync(filePath, 'utf-8')
  let original = content
  let fileChanges = 0

  for (const [from, to] of replacements) {
    // Use global string replace
    while (content.includes(from)) {
      content = content.replace(from, to)
      fileChanges++
    }
  }

  if (fileChanges > 0) {
    writeFileSync(filePath, content, 'utf-8')
    const shortPath = filePath.replace(SRC, '')
    console.log(`  ${shortPath}: ${fileChanges} replacements`)
    totalChanges += fileChanges
  }
}

console.log(`\nDone: ${totalChanges} total replacements across ${files.length} files scanned`)
