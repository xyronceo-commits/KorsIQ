import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { normalizeMathDelimiters } from '../lib/mathFormatter';

interface FormattedContentProps {
  content: string;
  className?: string;
}

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS: any[] = [[rehypeKatex, { throwOnError: false, strict: false }]];

/**
 * Renders rich GitHub-flavored Markdown + inline/block LaTeX math via KaTeX.
 * Malformed LaTeX never crashes the UI (`throwOnError: false`).
 */
export const FormattedContent: React.FC<FormattedContentProps> = ({ content, className = '' }) => {
  const normalized = useMemo(() => normalizeMathDelimiters(content || ''), [content]);

  return (
    <div className={`korsiq-formatted-content ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Renders a standalone display LaTeX formula via KaTeX (for Academic Studio Preview canvases).
 */
export function renderKatexHtml(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return expr;
  }
}

export default FormattedContent;
