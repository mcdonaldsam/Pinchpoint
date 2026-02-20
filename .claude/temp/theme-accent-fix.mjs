// Fix accent color chip/badge styles for light mode
// Pattern: keep dark styles via dark: prefix, add light alternatives
import { readFileSync, writeFileSync } from 'fs'

const SRC = 'c:\\Users\\samcd\\Projects\\Git-Repos\\Arete\\3.0 Build\\src\\renderer\\src'

// Each fix: [file, old, new]
// Strategy: bg-{color}-500/20 → bg-{color}-100 dark:bg-{color}-500/20
//           text-{color}-400 → text-{color}-600 dark:text-{color}-400
//           border-{color}-500/30 → border-{color}-300 dark:border-{color}-500/30
const fixes = [
  // ── ChatInput.tsx ──────────────────────────────────────────
  // Best button (amber)
  [`${SRC}\\components\\chat\\ChatInput.tsx`,
    `'bg-amber-500/20 text-amber-400 border border-amber-500/30'`,
    `'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'`],
  // Consensus button (purple)
  [`${SRC}\\components\\chat\\ChatInput.tsx`,
    `'bg-purple-500/20 text-purple-400 border border-purple-500/30'`,
    `'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30'`],
  // RAG indicator (emerald)
  [`${SRC}\\components\\chat\\ChatInput.tsx`,
    `'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'`,
    `'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'`],

  // ── ChatView.tsx ───────────────────────────────────────────
  // Console toggle (cyan)
  [`${SRC}\\components\\chat\\ChatView.tsx`,
    `'text-cyan-400 bg-cyan-400/10'`,
    `'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-400/10'`],

  // ── ConsensusView.tsx ──────────────────────────────────────
  // Provider color cards
  [`${SRC}\\components\\chat\\ConsensusView.tsx`,
    `openai: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'`,
    `openai: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5'`],
  [`${SRC}\\components\\chat\\ConsensusView.tsx`,
    `anthropic: 'text-orange-400 border-orange-500/30 bg-orange-500/5'`,
    `anthropic: 'text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/5'`],
  [`${SRC}\\components\\chat\\ConsensusView.tsx`,
    `gemini: 'text-blue-400 border-blue-500/30 bg-blue-500/5'`,
    `gemini: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/5'`],
  [`${SRC}\\components\\chat\\ConsensusView.tsx`,
    `perplexity: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5'`,
    `perplexity: 'text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/5'`],
  [`${SRC}\\components\\chat\\ConsensusView.tsx`,
    `xai: 'text-purple-400 border-purple-500/30 bg-purple-500/5'`,
    `xai: 'text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/5'`],
  [`${SRC}\\components\\chat\\ConsensusView.tsx`,
    `deepseek: 'text-pink-400 border-pink-500/30 bg-pink-500/5'`,
    `deepseek: 'text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/5'`],
  [`${SRC}\\components\\chat\\ConsensusView.tsx`,
    `kimi: 'text-amber-400 border-amber-500/30 bg-amber-500/5'`,
    `kimi: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5'`],

  // ── AISettings.tsx ─────────────────────────────────────────
  [`${SRC}\\components\\settings\\AISettings.tsx`,
    `'bg-amber-500/20 text-amber-400 border border-amber-500/30'`,
    `'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'`],

  // ── AppearanceSettings.tsx ─────────────────────────────────
  [`${SRC}\\components\\settings\\AppearanceSettings.tsx`,
    `'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'`,
    `'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30'`],

  // ── CostSettings.tsx ───────────────────────────────────────
  [`${SRC}\\components\\settings\\CostSettings.tsx`,
    `normal: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Normal' }`,
    `normal: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Normal' }`],
  [`${SRC}\\components\\settings\\CostSettings.tsx`,
    `warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Warning' }`,
    `warning: { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Warning' }`],
  [`${SRC}\\components\\settings\\CostSettings.tsx`,
    `blocked: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Blocked' }`,
    `blocked: { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Blocked' }`],

  // ── ShortcutSettings.tsx ───────────────────────────────────
  // Active capturing state (blue)
  [`${SRC}\\components\\settings\\ShortcutSettings.tsx`,
    `'bg-blue-600/20 border border-blue-500 text-blue-300 animate-pulse'`,
    `'bg-blue-100 dark:bg-blue-600/20 border border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-300 animate-pulse'`],
  // Customized key (yellow)
  [`${SRC}\\components\\settings\\ShortcutSettings.tsx`,
    `'bg-yellow-600/10 border border-yellow-600/30 text-yellow-300'`,
    `'bg-yellow-100 dark:bg-yellow-600/10 border border-yellow-300 dark:border-yellow-600/30 text-yellow-700 dark:text-yellow-300'`],

  // ── FileRow.tsx ─────────────────────────────────────────────
  [`${SRC}\\components\\explorer\\FileRow.tsx`,
    `'bg-blue-600/20 text-text-primary border-l-2 border-blue-500'`,
    `'bg-blue-100 dark:bg-blue-600/20 text-text-primary border-l-2 border-blue-400 dark:border-blue-500'`],

  // ── SearchBar.tsx ──────────────────────────────────────────
  [`${SRC}\\components\\explorer\\SearchBar.tsx`,
    `'bg-blue-500/20 text-blue-400 cursor-wait'`,
    `'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 cursor-wait'`],
  [`${SRC}\\components\\explorer\\SearchBar.tsx`,
    `'bg-emerald-500/15 text-emerald-400 hover:text-emerald-300'`,
    `'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'`],

  // ── PatchCard.tsx ──────────────────────────────────────────
  [`${SRC}\\components\\editor\\PatchCard.tsx`,
    `insert: 'text-green-400 bg-green-400/10'`,
    `insert: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-400/10'`],
  [`${SRC}\\components\\editor\\PatchCard.tsx`,
    `delete: 'text-red-400 bg-red-400/10'`,
    `delete: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-400/10'`],
  // Diff backgrounds
  [`${SRC}\\components\\editor\\PatchCard.tsx`,
    `bg-red-950/20`,
    `bg-red-50 dark:bg-red-950/20`],
  [`${SRC}\\components\\editor\\PatchCard.tsx`,
    `bg-green-950/20`,
    `bg-green-50 dark:bg-green-950/20`],

  // ── PatchList.tsx ──────────────────────────────────────────
  [`${SRC}\\components\\editor\\PatchList.tsx`,
    `text-green-400 hover:text-green-300 hover:bg-green-400/10`,
    `text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-400/10`],
  [`${SRC}\\components\\editor\\PatchList.tsx`,
    `text-red-400 hover:text-red-300 hover:bg-red-400/10`,
    `text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-400/10`],
]

let totalFixes = 0
for (const [filePath, from, to] of fixes) {
  let content = readFileSync(filePath, 'utf-8')
  if (content.includes(from)) {
    content = content.replace(from, to)
    writeFileSync(filePath, content, 'utf-8')
    const short = filePath.replace(SRC, '')
    console.log(`  ${short}: fixed`)
    totalFixes++
  } else {
    const short = filePath.replace(SRC, '')
    console.log(`  ${short}: SKIPPED (pattern not found: "${from.substring(0, 50)}...")`)
  }
}

console.log(`\nDone: ${totalFixes} files updated`)
