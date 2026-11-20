import { jsPDF } from 'jspdf';
import { AcademicDocument } from '../types';
import { renderVisualBlockToPng } from './visualRenderer';
import { formatReferenceEntry, inferSectionKind, STUDIO_DOWNLOAD_NOTICE } from '../lib/studioV2';
import { resolveDocumentCoverPage, resolveSlideCoverPage } from '../lib/studioCover';
import { latexToReadableMath } from '../lib/mathFormatter';
import {
  DocumentTemplate,
  SlideTemplate,
  documentTemplateToVisualPalette,
  getDocumentTemplateForDoc,
  getSlideTemplateForDoc,
  hexToRgbTuple,
  isSlideDocument,
  slideTemplateToVisualPalette,
} from '../lib/studioTemplates';

function stripInlineMarkdown(text: string): string {
  return latexToReadableMath(text || '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, '$1')
    .trim();
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => stripInlineMarkdown(cell));
}

function isMarkdownDividerRow(line: string): boolean {
  return /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(line.trim());
}

function toRoman(num: number): string {
  if (num <= 0) return '';
  const map: Array<[number, string]> = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
    [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
    [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let n = num;
  let out = '';
  for (const [val, sym] of map) {
    while (n >= val) {
      out += sym;
      n -= val;
    }
  }
  return out;
}

function extractSlideBullets(content: string): string[] {
  const lines = (content || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('|'));

  const bullets: string[] = [];
  for (const line of lines) {
    const bulletMatch = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const text = stripInlineMarkdown(bulletMatch[2]);
      if (text) bullets.push(text.length > 175 ? `${text.slice(0, 172)}...` : text);
      continue;
    }
    const clean = stripInlineMarkdown(line.replace(/^#{1,6}\s+/, ''));
    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);
    for (const s of sentences) {
      bullets.push(s.length > 175 ? `${s.slice(0, 172)}...` : s);
    }
  }
  return bullets.length > 0 ? bullets : ['Section content summary.'];
}

interface TocEntry {
  title: string;
  pageNumber: number;
  isFrontMatter: boolean;
}

interface PassMetrics {
  tocEntries: TocEntry[];
  tableEntries: Array<{ caption: string; pageNumber: number; isFrontMatter: boolean }>;
  figureEntries: Array<{ caption: string; pageNumber: number; isFrontMatter: boolean }>;
  frontMatterEndPage: number;
}

/**
 * 16:9 Widescreen Slide PDF renderer consuming lib/slideTemplates.ts.
 */
function renderSlideDeckPdf(doc: AcademicDocument, tpl: SlideTemplate): jsPDF {
  const slideW = 297;
  const slideH = 167.0625; // exact 16:9
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [slideW, slideH],
  });

  const bgRgb = hexToRgbTuple(tpl.colors.bg, [255, 255, 255]);
  const surfaceRgb = hexToRgbTuple(tpl.colors.surface, [248, 250, 252]);
  const titleBgRgb = hexToRgbTuple(tpl.colors.titleBg, [15, 41, 66]);
  const titleTextRgb = hexToRgbTuple(tpl.colors.titleText, [255, 255, 255]);
  const headingRgb = hexToRgbTuple(tpl.colors.heading, [17, 24, 39]);
  const bodyRgb = hexToRgbTuple(tpl.colors.body, [31, 41, 55]);
  const mutedRgb = hexToRgbTuple(tpl.colors.muted, [100, 116, 139]);
  const accentRgb = hexToRgbTuple(tpl.colors.accent, [29, 78, 216]);
  const accentTextRgb = hexToRgbTuple(tpl.colors.accentText, [255, 255, 255]);
  const borderRgb = hexToRgbTuple(tpl.colors.border, [203, 213, 225]);
  const visualPalette = slideTemplateToVisualPalette(tpl);

  const meta = doc.metadata || {};
  const slideCover = resolveSlideCoverPage(doc);
  const effectiveSlideTitle = slideCover.title || doc.title;
  const courseCode = slideCover.courseCode;
  const studentName = slideCover.studentName;
  const institution = slideCover.institution;
  const submissionDate = slideCover.submissionDate;
  const subtitleText = [
    slideCover.subtitle,
    courseCode,
    studentName ? (slideCover.studentId ? `${studentName} (${slideCover.studentId})` : studentName) : '',
    institution,
    submissionDate,
  ]
    .filter(Boolean)
    .join('  •  ');

  const docTitleForSlide = effectiveSlideTitle;
  const slideDoc: AcademicDocument = docTitleForSlide !== doc.title ? { ...doc, title: docTitleForSlide } : doc;

  let slideNum = 1;

  const paintBg = (rgb: [number, number, number]) => {
    pdf.setFillColor(...rgb);
    pdf.rect(0, 0, slideW, slideH, 'F');
  };

  const drawContentChrome = (title: string, num: number) => {
    paintBg(bgRgb);

    if (tpl.layout.headerStyle === 'top_rule_kicker') {
      pdf.setFillColor(...accentRgb);
      pdf.rect(0, 0, slideW, 3, 'F');
    } else if (tpl.layout.headerStyle === 'bold_accent_pill') {
      pdf.setFillColor(...accentRgb);
      pdf.rect(0, 0, 5, slideH, 'F');
    }

    // Header Title
    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(...headingRgb);
    const titleX = tpl.layout.headerStyle === 'bold_accent_pill' ? 18 : 16;
    const titleLines = pdf.splitTextToSize(title, slideW - 55) as string[];
    pdf.text(titleLines[0] || title, titleX, 21);

    if (tpl.layout.headerStyle === 'index_badge_panel') {
      pdf.setFillColor(...accentRgb);
      pdf.rect(slideW - 28, 12, 12, 10, 'F');
      pdf.setFont(tpl.fonts.pdfBody, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...accentTextRgb);
      pdf.text(String(num).padStart(2, '0'), slideW - 22, 18.5, { align: 'center' });
    }

    // Divider line
    pdf.setDrawColor(...(tpl.layout.headerStyle === 'top_rule_kicker' ? accentRgb : borderRgb));
    pdf.setLineWidth(0.4);
    pdf.line(titleX, 27, slideW - 16, 27);

    // Optional content panel
    if (tpl.layout.cardStyle === 'bordered_panel' || tpl.layout.cardStyle === 'elevated_dark') {
      pdf.setFillColor(...surfaceRgb);
      pdf.setDrawColor(...borderRgb);
      pdf.setLineWidth(0.3);
      pdf.rect(titleX, 33, slideW - titleX - 16, 114, 'FD');
    }

    // Footer
    const footerY = slideH - 11;
    if (tpl.layout.footerStyle === 'structured_band') {
      pdf.setFillColor(...titleBgRgb);
      pdf.rect(0, slideH - 12, slideW, 12, 'F');
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...titleTextRgb);
      pdf.text((doc.title || '').slice(0, 72), 16, slideH - 4.5);
      pdf.text(String(num).padStart(2, '0'), slideW - 16, slideH - 4.5, { align: 'right' });
    } else {
      pdf.setDrawColor(...borderRgb);
      pdf.setLineWidth(0.25);
      pdf.line(titleX, footerY - 3, slideW - 16, footerY - 3);
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...mutedRgb);
      pdf.text([courseCode, (doc.title || '').slice(0, 54)].filter(Boolean).join(' · '), titleX, footerY + 2);
      pdf.text(String(num).padStart(2, '0'), slideW - 16, footerY + 2, { align: 'right' });
    }
  };

  // 1. Title Slide
  if (tpl.layout.titleLayout === 'pitch_split_hero') {
    paintBg(bgRgb);
    pdf.setFillColor(...titleBgRgb);
    pdf.rect(0, 0, slideW * 0.62, slideH, 'F');
    pdf.setFillColor(...accentRgb);
    pdf.rect(slideW * 0.62, 0, 4, slideH, 'F');

    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...titleTextRgb);
    const tLines = pdf.splitTextToSize(slideDoc.title, slideW * 0.52) as string[];
    pdf.text(tLines.slice(0, 4), 18, 62);

    if (subtitleText) {
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(210, 220, 235);
      const sLines = pdf.splitTextToSize(subtitleText, slideW * 0.52) as string[];
      pdf.text(sLines.slice(0, 3), 18, 128);
    }

    pdf.setFillColor(...surfaceRgb);
    pdf.rect(slideW * 0.67, 46, 80, 72, 'F');
    pdf.setFillColor(...accentRgb);
    pdf.rect(slideW * 0.67, 46, 3, 72, 'F');
    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...headingRgb);
    pdf.text((courseCode || doc.docType.replace('_', ' ')).toUpperCase(), slideW * 0.67 + 9, 66);
    pdf.setFont(tpl.fonts.pdfBody, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...mutedRgb);
    pdf.text(`${(doc.sections || []).length} key sections`, slideW * 0.67 + 9, 80);
    if (submissionDate) pdf.text(submissionDate, slideW * 0.67 + 9, 92);
  } else if (tpl.layout.titleLayout === 'editorial_asymmetric') {
    paintBg(bgRgb);
    pdf.setFillColor(...titleBgRgb);
    pdf.rect(0, 0, 88, slideH, 'F');
    pdf.setFillColor(...accentRgb);
    pdf.rect(88, 0, 2.5, slideH, 'F');

    pdf.setFont(tpl.fonts.pdfBody, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...titleTextRgb);
    pdf.text((courseCode || 'SEMINAR DECK').toUpperCase(), 16, 26);

    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...headingRgb);
    const tLines = pdf.splitTextToSize(doc.title, 175) as string[];
    pdf.text(tLines.slice(0, 4), 104, 62);

    if (subtitleText) {
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...mutedRgb);
      const sLines = pdf.splitTextToSize(subtitleText, 175) as string[];
      pdf.text(sLines.slice(0, 3), 104, 128);
    }
  } else if (tpl.layout.titleLayout === 'dark_executive') {
    paintBg(bgRgb);
    pdf.setFillColor(...accentRgb);
    pdf.rect(18, 30, 28, 2.5, 'F');
    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(...headingRgb);
    const tLines = pdf.splitTextToSize(doc.title, slideW - 44) as string[];
    pdf.text(tLines.slice(0, 4), 18, 56);

    pdf.setFillColor(...surfaceRgb);
    pdf.setDrawColor(...borderRgb);
    pdf.rect(18, 118, slideW - 36, 26, 'FD');
    pdf.setFont(tpl.fonts.pdfBody, 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...bodyRgb);
    pdf.text(subtitleText || institution || 'Presentation Deck', 26, 134);
  } else if (tpl.layout.titleLayout === 'technical_framed') {
    paintBg(bgRgb);
    pdf.setFillColor(...surfaceRgb);
    pdf.setDrawColor(...borderRgb);
    pdf.setLineWidth(0.5);
    pdf.rect(14, 16, slideW - 28, slideH - 32, 'FD');

    pdf.setFillColor(...accentRgb);
    pdf.rect(24, 28, 16, 10, 'F');
    pdf.setFont(tpl.fonts.pdfBody, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...accentTextRgb);
    pdf.text('01', 32, 34.5, { align: 'center' });

    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(...headingRgb);
    const tLines = pdf.splitTextToSize(doc.title, slideW - 56) as string[];
    pdf.text(tLines.slice(0, 4), 24, 64);

    if (subtitleText) {
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...mutedRgb);
      pdf.text(subtitleText, 24, 132);
    }
  } else if (tpl.layout.titleLayout === 'minimal_left') {
    paintBg(bgRgb);
    pdf.setFont(tpl.fonts.pdfBody, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...mutedRgb);
    if (courseCode) pdf.text(courseCode.toUpperCase(), 20, 32);

    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(27);
    pdf.setTextColor(...headingRgb);
    const tLines = pdf.splitTextToSize(doc.title, slideW - 44) as string[];
    pdf.text(tLines.slice(0, 4), 20, 62);

    pdf.setDrawColor(...headingRgb);
    pdf.setLineWidth(0.7);
    pdf.line(20, 114, 52, 114);

    if (subtitleText) {
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...mutedRgb);
      pdf.text(subtitleText, 20, 128);
    }
  } else {
    // classic_academic_band
    paintBg(bgRgb);
    pdf.setFillColor(...accentRgb);
    pdf.rect(0, 0, slideW, 4, 'F');
    pdf.setFillColor(...titleBgRgb);
    pdf.rect(0, slideH - 18, slideW, 18, 'F');

    pdf.setFont(tpl.fonts.pdfBody, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...accentRgb);
    pdf.text([courseCode, institution].filter(Boolean).join(' · ').toUpperCase() || 'ACADEMIC PRESENTATION', 20, 36);

    pdf.setFont(tpl.fonts.pdfHeading, 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...headingRgb);
    const tLines = pdf.splitTextToSize(doc.title, slideW - 44) as string[];
    pdf.text(tLines.slice(0, 4), 20, 62);

    pdf.setFont(tpl.fonts.pdfBody, 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...titleTextRgb);
    pdf.text(subtitleText || studentName || 'KorsIQ Academic Studio', 20, slideH - 7);
  }

  // 2. Content Slides
  const MAX_BULLETS = 5;
  for (const section of doc.sections || []) {
    const bullets = extractSlideBullets(section.content);
    const chunks = Math.max(1, Math.ceil(bullets.length / MAX_BULLETS));
    for (let c = 0; c < chunks; c += 1) {
      slideNum += 1;
      pdf.addPage([slideW, slideH], 'landscape');
      const heading = chunks > 1 ? `${section.title} (${c + 1}/${chunks})` : section.title;
      drawContentChrome(heading, slideNum);

      const slice = bullets.slice(c * MAX_BULLETS, (c + 1) * MAX_BULLETS);
      const startX = tpl.layout.cardStyle === 'bordered_panel' || tpl.layout.cardStyle === 'elevated_dark' ? 24 : 18;
      const textMaxW = slideW - startX - 24;
      let curY = 44;
      const maxY = 144;

      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(13);
      for (const b of slice) {
        if (curY > maxY) break;
        pdf.setFillColor(...accentRgb);
        pdf.rect(startX, curY - 3, 2.2, 2.2, 'F');

        pdf.setTextColor(...bodyRgb);
        const lines = pdf.splitTextToSize(b, textMaxW - 8) as string[];
        for (const ln of lines.slice(0, 3)) {
          if (curY > maxY) break;
          pdf.text(ln, startX + 6, curY);
          curY += 6.2;
        }
        curY += 4;
      }
    }

    // Optional visual slides
    for (const vis of section.visuals || []) {
      slideNum += 1;
      pdf.addPage([slideW, slideH], 'landscape');
      drawContentChrome(`${section.title}: ${vis.title}`, slideNum);

      if (vis.kind === 'comparison_table' && vis.headers && vis.rows && vis.rows.length > 0) {
        const startX = 20;
        const tableW = slideW - 40;
        const colW = tableW / Math.max(1, vis.headers.length);
        let ty = 42;

        // Header
        pdf.setFillColor(...accentRgb);
        pdf.rect(startX, ty - 5, tableW, 9, 'F');
        pdf.setFont(tpl.fonts.pdfBody, 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...accentTextRgb);
        vis.headers.forEach((h, idx) => {
          pdf.text(String(h).slice(0, 26), startX + idx * colW + 2, ty + 1);
        });
        ty += 9;

        pdf.setFont(tpl.fonts.pdfBody, 'normal');
        pdf.setFontSize(9.5);
        for (let rIdx = 0; rIdx < vis.rows.length && ty < 140; rIdx += 1) {
          const row = vis.rows[rIdx];
          pdf.setFillColor(...(rIdx % 2 === 0 ? bgRgb : surfaceRgb));
          pdf.setDrawColor(...borderRgb);
          pdf.rect(startX, ty - 5, tableW, 8.5, 'FD');
          pdf.setTextColor(...bodyRgb);
          vis.headers.forEach((_, idx) => {
            pdf.text(String(row[idx] ?? '').slice(0, 30), startX + idx * colW + 2, ty + 0.5);
          });
          ty += 8.5;
        }
      } else {
        const rendered = renderVisualBlockToPng(
          vis,
          doc.metadata?.visualPreferences?.designStyle,
          visualPalette
        );
        if (rendered) {
          const maxW = slideW - 44;
          const maxH = 104;
          const aspect = rendered.width / rendered.height;
          let drawW = maxW;
          let drawH = drawW / aspect;
          if (drawH > maxH) {
            drawH = maxH;
            drawW = drawH * aspect;
          }
          pdf.addImage(rendered.dataUrl, 'PNG', (slideW - drawW) / 2, 36 + (maxH - drawH) / 2, drawW, drawH);
        }
      }
    }
  }

  // 3. References Slide(s)
  const refs = doc.references || [];
  if (refs.length > 0 && meta.includeReferences !== false) {
    const PER_SLIDE = 6;
    const pages = Math.ceil(refs.length / PER_SLIDE);
    for (let rp = 0; rp < pages; rp += 1) {
      slideNum += 1;
      pdf.addPage([slideW, slideH], 'landscape');
      drawContentChrome(pages > 1 ? `References (${rp + 1}/${pages})` : 'References', slideNum);
      let ry = 42;
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...bodyRgb);
      const slice = refs.slice(rp * PER_SLIDE, (rp + 1) * PER_SLIDE);
      slice.forEach((ref, idx) => {
        if (ry > 140) return;
        const txt = formatReferenceEntry(ref, doc.citationStyle || 'APA 7', rp * PER_SLIDE + idx + 1);
        const lines = pdf.splitTextToSize(stripInlineMarkdown(txt), slideW - 40) as string[];
        for (const ln of lines.slice(0, 2)) {
          pdf.text(ln, 20, ry);
          ry += 5;
        }
        ry += 3;
      });
    }
  }

  return pdf;
}

/**
 * A4 Portrait Document PDF renderer consuming lib/documentTemplates.ts.
 */
function renderDocumentPdfPass(
  doc: AcademicDocument,
  tpl: DocumentTemplate,
  metrics?: PassMetrics
): { pdf: jsPDF; metrics: PassMetrics } {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const textRgb = hexToRgbTuple(tpl.colors.text, [0, 0, 0]);
  const headingRgb = hexToRgbTuple(tpl.colors.heading, [0, 0, 0]);
  const mutedRgb = hexToRgbTuple(tpl.colors.muted, [71, 85, 105]);
  const accentRgb = hexToRgbTuple(tpl.colors.accent, [0, 0, 0]);
  const accentSoftRgb = hexToRgbTuple(tpl.colors.accentSoft, [255, 255, 255]);
  const borderRgb = hexToRgbTuple(tpl.colors.border, [0, 0, 0]);
  const tableHeaderBgRgb = hexToRgbTuple(tpl.colors.tableHeaderBg, [255, 255, 255]);
  const tableHeaderTextRgb = hexToRgbTuple(tpl.colors.tableHeaderText, [0, 0, 0]);
  const tableStripeBgRgb = hexToRgbTuple(tpl.colors.tableStripeBg, [255, 255, 255]);
  const pageBgRgb = hexToRgbTuple(tpl.colors.pageBg, [255, 255, 255]);
  const hasTintedPageBg = tpl.colors.pageBg.toUpperCase() !== '#FFFFFF';
  const coverBgRgb = hexToRgbTuple(tpl.colors.coverBg, [255, 255, 255]);
  const coverTextRgb = hexToRgbTuple(tpl.colors.coverText, [0, 0, 0]);
  const visualPalette = documentTemplateToVisualPalette(tpl);

  const effectiveSpacing = doc.brief?.spacing === 'double' ? 2.0 : tpl.lineSpacing;
  const lineMultiplier = 0.3528 * effectiveSpacing; // pt -> mm * lineSpacing

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const paintDocPageBg = () => {
    if (!hasTintedPageBg) return;
    pdf.setFillColor(...pageBgRgb);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  };
  paintDocPageBg();
  const marginTop = Math.max(16, tpl.marginsIn.top * 25.4);
  const marginRight = Math.max(16, tpl.marginsIn.right * 25.4);
  const marginBottom = Math.max(16, tpl.marginsIn.bottom * 25.4);
  const marginLeft = Math.max(16, tpl.marginsIn.left * 25.4);
  const maxLineWidth = pageWidth - marginLeft - marginRight;
  const bottomLimit = pageHeight - marginBottom - 8;
  let y = marginTop;

  const recorded: PassMetrics = {
    tocEntries: [],
    tableEntries: [],
    figureEntries: [],
    frontMatterEndPage: 1,
  };

  const formatPageLabel = (absPage: number, isFront: boolean): string => {
    if (absPage <= 1 && doc.metadata?.includeCoverPage !== false) return '';
    const coverOffset = doc.metadata?.includeCoverPage !== false ? 1 : 0;
    if (isFront) return toRoman(Math.max(1, absPage - coverOffset));
    const fmEnd = metrics?.frontMatterEndPage ?? recorded.frontMatterEndPage;
    return String(Math.max(1, absPage - fmEnd));
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      pdf.addPage();
      paintDocPageBg();
      y = marginTop;
    }
  };

  const writeWrappedText = (
    text: string,
    fontSize: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    opts?: {
      font?: 'times' | 'helvetica' | 'courier';
      color?: [number, number, number];
      extraBottomMm?: number;
      indentX?: number;
      lineHeightMm?: number;
    }
  ) => {
    const fontName = opts?.font || tpl.fonts.pdfBody;
    const lh = opts?.lineHeightMm || fontSize * lineMultiplier;
    const xStart = marginLeft + (opts?.indentX || 0);
    const widthAvail = maxLineWidth - (opts?.indentX || 0);
    pdf.setFont(fontName, style);
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...(opts?.color || textRgb));
    const lines = pdf.splitTextToSize(text, widthAvail) as string[];
    for (const line of lines) {
      ensureSpace(lh);
      pdf.text(line, xStart, y);
      y += lh;
    }
    y += opts?.extraBottomMm ?? 2;
  };

  const writeHeading = (text: string, level: 1 | 2 | 3) => {
    const size = level === 1 ? tpl.sizes.h1Pt : level === 2 ? tpl.sizes.h2Pt : tpl.sizes.h3Pt;
    const lh = size * 0.48;
    ensureSpace(lh + 10);

    if (level === 1 && tpl.layout.headingRule === 'left_bar') {
      pdf.setFillColor(...accentRgb);
      pdf.rect(marginLeft, y - size * 0.32, 2.2, lh + 1.5, 'F');
      writeWrappedText(text, size, 'bold', {
        font: tpl.fonts.pdfHeading,
        color: headingRgb,
        indentX: 5,
        lineHeightMm: lh,
        extraBottomMm: 3,
      });
      return;
    }

    if (level === 1 && tpl.layout.coverStyle === 'formal_centered') {
      pdf.setFont(tpl.fonts.pdfHeading, 'bold');
      pdf.setFontSize(size);
      pdf.setTextColor(...headingRgb);
      const lines = pdf.splitTextToSize(text, maxLineWidth) as string[];
      for (const ln of lines) {
        ensureSpace(lh);
        pdf.text(ln, pageWidth / 2, y, { align: 'center' });
        y += lh;
      }
      y += 3;
      return;
    }

    writeWrappedText(text, size, 'bold', {
      font: tpl.fonts.pdfHeading,
      color: headingRgb,
      lineHeightMm: lh,
      extraBottomMm: level === 1 ? 1.5 : 2,
    });

    if (level === 1 && (tpl.layout.headingRule === 'thin_bottom' || tpl.layout.headingRule === 'numbered_slate' || tpl.layout.headingRule === 'editorial_serif')) {
      pdf.setDrawColor(...(tpl.layout.headingRule === 'thin_bottom' ? accentRgb : borderRgb));
      pdf.setLineWidth(tpl.layout.headingRule === 'thin_bottom' ? 0.5 : 0.3);
      pdf.line(marginLeft, y - 0.5, pageWidth - marginRight, y - 0.5);
      y += 3;
    }
  };

  const renderStyledTable = (headers: string[], rows: string[][]) => {
    const colCount = Math.max(1, headers.length);
    const colWidth = maxLineWidth / colCount;
    const allRows = [headers, ...rows];
    const tableFontPt = Math.max(9, tpl.sizes.bodyPt - 1.5);

    for (let rIdx = 0; rIdx < allRows.length; rIdx += 1) {
      const row = allRows[rIdx];
      pdf.setFont(tpl.fonts.pdfBody, rIdx === 0 ? 'bold' : 'normal');
      pdf.setFontSize(tableFontPt);
      const wrappedCells = headers.map((_, cIdx) =>
        pdf.splitTextToSize(String(row[cIdx] ?? ''), Math.max(12, colWidth - 3)) as string[]
      );
      const rowLines = Math.max(...wrappedCells.map((c) => c.length), 1);
      const rowHeight = rowLines * 4.4 + 3.4;
      ensureSpace(rowHeight);

      if (rIdx === 0) {
        if (tpl.colors.tableHeaderBg !== '#FFFFFF') {
          pdf.setFillColor(...tableHeaderBgRgb);
          pdf.rect(marginLeft, y - 3.5, maxLineWidth, rowHeight, 'F');
        }
        pdf.setTextColor(...tableHeaderTextRgb);
        pdf.setFont(tpl.fonts.pdfBody, 'bold');
      } else {
        if (rIdx % 2 === 0 && tpl.colors.tableStripeBg !== '#FFFFFF') {
          pdf.setFillColor(...tableStripeBgRgb);
          pdf.rect(marginLeft, y - 3.5, maxLineWidth, rowHeight, 'F');
        }
        pdf.setTextColor(...textRgb);
        pdf.setFont(tpl.fonts.pdfBody, 'normal');
      }

      pdf.setDrawColor(...borderRgb);
      pdf.setLineWidth(0.25);
      for (let cIdx = 0; cIdx < colCount; cIdx += 1) {
        const x = marginLeft + cIdx * colWidth;
        pdf.rect(x, y - 3.5, colWidth, rowHeight);
        const cellLines = wrappedCells[cIdx] || [''];
        cellLines.forEach((cl, lineOffset) => {
          pdf.text(cl, x + 1.5, y + lineOffset * 4.4);
        });
      }
      y += rowHeight;
    }
    y += 3;
  };

  const meta = doc.metadata || {};
  const cover = resolveDocumentCoverPage(doc);
  const coverTitle = cover.title || doc.title;
  const institution = cover.institution || undefined;
  const faculty = [cover.department, cover.faculty].filter(Boolean).join(' · ') || undefined;
  const courseCode = cover.courseCode || undefined;
  const courseTitle = cover.courseTitle || cover.subtitle || undefined;
  const studentName = cover.studentName || undefined;
  const studentId = cover.studentId || undefined;
  const supervisor = cover.supervisorName || undefined;
  const submissionDate = cover.submissionDate || undefined;
  const docForCoverTitle = coverTitle;

  // 1. Cover Page
  if (cover.includeCoverPage) {
    if (tpl.layout.coverStyle === 'executive_banner') {
      pdf.setFillColor(...coverBgRgb);
      pdf.rect(0, 0, pageWidth, 92, 'F');
      pdf.setFillColor(...accentRgb);
      pdf.rect(0, 92, pageWidth, 3, 'F');

      pdf.setTextColor(...coverTextRgb);
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(10);
      if (institution) pdf.text(institution.toUpperCase(), marginLeft, 26);

      pdf.setFont(tpl.fonts.pdfHeading, 'bold');
      pdf.setFontSize(tpl.sizes.titlePt);
      const tLines = pdf.splitTextToSize(docForCoverTitle, maxLineWidth) as string[];
      pdf.text(tLines.slice(0, 4), marginLeft, 44);

      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(11);
      if (courseCode || courseTitle) {
        pdf.text([courseCode, courseTitle].filter(Boolean).join(' — '), marginLeft, 82);
      }

      y = 114;
      const details = [
        studentName ? `Prepared by: ${studentName}${studentId ? ` (${studentId})` : ''}` : '',
        faculty ? `Faculty / Department: ${faculty}` : '',
        supervisor ? `Supervisor: ${supervisor}` : '',
        submissionDate ? `Date: ${submissionDate}` : '',
      ].filter(Boolean);
      for (const d of details) {
        writeWrappedText(d, 11, 'normal', { color: textRgb, extraBottomMm: 3 });
      }
    } else if (tpl.layout.coverStyle === 'technical_compact') {
      y = marginTop + 4;
      writeHeading(docForCoverTitle, 1);
      y += 2;
      const metaRows = [
        ['Document Type', doc.docType.replace('_', ' ').toUpperCase()],
        ['Course', [courseCode, courseTitle].filter(Boolean).join(' — ') || doc.subject || 'N/A'],
        ['Author', [studentName, studentId ? `(${studentId})` : ''].filter(Boolean).join(' ') || 'N/A'],
        ['Department', faculty || 'N/A'],
        ['Institution', institution || 'N/A'],
        ...(supervisor ? [['Supervisor', supervisor]] : []),
        ['Date', submissionDate || new Date().toISOString().slice(0, 10)],
      ];
      renderStyledTable(['Field', 'Specification'], metaRows);
    } else if (tpl.layout.coverStyle === 'editorial_left') {
      pdf.setFillColor(...accentRgb);
      pdf.rect(marginLeft, 44, 2.5, 68, 'F');
      y = 50;
      if (institution || courseCode) {
        writeWrappedText([courseCode, institution].filter(Boolean).join(' · ').toUpperCase(), 9.5, 'normal', {
          color: mutedRgb,
          indentX: 8,
          extraBottomMm: 3,
        });
      }
      writeWrappedText(docForCoverTitle, tpl.sizes.titlePt, 'bold', {
        font: tpl.fonts.pdfHeading,
        color: headingRgb,
        indentX: 8,
        lineHeightMm: 9,
        extraBottomMm: 4,
      });
      if (faculty) {
        writeWrappedText(faculty, 11, 'italic', { color: mutedRgb, indentX: 8, extraBottomMm: 16 });
      }
      y = Math.max(y + 12, 130);
      if (studentName) writeWrappedText(studentName, 12, 'bold', { color: textRgb, extraBottomMm: 2 });
      if (studentId) writeWrappedText(`ID: ${studentId}`, 10.5, 'normal', { color: mutedRgb, extraBottomMm: 2 });
      if (supervisor) writeWrappedText(`Supervisor: ${supervisor}`, 10.5, 'normal', { color: mutedRgb, extraBottomMm: 2 });
      if (submissionDate) writeWrappedText(submissionDate, 10.5, 'normal', { color: mutedRgb, extraBottomMm: 2 });
    } else if (tpl.layout.coverStyle === 'clean_academic') {
      pdf.setFillColor(...accentRgb);
      pdf.rect(marginLeft, marginTop, maxLineWidth, 2, 'F');
      y = marginTop + 14;
      if (institution) {
        writeWrappedText(institution.toUpperCase(), 10.5, 'bold', { color: accentRgb, extraBottomMm: 2 });
      }
      if (faculty) {
        writeWrappedText(faculty, 10.5, 'normal', { color: mutedRgb, extraBottomMm: 16 });
      }
      writeWrappedText(docForCoverTitle, tpl.sizes.titlePt, 'bold', {
        font: tpl.fonts.pdfHeading,
        color: headingRgb,
        lineHeightMm: 9,
        extraBottomMm: 10,
      });
      pdf.setDrawColor(...borderRgb);
      pdf.line(marginLeft, y, pageWidth - marginRight, y);
      y += 8;
      if (studentName) writeWrappedText(`Prepared by: ${studentName}${studentId ? ` (${studentId})` : ''}`, 11, 'bold', { extraBottomMm: 2.5 });
      if (courseCode || courseTitle) writeWrappedText(`Course: ${[courseCode, courseTitle].filter(Boolean).join(' — ')}`, 11, 'normal', { color: mutedRgb, extraBottomMm: 2.5 });
      if (supervisor) writeWrappedText(`Supervisor: ${supervisor}`, 11, 'normal', { color: mutedRgb, extraBottomMm: 2.5 });
      if (submissionDate) writeWrappedText(`Date: ${submissionDate}`, 11, 'normal', { color: mutedRgb, extraBottomMm: 2.5 });
    } else {
      // formal_centered (Strict University Standard — pure black & white)
      y = 50;
      pdf.setTextColor(...textRgb);
      if (institution) {
        pdf.setFont(tpl.fonts.pdfHeading, 'bold');
        pdf.setFontSize(13);
        pdf.text(institution.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 8;
      }
      if (faculty) {
        pdf.setFont(tpl.fonts.pdfBody, 'normal');
        pdf.setFontSize(11);
        pdf.text(faculty.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 20;
      }
      pdf.setFont(tpl.fonts.pdfHeading, 'bold');
      pdf.setFontSize(tpl.sizes.titlePt);
      const titleLines = pdf.splitTextToSize(doc.title.toUpperCase(), maxLineWidth - 10) as string[];
      for (const tl of titleLines) {
        pdf.text(tl, pageWidth / 2, y, { align: 'center' });
        y += 8;
      }
      y += 14;
      const metaLines: string[] = [];
      if (courseCode || courseTitle) metaLines.push(`Course: ${[courseCode, courseTitle].filter(Boolean).join(' - ')}`);
      else if (doc.subject) metaLines.push(`Subject: ${doc.subject}`);
      if (studentName) metaLines.push(`Author: ${studentName}`);
      if (studentId) metaLines.push(`Matric / ID: ${studentId}`);
      if (supervisor) metaLines.push(`Supervisor: ${supervisor}`);
      if (submissionDate) metaLines.push(`Date: ${submissionDate}`);
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(12);
      for (const ml of metaLines) {
        pdf.text(ml, pageWidth / 2, y, { align: 'center' });
        y += 7.5;
      }
    }

    pdf.addPage();
    y = marginTop;
  } else {
    writeHeading(doc.title, 1);
  }

  // 2. Table of Contents
  const outlineMap = new Map((doc.outline || []).map((o) => [o.id, o]));
  const hasToc = meta.includeTableOfContents !== false && (doc.sections || []).length > 0;
  if (hasToc) {
    writeHeading('Table of Contents', 1);
    const entries =
      metrics?.tocEntries ||
      (doc.sections || []).map((s) => ({ title: s.title, pageNumber: 0, isFrontMatter: false }));

    for (const entry of entries) {
      ensureSpace(6);
      pdf.setFont(tpl.fonts.pdfBody, 'normal');
      pdf.setFontSize(10.5);
      pdf.setTextColor(...textRgb);
      const label = metrics ? formatPageLabel(entry.pageNumber, entry.isFrontMatter) : '...';
      const titleText = entry.title.length > 68 ? `${entry.title.slice(0, 65)}...` : entry.title;
      pdf.text(titleText, marginLeft, y);
      pdf.text(label, pageWidth - marginRight, y, { align: 'right' });
      y += 5.5;
    }

    if (metrics && metrics.tableEntries.length > 0) {
      y += 5;
      writeHeading('List of Tables', 2);
      for (let idx = 0; idx < metrics.tableEntries.length; idx += 1) {
        const te = metrics.tableEntries[idx];
        ensureSpace(6);
        pdf.setFont(tpl.fonts.pdfBody, 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...textRgb);
        const txt = `Table ${idx + 1}: ${te.caption}`;
        pdf.text(txt.length > 68 ? `${txt.slice(0, 65)}...` : txt, marginLeft, y);
        pdf.text(formatPageLabel(te.pageNumber, te.isFrontMatter), pageWidth - marginRight, y, { align: 'right' });
        y += 5.2;
      }
    }

    if (metrics && metrics.figureEntries.length > 0) {
      y += 5;
      writeHeading('List of Figures', 2);
      for (let idx = 0; idx < metrics.figureEntries.length; idx += 1) {
        const fe = metrics.figureEntries[idx];
        ensureSpace(6);
        pdf.setFont(tpl.fonts.pdfBody, 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...textRgb);
        const txt = `Figure ${idx + 1}: ${fe.caption}`;
        pdf.text(txt.length > 68 ? `${txt.slice(0, 65)}...` : txt, marginLeft, y);
        pdf.text(formatPageLabel(fe.pageNumber, fe.isFrontMatter), pageWidth - marginRight, y, { align: 'right' });
        y += 5.2;
      }
    }

    pdf.addPage();
    y = marginTop;
  }

  recorded.frontMatterEndPage = pdf.getNumberOfPages();

  // 3. Sections
  let switchedToBody = false;
  let chapterCounter = 0;
  for (const section of doc.sections || []) {
    const outlineItem = outlineMap.get(section.outlineItemId);
    const kind = outlineItem ? inferSectionKind(outlineItem) : 'body';
    if (kind === 'cover' || kind === 'toc' || kind === 'list_of_tables' || kind === 'list_of_figures' || kind === 'references') {
      continue;
    }
    const isFront = kind === 'front_matter' || kind === 'abstract';
    if (!isFront && !switchedToBody) {
      switchedToBody = true;
      recorded.frontMatterEndPage = pdf.getNumberOfPages() - 1;
    }

    if (section.level === 1 && !isFront) chapterCounter += 1;

    ensureSpace(16);
    const sectionPage = pdf.getNumberOfPages();
    const displayTitle =
      section.level === 1 && !isFront && tpl.layout.headingRule === 'numbered_slate'
        ? `${String(chapterCounter).padStart(2, '0')}. ${section.title}`
        : section.title;

    recorded.tocEntries.push({ title: displayTitle, pageNumber: sectionPage, isFrontMatter: isFront });
    writeHeading(displayTitle, section.level === 1 ? 1 : section.level === 2 ? 2 : 3);

    const rawLines = (section.content || '').split(/\r?\n/);
    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i].trim();
      if (!line) {
        y += 2;
        i += 1;
        continue;
      }

      if (line.startsWith('|') && line.endsWith('|')) {
        const tableRows: string[][] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
          const cur = rawLines[i].trim();
          if (!isMarkdownDividerRow(cur)) {
            tableRows.push(parseTableRow(cur));
          }
          i += 1;
        }
        if (tableRows.length >= 2) {
          recorded.tableEntries.push({
            caption: `${section.title} Summary`,
            pageNumber: pdf.getNumberOfPages(),
            isFrontMatter: isFront,
          });
          renderStyledTable(tableRows[0], tableRows.slice(1));
        }
        continue;
      }

      if (line.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('> ')) {
          quoteLines.push(stripInlineMarkdown(rawLines[i].trim().replace(/^>\s?/, '')));
          i += 1;
        }
        const quoteText = quoteLines.join(' ');
        pdf.setFont(tpl.fonts.pdfBody, tpl.layout.calloutStyle === 'editorial_quote' ? 'italic' : 'normal');
        pdf.setFontSize(Math.max(9.5, tpl.sizes.bodyPt - 0.5));
        const wrapped = pdf.splitTextToSize(quoteText, maxLineWidth - 10) as string[];
        const boxH = wrapped.length * 4.8 + 6;
        ensureSpace(boxH + 3);
        if (tpl.colors.accentSoft !== '#FFFFFF') {
          pdf.setFillColor(...accentSoftRgb);
          pdf.rect(marginLeft, y - 3.5, maxLineWidth, boxH, 'F');
        }
        pdf.setFillColor(...accentRgb);
        pdf.rect(marginLeft, y - 3.5, 1.8, boxH, 'F');
        pdf.setTextColor(...textRgb);
        wrapped.forEach((wl, idx) => {
          pdf.text(wl, marginLeft + 5, y + 1 + idx * 4.8);
        });
        y += boxH + 2;
        continue;
      }

      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        writeHeading(stripInlineMarkdown(headingMatch[2]), headingMatch[1].length <= 2 ? 2 : 3);
        i += 1;
        continue;
      }

      const bulletMatch = line.match(/^([-*]|\d+\.)\s+(.+)$/);
      if (bulletMatch) {
        const prefix = bulletMatch[1] === '-' || bulletMatch[1] === '*' ? '•' : bulletMatch[1];
        writeWrappedText(`${prefix} ${stripInlineMarkdown(bulletMatch[2])}`, tpl.sizes.bodyPt, 'normal', {
          indentX: 4,
          extraBottomMm: 1.5,
        });
        i += 1;
        continue;
      }

      writeWrappedText(stripInlineMarkdown(line), tpl.sizes.bodyPt, 'normal', { extraBottomMm: 2.5 });
      i += 1;
    }

    // Visuals
    if (Array.isArray(section.visuals) && section.visuals.length > 0) {
      for (const vis of section.visuals) {
        if (vis.kind === 'comparison_table' && vis.headers && vis.rows && vis.rows.length > 0) {
          ensureSpace(18);
          recorded.tableEntries.push({
            caption: vis.caption || vis.title,
            pageNumber: pdf.getNumberOfPages(),
            isFrontMatter: isFront,
          });
          writeWrappedText(vis.title, tpl.sizes.bodyPt, 'bold', { color: headingRgb, extraBottomMm: 2 });
          renderStyledTable(vis.headers, vis.rows);
          if (vis.caption) {
            writeWrappedText(`Table ${recorded.tableEntries.length}: ${vis.caption}`, tpl.sizes.captionPt, 'italic', {
              color: mutedRgb,
              extraBottomMm: 3,
            });
          }
          continue;
        }

        const rendered = renderVisualBlockToPng(
          vis,
          doc.metadata?.visualPreferences?.designStyle,
          visualPalette
        );
        if (!rendered) continue;

        const maxPrintableH = bottomLimit - marginTop - 14;
        let drawW = maxLineWidth;
        let drawH = drawW * (rendered.height / rendered.width);
        if (drawH > maxPrintableH) {
          const ratio = maxPrintableH / drawH;
          drawH = maxPrintableH;
          drawW *= ratio;
        }

        ensureSpace(drawH + 10);
        recorded.figureEntries.push({
          caption: vis.caption || vis.title,
          pageNumber: pdf.getNumberOfPages(),
          isFrontMatter: isFront,
        });
        const drawX = marginLeft + (maxLineWidth - drawW) / 2;
        pdf.addImage(rendered.dataUrl, 'PNG', drawX, y, drawW, drawH);
        y += drawH + 3;

        writeWrappedText(
          `Figure ${recorded.figureEntries.length}: ${vis.caption || vis.title}`,
          tpl.sizes.captionPt,
          'italic',
          { color: mutedRgb, extraBottomMm: 3 }
        );
      }
    }

    y += 4;
  }

  // 4. References
  if ((doc.references || []).length > 0 && meta.includeReferences !== false) {
    ensureSpace(16);
    recorded.tocEntries.push({ title: 'References', pageNumber: pdf.getNumberOfPages(), isFrontMatter: false });
    writeHeading('References', 1);
    doc.references.forEach((ref, rIdx) => {
      const refText = formatReferenceEntry(ref, doc.citationStyle || 'APA 7', rIdx + 1);
      writeWrappedText(stripInlineMarkdown(refText), Math.max(10, tpl.sizes.bodyPt - 1), 'normal', {
        extraBottomMm: 2.5,
      });
    });
  }

  // Integrity notice
  ensureSpace(10);
  writeWrappedText(STUDIO_DOWNLOAD_NOTICE, 8.5, 'italic', { color: mutedRgb, extraBottomMm: 2 });

  // Running Header & Footer / Page Numbers
  const totalPages = pdf.getNumberOfPages();
  const coverOffset = meta.includeCoverPage !== false ? 1 : 0;
  const fmEnd = metrics?.frontMatterEndPage ?? recorded.frontMatterEndPage;
  const showRunningHeader = tpl.layout.headerFooterStyle !== 'page_number_center';

  for (let p = 1; p <= totalPages; p += 1) {
    if (p <= coverOffset) continue;
    pdf.setPage(p);
    pdf.setFont(tpl.fonts.pdfBody, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...mutedRgb);

    if (showRunningHeader) {
      const shortTitle = (doc.title || '').slice(0, 62);
      pdf.text(shortTitle, marginLeft, 11);
      if (courseCode) {
        pdf.text(courseCode, pageWidth - marginRight, 11, { align: 'right' });
      }
      pdf.setDrawColor(...borderRgb);
      pdf.setLineWidth(0.2);
      pdf.line(marginLeft, 13, pageWidth - marginRight, 13);
    }

    const label = p <= fmEnd ? toRoman(p - coverOffset) : String(p - fmEnd);
    if (tpl.layout.headerFooterStyle === 'page_number_center') {
      pdf.text(label, pageWidth / 2, pageHeight - 10, { align: 'center' });
    } else {
      pdf.setDrawColor(...borderRgb);
      pdf.setLineWidth(0.2);
      pdf.line(marginLeft, pageHeight - 14, pageWidth - marginRight, pageHeight - 14);
      if (studentName) {
        pdf.text(studentName, marginLeft, pageHeight - 9);
      }
      pdf.text(`Page ${label}`, pageWidth - marginRight, pageHeight - 9, { align: 'right' });
    }
  }

  return { pdf, metrics: recorded };
}

export function generatePdfDoc(doc: AcademicDocument): jsPDF {
  if (isSlideDocument(doc)) {
    const slideTpl = getSlideTemplateForDoc(doc);
    return renderSlideDeckPdf(doc, slideTpl);
  }
  const docTpl = getDocumentTemplateForDoc(doc);
  const pass1 = renderDocumentPdfPass(doc, docTpl);
  const pass2 = renderDocumentPdfPass(doc, docTpl, pass1.metrics);
  return pass2.pdf;
}

export function generatePdfBlob(doc: AcademicDocument): Blob {
  const pdf = generatePdfDoc(doc);
  return pdf.output('blob');
}

export function downloadPdf(doc: AcademicDocument, filename: string): void {
  const pdf = generatePdfDoc(doc);
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
