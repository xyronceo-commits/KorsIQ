/**
 * Shared math formatting helpers for KorsIQ:
 * - `normalizeMathDelimiters`: normalizes `\(...\)` / `\[...\]` into `$...$` / `$$...$$` for KaTeX/remark-math.
 * - `latexToReadableMath`: converts LaTeX expressions into clean Unicode math for `.docx`, `.pdf`, and `.pptx` exports.
 */

const GREEK_AND_SYMBOLS: Array<[RegExp, string]> = [
  // Greek lowercase (use (?![A-Za-z]) instead of \b so \gamma_c and \nu_{ed} match)
  [/\\alpha(?![A-Za-z])/g, 'α'],
  [/\\beta(?![A-Za-z])/g, 'β'],
  [/\\gamma(?![A-Za-z])/g, 'γ'],
  [/\\delta(?![A-Za-z])/g, 'δ'],
  [/\\varepsilon(?![A-Za-z])/g, 'ε'],
  [/\\epsilon(?![A-Za-z])/g, 'ε'],
  [/\\zeta(?![A-Za-z])/g, 'ζ'],
  [/\\eta(?![A-Za-z])/g, 'η'],
  [/\\vartheta(?![A-Za-z])/g, 'θ'],
  [/\\theta(?![A-Za-z])/g, 'θ'],
  [/\\iota(?![A-Za-z])/g, 'ι'],
  [/\\kappa(?![A-Za-z])/g, 'κ'],
  [/\\lambda(?![A-Za-z])/g, 'λ'],
  [/\\mu(?![A-Za-z])/g, 'μ'],
  [/\\nu(?![A-Za-z])/g, 'ν'],
  [/\\xi(?![A-Za-z])/g, 'ξ'],
  [/\\pi(?![A-Za-z])/g, 'π'],
  [/\\varrho(?![A-Za-z])/g, 'ρ'],
  [/\\rho(?![A-Za-z])/g, 'ρ'],
  [/\\sigma(?![A-Za-z])/g, 'σ'],
  [/\\tau(?![A-Za-z])/g, 'τ'],
  [/\\upsilon(?![A-Za-z])/g, 'υ'],
  [/\\varphi(?![A-Za-z])/g, 'φ'],
  [/\\phi(?![A-Za-z])/g, 'φ'],
  [/\\chi(?![A-Za-z])/g, 'χ'],
  [/\\psi(?![A-Za-z])/g, 'ψ'],
  [/\\omega(?![A-Za-z])/g, 'ω'],
  // Greek uppercase
  [/\\Gamma(?![A-Za-z])/g, 'Γ'],
  [/\\Delta(?![A-Za-z])/g, 'Δ'],
  [/\\Theta(?![A-Za-z])/g, 'Θ'],
  [/\\Lambda(?![A-Za-z])/g, 'Λ'],
  [/\\Xi(?![A-Za-z])/g, 'Ξ'],
  [/\\Pi(?![A-Za-z])/g, 'Π'],
  [/\\Sigma(?![A-Za-z])/g, 'Σ'],
  [/\\Phi(?![A-Za-z])/g, 'Φ'],
  [/\\Psi(?![A-Za-z])/g, 'Ψ'],
  [/\\Omega(?![A-Za-z])/g, 'Ω'],
  // Relations & operators
  [/\\leq(?![A-Za-z])|\\le(?![A-Za-z])/g, '≤'],
  [/\\geq(?![A-Za-z])|\\ge(?![A-Za-z])/g, '≥'],
  [/\\neq(?![A-Za-z])|\\ne(?![A-Za-z])/g, '≠'],
  [/\\approx(?![A-Za-z])/g, '≈'],
  [/\\equiv(?![A-Za-z])/g, '≡'],
  [/\\sim(?![A-Za-z])/g, '~'],
  [/\\propto(?![A-Za-z])/g, '∝'],
  [/\\pm(?![A-Za-z])/g, '±'],
  [/\\mp(?![A-Za-z])/g, '∓'],
  [/\\times(?![A-Za-z])/g, '×'],
  [/\\cdot(?![A-Za-z])/g, '·'],
  [/\\div(?![A-Za-z])/g, '÷'],
  [/\\infty(?![A-Za-z])/g, '∞'],
  [/\\partial(?![A-Za-z])/g, '∂'],
  [/\\nabla(?![A-Za-z])/g, '∇'],
  [/\\sum(?![A-Za-z])/g, '∑'],
  [/\\prod(?![A-Za-z])/g, '∏'],
  [/\\int(?![A-Za-z])/g, '∫'],
  [/\\forall(?![A-Za-z])/g, '∀'],
  [/\\exists(?![A-Za-z])/g, '∃'],
  [/\\in(?![A-Za-z])/g, '∈'],
  [/\\notin(?![A-Za-z])/g, '∉'],
  [/\\subset(?![A-Za-z])/g, '⊂'],
  [/\\subseteq(?![A-Za-z])/g, '⊆'],
  [/\\cup(?![A-Za-z])/g, '∪'],
  [/\\cap(?![A-Za-z])/g, '∩'],
  [/\\rightarrow(?![A-Za-z])|\\to(?![A-Za-z])/g, '→'],
  [/\\leftarrow(?![A-Za-z])/g, '←'],
  [/\\Rightarrow(?![A-Za-z])|\\implies(?![A-Za-z])/g, '⇒'],
  [/\\Leftrightarrow(?![A-Za-z])|\\iff(?![A-Za-z])/g, '⇔'],
  [/\\therefore(?![A-Za-z])/g, '∴'],
  [/\\because(?![A-Za-z])/g, '∵'],
  [/\\degree(?![A-Za-z])/g, '°'],
  [/\\circ(?![A-Za-z])/g, '°'],
  [/\\ldots(?![A-Za-z])|\\cdots(?![A-Za-z])|\\dots(?![A-Za-z])/g, '…'],
  [/\\percent(?![A-Za-z])|\\%/g, '%'],
];

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
};

/**
 * Extracts a `{...}` balanced brace group starting at `startIdx` (which must point at `{`).
 * Returns `{ content, endIdx }` where `endIdx` is the index right after the closing `}`, or null.
 */
function readBraceGroup(str: string, startIdx: number): { content: string; endIdx: number } | null {
  if (str[startIdx] !== '{') return null;
  let depth = 0;
  for (let i = startIdx; i < str.length; i += 1) {
    if (str[i] === '{') depth += 1;
    else if (str[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return { content: str.slice(startIdx + 1, i), endIdx: i + 1 };
      }
    }
  }
  return null;
}

/**
 * Replaces `\frac{A}{B}` (including nested fractions) with readable `A / B` or `(A) / (B)`.
 */
function replaceFractions(input: string): string {
  let out = input;
  let guard = 0;
  while (/\\(?:d|t)?frac\s*\{/.test(out) && guard < 20) {
    guard += 1;
    const match = /\\(?:d|t)?frac\s*\{/.exec(out);
    if (!match) break;
    const numStart = match.index + match[0].length - 1;
    const numGroup = readBraceGroup(out, numStart);
    if (!numGroup) break;
    let denStart = numGroup.endIdx;
    while (denStart < out.length && /\s/.test(out[denStart])) denStart += 1;
    const denGroup = readBraceGroup(out, denStart);
    if (!denGroup) break;

    const num = numGroup.content.trim();
    const den = denGroup.content.trim();
    const needsNumParens = /[+\-/\s]/.test(num) && !/^\(.*\)$/.test(num);
    const needsDenParens = /[+\-/\s]/.test(den) && !/^\(.*\)$/.test(den);
    const formatted = `${needsNumParens ? `(${num})` : num} / ${needsDenParens ? `(${den})` : den}`;
    out = out.slice(0, match.index) + formatted + out.slice(denGroup.endIdx);
  }
  return out;
}

/**
 * Replaces `\sqrt{X}` and `\sqrt[n]{X}` with `√(X)` or `ⁿ√(X)`.
 */
function replaceRoots(input: string): string {
  let out = input;
  let guard = 0;
  while (/\\sqrt(?:\[[^\]]*\])?\s*\{/.test(out) && guard < 20) {
    guard += 1;
    const match = /\\sqrt(?:\[([^\]]*)\])?\s*\{/.exec(out);
    if (!match) break;
    const deg = match[1]?.trim();
    const groupStart = match.index + match[0].length - 1;
    const group = readBraceGroup(out, groupStart);
    if (!group) break;
    const inner = group.content.trim();
    const prefix = deg
      ? deg
          .split('')
          .map((ch) => SUPERSCRIPT_MAP[ch] || ch)
          .join('')
      : '';
    out = out.slice(0, match.index) + `${prefix}√(${inner})` + out.slice(group.endIdx);
  }
  return out;
}

/**
 * Unwraps `\text{...}`, `\mathrm{...}`, `\mathbf{...}`, `\operatorname{...}`, etc.
 */
function unwrapTextCommands(input: string): string {
  let out = input;
  let guard = 0;
  while (/\\(?:text|textrm|textbf|textit|mathrm|mathbf|mathit|mathsf|operatorname|boldsymbol)\s*\{/.test(out) && guard < 30) {
    guard += 1;
    const match = /\\(?:text|textrm|textbf|textit|mathrm|mathbf|mathit|mathsf|operatorname|boldsymbol)\s*\{/.exec(out);
    if (!match) break;
    const groupStart = match.index + match[0].length - 1;
    const group = readBraceGroup(out, groupStart);
    if (!group) break;
    out = out.slice(0, match.index) + group.content + out.slice(group.endIdx);
  }
  return out;
}

/**
 * Converts a single LaTeX math expression (without outer delimiters) into clean Unicode math.
 */
export function convertLatexExpression(expr: string): string {
  let s = (expr || '').trim();
  if (!s) return '';

  // Remove sizing/spacing wrappers
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b/g, '');
  s = s.replace(/\\(?:quad|qquad|,|;|!|:| )+/g, ' ');
  s = s.replace(/\\(?:displaystyle|textstyle|scriptstyle)\b/g, '');

  // Unwrap \text{...}, \mathrm{...}, etc.
  s = unwrapTextCommands(s);

  // Convert degrees early: 21.8^\circ or 21.8^{\circ} -> 21.8°
  s = s.replace(/\^\s*\{\s*\\circ\s*\}/g, '°');
  s = s.replace(/\^\s*\\circ(?![A-Za-z])/g, '°');

  // Convert roots and fractions (handles nesting)
  s = replaceRoots(s);
  s = replaceFractions(s);

  // Replace Greek letters & math operators
  for (const [pattern, replacement] of GREEK_AND_SYMBOLS) {
    s = s.replace(pattern, replacement);
  }

  // Common trig/log functions: \sin -> sin
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|lim|min|max|det|mod)\b/g, '$1');

  // Simple numeric superscripts: ^2 -> ², ^{2} -> ², ^{-1} -> ⁻¹
  s = s.replace(/\^\{([0-9+-]+)\}/g, (_, exp: string) =>
    exp
      .split('')
      .map((ch) => SUPERSCRIPT_MAP[ch] || ch)
      .join('')
  );
  s = s.replace(/\^([0-9])/g, (_, digit: string) => SUPERSCRIPT_MAP[digit] || `^${digit}`);

  // Clean braces around subscripts and superscripts: f_{cd} -> f_cd, x^{n+1} -> x^(n+1)
  s = s.replace(/_\{([^{}]+)\}/g, '_$1');
  s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');

  // Remove any remaining stray curly braces or backslashes before punctuation
  s = s.replace(/\\([{}%$&_#])/g, '$1');
  s = s.replace(/[{}]/g, '');

  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Normalizes LaTeX delimiters (`\[...\]` -> `$$...$$`, `\(...\)` -> `$...$`)
 * outside fenced code blocks so remark-math / KaTeX render every equation cleanly.
 */
export function normalizeMathDelimiters(markdown: string): string {
  if (!markdown) return '';
  const parts = markdown.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) return part; // leave fenced code blocks untouched
      return part
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => `\n$$\n${inner.trim()}\n$$\n`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) => `$${inner.trim()}$`);
    })
    .join('');
}

/**
 * Converts all LaTeX math (block `$$...$$`, `\[...\]`, inline `$...$`, `\(...\)`, and stray commands)
 * inside a text string into clean, human-readable Unicode math for `.docx`, `.pdf`, and `.pptx` exports.
 */
export function latexToReadableMath(text: string): string {
  if (!text) return '';
  let out = text;

  // 1. Block display math: $$...$$ and \[...\]
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr: string) => convertLatexExpression(expr));
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr: string) => convertLatexExpression(expr));

  // 2. Inline math: \(...\) and $...$ (avoid currency like $50 or $50 and $100)
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr: string) => convertLatexExpression(expr));
  out = out.replace(/(?<!\\)\$(?!\s*\d[\d,.]*(?:\s|$))([^$\n]+?)\$/g, (_, expr: string) =>
    convertLatexExpression(expr)
  );

  // 3. Any remaining unwrapped LaTeX commands (e.g. from partial edits or AI forgetting $)
  if (/\\(?:frac|dfrac|tfrac|sqrt|gamma|varepsilon|delta|nu|theta|rho|pi|sigma|tau|alpha|beta|lambda|mu|phi|omega|le|ge|leq|geq|approx|times|cdot|pm|circ|text|left|right)(?![A-Za-z])/.test(out)) {
    out = convertLatexExpression(out);
  }

  // Clean up any stray double dollar signs left over
  out = out.replace(/\$\$/g, '').trim();
  return out;
}
