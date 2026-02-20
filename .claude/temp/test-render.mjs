import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

async function render(label, input) {
  try {
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeStringify)
      .process(input);

    const html = String(result);
    const hasKatex = html.includes('katex');
    const hasRawDollar = html.includes('$\\');
    console.log(`=== ${label} ===`);
    console.log(`KaTeX rendered: ${hasKatex}`);
    console.log(`Raw $ visible: ${hasRawDollar}`);
    if (!hasKatex) {
      console.log(`HTML (first 300): ${html.substring(0, 300)}`);
    }
    console.log();
  } catch (e) {
    console.log(`=== ${label} === ERROR: ${e.message}`);
    console.log();
  }
}

// Test basic math
await render('Simple inline', 'Hello $x^2$ world');
await render('Simple display', 'Hello\n\n$$E = mc^2$$\n\nworld');

// Test the Lagrangian formula
await render('Lagrangian inline', '$L(x,\\lambda,\\nu) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x) + \\sum_{j=1}^p \\nu_j h_j(x),$');

// Test display math converted from \[...\]
await render('Display converted to inline by Step5', '$L(x,\\lambda,\\nu) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x)$');

// Test with surrounding text
await render('Inline in context', 'Define the **Lagrangian**: $L(x,\\lambda,\\nu) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x)$');

// Test multiple inline on one line
await render('Multiple inline', 'Sign convention: $g_i \\leq 0$ yields $\\lambda_i \\geq 0$; some formulations flip signs.');

// Test display math
await render('Display math $$', '$$L(x,\\lambda,\\nu) = f(x) + \\sum_{i=1}^m \\lambda_i g_i(x)$$');

// Test the problematic bare LaTeX wrapping
await render('Bare LaTeX over-wrapped', '$with \\lambda \\in \\mathbb{R}^m_{\\geq 0} for inequalities and unrestricted \\nu \\in \\mathbb{R}^p for equalities.$');

// Test edge case: comma before closing $
await render('Comma before closing $', '$f(x) + g(x),$');

// Test with \( \) delimiters converted
await render('Converted \\( \\)', 'where $\\nabla f$ must lie in the cone');
