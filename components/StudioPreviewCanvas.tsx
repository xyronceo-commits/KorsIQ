import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import { AcademicDocument, StudioSection, StudioVisualBlock } from '../types';
import {
  DocumentTemplate,
  SlideTemplate,
  documentTemplateToVisualPalette,
  slideTemplateToVisualPalette,
} from '../lib/studioTemplates';
import { formatReferenceEntry } from '../lib/studioV2';
import StudioVisualCard from './StudioVisualCard';

export function getSectionAnchorId(sectionId: string): string {
  return `studio-preview-sec-${sectionId}`;
}

/**
 * Renders inline Markdown (**bold**, *italic*, `code`, [label](url)) cleanly
 * without ever exposing raw Markdown tokens in Preview mode.
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const input = (text || '').replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  const tokens: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*|_([^_]+)_)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(input.slice(lastIdx, match.index));
    }
    if (match[2] || match[3]) {
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold">
          {match[2] || match[3]}
        </strong>
      );
    } else if (match[4]) {
      tokens.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1 py-0.5 rounded bg-slate-100 text-[0.9em] font-mono"
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      tokens.push(
        <span key={`l-${keyIdx++}`} className="underline underline-offset-2">
          {match[5]}
        </span>
      );
    } else if (match[7] || match[8]) {
      tokens.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {match[7] || match[8]}
        </em>
      );
    }
    lastIdx = pattern.lastIndex;
  }

  if (lastIdx < input.length) {
    tokens.push(input.slice(lastIdx));
  }
  return tokens.length > 0 ? tokens : input;
}

function stripInlineMarkdownPlain(text: string): string {
  return (text || '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

function isDividerRow(line: string): boolean {
  return /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(line.trim());
}

function parsePipeRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * Renders structured section Markdown blocks styled strictly by DocumentTemplate tokens.
 */
const RenderedMarkdownBlocks: React.FC<{
  content: string;
  template: DocumentTemplate;
}> = ({ content, template }) => {
  const { colors, fonts, layout } = template;
  const lines = (content || '').split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    // Markdown table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cur = lines[i].trim();
        if (!isDividerRow(cur)) {
          tableLines.push(cur);
        }
        i += 1;
      }
      if (tableLines.length >= 2) {
        const headers = parsePipeRow(tableLines[0]);
        const rows = tableLines.slice(1).map(parsePipeRow);
        nodes.push(
          <div key={`tbl-${blockKey++}`} className="my-5 overflow-x-auto">
            <table
              className="w-full text-sm border-collapse"
              style={{ borderColor: colors.border }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: colors.tableHeaderBg,
                    color: colors.tableHeaderText,
                  }}
                >
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="text-left px-3 py-2 border font-semibold text-xs"
                      style={{ borderColor: colors.border }}
                    >
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      backgroundColor:
                        rIdx % 2 === 1 ? colors.tableStripeBg : colors.pageBg,
                    }}
                  >
                    {headers.map((_, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 border text-xs align-top"
                        style={{ borderColor: colors.border, color: colors.text }}
                      >
                        {renderInlineMarkdown(row[cIdx] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Headings (## / ### / ####)
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const headingText = hMatch[2].trim();
      if (level <= 2) {
        nodes.push(
          <h3
            key={`h2-${blockKey++}`}
            className="font-bold mt-6 mb-2.5 leading-snug"
            style={{
              color: colors.heading,
              fontFamily: fonts.headingCss,
              fontSize: `${Math.max(15, template.sizes.h2Pt * 1.3)}px`,
            }}
          >
            {renderInlineMarkdown(headingText)}
          </h3>
        );
      } else {
        nodes.push(
          <h4
            key={`h3-${blockKey++}`}
            className="font-semibold mt-4 mb-2 leading-snug"
            style={{
              color: colors.heading,
              fontFamily: fonts.headingCss,
              fontSize: `${Math.max(14, template.sizes.h3Pt * 1.25)}px`,
            }}
          >
            {renderInlineMarkdown(headingText)}
          </h4>
        );
      }
      i += 1;
      continue;
    }

    // Blockquote / Callout
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      nodes.push(
        <blockquote
          key={`q-${blockKey++}`}
          className={`my-4 px-4 py-3 text-sm leading-relaxed ${
            layout.calloutStyle === 'editorial_quote' ? 'italic' : ''
          }`}
          style={{
            backgroundColor: colors.accentSoft,
            borderLeft: `3px solid ${colors.accent}`,
            borderTop:
              layout.calloutStyle === 'plain_border' || layout.calloutStyle === 'slate_box'
                ? `1px solid ${colors.border}`
                : undefined,
            borderRight:
              layout.calloutStyle === 'plain_border' || layout.calloutStyle === 'slate_box'
                ? `1px solid ${colors.border}`
                : undefined,
            borderBottom:
              layout.calloutStyle === 'plain_border' || layout.calloutStyle === 'slate_box'
                ? `1px solid ${colors.border}`
                : undefined,
            color: colors.text,
          }}
        >
          {renderInlineMarkdown(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${blockKey++}`} className="my-3 pl-6 list-disc space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={idx}
              style={{
                color: colors.text,
                lineHeight: Math.max(1.5, template.lineSpacing),
              }}
            >
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      nodes.push(
        <ol key={`ol-${blockKey++}`} className="my-3 pl-6 list-decimal space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={idx}
              style={{
                color: colors.text,
                lineHeight: Math.max(1.5, template.lineSpacing),
              }}
            >
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard paragraph (join consecutive plain lines until blank or block starter)
    const paraLines: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        next.startsWith('#') ||
        next.startsWith('> ') ||
        next.startsWith('|') ||
        /^[-*•]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i += 1;
    }

    nodes.push(
      <p
        key={`p-${blockKey++}`}
        className="mb-4"
        style={{
          color: colors.text,
          lineHeight: Math.max(1.55, template.lineSpacing),
          textIndent: template.id === 'university-standard' ? '1.5em' : undefined,
        }}
      >
        {renderInlineMarkdown(paraLines.join(' '))}
      </p>
    );
  }

  return <>{nodes}</>;
};

interface StudioDocumentPreviewProps {
  doc: AcademicDocument;
  sections: StudioSection[];
  template: DocumentTemplate;
  onSelectSectionForEdit?: (sectionId: string) => void;
}

export const StudioDocumentPreview: React.FC<StudioDocumentPreviewProps> = ({
  doc,
  sections,
  template,
  onSelectSectionForEdit,
}) => {
  const { colors, fonts, layout } = template;
  const visualPalette = useMemo(() => documentTemplateToVisualPalette(template), [template]);
  const meta = doc.metadata || {};
  const brief = doc.brief;
  const institution = brief?.institution || meta.institution || '';
  const faculty = brief?.faculty || brief?.department || meta.faculty || meta.department || '';
  const courseCode = brief?.courseCode || meta.courseCode || doc.subject || '';
  const courseTitle = brief?.courseTitle || meta.courseTitle || '';
  const studentName = brief?.studentName || meta.studentName || '';
  const studentId = brief?.matricNumber || meta.studentId || '';
  const supervisor = brief?.supervisorName || meta.lecturerName || '';
  const submissionDate = brief?.date || meta.submissionDate || '';

  return (
    <div
      className="w-full max-w-[780px] mx-auto my-6 sm:my-8 rounded-lg border shadow-xs overflow-hidden"
      data-preview-mode="document"
      data-active-template-id={template.id}
      style={{
        backgroundColor: colors.pageBg,
        borderColor: colors.border === '#000000' ? '#E5E7EB' : colors.border,
        color: colors.text,
        fontFamily: fonts.bodyCss,
        fontSize: `${Math.max(14, template.sizes.bodyPt * 1.25)}px`,
      }}
    >
      {/* Document Cover / Title Header styled by DocumentTemplate */}
      {layout.coverStyle === 'executive_banner' ? (
        <div
          className="px-5 py-7 sm:px-10 sm:py-10 border-b-4"
          style={{
            backgroundColor: colors.coverBg,
            color: colors.coverText,
            borderColor: colors.accent,
          }}
        >
          {(institution || courseCode) && (
            <p className="text-xs uppercase tracking-widest opacity-80 mb-2">
              {[institution, courseCode].filter(Boolean).join(' · ')}
            </p>
          )}
          <h1
            className="text-xl sm:text-2xl font-bold leading-snug"
            style={{ fontFamily: fonts.headingCss }}
          >
            {doc.title}
          </h1>
          {(studentName || submissionDate || supervisor) && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs opacity-85">
              {studentName && (
                <span>
                  {studentName}
                  {studentId ? ` (${studentId})` : ''}
                </span>
              )}
              {supervisor && <span>Supervisor: {supervisor}</span>}
              {submissionDate && <span>{submissionDate}</span>}
            </div>
          )}
        </div>
      ) : layout.coverStyle === 'editorial_left' ? (
        <div
          className="px-5 pt-7 pb-6 sm:px-10 sm:pt-12 sm:pb-8 border-b"
          style={{ borderColor: colors.border }}
        >
          <div className="border-l-4 pl-4 space-y-2" style={{ borderColor: colors.accent }}>
            {(courseCode || institution) && (
              <p className="text-xs uppercase tracking-widest" style={{ color: colors.muted }}>
                {[courseCode, institution].filter(Boolean).join(' · ')}
              </p>
            )}
            <h1
              className="text-xl sm:text-2xl font-bold leading-snug"
              style={{ color: colors.heading, fontFamily: fonts.headingCss }}
            >
              {doc.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1" style={{ color: colors.muted }}>
              {studentName && <span>{studentName}</span>}
              {faculty && <span>{faculty}</span>}
              {submissionDate && <span>{submissionDate}</span>}
            </div>
          </div>
        </div>
      ) : layout.coverStyle === 'technical_compact' ? (
        <div
          className="px-5 pt-6 pb-6 sm:px-10 sm:pt-10 sm:pb-8 border-b"
          style={{ backgroundColor: colors.coverBg, borderColor: colors.border }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono mb-2" style={{ color: colors.muted }}>
            <span>{[courseCode, doc.docType.replace('_', ' ').toUpperCase()].filter(Boolean).join(' · ')}</span>
            {submissionDate && <span>{submissionDate}</span>}
          </div>
          <h1
            className="text-xl sm:text-2xl font-bold leading-snug"
            style={{ color: colors.heading, fontFamily: fonts.headingCss }}
          >
            {doc.title}
          </h1>
          <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs" style={{ borderColor: colors.border, color: colors.muted }}>
            {studentName && <span>Author: <strong style={{ color: colors.text }}>{studentName}{studentId ? ` (${studentId})` : ''}</strong></span>}
            {institution && <span>Institution: <strong style={{ color: colors.text }}>{institution}</strong></span>}
            {courseTitle && <span>Course: <strong style={{ color: colors.text }}>{courseTitle}</strong></span>}
            {supervisor && <span>Supervisor: <strong style={{ color: colors.text }}>{supervisor}</strong></span>}
          </div>
        </div>
      ) : layout.coverStyle === 'clean_academic' ? (
        <div
          className="px-5 pt-7 pb-6 sm:px-10 sm:pt-11 sm:pb-8 border-b"
          style={{ borderColor: colors.border }}
        >
          <div className="h-1 w-full mb-5" style={{ backgroundColor: colors.accent }} />
          {(institution || courseCode) && (
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.accent }}>
              {[institution, courseCode].filter(Boolean).join(' · ')}
            </p>
          )}
          <h1
            className="text-xl sm:text-2xl font-bold leading-snug"
            style={{ color: colors.heading, fontFamily: fonts.headingCss }}
          >
            {doc.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: colors.muted }}>
            {studentName && <span>Prepared by <strong style={{ color: colors.text }}>{studentName}</strong></span>}
            {faculty && <span>{faculty}</span>}
            {submissionDate && <span>{submissionDate}</span>}
          </div>
        </div>
      ) : (
        /* formal_centered (Strict University Standard) */
        <div
          className="px-5 py-8 sm:px-10 sm:py-12 border-b text-center space-y-2.5"
          style={{ borderColor: '#E5E7EB' }}
        >
          {institution && (
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.heading }}>
              {institution}
            </p>
          )}
          {faculty && (
            <p className="text-xs uppercase" style={{ color: colors.muted }}>
              {faculty}
            </p>
          )}
          <h1
            className="text-lg sm:text-xl font-bold uppercase leading-snug pt-3 pb-2"
            style={{ color: colors.heading, fontFamily: fonts.headingCss }}
          >
            {doc.title}
          </h1>
          <div className="text-xs space-y-1 pt-1" style={{ color: colors.text }}>
            {studentName && (
              <p className="font-semibold">
                {studentName}
                {studentId ? ` — ${studentId}` : ''}
              </p>
            )}
            {(courseCode || courseTitle) && (
              <p>{[courseCode, courseTitle].filter(Boolean).join(' — ')}</p>
            )}
            {supervisor && <p>Supervisor: {supervisor}</p>}
            {submissionDate && <p>{submissionDate}</p>}
          </div>
        </div>
      )}

      {/* Assembled Document Body */}
      <div className="px-5 py-6 sm:px-10 sm:py-12 space-y-9">
        {sections.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: colors.muted }}>
            No drafted sections yet. Switch to Edit mode to start writing.
          </div>
        ) : (
          sections.map((section, idx) => (
            <article
              key={section.id}
              id={getSectionAnchorId(section.id)}
              className="scroll-mt-6 group"
            >
              <div
                className={`flex items-center justify-between gap-3 mb-4 ${
                  layout.headingRule === 'thin_bottom' ||
                  layout.headingRule === 'numbered_slate' ||
                  layout.headingRule === 'editorial_serif'
                    ? 'pb-2 border-b'
                    : ''
                }`}
                style={{
                  borderColor:
                    layout.headingRule === 'thin_bottom' ? colors.accent : colors.border,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {layout.headingRule === 'left_bar' && (
                    <span
                      className="w-1 h-5 shrink-0"
                      style={{ backgroundColor: colors.accent }}
                    />
                  )}
                  <h2
                    className="font-bold leading-snug"
                    style={{
                      color: colors.heading,
                      fontFamily: fonts.headingCss,
                      fontSize: `${Math.max(17, template.sizes.h1Pt * 1.32)}px`,
                    }}
                  >
                    {layout.headingRule === 'numbered_slate'
                      ? `${String(idx + 1).padStart(2, '0')}. ${section.title}`
                      : section.title}
                  </h2>
                </div>

                {onSelectSectionForEdit && (
                  <button
                    type="button"
                    onClick={() => onSelectSectionForEdit(section.id)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2.5 py-1 rounded border border-[#E5E7EB] bg-white text-[11px] font-medium text-[#2563EB] hover:border-[#2563EB] cursor-pointer shrink-0 font-sans"
                  >
                    Edit section
                  </button>
                )}
              </div>

              {section.content && section.content.trim() ? (
                <RenderedMarkdownBlocks content={section.content} template={template} />
              ) : (
                <p className="text-sm italic" style={{ color: colors.muted }}>
                  This section has no drafted text yet.
                </p>
              )}

              {Array.isArray(section.visuals) && section.visuals.length > 0 && (
                <div className="mt-5 space-y-4">
                  {section.visuals.map((vis) => (
                    <StudioVisualCard
                      key={vis.id}
                      block={vis}
                      designStyle={doc.metadata?.visualPreferences?.designStyle}
                      palette={visualPalette}
                    />
                  ))}
                </div>
              )}
            </article>
          ))
        )}

        {/* References Section */}
        {doc.references && doc.references.length > 0 && doc.metadata?.includeReferences !== false && (
          <section
            id="studio-preview-references"
            className="pt-8 border-t space-y-3"
            style={{ borderColor: colors.border === '#000000' ? '#E5E7EB' : colors.border }}
          >
            <h2
              className="font-bold"
              style={{
                color: colors.heading,
                fontFamily: fonts.headingCss,
                fontSize: `${Math.max(17, template.sizes.h1Pt * 1.32)}px`,
              }}
            >
              References
            </h2>
            <ol className="space-y-2.5 text-sm leading-relaxed">
              {doc.references.map((ref, idx) => (
                <li
                  key={ref.id}
                  className="pl-6 -indent-6"
                  style={{ color: colors.text }}
                >
                  {formatReferenceEntry(ref, doc.citationStyle || 'APA 7', idx + 1)}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
};

interface SlideDeckItem {
  id: string;
  sectionId?: string;
  kind: 'title' | 'content' | 'visual' | 'references';
  title: string;
  subtitle?: string;
  bullets?: string[];
  speakerNotes?: string;
  visual?: StudioVisualBlock;
  slideNumber: number;
}

function extractBulletsForPreview(content: string): string[] {
  const lines = (content || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('|'));

  const bullets: string[] = [];
  for (const line of lines) {
    const m = line.match(/^([-*•]|\d+\.)\s+(.+)$/);
    if (m) {
      const clean = stripInlineMarkdownPlain(m[2]);
      if (clean) bullets.push(clean);
      continue;
    }
    const clean = stripInlineMarkdownPlain(line);
    if (!clean) continue;
    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
    if (sentences.length > 0) {
      bullets.push(...sentences);
    } else {
      bullets.push(clean);
    }
  }
  return bullets.length > 0 ? bullets : ['Key talking points for this slide.'];
}

interface StudioSlideDeckPreviewProps {
  doc: AcademicDocument;
  sections: StudioSection[];
  template: SlideTemplate;
  activeSectionId: string | null;
  onSelectSectionId?: (sectionId: string) => void;
  onEditCurrentSlide?: (sectionId: string) => void;
}

export const StudioSlideDeckPreview: React.FC<StudioSlideDeckPreviewProps> = ({
  doc,
  sections,
  template,
  activeSectionId,
  onSelectSectionId,
  onEditCurrentSlide,
}) => {
  const { colors, fonts, layout } = template;
  const visualPalette = useMemo(() => slideTemplateToVisualPalette(template), [template]);

  const speakerNotesBySection = useMemo(() => {
    const map = new Map<string, string>();
    const blocks = doc.convertedVariants?.slides?.contentBlocks || doc.contentBlocks || [];
    for (const blk of blocks) {
      if (blk.type === 'slide' && blk.speakerNotes) {
        map.set(blk.sectionId, blk.speakerNotes);
      }
    }
    return map;
  }, [doc.contentBlocks, doc.convertedVariants?.slides?.contentBlocks]);

  const slides: SlideDeckItem[] = useMemo(() => {
    const out: SlideDeckItem[] = [];
    const subtitleParts = [
      doc.brief?.courseCode || doc.metadata?.courseCode || doc.subject,
      doc.brief?.studentName || doc.metadata?.studentName,
      doc.brief?.institution || doc.metadata?.institution,
      doc.brief?.date || doc.metadata?.submissionDate,
    ].filter(Boolean);

    out.push({
      id: 'slide-title',
      kind: 'title',
      title: doc.title,
      subtitle: subtitleParts.join(' · '),
      slideNumber: 1,
    });

    const MAX_BULLETS = 5;
    for (const sec of sections) {
      const bullets = extractBulletsForPreview(sec.content);
      const chunks = Math.max(1, Math.ceil(bullets.length / MAX_BULLETS));
      for (let c = 0; c < chunks; c += 1) {
        out.push({
          id: `slide-${sec.id}-${c}`,
          sectionId: sec.id,
          kind: 'content',
          title: chunks > 1 ? `${sec.title} (${c + 1}/${chunks})` : sec.title,
          bullets: bullets.slice(c * MAX_BULLETS, (c + 1) * MAX_BULLETS),
          speakerNotes: c === 0 ? speakerNotesBySection.get(sec.id) : undefined,
          slideNumber: out.length + 1,
        });
      }
      for (const vis of sec.visuals || []) {
        out.push({
          id: `slide-vis-${vis.id}`,
          sectionId: sec.id,
          kind: 'visual',
          title: `${sec.title}: ${vis.title}`,
          visual: vis,
          slideNumber: out.length + 1,
        });
      }
    }

    if (doc.references && doc.references.length > 0 && doc.metadata?.includeReferences !== false) {
      out.push({
        id: 'slide-references',
        kind: 'references',
        title: 'References',
        bullets: doc.references.slice(0, 6).map((r, i) =>
          formatReferenceEntry(r, doc.citationStyle || 'APA 7', i + 1)
        ),
        slideNumber: out.length + 1,
      });
    }

    return out;
  }, [doc, sections, speakerNotesBySection]);

  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Sync outline selection to slide index when user picks a slide from Outline rail
  useEffect(() => {
    if (!activeSectionId) return;
    const matchIdx = slides.findIndex((s) => s.sectionId === activeSectionId);
    if (matchIdx >= 0) {
      setCurrentSlideIdx(matchIdx);
    }
  }, [activeSectionId, slides]);

  const safeIdx = Math.min(currentSlideIdx, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeIdx] || slides[0];
  const courseCode = doc.brief?.courseCode || doc.metadata?.courseCode || doc.subject || '';

  const goTo = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIdx));
    setCurrentSlideIdx(clamped);
    const targetSecId = slides[clamped]?.sectionId;
    if (targetSecId && onSelectSectionId) {
      onSelectSectionId(targetSecId);
    }
  };

  return (
    <div
      className="w-full max-w-[920px] mx-auto my-6 sm:my-8 px-4 sm:px-6 space-y-5"
      data-preview-mode="slides"
      data-active-template-id={template.id}
    >
      {/* Slide Deck Stage (True 16:9 Widescreen) */}
      <div
        className="w-full aspect-video rounded-xl border shadow-sm overflow-hidden flex flex-col justify-between relative"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.body,
          fontFamily: fonts.bodyCss,
        }}
      >
        {currentSlide.kind === 'title' ? (
          layout.titleLayout === 'pitch_split_hero' ? (
            <div className="grid grid-cols-12 h-full">
              <div
                className="col-span-8 p-6 sm:p-10 flex flex-col justify-between"
                style={{ backgroundColor: colors.titleBg, color: colors.titleText }}
              >
                <div>
                  {courseCode && (
                    <span
                      className="inline-block px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
                      style={{ backgroundColor: colors.accent, color: colors.accentText }}
                    >
                      {courseCode}
                    </span>
                  )}
                </div>
                <h1
                  className="text-xl sm:text-3xl font-bold leading-tight"
                  style={{ fontFamily: fonts.headingCss }}
                >
                  {currentSlide.title}
                </h1>
                <p className="text-xs sm:text-sm opacity-80">{currentSlide.subtitle}</p>
              </div>
              <div
                className="col-span-4 p-6 flex flex-col justify-center gap-4 border-l-4"
                style={{ backgroundColor: colors.surface, borderColor: colors.accent }}
              >
                <div>
                  <div className="text-2xl font-bold" style={{ color: colors.accent }}>
                    {slides.length}
                  </div>
                  <div className="text-xs font-medium" style={{ color: colors.muted }}>
                    Slides in Deck
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold uppercase" style={{ color: colors.heading }}>
                    {doc.docType.replace('_', ' ')}
                  </div>
                  <div className="text-xs" style={{ color: colors.muted }}>
                    16:9 Widescreen
                  </div>
                </div>
              </div>
            </div>
          ) : layout.titleLayout === 'editorial_asymmetric' ? (
            <div className="grid grid-cols-12 h-full">
              <div
                className="col-span-4 p-6 sm:p-8 flex flex-col justify-between border-r-4"
                style={{
                  backgroundColor: colors.titleBg,
                  color: colors.titleText,
                  borderColor: colors.accent,
                }}
              >
                <span className="text-xs uppercase tracking-widest opacity-85">
                  {courseCode || 'Seminar Deck'}
                </span>
                <div className="h-1 w-12" style={{ backgroundColor: colors.accent }} />
              </div>
              <div className="col-span-8 p-6 sm:p-10 flex flex-col justify-between">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: colors.accent }}
                >
                  Academic Presentation
                </span>
                <h1
                  className="text-xl sm:text-3xl font-bold leading-tight"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  {currentSlide.title}
                </h1>
                <p className="text-xs sm:text-sm" style={{ color: colors.muted }}>
                  {currentSlide.subtitle}
                </p>
              </div>
            </div>
          ) : layout.titleLayout === 'dark_executive' ? (
            <div className="p-6 sm:p-12 h-full flex flex-col justify-between">
              <div className="h-1.5 w-16" style={{ backgroundColor: colors.accent }} />
              <h1
                className="text-xl sm:text-3xl font-bold leading-tight"
                style={{ color: colors.heading, fontFamily: fonts.headingCss }}
              >
                {currentSlide.title}
              </h1>
              <div
                className="p-4 rounded border text-xs sm:text-sm"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.body,
                }}
              >
                {currentSlide.subtitle || 'Executive Presentation Deck'}
              </div>
            </div>
          ) : layout.titleLayout === 'technical_framed' ? (
            <div className="p-5 sm:p-8 h-full">
              <div
                className="h-full border rounded p-6 sm:p-8 flex flex-col justify-between"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="px-2 py-0.5 text-xs font-mono font-bold"
                    style={{ backgroundColor: colors.accent, color: colors.accentText }}
                  >
                    01
                  </span>
                  <span className="text-xs font-mono" style={{ color: colors.muted }}>
                    {courseCode}
                  </span>
                </div>
                <h1
                  className="text-xl sm:text-3xl font-bold leading-tight"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  {currentSlide.title}
                </h1>
                <p className="text-xs sm:text-sm font-mono" style={{ color: colors.muted }}>
                  {currentSlide.subtitle}
                </p>
              </div>
            </div>
          ) : layout.titleLayout === 'minimal_left' ? (
            <div className="p-6 sm:p-12 h-full flex flex-col justify-between">
              <span className="text-xs uppercase tracking-widest" style={{ color: colors.muted }}>
                {courseCode}
              </span>
              <div className="space-y-4">
                <h1
                  className="text-xl sm:text-3xl font-bold leading-tight"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  {currentSlide.title}
                </h1>
                <div className="h-[2px] w-16" style={{ backgroundColor: colors.heading }} />
              </div>
              <p className="text-xs sm:text-sm" style={{ color: colors.muted }}>
                {currentSlide.subtitle}
              </p>
            </div>
          ) : (
            /* academic-classic */
            <div className="h-full flex flex-col justify-between">
              <div className="h-2 w-full" style={{ backgroundColor: colors.accent }} />
              <div className="px-6 sm:px-12 py-4 flex-1 flex flex-col justify-center space-y-3">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: colors.accent }}
                >
                  {[courseCode, doc.brief?.institution || doc.metadata?.institution]
                    .filter(Boolean)
                    .join(' · ') || 'ACADEMIC PRESENTATION'}
                </span>
                <h1
                  className="text-xl sm:text-3xl font-bold leading-tight"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  {currentSlide.title}
                </h1>
              </div>
              <div
                className="px-6 sm:px-12 py-3 text-xs sm:text-sm flex items-center justify-between"
                style={{ backgroundColor: colors.titleBg, color: colors.titleText }}
              >
                <span className="truncate">{currentSlide.subtitle || 'KorsIQ Academic Studio'}</span>
                <span className="font-mono">01</span>
              </div>
            </div>
          )
        ) : (
          /* Content / Visual / References Slide */
          <div className="h-full flex flex-col justify-between">
            {layout.headerStyle === 'top_rule_kicker' && (
              <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: colors.accent }} />
            )}

            <div className="flex-1 flex flex-col px-6 sm:px-10 pt-5 sm:pt-7 pb-3 min-h-0">
              {/* Slide Header */}
              <div
                className="flex items-center justify-between gap-3 pb-2.5 border-b shrink-0"
                style={{
                  borderColor:
                    layout.headerStyle === 'top_rule_kicker' ? colors.accent : colors.border,
                }}
              >
                <h2
                  className="text-base sm:text-2xl font-bold truncate"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  {currentSlide.title}
                </h2>
                {layout.headerStyle === 'index_badge_panel' && (
                  <span
                    className="px-2 py-0.5 text-xs font-mono font-bold shrink-0"
                    style={{ backgroundColor: colors.accent, color: colors.accentText }}
                  >
                    {String(currentSlide.slideNumber).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Slide Body */}
              <div
                className={`flex-1 mt-4 overflow-y-auto ${
                  layout.cardStyle === 'bordered_panel' || layout.cardStyle === 'elevated_dark'
                    ? 'p-4 sm:p-5 rounded border'
                    : ''
                }`}
                style={
                  layout.cardStyle === 'bordered_panel' || layout.cardStyle === 'elevated_dark'
                    ? { backgroundColor: colors.surface, borderColor: colors.border }
                    : undefined
                }
              >
                {currentSlide.kind === 'visual' && currentSlide.visual ? (
                  <StudioVisualCard
                    block={currentSlide.visual}
                    designStyle={doc.metadata?.visualPreferences?.designStyle}
                    palette={visualPalette}
                  />
                ) : (
                  <ul className="space-y-3 sm:space-y-3.5 text-xs sm:text-base leading-relaxed">
                    {(currentSlide.bullets || []).map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3">
                        <span
                          className="w-2 h-2 rounded-xs shrink-0 mt-2"
                          style={{ backgroundColor: colors.accent }}
                        />
                        <span style={{ color: colors.body }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Slide Footer */}
            {layout.footerStyle === 'structured_band' ? (
              <div
                className="px-6 sm:px-10 py-2 text-[11px] flex items-center justify-between shrink-0"
                style={{ backgroundColor: colors.titleBg, color: colors.titleText }}
              >
                <span className="truncate max-w-[80%]">{doc.title}</span>
                <span className="font-mono">
                  {String(currentSlide.slideNumber).padStart(2, '0')}
                </span>
              </div>
            ) : (
              <div
                className="px-6 sm:px-10 py-2 border-t text-[11px] flex items-center justify-between shrink-0"
                style={{ borderColor: colors.border, color: colors.muted }}
              >
                <span className="truncate max-w-[80%]">
                  {[courseCode, doc.title].filter(Boolean).join(' · ')}
                </span>
                <span className="font-mono">
                  {String(currentSlide.slideNumber).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clean Slide Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(safeIdx - 1)}
            disabled={safeIdx === 0}
            aria-label="Previous slide"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 text-xs font-medium text-[#111827] dark:text-slate-200 hover:border-[#2563EB] disabled:opacity-40 min-h-[38px] cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>
          <span className="text-xs font-medium text-[#5B6472] dark:text-slate-400 px-2 tabular-nums">
            Slide {safeIdx + 1} of {slides.length}
          </span>
          <button
            type="button"
            onClick={() => goTo(safeIdx + 1)}
            disabled={safeIdx >= slides.length - 1}
            aria-label="Next slide"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 text-xs font-medium text-[#111827] dark:text-slate-200 hover:border-[#2563EB] disabled:opacity-40 min-h-[38px] cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {currentSlide.sectionId && onEditCurrentSlide && (
          <button
            type="button"
            onClick={() => onEditCurrentSlide(currentSlide.sectionId!)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-xs font-medium text-[#2563EB] min-h-[38px] cursor-pointer"
          >
            <FileText size={13} />
            <span>Edit This Slide</span>
          </button>
        )}
      </div>

      {/* Speaker Notes (if present on current slide) */}
      {currentSlide.speakerNotes && (
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
            <MessageSquare size={12} />
            <span>Speaker Notes</span>
          </div>
          <p className="text-xs text-[#111827] dark:text-slate-200 leading-relaxed">
            {currentSlide.speakerNotes}
          </p>
        </div>
      )}

      {/* Compact Horizontal Slide Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        {slides.map((sl, idx) => {
          const isCurrent = idx === safeIdx;
          return (
            <button
              key={sl.id}
              type="button"
              onClick={() => goTo(idx)}
              className={`shrink-0 w-36 rounded-lg border p-2 text-left transition-colors cursor-pointer ${
                isCurrent
                  ? 'border-[#2563EB] ring-1 ring-[#2563EB] bg-white dark:bg-slate-900'
                  : 'border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#2563EB]/60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-[#5B6472] mb-1">
                <span>{String(sl.slideNumber).padStart(2, '0')}</span>
                <span className="uppercase">{sl.kind === 'title' ? 'Cover' : sl.kind === 'references' ? 'Refs' : 'Slide'}</span>
              </div>
              <p className="text-[11px] font-semibold text-[#111827] dark:text-white truncate">
                {sl.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
