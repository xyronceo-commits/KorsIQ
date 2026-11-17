import { jsPDF } from 'jspdf';
import { AcademicDocument } from '../types';
import { renderVisualBlockToPng } from './visualRenderer';

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

export function generatePdfDoc(doc: AcademicDocument): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const designStyle = doc.metadata?.visualPreferences?.designStyle || 'classic_academic';
  const isClassic = designStyle === 'classic_academic';
  const pdfFont = isClassic ? 'times' : 'helvetica';

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - margin - 8;
  let y = margin;

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
    lineHeightMm = fontSize * 0.45,
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

  // Cover page
  if (doc.metadata?.includeCoverPage !== false) {
    y = 55;
    if (doc.metadata?.institution) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(doc.metadata.institution.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 8;
    }
    if (doc.metadata?.faculty || doc.metadata?.department) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(
        (doc.metadata.faculty || doc.metadata.department || '').toUpperCase(),
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      y += 16;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    const titleLines = pdf.splitTextToSize(doc.title, maxLineWidth - 10) as string[];
    for (const tl of titleLines) {
      pdf.text(tl, pageWidth / 2, y, { align: 'center' });
      y += 8;
    }
    y += 12;

    const metaLines: string[] = [];
    if (doc.metadata?.courseCode || doc.metadata?.courseTitle) {
      metaLines.push(
        `Course: ${[doc.metadata.courseCode, doc.metadata.courseTitle].filter(Boolean).join(' - ')}`
      );
    } else if (doc.subject) {
      metaLines.push(`Subject: ${doc.subject}`);
    }
    if (doc.metadata?.studentName) metaLines.push(`Author: ${doc.metadata.studentName}`);
    if (doc.metadata?.studentId) metaLines.push(`Student ID: ${doc.metadata.studentId}`);
    if (doc.metadata?.lecturerName) metaLines.push(`Supervisor: ${doc.metadata.lecturerName}`);
    if (doc.metadata?.submissionDate) metaLines.push(`Date: ${doc.metadata.submissionDate}`);

    pdf.setFont('helvetica', 'normal');
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

  // Abstract
  if (doc.metadata?.abstract?.trim()) {
    writeWrappedText('Abstract', 13, 'bold', 6, 2);
    writeWrappedText(stripInlineMarkdown(doc.metadata.abstract), 10.5, 'normal', 5, 6);
  }

  // Sections
  for (const section of doc.sections || []) {
    ensureSpace(14);
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

      // Markdown table block
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

            pdf.setFont('helvetica', rIdx === 0 ? 'bold' : 'normal');
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

      // Subheadings
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const subTitle = stripInlineMarkdown(headingMatch[2]);
        writeWrappedText(subTitle, 11.5, 'bold', 5.5, 2);
        i += 1;
        continue;
      }

      // Bullet / numbered items
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

    // Optional visual elements for this section (only when generated/enabled)
    if (Array.isArray(section.visuals) && section.visuals.length > 0) {
      for (const vis of section.visuals) {
        if (vis.kind === 'comparison_table' && vis.headers && vis.rows && vis.rows.length > 0) {
          ensureSpace(18);
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
            writeWrappedText(vis.caption, 9, 'italic', 4.2, 3);
            pdf.setTextColor(0, 0, 0);
          } else {
            y += 3;
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
        const drawX = margin + (maxLineWidth - drawW) / 2;
        pdf.addImage(rendered.dataUrl, 'PNG', drawX, y, drawW, drawH);
        y += drawH + 3;

        if (vis.caption) {
          pdf.setTextColor(71, 85, 105);
          writeWrappedText(vis.caption, 9, 'italic', 4.2, 3);
          pdf.setTextColor(0, 0, 0);
        } else {
          y += 2;
        }
      }
    }

    y += 4;
  }

  // References
  if ((doc.references || []).length > 0 && doc.metadata?.includeReferences !== false) {
    ensureSpace(16);
    writeWrappedText('References', 13, 'bold', 6.5, 3);
    for (const ref of doc.references) {
      const refText = [ref.authors, ref.year ? `(${ref.year})` : '', ref.title, ref.doi || ref.fileName]
        .filter(Boolean)
        .join('. ');
      writeWrappedText(stripInlineMarkdown(refText), 10, 'normal', 4.8, 2.5);
    }
  }

  // Page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  }

  return pdf;
}

export function generatePdfBlob(doc: AcademicDocument): Blob {
  const pdf = generatePdfDoc(doc);
  return pdf.output('blob');
}

export function downloadPdf(doc: AcademicDocument, filename: string): void {
  const pdf = generatePdfDoc(doc);
  pdf.save(filename);
}
