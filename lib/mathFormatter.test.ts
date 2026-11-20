import assert from 'node:assert/strict';
import {
  convertLatexExpression,
  latexToReadableMath,
  normalizeMathDelimiters,
} from './mathFormatter';

// 1. Structural engineering formulas (Eurocode 2)
{
  const fcd = latexToReadableMath('Design strength is $$f_{cd} = \\frac{f_{ck}}{\\gamma_c}$$.');
  assert.equal(fcd, 'Design strength is f_cd = f_ck / γ_c.');
  assert.ok(!fcd.includes('$') && !fcd.includes('\\frac') && !fcd.includes('\\gamma'));

  const xd = latexToReadableMath('Neutral axis ratio: $\\frac{x}{d} \\le \\delta - 0.4$');
  assert.equal(xd, 'Neutral axis ratio: x / d ≤ δ - 0.4');
  assert.ok(!xd.includes('\\le') && !xd.includes('\\delta'));

  const shear = latexToReadableMath('\\[\\nu_{ed} = \\frac{V_{ed}}{b_w d}\\]');
  assert.equal(shear, 'ν_ed = V_ed / (b_w d)');

  const angle = latexToReadableMath('Strut inclination $\\theta = 21.8^\\circ$ to $45^\\circ$.');
  assert.equal(angle, 'Strut inclination θ = 21.8° to 45°.');
}

// 2. Roots, Greek letters, operators, and \text{}
{
  const quad = convertLatexExpression('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  assert.equal(quad, 'x = (-b ± √(b² - 4ac)) / 2a');

  const stress = latexToReadableMath('Strain $\\varepsilon_{cu} \\approx 0.0035$ and $\\rho \\ge 0.0013$.');
  assert.equal(stress, 'Strain ε_cu ≈ 0.0035 and ρ ≥ 0.0013.');

  const textWrap = latexToReadableMath('$A_{s,\\text{req}} = \\frac{M}{0.87 f_{yk} z}$');
  assert.equal(textWrap, 'A_s,req = M / (0.87 f_yk z)');
}

// 3. Currency values are preserved intact
{
  const price = latexToReadableMath('The budget is $50 for materials and $100 for lab testing.');
  assert.equal(price, 'The budget is $50 for materials and $100 for lab testing.');
}

// 4. Delimiter normalization for KaTeX / remark-math (skips fenced code blocks)
{
  const md = 'Inline \\(a^2 + b^2 = c^2\\) and block:\n\\[f_{cd} = \\frac{f_{ck}}{\\gamma_c}\\]\n```tex\n\\(keep_me\\)\n```';
  const normalized = normalizeMathDelimiters(md);
  assert.ok(normalized.includes('$a^2 + b^2 = c^2$'));
  assert.ok(normalized.includes('$$\nf_{cd} = \\frac{f_{ck}}{\\gamma_c}\n$$'));
  assert.ok(normalized.includes('\\(keep_me\\)'));
}

console.log('All mathFormatter tests passed!');
