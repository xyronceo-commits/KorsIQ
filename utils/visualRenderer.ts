import {
  StudioDesignStyle,
  StudioVisualBlock,
  StudioVisualPreferences,
} from '../types';
import { TemplateVisualPalette } from '../lib/studioTemplates';

export const DEFAULT_VISUAL_PREFERENCES: StudioVisualPreferences = {
  customized: false,
  designStyle: 'classic_academic',
  intensity: 'minimal',
  enabledElements: {
    infographics: false,
    diagrams: false,
    flowcharts: false,
    charts: false,
    illustrations: false,
    icons: false,
    comparisonTables: false,
  },
};

export function hasAnyVisualElementEnabled(prefs?: StudioVisualPreferences | null): boolean {
  if (!prefs?.enabledElements) return false;
  return Object.values(prefs.enabledElements).some(Boolean);
}

export function getDesignStylePalette(style?: StudioDesignStyle) {
  switch (style) {
    case 'modern_professional':
      return {
        primary: '#2563EB',
        primarySoft: '#EFF6FF',
        border: '#BFDBFE',
        ink: '#0F172A',
        muted: '#475569',
        surface: '#FFFFFF',
        headerBg: '#F8FAFC',
        fontFamily: 'Inter, Arial, sans-serif',
      };
    case 'infographic':
      return {
        primary: '#1D4ED8',
        primarySoft: '#DBEAFE',
        border: '#93C5FD',
        ink: '#111827',
        muted: '#334155',
        surface: '#FFFFFF',
        headerBg: '#EFF6FF',
        fontFamily: 'Inter, Arial, sans-serif',
      };
    case 'creative_visual':
      return {
        primary: '#1E40AF',
        primarySoft: '#EEF2FF',
        border: '#A5B4FC',
        ink: '#0F172A',
        muted: '#475569',
        surface: '#FFFFFF',
        headerBg: '#F8FAFC',
        fontFamily: 'Inter, Arial, sans-serif',
      };
    case 'classic_academic':
    default:
      return {
        primary: '#1E3A8A',
        primarySoft: '#F8FAFC',
        border: '#CBD5E1',
        ink: '#111827',
        muted: '#4B5563',
        surface: '#FFFFFF',
        headerBg: '#F8FAFC',
        fontFamily: 'Georgia, "Times New Roman", serif',
      };
  }
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Synchronously renders a StudioVisualBlock to a high-DPI PNG data URL using HTML5 Canvas.
 * Guarantees crisp typography, wrapped text, and zero overlapping elements for PDF, DOCX, and PPTX exports.
 */
export function renderVisualBlockToPng(
  block: StudioVisualBlock,
  designStyle?: StudioDesignStyle,
  customPalette?: Partial<TemplateVisualPalette>
): { dataUrl: string; width: number; height: number } | null {
  if (typeof document === 'undefined') return null;

  const basePalette = getDesignStylePalette(designStyle);
  const palette = customPalette ? { ...basePalette, ...customPalette } : basePalette;
  const logicalWidth = 700;
  const padding = 24;
  const contentWidth = logicalWidth - padding * 2;
  const scale = 2;

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = logicalWidth;
  measureCanvas.height = 100;
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) return null;

  const kindLabelMap: Record<StudioVisualBlock['kind'], string> = {
    infographic: 'INFOGRAPHIC',
    diagram: 'CONCEPT DIAGRAM',
    flowchart: 'PROCESS FLOWCHART',
    chart: 'DATA CHART',
    illustration: 'ACADEMIC ILLUSTRATION',
    icon_callout: 'KEY CONCEPTS',
    comparison_table: 'COMPARISON TABLE',
  };

  // Measure header
  mCtx.font = `700 15px ${palette.fontFamily}`;
  const titleLines = wrapLines(mCtx, block.title, contentWidth - 16);
  const headerHeight = 28 + titleLines.length * 20 + 14;

  // Measure body height by kind
  let bodyHeight = 140;

  if (block.kind === 'chart' && block.dataPoints && block.dataPoints.length > 0) {
    bodyHeight = 230;
  } else if (block.kind === 'flowchart' && block.steps && block.steps.length > 0) {
    let totalH = 0;
    for (const step of block.steps) {
      mCtx.font = `700 12px ${palette.fontFamily}`;
      const lblLines = wrapLines(mCtx, step.label, contentWidth - 72);
      mCtx.font = `400 11px ${palette.fontFamily}`;
      const detLines = step.detail ? wrapLines(mCtx, step.detail, contentWidth - 72) : [];
      totalH += Math.max(44, 18 + lblLines.length * 16 + detLines.length * 15) + 22;
    }
    bodyHeight = totalH;
  } else if (block.kind === 'comparison_table' && block.headers && block.rows) {
    const colW = contentWidth / Math.max(1, block.headers.length);
    let totalH = 34;
    mCtx.font = `400 11px ${palette.fontFamily}`;
    for (const row of block.rows) {
      const maxLines = Math.max(
        1,
        ...row.map((cell) => wrapLines(mCtx, cell, Math.max(40, colW - 16)).length)
      );
      totalH += maxLines * 15 + 14;
    }
    bodyHeight = totalH + 8;
  } else {
    const items = block.items || [];
    const cols = items.length > 1 ? 2 : 1;
    const cardW = cols === 2 ? (contentWidth - 14) / 2 : contentWidth;
    let totalH = 0;
    for (let i = 0; i < items.length; i += cols) {
      const rowItems = items.slice(i, i + cols);
      let rowMaxH = 56;
      for (const it of rowItems) {
        mCtx.font = `700 12px ${palette.fontFamily}`;
        const lLines = wrapLines(mCtx, it.label, cardW - 36);
        mCtx.font = `400 11px ${palette.fontFamily}`;
        const dLines = it.detail ? wrapLines(mCtx, it.detail, cardW - 36) : [];
        rowMaxH = Math.max(rowMaxH, 22 + lLines.length * 16 + dLines.length * 15 + 12);
      }
      totalH += rowMaxH + 12;
    }
    bodyHeight = Math.max(80, totalH);
  }

  // Measure caption
  let captionLines: string[] = [];
  if (block.caption) {
    mCtx.font = `italic 11px ${palette.fontFamily}`;
    captionLines = wrapLines(mCtx, block.caption, contentWidth);
  }
  const captionHeight = captionLines.length > 0 ? captionLines.length * 15 + 14 : 0;

  const logicalHeight = padding + headerHeight + bodyHeight + captionHeight + padding;

  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);

  // Outer card background
  ctx.fillStyle = palette.surface;
  drawRoundedRect(ctx, 1, 1, logicalWidth - 2, logicalHeight - 2, 10);
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header band
  ctx.fillStyle = palette.headerBg;
  drawRoundedRect(ctx, 2, 2, logicalWidth - 4, headerHeight + 10, 9);
  ctx.fill();

  // Left accent bar
  ctx.fillStyle = palette.primary;
  ctx.fillRect(padding, padding, 4, headerHeight - 16);

  // Kind badge
  ctx.fillStyle = palette.primary;
  ctx.font = `700 10px ${palette.fontFamily}`;
  ctx.fillText(kindLabelMap[block.kind] || 'VISUAL FIGURE', padding + 14, padding + 10);

  // Title
  ctx.fillStyle = palette.ink;
  ctx.font = `700 15px ${palette.fontFamily}`;
  let curY = padding + 28;
  for (const tl of titleLines) {
    ctx.fillText(tl, padding + 14, curY);
    curY += 20;
  }

  let bodyY = padding + headerHeight + 6;

  // Render body
  if (block.kind === 'chart' && block.dataPoints && block.dataPoints.length > 0) {
    const pts = block.dataPoints;
    const chartLeft = padding + 48;
    const chartTop = bodyY + 14;
    const chartW = contentWidth - 64;
    const chartH = 155;
    const maxVal = Math.max(...pts.map((p) => Math.abs(p.value)), 1);

    // Axes
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartTop + chartH);
    ctx.lineTo(chartLeft + chartW, chartTop + chartH);
    ctx.stroke();

    // Gridlines
    ctx.strokeStyle = '#E2E8F0';
    ctx.fillStyle = palette.muted;
    ctx.font = `400 10px ${palette.fontFamily}`;
    for (let g = 0; g <= 4; g += 1) {
      const gy = chartTop + (chartH * g) / 4;
      const val = Math.round(maxVal * (1 - g / 4));
      ctx.beginPath();
      ctx.moveTo(chartLeft, gy);
      ctx.lineTo(chartLeft + chartW, gy);
      ctx.stroke();
      ctx.fillText(String(val), padding + 6, gy + 3);
    }

    if (block.chartType === 'line') {
      const stepX = pts.length > 1 ? chartW / (pts.length - 1) : chartW / 2;
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartLeft + (pts.length > 1 ? idx * stepX : chartW / 2);
        const py = chartTop + chartH - (p.value / maxVal) * (chartH - 12);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      pts.forEach((p, idx) => {
        const px = chartLeft + (pts.length > 1 ? idx * stepX : chartW / 2);
        const py = chartTop + chartH - (p.value / maxVal) * (chartH - 12);
        ctx.fillStyle = palette.primary;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.ink;
        ctx.font = `700 10px ${palette.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${p.value}${p.unit || ''}`, px, py - 9);

        ctx.fillStyle = palette.muted;
        ctx.font = `400 10px ${palette.fontFamily}`;
        const shortLbl = p.label.length > 14 ? `${p.label.slice(0, 12)}..` : p.label;
        ctx.fillText(shortLbl, px, chartTop + chartH + 16);
      });
      ctx.textAlign = 'left';
    } else {
      const slotW = chartW / pts.length;
      const barW = Math.min(48, slotW * 0.56);
      pts.forEach((p, idx) => {
        const barH = Math.max(4, (p.value / maxVal) * (chartH - 16));
        const bx = chartLeft + idx * slotW + (slotW - barW) / 2;
        const by = chartTop + chartH - barH;
        ctx.fillStyle = palette.primary;
        drawRoundedRect(ctx, bx, by, barW, barH, 3);
        ctx.fill();

        ctx.fillStyle = palette.ink;
        ctx.font = `700 10px ${palette.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${p.value}${p.unit || ''}`, bx + barW / 2, by - 6);

        ctx.fillStyle = palette.muted;
        ctx.font = `400 10px ${palette.fontFamily}`;
        const shortLbl = p.label.length > 14 ? `${p.label.slice(0, 12)}..` : p.label;
        ctx.fillText(shortLbl, bx + barW / 2, chartTop + chartH + 16);
      });
      ctx.textAlign = 'left';
    }

    if (block.xLabel) {
      ctx.fillStyle = palette.muted;
      ctx.font = `600 10px ${palette.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText(block.xLabel, chartLeft + chartW / 2, chartTop + chartH + 34);
      ctx.textAlign = 'left';
    }
  } else if (block.kind === 'flowchart' && block.steps && block.steps.length > 0) {
    let sy = bodyY;
    block.steps.forEach((step, idx) => {
      ctx.font = `700 12px ${palette.fontFamily}`;
      const lblLines = wrapLines(ctx, step.label, contentWidth - 72);
      ctx.font = `400 11px ${palette.fontFamily}`;
      const detLines = step.detail ? wrapLines(ctx, step.detail, contentWidth - 72) : [];
      const boxH = Math.max(44, 18 + lblLines.length * 16 + detLines.length * 15);

      ctx.fillStyle = palette.primarySoft;
      drawRoundedRect(ctx, padding, sy, contentWidth, boxH, 7);
      ctx.fill();
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Step badge
      ctx.fillStyle = palette.primary;
      drawRoundedRect(ctx, padding + 12, sy + 11, 24, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 11px ${palette.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(idx + 1), padding + 24, sy + 27);
      ctx.textAlign = 'left';

      // Step text
      let ty = sy + 22;
      ctx.fillStyle = palette.ink;
      ctx.font = `700 12px ${palette.fontFamily}`;
      for (const ll of lblLines) {
        ctx.fillText(ll, padding + 48, ty);
        ty += 16;
      }
      ctx.fillStyle = palette.muted;
      ctx.font = `400 11px ${palette.fontFamily}`;
      for (const dl of detLines) {
        ctx.fillText(dl, padding + 48, ty);
        ty += 15;
      }

      sy += boxH;
      if (idx < block.steps!.length - 1) {
        const midX = padding + contentWidth / 2;
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(midX, sy + 2);
        ctx.lineTo(midX, sy + 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(midX - 5, sy + 12);
        ctx.lineTo(midX, sy + 18);
        ctx.lineTo(midX + 5, sy + 12);
        ctx.stroke();
        sy += 22;
      }
    });
  } else if (block.kind === 'comparison_table' && block.headers && block.rows) {
    const colCount = Math.max(1, block.headers.length);
    const colW = contentWidth / colCount;
    let ty = bodyY;

    // Header row
    ctx.fillStyle = palette.primary;
    ctx.fillRect(padding, ty, contentWidth, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 11px ${palette.fontFamily}`;
    block.headers.forEach((h, cIdx) => {
      ctx.fillText(h.slice(0, 28), padding + cIdx * colW + 8, ty + 19);
    });
    ty += 30;

    // Data rows
    ctx.font = `400 11px ${palette.fontFamily}`;
    block.rows.forEach((row, rIdx) => {
      const wrapped = row.map((cell) => wrapLines(ctx, cell, Math.max(40, colW - 16)));
      const maxL = Math.max(1, ...wrapped.map((w) => w.length));
      const rowH = maxL * 15 + 14;

      ctx.fillStyle = rIdx % 2 === 0 ? palette.surface : palette.primarySoft;
      ctx.fillRect(padding, ty, contentWidth, rowH);
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(padding, ty, contentWidth, rowH);

      ctx.fillStyle = palette.ink;
      for (let cIdx = 0; cIdx < colCount; cIdx += 1) {
        const lines = wrapped[cIdx] || [''];
        lines.forEach((ln, lIdx) => {
          ctx.fillText(ln, padding + cIdx * colW + 8, ty + 18 + lIdx * 15);
        });
      }
      ty += rowH;
    });
  } else {
    const items = block.items || [];
    const cols = items.length > 1 ? 2 : 1;
    const gap = 14;
    const cardW = cols === 2 ? (contentWidth - gap) / 2 : contentWidth;
    let iy = bodyY;

    for (let i = 0; i < items.length; i += cols) {
      const rowItems = items.slice(i, i + cols);
      let rowMaxH = 56;
      const measured = rowItems.map((it) => {
        ctx.font = `700 12px ${palette.fontFamily}`;
        const lLines = wrapLines(ctx, it.label, cardW - 36);
        ctx.font = `400 11px ${palette.fontFamily}`;
        const dLines = it.detail ? wrapLines(ctx, it.detail, cardW - 36) : [];
        const h = Math.max(56, 22 + lLines.length * 16 + dLines.length * 15 + 12);
        rowMaxH = Math.max(rowMaxH, h);
        return { it, lLines, dLines };
      });

      measured.forEach(({ lLines, dLines }, cIdx) => {
        const cx = padding + cIdx * (cardW + gap);
        ctx.fillStyle = palette.primarySoft;
        drawRoundedRect(ctx, cx, iy, cardW, rowMaxH, 7);
        ctx.fill();
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Numbered/dot indicator
        ctx.fillStyle = palette.primary;
        ctx.fillRect(cx, iy + 10, 3.5, rowMaxH - 20);

        let textY = iy + 22;
        ctx.fillStyle = palette.ink;
        ctx.font = `700 12px ${palette.fontFamily}`;
        for (const ll of lLines) {
          ctx.fillText(ll, cx + 14, textY);
          textY += 16;
        }
        ctx.fillStyle = palette.muted;
        ctx.font = `400 11px ${palette.fontFamily}`;
        for (const dl of dLines) {
          ctx.fillText(dl, cx + 14, textY);
          textY += 15;
        }
      });

      iy += rowMaxH + 12;
    }
  }

  // Caption
  if (captionLines.length > 0) {
    let cy = logicalHeight - padding - (captionLines.length - 1) * 15;
    ctx.fillStyle = palette.muted;
    ctx.font = `italic 11px ${palette.fontFamily}`;
    for (const cl of captionLines) {
      ctx.fillText(cl, padding, cy);
      cy += 15;
    }
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: logicalWidth,
    height: logicalHeight,
  };
}
