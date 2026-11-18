import { jsPDF } from 'jspdf';
import { AcademicDocument } from '../types';
import { renderVisualBlockToPng } from './visualRenderer';
import { formatReferenceEntry, inferSectionKind, STUDIO_DOWNLOAD_NOTICE } from '../lib/studioV2';

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
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

function renderPdfPass(doc: AcademicDocument, metrics?: PassMetrics): { pdf: jsPDF; metrics: PassMetrics } {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const designStyle =
    doc.brief?.documentStyle === 'modern_clean'
      ? 'modern_professional'
      : (doc.metadata?.visualPreferences?.designStyle || 'classic_academic');
  const isClassic = designStyle === 'classic_academic';
  const pdfFont = isClassic ? 'times' : 'helvetica';
  const lineMultiplier = doc.brief?.spacing === 'double' ? 0.56 : 0.45;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - margin - 10;
  let y = margin;

  const recorded: PassMetrics = {
    tocEntries: [],
    tableEntries: [],
    figureEntries: [],
    frontMatterEndPage: 1,
  };

  const formatPageLabel = (absPage: number, isFront: boolean): string => {
    if (absPage <= 1 && doc.metadata?.includeCoverPage !== false) return '';
    const coverOffset = doc.metadata?.includeCoverPage !== false ? 1 : 0;
    if (isFront) {
      return toRoman(Math.max(1, absPage - coverOffset));
    }
    const fmEnd = metrics?.frontMatterEndPage ?? recorded.frontMatterEndPage;
    return String(Math.max(1, absPage - fmEnd));
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeWrappedText = (
    text: string,
    fontSize: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    lineHeightMm = fontSize * lineMultiplier,
    extraBottomMm = 2
  ) => {
    pdf.setFont(pdfFont, style);
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxLineWidth) as string[];
    for (const line of lines) {
      ensureSpace(lineHeightMm);
      pdf.text(line, margin, y);
      y += lineHeightMm;
    }
    y += extraBottomMm;
  };

  const brief = doc.brief;
  const meta = doc.metadata || {};
  const institution = brief?.institution || meta.institution;
  const faculty = brief?.faculty || meta.faculty || brief?.department || meta.department;
  const courseCode = brief?.courseCode || meta.courseCode;
  const courseTitle = brief?.courseTitle || meta.courseTitle;
  const studentName = brief?.studentName || meta.studentName;
  const studentId = brief?.matricNumber || meta.studentId;
  const supervisor = brief?.supervisorName || meta.lecturerName;
  const submissionDate = brief?.date || meta.submissionDate;

  // 1. Cover page
  if (meta.includeCoverPage !== false) {
    y = 50;
    if (institution) {
      pdf.setFont(pdfFont, 'bold');
      pdf.setFontSize(13);
      pdf.text(institution.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 8;
    }
    if (faculty) {
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(10.5);
      pdf.text(faculty.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 18;
    }

    pdf.setFont(pdfFont, 'bold');
    pdf.setFontSize(18);
    const titleLines = pdf.splitTextToSize(doc.title, maxLineWidth - 10) as string[];
    for (const tl of titleLines) {
      pdf.text(tl, pageWidth / 2, y, { align: 'center' });
      y += 8;
    }
    y += 14;

    const metaLines: string[] = [];
    if (courseCode || courseTitle) {
      metaLines.push(`Course: ${[courseCode, courseTitle].filter(Boolean).join(' - ')}`);
    } else if (doc.subject) {
      metaLines.push(`Subject: ${doc.subject}`);
    }
    if (studentName) metaLines.push(`Author: ${studentName}`);
    if (studentId) metaLines.push(`Matric / ID: ${studentId}`);
    if (supervisor) metaLines.push(`Supervisor: ${supervisor}`);
    if (submissionDate) metaLines.push(`Date: ${submissionDate}`);

    pdf.setFont(pdfFont, 'normal');
    pdf.setFontSize(11);
    for (const ml of metaLines) {
      pdf.text(ml, pageWidth / 2, y, { align: 'center' });
      y += 7;
    }

    pdf.addPage();
    y = margin;
  } else {
    writeWrappedText(doc.title, 16, 'bold', 7.5, 4);
  }

  // 2. Table of Contents, List of Tables, List of Figures (Front Matter)
  const outlineMap = new Map((doc.outline || []).map((o) => [o.id, o]));
  const hasToc = meta.includeTableOfContents !== false && (doc.sections || []).length > 0;
  if (hasToc) {
    writeWrappedText('Table of Contents', 14, 'bold', 7, 4);
    const entries = metrics?.tocEntries || (doc.sections || []).map((s) => ({
      title: s.title,
      pageNumber: 0,
      isFrontMatter: false,
    }));
    for (const entry of entries) {
      ensureSpace(6);
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(10.5);
      const label = metrics ? formatPageLabel(entry.pageNumber, entry.isFrontMatter) : '...';
      const titleText = entry.title.length > 68 ? `${entry.title.slice(0, 65)}...` : entry.title;
      pdf.text(titleText, margin, y);
      pdf.text(label, pageWidth - margin, y, { align: 'right' });
      y += 5.5;
    }

    if (metrics && metrics.tableEntries.length > 0) {
      y += 5;
      writeWrappedText('List of Tables', 13, 'bold', 6.5, 3);
      for (let idx = 0; idx < metrics.tableEntries.length; idx += 1) {
        const te = metrics.tableEntries[idx];
        ensureSpace(6);
        pdf.setFont(pdfFont, 'normal');
        pdf.setFontSize(10);
        const txt = `Table ${idx + 1}: ${te.caption}`;
        pdf.text(txt.length > 68 ? `${txt.slice(0, 65)}...` : txt, margin, y);
        pdf.text(formatPageLabel(te.pageNumber, te.isFrontMatter), pageWidth - margin, y, { align: 'right' });
        y += 5.2;
      }
    }

    if (metrics && metrics.figureEntries.length > 0) {
      y += 5;
      writeWrappedText('List of Figures', 13, 'bold', 6.5, 3);
      for (let idx = 0; idx < metrics.figureEntries.length; idx += 1) {
        const fe = metrics.figureEntries[idx];
        ensureSpace(6);
        pdf.setFont(pdfFont, 'normal');
        pdf.setFontSize(10);
        const txt = `Figure ${idx + 1}: ${fe.caption}`;
        pdf.text(txt.length > 68 ? `${txt.slice(0, 65)}...` : txt, margin, y);
        pdf.text(formatPageLabel(fe.pageNumber, fe.isFrontMatter), pageWidth - margin, y, { align: 'right' });
        y += 5.2;
      }
    }

    pdf.addPage();
    y = margin;
  }

  recorded.frontMatterEndPage = pdf.getNumberOfPages();

  // 3. Sections (Front matter sections first if any, then body)
  let switchedToBody = false;
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

    ensureSpace(14);
    const sectionPage = pdf.getNumberOfPages();
    recorded.tocEntries.push({ title: section.title, pageNumber: sectionPage, isFrontMatter: isFront });
    writeWrappedText(section.title, 13, 'bold', 6.5, 2.5);

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
        if (tableRows.length > 0) {
          recorded.tableEntries.push({
            caption: `${section.title} Summary`,
            pageNumber: pdf.getNumberOfPages(),
            isFrontMatter: isFront,
          });
          const colCount = Math.max(...tableRows.map((r) => r.length));
          const colWidth = maxLineWidth / Math.max(1, colCount);
          for (let rIdx = 0; rIdx < tableRows.length; rIdx += 1) {
            const row = tableRows[rIdx];
            const wrappedCells = row.map((cell) =>
              pdf.splitTextToSize(cell, Math.max(15, colWidth - 3)) as string[]
            );
            const rowLines = Math.max(...wrappedCells.map((c) => c.length), 1);
            const rowHeight = rowLines * 4.5 + 3;
            ensureSpace(rowHeight);

            pdf.setFont(pdfFont, rIdx === 0 ? 'bold' : 'normal');
            pdf.setFontSize(9.5);
            for (let cIdx = 0; cIdx < colCount; cIdx += 1) {
              const x = margin + cIdx * colWidth;
              pdf.rect(x, y - 3.5, colWidth, rowHeight);
              const cellLines = wrappedCells[cIdx] || [''];
              cellLines.forEach((cl, lineOffset) => {
                pdf.text(cl, x + 1.5, y + lineOffset * 4.5);
              });
            }
            y += rowHeight;
          }
          y += 3;
        }
        continue;
      }

      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        writeWrappedText(stripInlineMarkdown(headingMatch[2]), 11.5, 'bold', 5.5, 2);
        i += 1;
        continue;
      }

      const bulletMatch = line.match(/^([-*]|\d+\.)\s+(.+)$/);
      if (bulletMatch) {
        const prefix = bulletMatch[1] === '-' || bulletMatch[1] === '*' ? '•' : bulletMatch[1];
        writeWrappedText(`${prefix} ${stripInlineMarkdown(bulletMatch[2])}`, 10.5, 'normal', 5, 1.5);
        i += 1;
        continue;
      }

      writeWrappedText(stripInlineMarkdown(line), 10.5, 'normal', 5, 2.5);
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
          pdf.setTextColor(isClassic ? 17 : 30, isClassic ? 24 : 58, isClassic ? 39 : 138);
          writeWrappedText(vis.title, 10.5, 'bold', 5, 2);
          pdf.setTextColor(0, 0, 0);

          const colCount = Math.max(1, vis.headers.length);
          const colWidth = maxLineWidth / colCount;
          const allRows = [vis.headers, ...vis.rows];
          for (let rIdx = 0; rIdx < allRows.length; rIdx += 1) {
            const row = allRows[rIdx];
            const wrappedCells = row.map((cell) =>
              pdf.splitTextToSize(String(cell ?? ''), Math.max(15, colWidth - 3)) as string[]
            );
            const rowLines = Math.max(...wrappedCells.map((c) => c.length), 1);
            const rowHeight = rowLines * 4.5 + 3.5;
            ensureSpace(rowHeight);

            if (rIdx === 0) {
              pdf.setFillColor(37, 99, 235);
              pdf.rect(margin, y - 3.5, maxLineWidth, rowHeight, 'F');
              pdf.setTextColor(255, 255, 255);
              pdf.setFont(pdfFont, 'bold');
            } else {
              if (rIdx % 2 === 0) {
                pdf.setFillColor(248, 250, 252);
                pdf.rect(margin, y - 3.5, maxLineWidth, rowHeight, 'F');
              }
              pdf.setTextColor(15, 23, 42);
              pdf.setFont(pdfFont, 'normal');
            }
            pdf.setFontSize(9.5);
            for (let cIdx = 0; cIdx < colCount; cIdx += 1) {
              const x = margin + cIdx * colWidth;
              pdf.setDrawColor(203, 213, 225);
              pdf.rect(x, y - 3.5, colWidth, rowHeight);
              const cellLines = wrappedCells[cIdx] || [''];
              cellLines.forEach((cl, lineOffset) => {
                pdf.text(cl, x + 1.5, y + lineOffset * 4.5);
              });
            }
            y += rowHeight;
          }
          pdf.setTextColor(0, 0, 0);
          pdf.setDrawColor(0, 0, 0);
          if (vis.caption) {
            y += 1.5;
            pdf.setTextColor(71, 85, 105);
            writeWrappedText(`Table ${recorded.tableEntries.length}: ${vis.caption}`, 9, 'italic', 4.2, 3);
            pdf.setTextColor(0, 0, 0);
          }
          continue;
        }

        const rendered = renderVisualBlockToPng(vis, designStyle);
        if (!rendered) continue;

        const maxPrintableH = bottomLimit - margin - 14;
        let drawW = maxLineWidth;
        let drawH = drawW * (rendered.height / rendered.width);
        if (drawH > maxPrintableH) {
          const ratio = maxPrintableH / drawH;
          drawH = maxPrintableH;
          drawW = drawW * ratio;
        }

        ensureSpace(drawH + 10);
        recorded.figureEntries.push({
          caption: vis.caption || vis.title,
          pageNumber: pdf.getNumberOfPages(),
          isFrontMatter: isFront,
        });
        const drawX = margin + (maxLineWidth - drawW) / 2;
        pdf.addImage(rendered.dataUrl, 'PNG', drawX, y, drawW, drawH);
        y += drawH + 3;

        pdf.setTextColor(71, 85, 105);
        writeWrappedText(
          `Figure ${recorded.figureEntries.length}: ${vis.caption || vis.title}`,
          9,
          'italic',
          4.2,
          3
        );
        pdf.setTextColor(0, 0, 0);
      }
    }

    y += 4;
  }

  // 4. References
  if ((doc.references || []).length > 0 && meta.includeReferences !== false) {
    ensureSpace(16);
    recorded.tocEntries.push({ title: 'References', pageNumber: pdf.getNumberOfPages(), isFrontMatter: false });
    writeWrappedText('References', 13, 'bold', 6.5, 3);
    doc.references.forEach((ref, rIdx) => {
      const refText = formatReferenceEntry(ref, doc.citationStyle || 'APA 7', rIdx + 1);
      writeWrappedText(stripInlineMarkdown(refText), 10, 'normal', 4.8, 2.5);
    });
  }

  // Integrity notice
  ensureSpace(10);
  pdf.setTextColor(100, 116, 139);
  writeWrappedText(STUDIO_DOWNLOAD_NOTICE, 8.5, 'italic', 4, 2);
  pdf.setTextColor(0, 0, 0);

  // Page numbers (Roman for front matter, Arabic for body)
  const totalPages = pdf.getNumberOfPages();
  const coverOffset = meta.includeCoverPage !== false ? 1 : 0;
  const fmEnd = metrics?.frontMatterEndPage ?? recorded.frontMatterEndPage;

  for (let p = 1; p <= totalPages; p += 1) {
    if (p <= coverOffset) continue;
    pdf.setPage(p);
    pdf.setFont(pdfFont, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(120, 120, 120);
    const label = p <= fmEnd ? toRoman(p - coverOffset) : String(p - fmEnd);
    pdf.text(label, pageWidth - margin, pageHeight - 10, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  }

  return { pdf, metrics: recorded };
}

export function generatePdfDoc(doc: AcademicDocument): jsPDF {
  const pass1 = renderPdfPass(doc);
  const pass2 = renderPdfPass(doc, pass1.metrics);
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
