// Fix remaining zinc references that weren't caught in the first pass
import { readFileSync, writeFileSync } from 'fs'

const SRC = 'c:\\Users\\samcd\\Projects\\Git-Repos\\Arete\\3.0 Build\\src\\renderer\\src'

const fixes = [
  // hover:bg-zinc-600 → hover:bg-border-strong (used as cancel button hover)
  [`${SRC}\\components\\shared\\ConfirmDialog.tsx`, 'hover:bg-zinc-600', 'hover:bg-border-strong'],
  [`${SRC}\\components\\shared\\InputDialog.tsx`, 'hover:bg-zinc-600', 'hover:bg-border-strong'],
  [`${SRC}\\components\\editor\\PatchList.tsx`, 'hover:bg-zinc-600', 'hover:bg-border-strong'],
  [`${SRC}\\components\\settings\\ShortcutSettings.tsx`, 'hover:bg-zinc-600', 'hover:bg-border-strong'],
  [`${SRC}\\components\\explorer\\PropertiesDialog.tsx`, 'hover:bg-zinc-600', 'hover:bg-border-strong'],

  // Sidebar active indicator
  [`${SRC}\\components\\shared\\Sidebar.tsx`, 'bg-zinc-100', 'bg-text-primary'],

  // Animated dots
  [`${SRC}\\components\\chat\\MessageList.tsx`, 'bg-zinc-500', 'bg-text-muted'],

  // placeholder-zinc-600
  [`${SRC}\\components\\settings\\ApiKeySettings.tsx`, 'placeholder-zinc-600', 'placeholder-text-faint'],

  // disabled:text-zinc-700
  [`${SRC}\\components\\explorer\\Breadcrumb.tsx`, 'disabled:text-zinc-700', 'disabled:text-text-faint'],

  // text-zinc-700
  [`${SRC}\\components\\explorer\\SearchBar.tsx`, 'text-zinc-700', 'text-text-faint'],

  // focus:ring-zinc-600
  [`${SRC}\\components\\explorer\\SearchBar.tsx`, 'focus:ring-zinc-600', 'focus:ring-border-strong'],

  // ChatInput light-specific styles: bg-zinc-200 text-zinc-900 hover:bg-white
  // These are inverted colors for a light button in dark mode - convert to semantic tokens
  [`${SRC}\\components\\chat\\ChatInput.tsx`, 'bg-zinc-200 text-zinc-900 hover:bg-white', 'bg-text-secondary text-surface hover:bg-text-primary'],
]

for (const [filePath, from, to] of fixes) {
  let content = readFileSync(filePath, 'utf-8')
  let count = 0
  while (content.includes(from)) {
    content = content.replace(from, to)
    count++
  }
  if (count > 0) {
    writeFileSync(filePath, content, 'utf-8')
    console.log(`  ${filePath.replace(SRC, '')}: ${count}x "${from}" → "${to}"`)
  }
}

console.log('\nDone with remaining fixes')
