import PptxGenJS from 'pptxgenjs';
import { AcademicDocument } from '../types';
import { renderVisualBlockToPng } from './visualRenderer';
import { formatReferenceEntry, STUDIO_DOWNLOAD_NOTICE } from '../lib/studioV2';

function cleanText(raw: string): string {
  return raw
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

function extractConciseBullets(content: string): string[] {
  const lines = (content || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('|'));

  const bullets: string[] = [];
  for (const line of lines) {
    const bulletMatch = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const text = cleanText(bulletMatch[2]);
      if (text) bullets.push(text.length > 180 ? `${text.slice(0, 177)}...` : text);
      continue;
    }

    // Split dense prose paragraphs into concise sentence points
    const sentences = cleanText(line)
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);
    for (const s of sentences) {
      bullets.push(s.length > 180 ? `${s.slice(0, 177)}...` : s);
    }
  }

  return bullets.length > 0 ? bullets : ['Section content summary.'];
}

export async function generatePptxBlob(doc: AcademicDocument): Promise<Blob> {
  const PptxCtor = (PptxGenJS as any).default || PptxGenJS;
  const pptx = new PptxCtor();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = doc.title;
  pptx.author = doc.metadata?.studentName || 'KorsIQ';

  const designStyle = doc.metadata?.visualPreferences?.designStyle || 'classic_academic';
  const slideFont = designStyle === 'classic_academic' ? 'Georgia' : 'Arial';

  // 1. Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: 'FFFFFF' };
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0.6,
    y: 0.9,
    w: 0.12,
    h: 4.8,
    fill: { color: '2563EB' },
  });
  titleSlide.addText(doc.title, {
    x: 1.0,
    y: 1.4,
    w: 11.2,
    h: 1.8,
    fontSize: 32,
    bold: true,
    color: '111827',
    fontFace: 'Arial',
  });

  const subtitleParts = [
    doc.metadata?.courseCode || doc.subject,
    doc.metadata?.studentName,
    doc.metadata?.institution,
    doc.metadata?.submissionDate,
  ].filter(Boolean);

  if (subtitleParts.length > 0) {
    titleSlide.addText(subtitleParts.join('  •  '), {
      x: 1.0,
      y: 3.5,
      w: 11.2,
      h: 0.9,
      fontSize: 16,
      color: '4B5563',
      fontFace: 'Arial',
    });
  }

  // 2. Section Slides (3-5 concise bullets per slide, split sensibly)
  const MAX_BULLETS_PER_SLIDE = 5;
  for (const section of doc.sections || []) {
    const bullets = extractConciseBullets(section.content);
    const totalChunks = Math.max(1, Math.ceil(bullets.length / MAX_BULLETS_PER_SLIDE));

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx += 1) {
      const slice = bullets.slice(
        chunkIdx * MAX_BULLETS_PER_SLIDE,
        (chunkIdx + 1) * MAX_BULLETS_PER_SLIDE
      );
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      const slideTitle =
        totalChunks > 1 ? `${section.title} (${chunkIdx + 1}/${totalChunks})` : section.title;

      slide.addText(slideTitle, {
        x: 0.7,
        y: 0.5,
        w: 11.9,
        h: 0.7,
        fontSize: 24,
        bold: true,
        color: '111827',
        fontFace: 'Arial',
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 0.7,
        y: 1.25,
        w: 1.4,
        h: 0.06,
        fill: { color: '2563EB' },
      });

      slide.addText(
        slice.map((b) => ({
          text: b,
          options: { bullet: true, breakLine: true, paraSpaceAfter: 10 },
        })),
        {
          x: 0.7,
          y: 1.55,
          w: 11.9,
          h: 5.2,
          fontSize: 16,
          color: '1F2937',
          valign: 'top',
          fontFace: slideFont,
        }
      );
    }

    // Optional visual slides for this section (only when generated/enabled)
    if (Array.isArray(section.visuals) && section.visuals.length > 0) {
      for (const vis of section.visuals) {
        const vSlide = pptx.addSlide();
        vSlide.background = { color: 'FFFFFF' };

        vSlide.addText(`${section.title}: ${vis.title}`, {
          x: 0.7,
          y: 0.45,
          w: 11.9,
          h: 0.6,
          fontSize: 21,
          bold: true,
          color: '111827',
          fontFace: slideFont,
        });

        vSlide.addShape(pptx.ShapeType.rect, {
          x: 0.7,
          y: 1.12,
          w: 1.4,
          h: 0.06,
          fill: { color: '2563EB' },
        });

        if (vis.kind === 'comparison_table' && vis.headers && vis.rows && vis.rows.length > 0) {
          const tableData = [
            vis.headers.map((h) => ({
              text: h,
              options: { bold: true, color: 'FFFFFF', fill: { color: '2563EB' } },
            })),
            ...vis.rows.map((row, rIdx) =>
              vis.headers!.map((_, cIdx) => ({
                text: String(row[cIdx] ?? ''),
                options: { color: '111827', fill: { color: rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' } },
              }))
            ),
          ];
          vSlide.addTable(tableData, {
            x: 0.7,
            y: 1.35,
            w: 11.9,
            fontSize: 12,
            fontFace: slideFont,
            border: { type: 'solid', pt: 1, color: 'CBD5E1' },
            margin: 6,
          });
        } else {
          const rendered = renderVisualBlockToPng(vis, designStyle);
          if (rendered) {
            const maxW = 11.4;
            const maxH = 5.0;
            const aspect = rendered.width / rendered.height;
            let drawW = maxW;
            let drawH = drawW / aspect;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = drawH * aspect;
            }
            const drawX = (13.333 - drawW) / 2;
            const drawY = 1.35 + (maxH - drawH) / 2;

            vSlide.addImage({
              data: rendered.dataUrl,
              x: drawX,
              y: drawY,
              w: drawW,
              h: drawH,
            });
          }
        }

        if (vis.caption) {
          vSlide.addText(vis.caption, {
            x: 0.7,
            y: 6.65,
            w: 11.9,
            h: 0.45,
            fontSize: 11,
            italic: true,
            color: '4B5563',
            align: 'center',
            fontFace: slideFont,
          });
        }
      }
    }
  }

  // 3. References Slide(s)
  const refs = doc.references || [];
  if (refs.length > 0 && doc.metadata?.includeReferences !== false) {
    const REFS_PER_SLIDE = 6;
    const refPages = Math.ceil(refs.length / REFS_PER_SLIDE);
    for (let rPage = 0; rPage < refPages; rPage += 1) {
      const slice = refs.slice(rPage * REFS_PER_SLIDE, (rPage + 1) * REFS_PER_SLIDE);
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      slide.addText(refPages > 1 ? `References (${rPage + 1}/${refPages})` : 'References', {
        x: 0.7,
        y: 0.5,
        w: 11.9,
        h: 0.7,
        fontSize: 24,
        bold: true,
        color: '111827',
        fontFace: 'Arial',
      });

      slide.addText(
        slice.map((ref, idx) => ({
          text: formatReferenceEntry(ref, doc.citationStyle || 'APA 7', rPage * REFS_PER_SLIDE + idx + 1),
          options: { bullet: true, breakLine: true, paraSpaceAfter: 8 },
        })),
        {
          x: 0.7,
          y: 1.45,
          w: 11.9,
          h: 5.0,
          fontSize: 13,
          color: '374151',
          valign: 'top',
          fontFace: 'Arial',
        }
      );

      slide.addText(STUDIO_DOWNLOAD_NOTICE, {
        x: 0.7,
        y: 6.75,
        w: 11.9,
        h: 0.4,
        fontSize: 10,
        italic: true,
        color: '6B7280',
        fontFace: 'Arial',
      });
    }
  }

  const out = await pptx.write({ outputType: 'blob' });
  return out as Blob;
}

export async function downloadPptx(doc: AcademicDocument, filename: string): Promise<void> {
  const blob = await generatePptxBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
