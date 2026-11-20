import PptxGenJS from 'pptxgenjs';
import { AcademicDocument } from '../types';
import { renderVisualBlockToPng } from './visualRenderer';
import { formatReferenceEntry, STUDIO_DOWNLOAD_NOTICE } from '../lib/studioV2';
import { resolveSlideCoverPage } from '../lib/studioCover';
import { latexToReadableMath } from '../lib/mathFormatter';
import {
  SlideTemplate,
  getSlideTemplateForDoc,
  slideTemplateToVisualPalette,
  stripHexHash,
} from '../lib/studioTemplates';

function cleanText(raw: string): string {
  return latexToReadableMath(raw || '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, '$1')
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
      if (text) bullets.push(text.length > 170 ? `${text.slice(0, 167)}...` : text);
      continue;
    }

    const sentences = cleanText(line)
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);
    for (const s of sentences) {
      bullets.push(s.length > 170 ? `${s.slice(0, 167)}...` : s);
    }
  }

  return bullets.length > 0 ? bullets : ['Section content summary.'];
}

function renderVectorBackgroundToPptx(
  pptx: any,
  slide: any,
  tpl: SlideTemplate,
  variant: 'title' | 'content'
): void {
  const kind = tpl.vectorKind;
  if (!kind) return;

  const bg = stripHexHash(tpl.colors.bg, 'FFFFFF');
  const surface = stripHexHash(tpl.colors.surface, 'F8FAFC');
  const titleBg = stripHexHash(tpl.colors.titleBg, '1B1D21');
  const heading = stripHexHash(tpl.colors.heading, '18181B');
  const accent = stripHexHash(tpl.colors.accent, '113826');
  const accentSoft = stripHexHash(tpl.colors.accentSoft || tpl.colors.surface, 'E2E8F0');
  const border = stripHexHash(tpl.colors.border, 'CBD5E1');

  const rect = pptx.ShapeType.rect;
  const roundRect = pptx.ShapeType.roundRect;
  const ellipse = pptx.ShapeType.ellipse;
  const line = pptx.ShapeType.line;
  const rtTriangle = pptx.ShapeType.rtTriangle;
  const custGeom = pptx.ShapeType.custGeom || 'custGeom';

  if (kind === 'diagonal-slash') {
    slide.background = { color: bg };
    // Stripe 1: thin leading slash (0.35,0) -> (0.75,0) -> (0,3.2) -> (0,2.0)
    slide.addShape(custGeom, {
      x: 0,
      y: 0,
      w: 0.75,
      h: 3.2,
      fill: { color: accent },
      line: { color: accent, pt: 0 },
      points: [
        { x: 0.35, y: 0 },
        { x: 0.75, y: 0 },
        { x: 0, y: 3.2 },
        { x: 0, y: 2.0 },
        { close: true },
      ],
    });
    // Stripe 2: bold primary slash (1.15,0) -> (2.15,0) -> (0.65,7.5) -> (0,7.5)
    slide.addShape(custGeom, {
      x: 0,
      y: 0,
      w: 2.15,
      h: 7.5,
      fill: { color: accent },
      line: { color: accent, pt: 0 },
      points: [
        { x: 1.15, y: 0 },
        { x: 2.15, y: 0 },
        { x: 0.65, y: 7.5 },
        { x: 0, y: 7.5 },
        { close: true },
      ],
    });
    // Subtle 1px outer frame
    slide.addShape(rect, {
      x: 0.02,
      y: 0.02,
      w: 13.293,
      h: 7.46,
      fill: { type: 'none' },
      line: { color: accent, pt: 1 },
    });
    return;
  }

  if (kind === 'warm-geometric-arcs') {
    slide.background = { color: bg };
    if (variant === 'title') {
      // Left vertical tan panel
      slide.addShape(rect, { x: 0, y: 0, w: 3.1, h: 7.5, fill: { color: accentSoft } });
      // Soft overlapping cream circle
      slide.addShape(ellipse, { x: 1.6, y: -0.8, w: 4.0, h: 4.0, fill: { color: surface } });
      // 4 concentric quarter-circle arcs at top-right
      [1.7, 2.2, 2.7, 3.2].forEach((r, idx) => {
        slide.addShape(ellipse, {
          x: 13.333 - r,
          y: -r,
          w: r * 2,
          h: r * 2,
          fill: { type: 'none' },
          line: { color: accent, pt: 1.2, transparency: 45 + idx * 10 },
        });
      });
      // Concentric arcs at bottom-center
      [1.3, 1.75].forEach((r, idx) => {
        slide.addShape(ellipse, {
          x: 6.7 - r,
          y: 7.5 - r,
          w: r * 2,
          h: r * 2,
          fill: { type: 'none' },
          line: { color: accent, pt: 1.2, transparency: 60 + idx * 12 },
        });
      });
      // 3 stacked stepped L-squares bottom-right
      slide.addShape(rect, { x: 11.533, y: 6.1, w: 0.6, h: 0.6, fill: { color: accentSoft } });
      slide.addShape(rect, { x: 12.133, y: 6.1, w: 0.6, h: 0.6, fill: { color: accent, transparency: 15 } });
      slide.addShape(rect, { x: 12.133, y: 6.7, w: 0.6, h: 0.6, fill: { color: accentSoft } });
      slide.addShape(rect, { x: 12.733, y: 6.7, w: 0.6, h: 0.6, fill: { color: accent } });
    } else {
      // Narrow vertical tan side tabs
      slide.addShape(rect, { x: 0, y: 2.55, w: 0.35, h: 2.4, fill: { color: accentSoft } });
      slide.addShape(rect, { x: 12.983, y: 2.55, w: 0.35, h: 2.4, fill: { color: accentSoft } });
      // Delicate concentric arcs at top-right and bottom-left
      [1.3, 1.75].forEach((r, idx) => {
        slide.addShape(ellipse, {
          x: 13.333 - r,
          y: -r,
          w: r * 2,
          h: r * 2,
          fill: { type: 'none' },
          line: { color: accent, pt: 1.1, transparency: 55 + idx * 15 },
        });
        slide.addShape(ellipse, {
          x: -r,
          y: 7.5 - r,
          w: r * 2,
          h: r * 2,
          fill: { type: 'none' },
          line: { color: accent, pt: 1.1, transparency: 55 + idx * 15 },
        });
      });
      // Tiny stepped L-corner marks top-left & bottom-right
      slide.addShape(rect, { x: 0.3, y: 0.3, w: 0.22, h: 0.22, fill: { color: accent, transparency: 15 } });
      slide.addShape(rect, { x: 0.52, y: 0.3, w: 0.22, h: 0.22, fill: { color: accentSoft } });
      slide.addShape(rect, { x: 0.3, y: 0.52, w: 0.22, h: 0.22, fill: { color: accentSoft } });
      slide.addShape(rect, { x: 12.593, y: 6.98, w: 0.22, h: 0.22, fill: { color: accentSoft } });
      slide.addShape(rect, { x: 12.813, y: 6.76, w: 0.22, h: 0.22, fill: { color: accentSoft } });
      slide.addShape(rect, { x: 12.813, y: 6.98, w: 0.22, h: 0.22, fill: { color: accent, transparency: 15 } });
    }
    return;
  }

  if (kind === 'swiss-monochrome') {
    slide.background = { color: bg };
    if (variant === 'title') {
      slide.addShape(rect, { x: 0.7, y: 0.5, w: 0.65, h: 0.65, fill: { color: accent } });
      slide.addShape(line, { x: 1.55, y: 0.82, w: 11.08, h: 0, line: { color: border, pt: 1 } });
      slide.addShape(rect, {
        x: 2.2,
        y: 1.8,
        w: 8.9,
        h: 3.8,
        fill: { type: 'none' },
        line: { color: heading, pt: 1.5 },
      });
      slide.addShape(line, { x: 0.7, y: 6.8, w: 11.93, h: 0, line: { color: border, pt: 1 } });
    } else {
      slide.addShape(rect, { x: 0.7, y: 0.42, w: 0.24, h: 0.24, fill: { color: accent } });
      slide.addShape(line, { x: 0.7, y: 0.85, w: 11.93, h: 0, line: { color: border, pt: 1 } });
      slide.addShape(rect, { x: 0.7, y: 6.88, w: 11.93, h: 0.32, fill: { color: accent } });
    }
    return;
  }

  if (kind === 'corporate-slant') {
    slide.background = { color: bg };
    if (variant === 'title') {
      slide.addShape(ellipse, {
        x: 0.25,
        y: -0.35,
        w: 2.9,
        h: 2.9,
        fill: { color: accentSoft, transparency: 55 },
      });
      slide.addShape(ellipse, {
        x: 5.15,
        y: 5.35,
        w: 3.1,
        h: 3.1,
        fill: { color: accentSoft, transparency: 55 },
      });
      // Angled polygon covering right ~34%
      slide.addShape(custGeom, {
        x: 8.35,
        y: 0,
        w: 4.983,
        h: 7.5,
        fill: { color: accent },
        line: { color: accent, pt: 0 },
        points: [
          { x: 1.05, y: 0 },
          { x: 4.983, y: 0 },
          { x: 4.983, y: 7.5 },
          { x: 0, y: 7.5 },
          { close: true },
        ],
      });
    } else {
      slide.addShape(roundRect, {
        x: 8.133,
        y: 0.34,
        w: 4.5,
        h: 0.14,
        fill: { color: accent },
        rectRadius: 0.5,
      });
      slide.addShape(roundRect, {
        x: 0.64,
        y: 0.88,
        w: 12.05,
        h: 6.02,
        fill: { type: 'none' },
        line: { color: border, pt: 1 },
        rectRadius: 0.08,
      });
      slide.addShape(rtTriangle, {
        x: 12.2,
        y: 6.35,
        w: 1.133,
        h: 1.15,
        fill: { color: accent },
        flipH: true,
      });
    }
    return;
  }

  if (kind === 'architectural-frame') {
    slide.background = { color: bg };
    // Inset hairline rectangular frame with subtle midpoint gaps
    slide.addShape(line, { x: 0.4, y: 0.4, w: 5.85, h: 0, line: { color: border, pt: 1 } });
    slide.addShape(line, { x: 7.08, y: 0.4, w: 5.853, h: 0, line: { color: border, pt: 1 } });
    slide.addShape(line, { x: 0.4, y: 7.1, w: 5.85, h: 0, line: { color: border, pt: 1 } });
    slide.addShape(line, { x: 7.08, y: 7.1, w: 5.853, h: 0, line: { color: border, pt: 1 } });
    slide.addShape(line, { x: 0.4, y: 0.4, w: 0, h: 3.05, line: { color: border, pt: 1 } });
    slide.addShape(line, { x: 0.4, y: 4.05, w: 0, h: 3.05, line: { color: border, pt: 1 } });
    slide.addShape(line, { x: 12.933, y: 0.4, w: 0, h: 3.05, line: { color: border, pt: 1 } });
    slide.addShape(line, { x: 12.933, y: 4.05, w: 0, h: 3.05, line: { color: border, pt: 1 } });
    // Registration crosshairs (+ left, x right)
    slide.addShape(line, { x: 0.14, y: 3.75, w: 0.12, h: 0, line: { color: heading, pt: 1 } });
    slide.addShape(line, { x: 0.2, y: 3.69, w: 0, h: 0.12, line: { color: heading, pt: 1 } });
    slide.addShape(line, { x: 13.08, y: 3.7, w: 0.1, h: 0.1, line: { color: heading, pt: 1 } });
    slide.addShape(line, { x: 13.08, y: 3.7, w: 0.1, h: 0.1, flipV: true, line: { color: heading, pt: 1 } });
    if (variant === 'content') {
      slide.addShape(line, { x: 0.8, y: 1.25, w: 11.733, h: 0, line: { color: border, pt: 0.85 } });
      slide.addShape(rect, { x: 0.8, y: 1.22, w: 1.1, h: 0.05, fill: { color: accent } });
    }
    return;
  }

  if (kind === 'blue-wave-flow') {
    slide.background = { color: bg };
    if (variant === 'title') {
      // Corner accents top-left and bottom-left
      slide.addShape(rtTriangle, {
        x: 0,
        y: 0,
        w: 1.85,
        h: 1.55,
        fill: { color: accentSoft, transparency: 65 },
        flipV: true,
      });
      slide.addShape(rtTriangle, {
        x: 0,
        y: 6.1,
        w: 1.9,
        h: 1.4,
        fill: { color: accent, transparency: 78 },
      });
      // 3 layered curved wave ribbons along right third
      slide.addShape(custGeom, {
        x: 8.6,
        y: 0,
        w: 4.733,
        h: 7.5,
        fill: { color: accentSoft, transparency: 55 },
        line: { color: accentSoft, pt: 0 },
        points: [
          { x: 0.4, y: 0 },
          { x: 4.733, y: 0 },
          { x: 4.733, y: 7.5 },
          { x: 0, y: 7.5 },
          { x: 0.4, y: 0, curve: { type: 'cubic', x1: 0.9, y1: 4.8, x2: -0.2, y2: 2.3 } },
          { close: true },
        ],
      });
      slide.addShape(custGeom, {
        x: 9.3,
        y: 0,
        w: 4.033,
        h: 7.5,
        fill: { color: accent, transparency: 12 },
        line: { color: accent, pt: 0 },
        points: [
          { x: 0.45, y: 0 },
          { x: 4.033, y: 0 },
          { x: 4.033, y: 7.5 },
          { x: 0, y: 7.5 },
          { x: 0.45, y: 0, curve: { type: 'cubic', x1: 0.85, y1: 4.9, x2: -0.2, y2: 2.4 } },
          { close: true },
        ],
      });
      slide.addShape(custGeom, {
        x: 10.2,
        y: 0,
        w: 3.133,
        h: 7.5,
        fill: { color: heading },
        line: { color: heading, pt: 0 },
        points: [
          { x: 0.5, y: 0 },
          { x: 3.133, y: 0 },
          { x: 3.133, y: 7.5 },
          { x: 0, y: 7.5 },
          { x: 0.5, y: 0, curve: { type: 'cubic', x1: 0.8, y1: 5.0, x2: -0.1, y2: 2.5 } },
          { close: true },
        ],
      });
    } else {
      slide.addShape(rtTriangle, {
        x: 10.6,
        y: 0,
        w: 2.733,
        h: 1.55,
        fill: { color: accentSoft, transparency: 60 },
        flipH: true,
        flipV: true,
      });
      slide.addShape(rtTriangle, {
        x: 11.45,
        y: 0,
        w: 1.883,
        h: 1.05,
        fill: { color: accent, transparency: 15 },
        flipH: true,
        flipV: true,
      });
      slide.addShape(rtTriangle, {
        x: 0,
        y: 6.25,
        w: 2.2,
        h: 1.25,
        fill: { color: accentSoft, transparency: 65 },
      });
      slide.addShape(rect, { x: 0, y: 7.32, w: 13.333, h: 0.18, fill: { color: accent } });
    }
    return;
  }

  if (kind === 'editorial-split-dark') {
    if (variant === 'title') {
      slide.background = { color: titleBg };
      slide.addShape(custGeom, {
        x: 8.35,
        y: 0,
        w: 4.983,
        h: 7.5,
        fill: { color: surface },
        line: { color: surface, pt: 0 },
        points: [
          { x: 0.5, y: 0 },
          { x: 4.983, y: 0 },
          { x: 4.983, y: 7.5 },
          { x: 0, y: 7.5 },
          { x: 0.5, y: 0, curve: { type: 'cubic', x1: 1.1, y1: 5.1, x2: -0.4, y2: 2.5 } },
          { close: true },
        ],
      });
      slide.addShape(custGeom, {
        x: 0,
        y: 6.15,
        w: 4.95,
        h: 1.35,
        fill: { color: accentSoft, transparency: 8 },
        line: { color: accentSoft, pt: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 4.95, y: 1.35, curve: { type: 'quadratic', x1: 2.1, y1: 0.45 } },
          { x: 0, y: 1.35 },
          { close: true },
        ],
      });
    } else {
      slide.background = { color: bg };
      slide.addShape(custGeom, {
        x: 8.75,
        y: 0,
        w: 4.583,
        h: 7.5,
        fill: { color: titleBg },
        line: { color: accent, pt: 1.5 },
        points: [
          { x: 0.2, y: 0 },
          { x: 4.583, y: 0 },
          { x: 4.583, y: 7.5 },
          { x: 0, y: 7.5 },
          { x: 0.2, y: 0, curve: { type: 'cubic', x1: 0.55, y1: 5.0, x2: -0.2, y2: 2.4 } },
          { close: true },
        ],
      });
    }
    return;
  }

  if (kind === 'executive-concentric') {
    slide.background = { color: bg };
    // 3 overlapping concentric circles anchored off right edge (cx: 13.4, cy: 3.75)
    slide.addShape(ellipse, {
      x: 13.4 - 4.1,
      y: 3.75 - 4.1,
      w: 8.2,
      h: 8.2,
      fill: { color: surface, transparency: 35 },
    });
    slide.addShape(ellipse, {
      x: 13.4 - 2.9,
      y: 3.75 - 2.9,
      w: 5.8,
      h: 5.8,
      fill: { color: border, transparency: 45 },
    });
    slide.addShape(ellipse, {
      x: 13.4 - 1.75,
      y: 3.75 - 1.75,
      w: 3.5,
      h: 3.5,
      fill: { color: accent },
    });
    // Bottom structured takeaway strip (blank until populated)
    slide.addShape(roundRect, {
      x: 0.85,
      y: 6.15,
      w: 10.6,
      h: 0.65,
      fill: { color: accentSoft },
      rectRadius: 0.06,
    });
    slide.addShape(custGeom, {
      x: 0.85,
      y: 6.15,
      w: 2.8,
      h: 0.65,
      fill: { color: accent },
      line: { color: accent, pt: 0 },
      points: [
        { x: 0, y: 0 },
        { x: 2.8, y: 0 },
        { x: 2.53, y: 0.65 },
        { x: 0, y: 0.65 },
        { close: true },
      ],
    });
  }
}

function buildTitleSlide(
  pptx: any,
  doc: AcademicDocument,
  tpl: SlideTemplate,
  subtitleParts: string[]
) {
  const slide = pptx.addSlide();
  const bg = stripHexHash(tpl.colors.bg, 'FFFFFF');
  const surface = stripHexHash(tpl.colors.surface, 'F8FAFC');
  const titleBg = stripHexHash(tpl.colors.titleBg, '0F2942');
  const titleText = stripHexHash(tpl.colors.titleText, 'FFFFFF');
  const heading = stripHexHash(tpl.colors.heading, '0A0A0A');
  const body = stripHexHash(tpl.colors.body, '1F2937');
  const muted = stripHexHash(tpl.colors.muted, '64748B');
  const accent = stripHexHash(tpl.colors.accent, '1D4ED8');
  const accentText = stripHexHash(tpl.colors.accentText, 'FFFFFF');
  const border = stripHexHash(tpl.colors.border, 'CBD5E1');
  const slideCover = resolveSlideCoverPage(doc);
  const effectiveDocTitle = slideCover.title || doc.title;
  const courseCode = slideCover.courseCode;
  const subtitle = subtitleParts.join('  •  ');
  const titleDoc: AcademicDocument = effectiveDocTitle !== doc.title ? { ...doc, title: effectiveDocTitle } : doc;

  if (slideCover.speakerNotes && typeof slide.addNotes === 'function') {
    slide.addNotes(slideCover.speakerNotes);
  }

  if (tpl.vectorKind && tpl.safeZone) {
    renderVectorBackgroundToPptx(pptx, slide, tpl, 'title');
    const zone = tpl.safeZone.title;
    const isDarkTitle = tpl.vectorKind === 'editorial-split-dark';
    const titleColor = isDarkTitle ? titleText : heading;
    const subColor = isDarkTitle ? stripHexHash(tpl.colors.accentSoft || '#E2E8F0', 'E2E8F0') : muted;
    const kickerColor = isDarkTitle ? accent : accent;

    if (courseCode) {
      slide.addText(courseCode.toUpperCase(), {
        x: zone.x,
        y: zone.y,
        w: zone.w,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: kickerColor,
        fontFace: tpl.fonts.body,
        align: tpl.vectorKind === 'swiss-monochrome' ? 'center' : 'left',
      });
    }
    slide.addText(titleDoc.title, {
      x: zone.x,
      y: zone.y + 0.55,
      w: zone.w,
      h: Math.min(2.6, zone.h - 1.35),
      fontSize: zone.w < 8.5 ? 28 : 32,
      bold: true,
      color: titleColor,
      fontFace: tpl.fonts.heading,
      valign: 'top',
      align: tpl.vectorKind === 'swiss-monochrome' ? 'center' : 'left',
      fit: 'shrink',
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: zone.x,
        y: zone.y + zone.h - 0.75,
        w: zone.w,
        h: 0.7,
        fontSize: 13.5,
        color: subColor,
        fontFace: tpl.fonts.body,
        align: tpl.vectorKind === 'swiss-monochrome' ? 'center' : 'left',
        fit: 'shrink',
      });
    }
    return;
  }

  if (tpl.layout.titleLayout === 'pitch_split_hero') {
    slide.background = { color: bg };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 8.2, h: 7.5, fill: { color: titleBg } });
    slide.addShape(pptx.ShapeType.rect, { x: 8.2, y: 0, w: 0.16, h: 7.5, fill: { color: accent } });

    if (courseCode) {
      slide.addText(courseCode.toUpperCase(), {
        x: 0.8,
        y: 0.9,
        w: 3.2,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: accentText,
        fill: { color: accent },
        align: 'center',
        fontFace: tpl.fonts.body,
      });
    }
    slide.addText(doc.title, {
      x: 0.8,
      y: 1.7,
      w: 6.8,
      h: 2.8,
      fontSize: 32,
      bold: true,
      color: titleText,
      fontFace: tpl.fonts.heading,
      valign: 'top',
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.8,
        y: 5.4,
        w: 6.8,
        h: 1.1,
        fontSize: 14,
        color: 'CBD5E1',
        fontFace: tpl.fonts.body,
      });
    }

    // Right accent panel
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.85,
      y: 1.9,
      w: 3.7,
      h: 3.6,
      fill: { color: surface },
      line: { color: border, pt: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, { x: 8.85, y: 1.9, w: 0.12, h: 3.6, fill: { color: accent } });
    slide.addText(`${(doc.sections || []).length} Sections`, {
      x: 9.2,
      y: 2.4,
      w: 3.1,
      h: 0.7,
      fontSize: 22,
      bold: true,
      color: accent,
      fontFace: tpl.fonts.heading,
    });
    slide.addText(doc.docType.replace('_', ' ').toUpperCase(), {
      x: 9.2,
      y: 3.2,
      w: 3.1,
      h: 0.5,
      fontSize: 12,
      bold: true,
      color: heading,
      fontFace: tpl.fonts.body,
    });
    if (doc.metadata?.submissionDate || doc.brief?.date) {
      slide.addText(String(doc.brief?.date || doc.metadata?.submissionDate), {
        x: 9.2,
        y: 3.9,
        w: 3.1,
        h: 0.5,
        fontSize: 12,
        color: muted,
        fontFace: tpl.fonts.body,
      });
    }
    return;
  }

  if (tpl.layout.titleLayout === 'editorial_asymmetric') {
    slide.background = { color: bg };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 4.1, h: 7.5, fill: { color: titleBg } });
    slide.addShape(pptx.ShapeType.rect, { x: 4.1, y: 0, w: 0.1, h: 7.5, fill: { color: accent } });
    if (courseCode) {
      slide.addText(courseCode.toUpperCase(), {
        x: 0.6,
        y: 0.9,
        w: 3.0,
        h: 0.6,
        fontSize: 12,
        bold: true,
        color: titleText,
        fontFace: tpl.fonts.body,
      });
    }
    slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 6.3, w: 1.2, h: 0.08, fill: { color: accent } });

    slide.addText('SEMINAR PRESENTATION', {
      x: 4.75,
      y: 1.2,
      w: 7.8,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: accent,
      fontFace: tpl.fonts.body,
    });
    slide.addText(doc.title, {
      x: 4.75,
      y: 1.8,
      w: 7.8,
      h: 2.7,
      fontSize: 32,
      bold: true,
      color: heading,
      fontFace: tpl.fonts.heading,
      valign: 'top',
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 4.75,
        y: 5.2,
        w: 7.8,
        h: 1.1,
        fontSize: 14,
        color: muted,
        fontFace: tpl.fonts.body,
      });
    }
    return;
  }

  if (tpl.layout.titleLayout === 'dark_executive') {
    slide.background = { color: bg };
    slide.addShape(pptx.ShapeType.rect, { x: 0.85, y: 1.1, w: 1.4, h: 0.1, fill: { color: accent } });
    slide.addText(doc.title, {
      x: 0.85,
      y: 1.5,
      w: 11.6,
      h: 2.6,
      fontSize: 34,
      bold: true,
      color: heading,
      fontFace: tpl.fonts.heading,
      valign: 'top',
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.85,
      y: 5.0,
      w: 11.6,
      h: 1.35,
      fill: { color: surface },
      line: { color: border, pt: 1 },
    });
    slide.addText(subtitle || 'Executive Presentation', {
      x: 1.2,
      y: 5.35,
      w: 10.9,
      h: 0.7,
      fontSize: 15,
      color: body,
      fontFace: tpl.fonts.body,
    });
    return;
  }

  if (tpl.layout.titleLayout === 'technical_framed') {
    slide.background = { color: bg };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.65,
      y: 0.65,
      w: 12.03,
      h: 6.2,
      fill: { color: surface },
      line: { color: border, pt: 1.2 },
    });
    slide.addText('01', {
      x: 1.05,
      y: 1.1,
      w: 0.75,
      h: 0.45,
      fontSize: 13,
      bold: true,
      color: accentText,
      fill: { color: accent },
      align: 'center',
      fontFace: tpl.fonts.mono,
    });
    if (courseCode) {
      slide.addText(courseCode.toUpperCase(), {
        x: 2.0,
        y: 1.15,
        w: 9.8,
        h: 0.4,
        fontSize: 12,
        color: muted,
        fontFace: tpl.fonts.mono,
      });
    }
    slide.addText(doc.title, {
      x: 1.05,
      y: 2.0,
      w: 11.2,
      h: 2.4,
      fontSize: 30,
      bold: true,
      color: heading,
      fontFace: tpl.fonts.heading,
      valign: 'top',
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 1.05,
        y: 5.2,
        w: 11.2,
        h: 0.8,
        fontSize: 14,
        color: muted,
        fontFace: tpl.fonts.body,
      });
    }
    return;
  }

  if (tpl.layout.titleLayout === 'minimal_left') {
    slide.background = { color: bg };
    if (courseCode) {
      slide.addText(courseCode.toUpperCase(), {
        x: 0.9,
        y: 1.1,
        w: 11.4,
        h: 0.45,
        fontSize: 12,
        color: muted,
        fontFace: tpl.fonts.body,
      });
    }
    slide.addText(doc.title, {
      x: 0.9,
      y: 1.85,
      w: 11.4,
      h: 2.5,
      fontSize: 34,
      bold: true,
      color: heading,
      fontFace: tpl.fonts.heading,
      valign: 'top',
    });
    slide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 4.8, w: 1.6, h: 0.04, fill: { color: heading } });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.9,
        y: 5.2,
        w: 11.4,
        h: 0.9,
        fontSize: 15,
        color: muted,
        fontFace: tpl.fonts.body,
      });
    }
    return;
  }

  // academic-classic (default)
  slide.background = { color: bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.16, fill: { color: accent } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 6.55, w: 13.333, h: 0.95, fill: { color: titleBg } });

  slide.addText(
    [courseCode, doc.brief?.institution || doc.metadata?.institution]
      .filter(Boolean)
      .join('  ·  ')
      .toUpperCase() || 'ACADEMIC PRESENTATION',
    {
      x: 0.85,
      y: 1.15,
      w: 11.6,
      h: 0.45,
      fontSize: 13,
      bold: true,
      color: accent,
      fontFace: tpl.fonts.body,
    }
  );
  slide.addText(doc.title, {
    x: 0.85,
    y: 1.85,
    w: 11.6,
    h: 2.7,
    fontSize: 33,
    bold: true,
    color: heading,
    fontFace: tpl.fonts.heading,
    valign: 'top',
  });
  slide.addText(subtitle || 'KorsIQ Academic Studio', {
    x: 0.85,
    y: 6.77,
    w: 11.6,
    h: 0.5,
    fontSize: 13,
    color: titleText,
    fontFace: tpl.fonts.body,
  });
}

function applyContentSlideChrome(
  pptx: any,
  slide: any,
  doc: AcademicDocument,
  tpl: SlideTemplate,
  slideTitle: string,
  slideNum: number
): { bodyX: number; bodyY: number; bodyW: number; bodyH: number } {
  const bg = stripHexHash(tpl.colors.bg, 'FFFFFF');
  const surface = stripHexHash(tpl.colors.surface, 'F8FAFC');
  const titleBg = stripHexHash(tpl.colors.titleBg, '0F2942');
  const titleText = stripHexHash(tpl.colors.titleText, 'FFFFFF');
  const heading = stripHexHash(tpl.colors.heading, '0A0A0A');
  const muted = stripHexHash(tpl.colors.muted, '64748B');
  const accent = stripHexHash(tpl.colors.accent, '1D4ED8');
  const accentText = stripHexHash(tpl.colors.accentText, 'FFFFFF');
  const border = stripHexHash(tpl.colors.border, 'CBD5E1');
  const courseCode = doc.brief?.courseCode || doc.metadata?.courseCode || doc.subject || '';

  if (tpl.vectorKind && tpl.safeZone) {
    renderVectorBackgroundToPptx(pptx, slide, tpl, 'content');
    const zone = tpl.safeZone.content;
    const headerH = 0.65;
    slide.addText(slideTitle, {
      x: zone.x,
      y: zone.y,
      w: zone.w - 0.85,
      h: headerH,
      fontSize: zone.w < 8.5 ? 20 : 22,
      bold: true,
      color: heading,
      fontFace: tpl.fonts.heading,
      valign: 'middle',
      fit: 'shrink',
    });
    slide.addText(String(slideNum).padStart(2, '0'), {
      x: zone.x + zone.w - 0.75,
      y: zone.y + 0.1,
      w: 0.75,
      h: 0.42,
      fontSize: 10.5,
      bold: true,
      color: muted,
      align: 'right',
      fontFace: tpl.fonts.mono,
    });
    return {
      bodyX: zone.x,
      bodyY: zone.y + headerH + 0.18,
      bodyW: zone.w,
      bodyH: Math.max(2.4, zone.h - headerH - 0.25),
    };
  }

  slide.background = { color: bg };

  if (tpl.layout.headerStyle === 'top_rule_kicker') {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: accent } });
  } else if (tpl.layout.headerStyle === 'bold_accent_pill') {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: 7.5, fill: { color: accent } });
  }

  const leftX = tpl.layout.headerStyle === 'bold_accent_pill' ? 0.85 : 0.7;
  const contentW = 13.333 - leftX - 0.7;

  slide.addText(slideTitle, {
    x: leftX,
    y: 0.42,
    w: contentW - 1.1,
    h: 0.65,
    fontSize: 23,
    bold: true,
    color: heading,
    fontFace: tpl.fonts.heading,
    valign: 'middle',
  });

  if (tpl.layout.headerStyle === 'index_badge_panel') {
    slide.addText(String(slideNum).padStart(2, '0'), {
      x: 13.333 - 1.35,
      y: 0.5,
      w: 0.65,
      h: 0.45,
      fontSize: 12,
      bold: true,
      color: accentText,
      fill: { color: accent },
      align: 'center',
      fontFace: tpl.fonts.mono,
    });
  }

  // Header divider rule
  slide.addShape(pptx.ShapeType.rect, {
    x: leftX,
    y: 1.18,
    w: tpl.layout.headerStyle === 'plain_hairline' ? contentW : tpl.layout.headerStyle === 'top_rule_kicker' ? 1.8 : contentW,
    h: tpl.layout.headerStyle === 'plain_hairline' ? 0.02 : 0.04,
    fill: { color: tpl.layout.headerStyle === 'top_rule_kicker' || tpl.layout.headerStyle === 'editorial_serif_bar' ? accent : border },
  });

  let bodyX = leftX;
  let bodyY = 1.45;
  let bodyW = contentW;
  let bodyH = 5.05;

  if (tpl.layout.cardStyle === 'bordered_panel' || tpl.layout.cardStyle === 'elevated_dark') {
    slide.addShape(pptx.ShapeType.rect, {
      x: leftX,
      y: 1.42,
      w: contentW,
      h: 5.15,
      fill: { color: surface },
      line: { color: border, pt: 1 },
    });
    bodyX = leftX + 0.3;
    bodyY = 1.65;
    bodyW = contentW - 0.6;
    bodyH = 4.7;
  }

  // Footer
  if (tpl.layout.footerStyle === 'structured_band') {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 6.92, w: 13.333, h: 0.58, fill: { color: titleBg } });
    slide.addText((doc.title || '').slice(0, 72), {
      x: 0.7,
      y: 7.04,
      w: 10.6,
      h: 0.34,
      fontSize: 10,
      color: titleText,
      fontFace: tpl.fonts.body,
    });
    slide.addText(String(slideNum).padStart(2, '0'), {
      x: 11.6,
      y: 7.04,
      w: 1.0,
      h: 0.34,
      fontSize: 10,
      bold: true,
      color: titleText,
      align: 'right',
      fontFace: tpl.fonts.mono,
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, { x: leftX, y: 6.86, w: contentW, h: 0.02, fill: { color: border } });
    slide.addText([courseCode, (doc.title || '').slice(0, 58)].filter(Boolean).join(' · '), {
      x: leftX,
      y: 6.96,
      w: contentW - 1.2,
      h: 0.34,
      fontSize: 9.5,
      color: muted,
      fontFace: tpl.fonts.body,
    });
    slide.addText(String(slideNum).padStart(2, '0'), {
      x: 13.333 - 1.5,
      y: 6.96,
      w: 0.8,
      h: 0.34,
      fontSize: 9.5,
      bold: true,
      color: muted,
      align: 'right',
      fontFace: tpl.fonts.mono,
    });
  }

  return { bodyX, bodyY, bodyW, bodyH };
}

export async function generatePptxBlob(doc: AcademicDocument): Promise<Blob> {
  const PptxCtor = (PptxGenJS as any).default || PptxGenJS;
  const pptx = new PptxCtor();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in (16:9)
  pptx.title = doc.title;
  pptx.author = doc.brief?.studentName || doc.metadata?.studentName || 'KorsIQ';

  const tpl = getSlideTemplateForDoc(doc);
  const visualPalette = slideTemplateToVisualPalette(tpl);
  const bodyHex = stripHexHash(tpl.colors.body, '1F2937');
  const mutedHex = stripHexHash(tpl.colors.muted, '64748B');
  const accentHex = stripHexHash(tpl.colors.accent, '1D4ED8');
  const accentTextHex = stripHexHash(tpl.colors.accentText, 'FFFFFF');
  const bgHex = stripHexHash(tpl.colors.bg, 'FFFFFF');
  const surfaceHex = stripHexHash(tpl.colors.surface, 'F8FAFC');
  const borderHex = stripHexHash(tpl.colors.border, 'CBD5E1');

  const speakerNotesBySection = new Map<string, string>();
  for (const blk of doc.contentBlocks || []) {
    if (blk.type === 'slide' && blk.speakerNotes) {
      speakerNotesBySection.set(blk.sectionId, blk.speakerNotes);
    }
  }

  const slideCover = resolveSlideCoverPage(doc);
  const subtitleParts = [
    slideCover.subtitle,
    slideCover.courseCode,
    slideCover.studentName
      ? slideCover.studentId
        ? `${slideCover.studentName} (${slideCover.studentId})`
        : slideCover.studentName
      : '',
    slideCover.department,
    slideCover.institution,
    slideCover.submissionDate,
  ].filter(Boolean) as string[];

  // 1. Title Slide
  buildTitleSlide(pptx, { ...doc, title: slideCover.title || doc.title }, tpl, subtitleParts);

  let slideNum = 1;

  // 2. Section Slides (max 5 bullets per slide, safe text bounds)
  const MAX_BULLETS_PER_SLIDE = 5;
  for (const section of doc.sections || []) {
    const bullets = extractConciseBullets(section.content);
    const totalChunks = Math.max(1, Math.ceil(bullets.length / MAX_BULLETS_PER_SLIDE));

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx += 1) {
      slideNum += 1;
      const slice = bullets.slice(
        chunkIdx * MAX_BULLETS_PER_SLIDE,
        (chunkIdx + 1) * MAX_BULLETS_PER_SLIDE
      );
      const slide = pptx.addSlide();
      const slideTitle =
        totalChunks > 1 ? `${section.title} (${chunkIdx + 1}/${totalChunks})` : section.title;

      const box = applyContentSlideChrome(pptx, slide, doc, tpl, slideTitle, slideNum);

      slide.addText(
        slice.map((b) => ({
          text: b,
          options: {
            bullet: { code: '2022', color: accentHex },
            breakLine: true,
            paraSpaceAfter: 10,
          },
        })),
        {
          x: box.bodyX,
          y: box.bodyY,
          w: box.bodyW,
          h: box.bodyH,
          fontSize: slice.length >= 5 ? 15 : 16.5,
          color: bodyHex,
          valign: 'top',
          fontFace: tpl.fonts.body,
          fit: 'shrink',
        }
      );

      const notes = speakerNotesBySection.get(section.id);
      if (notes && chunkIdx === 0 && typeof slide.addNotes === 'function') {
        slide.addNotes(notes);
      }

      if (tpl.vectorKind === 'executive-concentric' && section.takeaway && section.takeaway.trim()) {
        slide.addText(section.takeaway.trim(), {
          x: 3.75,
          y: 6.2,
          w: 7.55,
          h: 0.54,
          fontSize: 11.5,
          bold: true,
          color: stripHexHash(tpl.colors.heading, '2B181A'),
          fontFace: tpl.fonts.body,
          valign: 'middle',
          fit: 'shrink',
        });
      }
    }

    // Optional visual slides
    if (Array.isArray(section.visuals) && section.visuals.length > 0) {
      for (const vis of section.visuals) {
        slideNum += 1;
        const vSlide = pptx.addSlide();
        const box = applyContentSlideChrome(
          pptx,
          vSlide,
          doc,
          tpl,
          `${section.title}: ${vis.title}`,
          slideNum
        );

        if (vis.kind === 'comparison_table' && vis.headers && vis.rows && vis.rows.length > 0) {
          const tableData = [
            vis.headers.map((h) => ({
              text: h,
              options: { bold: true, color: accentTextHex, fill: { color: accentHex } },
            })),
            ...vis.rows.slice(0, 7).map((row, rIdx) =>
              vis.headers!.map((_, cIdx) => ({
                text: String(row[cIdx] ?? ''),
                options: {
                  color: bodyHex,
                  fill: { color: rIdx % 2 === 0 ? bgHex : surfaceHex },
                },
              }))
            ),
          ];
          vSlide.addTable(tableData, {
            x: box.bodyX,
            y: box.bodyY,
            w: box.bodyW,
            fontSize: 12,
            fontFace: tpl.fonts.body,
            border: { type: 'solid', pt: 1, color: borderHex },
            margin: 6,
          });
        } else {
          const rendered = renderVisualBlockToPng(
            vis,
            doc.metadata?.visualPreferences?.designStyle,
            visualPalette
          );
          if (rendered) {
            const maxW = box.bodyW - 0.4;
            const maxH = box.bodyH - (vis.caption ? 0.55 : 0.15);
            const aspect = rendered.width / rendered.height;
            let drawW = maxW;
            let drawH = drawW / aspect;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = drawH * aspect;
            }
            const drawX = box.bodyX + (box.bodyW - drawW) / 2;
            const drawY = box.bodyY + (maxH - drawH) / 2;

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
            x: box.bodyX,
            y: box.bodyY + box.bodyH - 0.42,
            w: box.bodyW,
            h: 0.4,
            fontSize: 10.5,
            italic: true,
            color: mutedHex,
            align: 'center',
            fontFace: tpl.fonts.body,
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
      slideNum += 1;
      const slice = refs.slice(rPage * REFS_PER_SLIDE, (rPage + 1) * REFS_PER_SLIDE);
      const slide = pptx.addSlide();
      const box = applyContentSlideChrome(
        pptx,
        slide,
        doc,
        tpl,
        refPages > 1 ? `References (${rPage + 1}/${refPages})` : 'References',
        slideNum
      );

      slide.addText(
        slice.map((ref, idx) => ({
          text: formatReferenceEntry(ref, doc.citationStyle || 'APA 7', rPage * REFS_PER_SLIDE + idx + 1),
          options: { bullet: true, breakLine: true, paraSpaceAfter: 7 },
        })),
        {
          x: box.bodyX,
          y: box.bodyY,
          w: box.bodyW,
          h: box.bodyH - 0.5,
          fontSize: 12.5,
          color: bodyHex,
          valign: 'top',
          fontFace: tpl.fonts.body,
          fit: 'shrink',
        }
      );

      slide.addText(STUDIO_DOWNLOAD_NOTICE, {
        x: box.bodyX,
        y: box.bodyY + box.bodyH - 0.42,
        w: box.bodyW,
        h: 0.36,
        fontSize: 9.5,
        italic: true,
        color: mutedHex,
        fontFace: tpl.fonts.body,
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
