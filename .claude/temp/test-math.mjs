const LATEX_COMMANDS = [
  'approx', 'frac', 'tfrac', 'dfrac', 'sqrt', 'sum', 'prod', 'int', 'infty',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
  'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Delta', 'Gamma', 'Lambda', 'Omega', 'Phi', 'Pi', 'Psi', 'Sigma', 'Theta',
  'cdot', 'times', 'div', 'pm', 'mp', 'leq', 'geq', 'neq', 'sim', 'simeq',
  'equiv', 'propto', 'partial', 'nabla', 'forall', 'exists', 'in', 'notin',
  'subset', 'supset', 'cap', 'cup', 'wedge', 'vee', 'neg',
  'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'leftrightarrow',
  'hat', 'bar', 'vec', 'dot', 'ddot', 'tilde', 'overline', 'underline',
  'mathrm', 'mathbf', 'mathit', 'mathbb', 'mathcal', 'text',
  'left', 'right', 'bigg', 'Big', 'langle', 'rangle'
];
const LATEX_CMD_PATTERN = new RegExp(`\\\\(?:${LATEX_COMMANDS.join('|')})(?![a-zA-Z])`);
const LATEX_CMD_RE = new RegExp(
  `\\\\(?:${LATEX_COMMANDS.join('|')})(?![a-zA-Z])` +
  `(?:\\{[^}]*\\}|\\[[^\\]]*\\])*` +
  `(?:[_^](?:\\{[^}]*\\}|[a-zA-Z0-9]))*`,
  'g'
);

function preprocessMath(content) {
  // Step 1
  let result = content
    .replace(/\\\((.+?)\\\)/gs, (_match, inner) => `$${inner}$`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, inner) => `$$${inner}$$`);

  // Step 2: Wrap individual bare LaTeX commands
  const lines = result.split('\n');
  let inCodeBlock = false;
  let inDisplayMath = false;
  result = lines.map((line) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return line;
    }
    if (inCodeBlock || trimmed.startsWith('    ')) return line;
    if (trimmed === '$$') {
      inDisplayMath = !inDisplayMath;
      return line;
    }
    if (inDisplayMath) return line;

    const parts = line.split(/(\$\$[\s\S]*?\$\$|\$[^$]+?\$)/g);
    return parts.map((part) => {
      if (part.startsWith('$')) return part;
      if (LATEX_CMD_PATTERN.test(part)) {
        return part.replace(LATEX_CMD_RE, (match) => `$${match}$`);
      }
      return part;
    }).join('');
  }).join('\n');

  // Step 2b: Merge adjacent $...$ blocks
  let merged = result;
  let prev = '';
  while (merged !== prev) {
    prev = merged;
    merged = merged.replace(
      /\$([^$]+)\$([ \t]*(?:[a-zA-Z0-9_^{}\[\]()=<>≤≥≈+\-×·*/,.])*[ \t]*)\$([^$]+)\$/g,
      (_match, a, sep, b) => {
        if (/[a-zA-Z]{3,}/.test(sep)) return _match;
        return `$${a}${sep}${b}$`;
      }
    );
  }
  result = merged;

  // Step 3
  result = result.replace(
    /(?<!\$)(?<![`\\])(\b(?:[a-zA-Z0-9_()||]+\s*[\^]\s*[a-zA-Z0-9_{}.()]+(?:\s*[+\-×·*/=≤≥<>→±]\s*[a-zA-Z0-9_()||]+\s*[\^]?\s*[a-zA-Z0-9_{}.()]*)*(?:\s*[+\-×·*/=≤≥<>→±]\s*[a-zA-Z0-9_()||]+\s*[\^]?\s*[a-zA-Z0-9_{}.()]*)*))(?!\$)/g,
    (_match, expr) => `$${expr}$`
  );

  // Step 4
  result = result.replace(
    /(?<!\$)(?<![`\\])\bsqrt\(([^)]+)\)/g,
    (_match, inner) => `$\\sqrt{${inner}}$`
  );

  return result;
}

// Tests
const tests = [
  {
    name: 'Already $-delimited inline',
    input: 'Inline: $\\lambda > 0$ and $x^2$',
    check: (out, inp) => out === inp ? null : 'Should be unchanged'
  },
  {
    name: 'Already $-delimited Lagrangian',
    input: '$L(x,\\lambda,\\nu) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x) + \\sum_{j=1}^p \\nu_j h_j(x),$',
    check: (out, inp) => out === inp ? null : 'Should be unchanged'
  },
  {
    name: 'Bare LaTeX — no English words wrapped',
    input: 'with \\lambda \\in \\mathbb{R}^m_{\\geq 0} for inequalities and unrestricted \\nu \\in \\mathbb{R}^p for equalities.',
    check: (out) => {
      if (out.includes('$with')) return 'Wrapped "with" in $';
      if (out.includes('inequalities$')) return 'Wrapped "inequalities" in $';
      if (!out.includes('$\\lambda')) return 'Commands not wrapped';
      return null;
    }
  },
  {
    name: 'Mixed $-delimited and text',
    input: 'Sign convention: $g_i \\leq 0$ yields $\\lambda_i \\geq 0$; some formulations flip signs.',
    check: (out, inp) => out === inp ? null : 'Should be unchanged'
  },
  {
    name: 'Display \\[...\\] preserved as $$',
    input: '\\[L(x,\\lambda,\\nu) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x)\\]',
    check: (out) => out.includes('$$') ? null : 'Display math lost $$'
  },
  {
    name: 'Display $$...$$ unchanged',
    input: '$$L(x,\\lambda,\\nu) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x)$$',
    check: (out, inp) => out === inp ? null : 'Should be unchanged'
  },
  {
    name: 'Inline \\(...\\) converted',
    input: 'where \\(\\nabla f\\) must lie in the cone',
    check: (out) => out === 'where $\\nabla f$ must lie in the cone' ? null : 'Wrong conversion'
  },
  {
    name: 'Multi-line mixed unchanged',
    input: 'Define the **Lagrangian**:\n\n$L(x,\\lambda,\\nu) = f(x)$\n\nwith $\\lambda \\in \\mathbb{R}$ for inequalities.',
    check: (out, inp) => out === inp ? null : 'Should be unchanged'
  },
  {
    name: 'Merge adjacent bare commands',
    input: 'Then \\lambda \\in \\mathbb{R} holds.',
    check: (out) => out.includes('$\\lambda \\in \\mathbb{R}$') ? null : 'Adjacent commands not merged'
  },
  {
    name: 'Multiline \\[...\\] display math — inner lines not processed',
    input: '\\[\nL(x) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x)\n\\]',
    check: (out) => {
      if (!out.startsWith('$$')) return 'Missing opening $$';
      if (!out.endsWith('$$')) return 'Missing closing $$';
      // Inner content should NOT have $ wrapping
      const inner = out.replace(/^\$\$/, '').replace(/\$\$$/, '');
      if (inner.includes('$\\sum')) return 'Inner content was processed by Step 2';
      return null;
    }
  },
  {
    name: 'Code block not processed',
    input: '```\n\\lambda = 5\n```',
    check: (out, inp) => out === inp ? null : 'Code block was modified'
  },
  {
    name: 'Dont merge across English words',
    input: '$\\alpha$ hello world $\\beta$',
    check: (out, inp) => out === inp ? null : 'Merged across English text'
  }
];

let passed = 0, failed = 0;
for (const test of tests) {
  const out = preprocessMath(test.input);
  const err = test.check(out, test.input);
  if (err) {
    console.log(`FAIL: ${test.name}`);
    console.log(`  Error: ${err}`);
    console.log(`  IN:  ${JSON.stringify(test.input)}`);
    console.log(`  OUT: ${JSON.stringify(out)}`);
    failed++;
  } else {
    console.log(`PASS: ${test.name}`);
    console.log(`  OUT: ${JSON.stringify(out)}`);
    passed++;
  }
}
console.log(`\n--- ${passed} passed, ${failed} failed ---`);
