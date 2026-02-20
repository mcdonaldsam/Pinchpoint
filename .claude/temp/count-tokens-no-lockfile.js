const fs = require('fs');
const path = require('path');

// Rough token estimation: ~4 characters per token (conservative)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function shouldSkip(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  // Skip node_modules
  if (normalized.includes('/node_modules/')) return true;

  // Skip dist/out directories
  if (normalized.includes('/dist/') || normalized.includes('/out/')) return true;

  // Skip the plan files
  if (normalized.includes('3.1 Design/Plan_') && normalized.endsWith('.md')) return true;
  if (normalized.includes('3.1 Design/implementation/')) return true;

  // Skip lock files
  if (normalized.endsWith('package-lock.json')) return true;

  return false;
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);

    if (shouldSkip(filePath)) continue;

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      const validExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml', '.toml', '.html', '.css'];

      if (validExts.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

function analyzeFiles(baseDir) {
  const files = walkDir(baseDir);

  const results = {
    totalTokens: 0,
    totalFiles: 0,
    byType: {},
    largestFiles: []
  };

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const tokens = estimateTokens(content);
    const ext = path.extname(filePath).toLowerCase();

    // Track by type
    if (!results.byType[ext]) {
      results.byType[ext] = { count: 0, tokens: 0 };
    }
    results.byType[ext].count++;
    results.byType[ext].tokens += tokens;

    // Track largest files
    results.largestFiles.push({
      path: filePath.replace(baseDir + path.sep, ''),
      tokens: tokens,
      size: content.length
    });

    results.totalTokens += tokens;
    results.totalFiles++;
  }

  // Sort largest files
  results.largestFiles.sort((a, b) => b.tokens - a.tokens);
  results.largestFiles = results.largestFiles.slice(0, 20);

  return results;
}

// Run analysis
const baseDir = 'C:\\Users\\samcd\\Projects\\Git-Repos\\Arete\\3.0 Build';
const results = analyzeFiles(baseDir);

console.log('=== TOKEN ANALYSIS FOR 3.0 Build/ (excluding package-lock.json) ===\n');
console.log(`Total Files: ${results.totalFiles}`);
console.log(`Total Tokens: ${results.totalTokens.toLocaleString()}\n`);

console.log('=== BREAKDOWN BY FILE TYPE ===');
const sortedTypes = Object.entries(results.byType).sort((a, b) => b[1].tokens - a[1].tokens);
for (const [ext, data] of sortedTypes) {
  console.log(`${ext.padEnd(8)} ${data.count.toString().padStart(4)} files  ${data.tokens.toLocaleString().padStart(8)} tokens`);
}

console.log('\n=== TOP 20 LARGEST FILES ===');
for (let i = 0; i < results.largestFiles.length; i++) {
  const file = results.largestFiles[i];
  console.log(`${(i + 1).toString().padStart(2)}. ${file.tokens.toLocaleString().padStart(6)} tokens - ${file.path}`);
}
