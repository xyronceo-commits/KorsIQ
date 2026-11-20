import React, { useMemo, useState } from 'react';
import { Check, Eye, FileText, Presentation, X } from 'lucide-react';
import { DocumentTemplateId, SlideTemplateId, TemplateCategory } from '../types';
import {
  DOCUMENT_TEMPLATES,
  DocumentTemplate,
  DocumentTemplatePalette,
  SLIDE_TEMPLATES,
  SlideTemplate,
  SlideTemplatePalette,
  getDefaultDocumentPaletteId,
  getDefaultSlidePaletteId,
  resolveDocumentTemplate,
  resolveSlideTemplate,
} from '../lib/studioTemplates';
import SlideVectorBackground from './SlideVectorBackground';

export type TemplatePickerMode = 'document' | 'slide';

export interface TemplatePreviewSample {
  title?: string;
  courseCode?: string;
  courseTitle?: string;
  studentName?: string;
  institution?: string;
  date?: string;
}

interface StudioTemplatePickerProps {
  mode: TemplatePickerMode;
  selectedDocumentTemplateId: DocumentTemplateId;
  selectedDocumentPaletteId?: string;
  selectedSlideTemplateId: SlideTemplateId;
  selectedSlidePaletteId?: string;
  onSelectDocumentTemplate: (id: DocumentTemplateId, paletteId?: string) => void;
  onSelectSlideTemplate: (id: SlideTemplateId, paletteId?: string) => void;
  onSelectDocumentPalette?: (paletteId: string) => void;
  onSelectSlidePalette?: (paletteId: string) => void;
  sample?: TemplatePreviewSample;
  compact?: boolean;
}

interface StudioTemplateModalProps {
  isOpen: boolean;
  mode: TemplatePickerMode;
  initialTemplateId: DocumentTemplateId | SlideTemplateId;
  initialPaletteId?: string;
  onClose: () => void;
  onConfirm: (id: DocumentTemplateId | SlideTemplateId, paletteId: string) => void;
  sample?: TemplatePreviewSample;
  titleLabel?: string;
}

/**
 * Compact curated color palette swatch selector (no color wheel / hex inputs).
 * Uses two crisp geometric halves (no CSS gradients) inside a circular swatch.
 */
export const PaletteSwatchRow: React.FC<{
  palettes: readonly (DocumentTemplatePalette | SlideTemplatePalette)[];
  activePaletteId: string;
  onSelectPalette: (paletteId: string) => void;
  size?: 'sm' | 'md';
  showActiveLabel?: boolean;
}> = ({
  palettes,
  activePaletteId,
  onSelectPalette,
  size = 'sm',
  showActiveLabel = true,
}) => {
  const active = palettes.find((p) => p.id === activePaletteId) || palettes[0];
  const dimClass = size === 'md' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-palette-swatch-row="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Color palette">
        {palettes.map((palette) => {
          const isSelected = palette.id === active.id;
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Palette: ${palette.name}`}
              title={palette.name}
              data-palette-swatch={palette.id}
              data-palette-selected={isSelected ? 'true' : 'false'}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPalette(palette.id);
              }}
              className={`${dimClass} rounded-full overflow-hidden border border-black/20 dark:border-white/25 flex shrink-0 cursor-pointer transition-transform ${
                isSelected
                  ? 'ring-2 ring-offset-1 ring-[#111827] dark:ring-white dark:ring-offset-slate-900 scale-105'
                  : 'hover:scale-105 opacity-90 hover:opacity-100'
              }`}
            >
              <span className="w-1/2 h-full block" style={{ backgroundColor: palette.swatchPrimary }} />
              <span className="w-1/2 h-full block" style={{ backgroundColor: palette.swatchSecondary }} />
            </button>
          );
        })}
      </div>
      {showActiveLabel && (
        <span className="text-[11px] font-medium text-[#5B6472] dark:text-slate-400 truncate">
          {active.name}
        </span>
      )}
    </div>
  );
};

function getSafeSample(sample?: TemplatePreviewSample) {
  return {
    title: (sample?.title || '').trim() || 'Renewable Microgrids for Campus Energy Resilience',
    courseCode: (sample?.courseCode || '').trim() || 'EEE 401',
    courseTitle: (sample?.courseTitle || '').trim() || 'Power Systems Engineering',
    studentName: (sample?.studentName || '').trim() || 'Adaeze Okafor',
    institution: (sample?.institution || '').trim() || 'University Faculty of Engineering',
    date: (sample?.date || '').trim() || new Date().toISOString().slice(0, 10),
  };
}

/**
 * Miniature A4 Portrait thumbnail rendered strictly from DocumentTemplate tokens.
 */
export const DocumentTemplateThumbnail: React.FC<{
  template: DocumentTemplate;
  sample?: TemplatePreviewSample;
}> = ({ template, sample }) => {
  const s = getSafeSample(sample);
  const { colors, fonts, layout } = template;

  return (
    <div
      className="w-full aspect-[210/250] rounded border overflow-hidden select-none flex flex-col justify-between text-left"
      style={{
        backgroundColor: colors.pageBg,
        borderColor: colors.border === '#000000' ? '#D1D5DB' : colors.border,
        color: colors.text,
        fontFamily: fonts.bodyCss,
      }}
    >
      {/* Top / Cover Preview Area */}
      {layout.coverStyle === 'executive_banner' ? (
        <div className="w-full">
          <div
            className="px-3 py-2.5"
            style={{ backgroundColor: colors.coverBg, color: colors.coverText }}
          >
            <div className="text-[7px] uppercase tracking-wider opacity-80 truncate">
              {s.courseCode} · {s.institution}
            </div>
            <div
              className="text-[10px] font-bold leading-tight mt-1 line-clamp-2"
              style={{ fontFamily: fonts.headingCss }}
            >
              {s.title}
            </div>
            <div className="mt-1.5 h-[2px] w-7" style={{ backgroundColor: colors.accent }} />
          </div>
          <div className="px-3 pt-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-[3px] h-3 shrink-0" style={{ backgroundColor: colors.accent }} />
              <div
                className="text-[8px] font-bold truncate"
                style={{ color: colors.heading, fontFamily: fonts.headingCss }}
              >
                1. Executive Summary
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-[3px] rounded-xs w-full opacity-25" style={{ backgroundColor: colors.text }} />
              <div className="h-[3px] rounded-xs w-11/12 opacity-20" style={{ backgroundColor: colors.text }} />
            </div>
            <div
              className="p-1.5 rounded-xs border-l-2 space-y-1"
              style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent }}
            >
              <div className="h-[3px] w-3/4 opacity-40" style={{ backgroundColor: colors.heading }} />
              <div className="h-[3px] w-1/2 opacity-25" style={{ backgroundColor: colors.text }} />
            </div>
            {/* Mini table */}
            <div className="border overflow-hidden" style={{ borderColor: colors.border }}>
              <div className="h-2.5 flex items-center px-1 gap-2" style={{ backgroundColor: colors.tableHeaderBg }}>
                <div className="h-[2.5px] w-6 bg-white/80" />
                <div className="h-[2.5px] w-6 bg-white/60" />
              </div>
              <div className="h-2 px-1 flex items-center gap-2" style={{ backgroundColor: colors.pageBg }}>
                <div className="h-[2px] w-5 opacity-25" style={{ backgroundColor: colors.text }} />
                <div className="h-[2px] w-7 opacity-20" style={{ backgroundColor: colors.text }} />
              </div>
              <div className="h-2 px-1 flex items-center gap-2" style={{ backgroundColor: colors.tableStripeBg }}>
                <div className="h-[2px] w-6 opacity-25" style={{ backgroundColor: colors.text }} />
                <div className="h-[2px] w-5 opacity-20" style={{ backgroundColor: colors.text }} />
              </div>
            </div>
          </div>
        </div>
      ) : layout.coverStyle === 'formal_centered' ? (
        <div className="p-3 flex flex-col items-center text-center flex-1 justify-between">
          <div className="space-y-1 w-full">
            <div className="text-[7px] uppercase tracking-wider truncate" style={{ color: colors.text }}>
              {s.institution}
            </div>
            <div className="w-10 mx-auto border-t my-1" style={{ borderColor: colors.border }} />
          </div>
          <div className="space-y-1 w-full px-1">
            <div
              className="text-[10px] font-bold uppercase leading-tight line-clamp-2"
              style={{ color: colors.heading, fontFamily: fonts.headingCss }}
            >
              {s.title}
            </div>
            <div className="text-[7px] truncate" style={{ color: colors.muted }}>
              {s.courseCode} — {s.studentName}
            </div>
          </div>
          <div className="w-full space-y-1.5 text-left pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div className="text-[7.5px] font-bold" style={{ fontFamily: fonts.headingCss }}>
              1. Introduction
            </div>
            <div className="space-y-1">
              <div className="h-[2.5px] w-full opacity-35" style={{ backgroundColor: colors.text }} />
              <div className="h-[2.5px] w-11/12 opacity-30" style={{ backgroundColor: colors.text }} />
              <div className="h-[2.5px] w-4/5 opacity-25" style={{ backgroundColor: colors.text }} />
            </div>
          </div>
        </div>
      ) : layout.coverStyle === 'technical_compact' ? (
        <div className="p-2.5 flex flex-col flex-1 justify-between">
          <div
            className="p-2 border rounded-xs space-y-1"
            style={{ backgroundColor: colors.coverBg, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between text-[6.5px] font-mono" style={{ color: colors.muted }}>
              <span>{s.courseCode}</span>
              <span>{s.date}</span>
            </div>
            <div
              className="text-[9.5px] font-bold leading-tight line-clamp-2"
              style={{ color: colors.heading, fontFamily: fonts.headingCss }}
            >
              {s.title}
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <div
              className="text-[7.5px] font-bold pb-0.5 border-b flex items-center gap-1"
              style={{ color: colors.heading, borderColor: colors.border, fontFamily: fonts.headingCss }}
            >
              <span className="font-mono">01</span>
              <span className="truncate">System Specification</span>
            </div>
            <div className="space-y-1">
              <div className="h-[2.5px] w-full opacity-25" style={{ backgroundColor: colors.text }} />
              <div className="h-[2.5px] w-10/12 opacity-20" style={{ backgroundColor: colors.text }} />
            </div>
            <div className="grid grid-cols-3 border text-[6px]" style={{ borderColor: colors.border }}>
              <div className="p-1 font-bold border-r" style={{ backgroundColor: colors.tableHeaderBg, borderColor: colors.border }}>
                Param
              </div>
              <div className="p-1 font-bold border-r" style={{ backgroundColor: colors.tableHeaderBg, borderColor: colors.border }}>
                Target
              </div>
              <div className="p-1 font-bold" style={{ backgroundColor: colors.tableHeaderBg }}>
                Unit
              </div>
              <div className="p-1 border-t border-r opacity-70" style={{ borderColor: colors.border }}>Load</div>
              <div className="p-1 border-t border-r opacity-70" style={{ borderColor: colors.border }}>98.4</div>
              <div className="p-1 border-t opacity-70" style={{ borderColor: colors.border }}>%</div>
            </div>
          </div>
        </div>
      ) : layout.coverStyle === 'editorial_left' ? (
        <div className="p-3 flex flex-col flex-1 justify-between">
          <div className="border-l-[3px] pl-2 space-y-1" style={{ borderColor: colors.accent }}>
            <div className="text-[6.5px] uppercase tracking-widest" style={{ color: colors.muted }}>
              {s.courseCode} · Seminar Paper
            </div>
            <div
              className="text-[10px] font-bold leading-tight line-clamp-2"
              style={{ color: colors.heading, fontFamily: fonts.headingCss }}
            >
              {s.title}
            </div>
            <div className="text-[7px]" style={{ color: colors.muted }}>
              {s.studentName}
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <div
              className="text-[8px] font-bold"
              style={{ color: colors.heading, fontFamily: fonts.headingCss }}
            >
              I. Critical Context
            </div>
            <div className="space-y-1">
              <div className="h-[2.5px] w-full opacity-25" style={{ backgroundColor: colors.text }} />
              <div className="h-[2.5px] w-11/12 opacity-20" style={{ backgroundColor: colors.text }} />
            </div>
            <div
              className="p-1.5 border-l-2 italic text-[6.5px]"
              style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, color: colors.heading }}
            >
              Key takeaway callout block
            </div>
          </div>
        </div>
      ) : (
        /* clean_academic */
        <div className="p-3 flex flex-col flex-1 justify-between">
          <div className="space-y-1">
            <div className="h-[3px] w-full" style={{ backgroundColor: colors.accent }} />
            <div className="text-[6.5px] uppercase tracking-wider pt-1" style={{ color: colors.accent }}>
              {s.courseCode} · {s.institution}
            </div>
            <div
              className="text-[10px] font-bold leading-tight line-clamp-2"
              style={{ color: colors.heading, fontFamily: fonts.headingCss }}
            >
              {s.title}
            </div>
            <div className="text-[7px]" style={{ color: colors.muted }}>
              {s.studentName}
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <div
              className="text-[8px] font-bold pb-0.5 border-b"
              style={{ color: colors.heading, borderColor: colors.accent, fontFamily: fonts.headingCss }}
            >
              1. Introduction
            </div>
            <div className="space-y-1">
              <div className="h-[2.5px] w-full opacity-25" style={{ backgroundColor: colors.text }} />
              <div className="h-[2.5px] w-11/12 opacity-20" style={{ backgroundColor: colors.text }} />
            </div>
            <div className="border rounded-xs overflow-hidden" style={{ borderColor: colors.border }}>
              <div className="h-2.5 px-1 flex items-center gap-2" style={{ backgroundColor: colors.tableHeaderBg }}>
                <div className="h-[2.5px] w-7 opacity-60" style={{ backgroundColor: colors.heading }} />
                <div className="h-[2.5px] w-6 opacity-40" style={{ backgroundColor: colors.heading }} />
              </div>
              <div className="h-2 px-1 flex items-center gap-2">
                <div className="h-[2px] w-6 opacity-25" style={{ backgroundColor: colors.text }} />
                <div className="h-[2px] w-8 opacity-20" style={{ backgroundColor: colors.text }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Footer */}
      <div
        className="px-3 py-1.5 border-t flex items-center justify-between text-[6.5px]"
        style={{ borderColor: colors.border === '#000000' ? '#E5E7EB' : colors.border, color: colors.muted }}
      >
        <span className="truncate">{layout.headerFooterStyle === 'page_number_center' ? '' : s.courseCode}</span>
        <span>{layout.headerFooterStyle === 'page_number_center' ? '1' : 'Page 1'}</span>
      </div>
    </div>
  );
};

/**
 * Miniature 16:9 Widescreen Slide thumbnail rendered strictly from SlideTemplate tokens.
 */
export const SlideTemplateThumbnail: React.FC<{
  template: SlideTemplate;
  sample?: TemplatePreviewSample;
  blankCanvas?: boolean;
}> = ({ template, sample, blankCanvas = false }) => {
  const s = getSafeSample(sample);
  const { colors, fonts, layout } = template;

  if (template.vectorKind && template.safeZone) {
    const zone = template.safeZone.title;
    const isDarkTitle = template.vectorKind === 'editorial-split-dark';
    const titleColor = isDarkTitle ? colors.titleText : colors.heading;
    const subColor = isDarkTitle ? colors.accentSoft || '#E2E8F0' : colors.muted;
    const isCentered = template.vectorKind === 'swiss-monochrome';
    return (
      <div
        className="w-full aspect-video rounded border overflow-hidden select-none relative text-left"
        style={{ backgroundColor: colors.bg, borderColor: colors.border, fontFamily: fonts.bodyCss }}
      >
        <SlideVectorBackground template={template} variant="title" />
        {!blankCanvas && (
          <div
            className={`absolute z-10 flex flex-col justify-center gap-1 ${
              isCentered ? 'items-center text-center' : 'text-left'
            }`}
            style={{
              left: `${(zone.x / 13.333) * 100}%`,
              top: `${(zone.y / 7.5) * 100}%`,
              width: `${(zone.w / 13.333) * 100}%`,
              height: `${(zone.h / 7.5) * 100}%`,
            }}
          >
            <div className="text-[6px] font-bold uppercase tracking-wider truncate" style={{ color: colors.accent }}>
              {s.courseCode}
            </div>
            <div
              className="text-[9.5px] font-bold leading-tight line-clamp-2"
              style={{ color: titleColor, fontFamily: fonts.headingCss }}
            >
              {s.title}
            </div>
            <div className="text-[6px] truncate" style={{ color: subColor }}>
              {s.studentName}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (layout.titleLayout === 'pitch_split_hero') {
    return (
      <div
        className="w-full aspect-video rounded border overflow-hidden select-none grid grid-cols-12 text-left"
        style={{ backgroundColor: colors.bg, borderColor: colors.border, fontFamily: fonts.bodyCss }}
      >
        <div
          className="col-span-7 p-3 flex flex-col justify-between"
          style={{ backgroundColor: colors.titleBg, color: colors.titleText }}
        >
          <div className="inline-flex items-center gap-1">
            <span className="px-1.5 py-0.5 text-[6px] font-bold uppercase" style={{ backgroundColor: colors.accent, color: colors.accentText }}>
              {s.courseCode}
            </span>
          </div>
          <div
            className="text-[10px] font-bold leading-tight line-clamp-3"
            style={{ fontFamily: fonts.headingCss }}
          >
            {s.title}
          </div>
          <div className="text-[6.5px] opacity-75 truncate">{s.studentName}</div>
        </div>
        <div className="col-span-5 p-2.5 flex flex-col justify-center gap-1.5" style={{ backgroundColor: colors.surface }}>
          <div className="p-1.5 rounded-xs border-l-2 bg-white" style={{ borderColor: colors.accent }}>
            <div className="text-[8px] font-bold" style={{ color: colors.accent }}>94%</div>
            <div className="h-[2.5px] w-10 mt-0.5 opacity-30" style={{ backgroundColor: colors.heading }} />
          </div>
          <div className="p-1.5 rounded-xs border-l-2 bg-white" style={{ borderColor: colors.heading }}>
            <div className="text-[8px] font-bold" style={{ color: colors.heading }}>3.2x</div>
            <div className="h-[2.5px] w-8 mt-0.5 opacity-30" style={{ backgroundColor: colors.heading }} />
          </div>
        </div>
      </div>
    );
  }

  if (layout.titleLayout === 'editorial_asymmetric') {
    return (
      <div
        className="w-full aspect-video rounded border overflow-hidden select-none grid grid-cols-12 text-left"
        style={{ backgroundColor: colors.bg, borderColor: colors.border, fontFamily: fonts.bodyCss }}
      >
        <div className="col-span-4 p-2.5 flex flex-col justify-between" style={{ backgroundColor: colors.titleBg, color: colors.titleText }}>
          <div className="text-[6.5px] uppercase tracking-wider opacity-85 truncate">{s.courseCode}</div>
          <div className="h-[2px] w-6" style={{ backgroundColor: colors.accent }} />
        </div>
        <div className="col-span-8 p-3 flex flex-col justify-between">
          <div className="text-[6.5px] uppercase tracking-widest" style={{ color: colors.accent }}>
            Seminar Deck
          </div>
          <div
            className="text-[10px] font-bold leading-tight line-clamp-3"
            style={{ color: colors.heading, fontFamily: fonts.headingCss }}
          >
            {s.title}
          </div>
          <div className="text-[6.5px] truncate" style={{ color: colors.muted }}>
            {s.studentName} · {s.date}
          </div>
        </div>
      </div>
    );
  }

  if (layout.titleLayout === 'dark_executive') {
    return (
      <div
        className="w-full aspect-video rounded border overflow-hidden select-none p-3 flex flex-col justify-between text-left"
        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.heading, fontFamily: fonts.bodyCss }}
      >
        <div className="flex items-center justify-between">
          <span className="h-[3px] w-8 rounded-xs" style={{ backgroundColor: colors.accent }} />
          <span className="text-[6.5px] font-mono" style={{ color: colors.muted }}>{s.courseCode}</span>
        </div>
        <div className="space-y-1.5">
          <div
            className="text-[10.5px] font-bold leading-tight line-clamp-2"
            style={{ color: colors.heading, fontFamily: fonts.headingCss }}
          >
            {s.title}
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <div className="p-1.5 rounded-xs border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <div className="h-[2.5px] w-8" style={{ backgroundColor: colors.accent }} />
              <div className="h-[2px] w-12 mt-1 opacity-40" style={{ backgroundColor: colors.body }} />
            </div>
            <div className="p-1.5 rounded-xs border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <div className="h-[2.5px] w-6" style={{ backgroundColor: colors.accent }} />
              <div className="h-[2px] w-10 mt-1 opacity-40" style={{ backgroundColor: colors.body }} />
            </div>
          </div>
        </div>
        <div className="text-[6.5px] flex justify-between" style={{ color: colors.muted }}>
          <span className="truncate">{s.studentName}</span>
          <span>01</span>
        </div>
      </div>
    );
  }

  if (layout.titleLayout === 'technical_framed') {
    return (
      <div
        className="w-full aspect-video rounded border overflow-hidden select-none p-2.5 flex flex-col justify-between text-left"
        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.heading, fontFamily: fonts.bodyCss }}
      >
        <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: colors.border }}>
          <span
            className="px-1 py-0.5 text-[6.5px] font-mono font-bold"
            style={{ backgroundColor: colors.accent, color: colors.accentText }}
          >
            01
          </span>
          <span className="text-[6.5px] font-mono truncate" style={{ color: colors.muted }}>
            {s.courseCode}
          </span>
        </div>
        <div className="p-2 border rounded-xs my-1 space-y-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <div
            className="text-[9.5px] font-bold leading-tight line-clamp-2"
            style={{ color: colors.heading, fontFamily: fonts.headingCss }}
          >
            {s.title}
          </div>
          <div className="grid grid-cols-2 gap-1 pt-0.5">
            <div className="h-[2.5px] opacity-30" style={{ backgroundColor: colors.body }} />
            <div className="h-[2.5px] opacity-20" style={{ backgroundColor: colors.body }} />
          </div>
        </div>
        <div className="text-[6.5px] font-mono flex justify-between" style={{ color: colors.muted }}>
          <span className="truncate">{s.studentName}</span>
          <span>{s.date}</span>
        </div>
      </div>
    );
  }

  if (layout.titleLayout === 'minimal_left') {
    return (
      <div
        className="w-full aspect-video rounded border overflow-hidden select-none p-3.5 flex flex-col justify-between text-left"
        style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.heading, fontFamily: fonts.bodyCss }}
      >
        <div className="text-[6.5px] uppercase tracking-widest" style={{ color: colors.muted }}>
          {s.courseCode}
        </div>
        <div className="space-y-1.5">
          <div
            className="text-[10.5px] font-bold leading-tight line-clamp-2"
            style={{ color: colors.heading, fontFamily: fonts.headingCss }}
          >
            {s.title}
          </div>
          <div className="h-[1px] w-10" style={{ backgroundColor: colors.heading }} />
        </div>
        <div className="flex items-center justify-between text-[6.5px] pt-1 border-t" style={{ borderColor: colors.border, color: colors.muted }}>
          <span className="truncate">{s.studentName}</span>
          <span>1</span>
        </div>
      </div>
    );
  }

  /* academic-classic (default) */
  return (
    <div
      className="w-full aspect-video rounded border overflow-hidden select-none flex flex-col justify-between text-left"
      style={{ backgroundColor: colors.bg, borderColor: colors.border, fontFamily: fonts.bodyCss }}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: colors.accent }} />
      <div className="px-3 py-2 flex-1 flex flex-col justify-center space-y-1">
        <div className="text-[6.5px] font-bold uppercase tracking-wider" style={{ color: colors.accent }}>
          {s.courseCode} · {s.institution}
        </div>
        <div
          className="text-[10px] font-bold leading-tight line-clamp-2"
          style={{ color: colors.heading, fontFamily: fonts.headingCss }}
        >
          {s.title}
        </div>
        <div className="text-[6.5px] truncate" style={{ color: colors.muted }}>
          {s.studentName}
        </div>
      </div>
      <div
        className="px-3 py-1 flex items-center justify-between text-[6.5px]"
        style={{ backgroundColor: colors.titleBg, color: colors.titleText }}
      >
        <span className="truncate opacity-90">{s.courseTitle}</span>
        <span className="font-mono">01</span>
      </div>
    </div>
  );
};

/**
 * Full multi-page Document Preview rendered directly from DocumentTemplate tokens.
 */
const DocumentFullPreview: React.FC<{
  template: DocumentTemplate;
  sample?: TemplatePreviewSample;
}> = ({ template, sample }) => {
  const s = getSafeSample(sample);
  const { colors, fonts, layout } = template;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Page 1: Cover / Title Page */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-[#5B6472] dark:text-slate-400 uppercase tracking-wider">
          Page 1 — Cover / Title Header
        </p>
        <div
          className="w-full aspect-[210/297] rounded border shadow-xs overflow-hidden flex flex-col justify-between"
          style={{
            backgroundColor: colors.pageBg,
            borderColor: colors.border === '#000000' ? '#D1D5DB' : colors.border,
            color: colors.text,
            fontFamily: fonts.bodyCss,
          }}
        >
          {layout.coverStyle === 'executive_banner' ? (
            <>
              <div>
                <div className="p-6" style={{ backgroundColor: colors.coverBg, color: colors.coverText }}>
                  <p className="text-[10px] uppercase tracking-widest opacity-80">{s.institution}</p>
                  <h3
                    className="text-base font-bold leading-snug mt-2"
                    style={{ fontFamily: fonts.headingCss }}
                  >
                    {s.title}
                  </h3>
                  <div className="h-1 w-12 mt-3" style={{ backgroundColor: colors.accent }} />
                </div>
                <div className="p-6 space-y-3 text-xs">
                  <div className="p-3 rounded-xs border-l-4" style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent }}>
                    <p className="font-bold text-[11px]" style={{ color: colors.heading }}>Executive Overview</p>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: colors.muted }}>
                      Structured proposal and analytical report formatted with alternating tables and executive section bands.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div><span style={{ color: colors.muted }}>Course:</span> <strong>{s.courseCode}</strong></div>
                    <div><span style={{ color: colors.muted }}>Author:</span> <strong>{s.studentName}</strong></div>
                    <div><span style={{ color: colors.muted }}>Date:</span> <strong>{s.date}</strong></div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-2.5 border-t text-[10px] flex justify-between" style={{ borderColor: colors.border, color: colors.muted }}>
                <span>{s.courseCode}</span>
                <span>{s.date}</span>
              </div>
            </>
          ) : layout.coverStyle === 'formal_centered' ? (
            <div className="p-7 flex flex-col items-center justify-between text-center flex-1">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide">{s.institution}</p>
                <p className="text-[10px]">{s.courseTitle}</p>
              </div>
              <div className="space-y-2 max-w-[90%]">
                <h3
                  className="text-sm font-bold uppercase leading-snug"
                  style={{ fontFamily: fonts.headingCss }}
                >
                  {s.title}
                </h3>
                <p className="text-[10px]">BY</p>
                <p className="text-xs font-bold">{s.studentName}</p>
              </div>
              <div className="space-y-1 text-[10px]">
                <p>Course: {s.courseCode}</p>
                <p>{s.date}</p>
              </div>
            </div>
          ) : layout.coverStyle === 'technical_compact' ? (
            <div className="p-5 flex flex-col justify-between flex-1">
              <div className="space-y-3">
                <div className="p-3.5 border rounded-xs space-y-2" style={{ backgroundColor: colors.coverBg, borderColor: colors.border }}>
                  <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: colors.muted }}>
                    <span>SPEC / REPORT · {s.courseCode}</span>
                    <span>{s.date}</span>
                  </div>
                  <h3 className="text-sm font-bold leading-snug" style={{ color: colors.heading, fontFamily: fonts.headingCss }}>
                    {s.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-1 pt-1 border-t text-[10px]" style={{ borderColor: colors.border, color: colors.muted }}>
                    <span>Author: <strong style={{ color: colors.text }}>{s.studentName}</strong></span>
                    <span>Dept: <strong style={{ color: colors.text }}>{s.courseTitle}</strong></span>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <p className="font-bold text-xs pb-1 border-b" style={{ color: colors.heading, borderColor: colors.border }}>
                    0. Abstract &amp; Scope
                  </p>
                  <p className="leading-relaxed" style={{ color: colors.text }}>
                    Concise technical layout featuring numbered section headers, tight 1.25 spacing, and clear grid-bordered data tables.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t text-[10px] font-mono flex justify-between" style={{ borderColor: colors.border, color: colors.muted }}>
                <span>{s.courseCode}</span>
                <span>PAGE 1</span>
              </div>
            </div>
          ) : layout.coverStyle === 'editorial_left' ? (
            <div className="p-6 flex flex-col justify-between flex-1">
              <div className="space-y-4">
                <div className="border-l-4 pl-3.5 py-1 space-y-1.5" style={{ borderColor: colors.accent }}>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: colors.muted }}>
                    {s.courseCode} · {s.institution}
                  </p>
                  <h3
                    className="text-base font-bold leading-snug"
                    style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-xs" style={{ color: colors.muted }}>{s.studentName} · {s.date}</p>
                </div>
                <div className="p-3 border-l-2 italic text-[11px] leading-relaxed" style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, color: colors.heading }}>
                  “Editorial typography pairs classical serif headings with crisp sans-serif body prose for high readability.”
                </div>
              </div>
              <div className="pt-2 border-t text-[10px] flex justify-between" style={{ borderColor: colors.border, color: colors.muted }}>
                <span>{s.title.slice(0, 28)}</span>
                <span>1</span>
              </div>
            </div>
          ) : (
            /* clean_academic */
            <div className="p-6 flex flex-col justify-between flex-1">
              <div className="space-y-3">
                <div className="h-1 w-full" style={{ backgroundColor: colors.accent }} />
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.accent }}>
                  {s.institution}
                </p>
                <h3
                  className="text-base font-bold leading-snug"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  {s.title}
                </h3>
                <div className="pt-3 border-t space-y-1 text-[11px]" style={{ borderColor: colors.border }}>
                  <p><span style={{ color: colors.muted }}>Prepared by:</span> <strong>{s.studentName}</strong></p>
                  <p><span style={{ color: colors.muted }}>Course:</span> {s.courseCode} — {s.courseTitle}</p>
                  <p><span style={{ color: colors.muted }}>Date:</span> {s.date}</p>
                </div>
              </div>
              <div className="pt-2 border-t text-[10px] flex justify-between" style={{ borderColor: colors.border, color: colors.muted }}>
                <span>{s.courseCode}</span>
                <span>Page 1</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page 2: Body, Callout & Formatted Table */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-[#5B6472] dark:text-slate-400 uppercase tracking-wider">
          Page 2 — Headings, Callout &amp; Table
        </p>
        <div
          className="w-full aspect-[210/297] rounded border shadow-xs overflow-hidden p-5 flex flex-col justify-between"
          style={{
            backgroundColor: colors.pageBg,
            borderColor: colors.border === '#000000' ? '#D1D5DB' : colors.border,
            color: colors.text,
            fontFamily: fonts.bodyCss,
          }}
        >
          <div className="space-y-3">
            {/* Running header if enabled */}
            {layout.headerFooterStyle !== 'page_number_center' && (
              <div className="pb-1.5 border-b flex justify-between text-[9px]" style={{ borderColor: colors.border, color: colors.muted }}>
                <span className="truncate max-w-[70%]">{s.title}</span>
                <span>{s.courseCode}</span>
              </div>
            )}

            {/* Heading */}
            <div
              className={`flex items-center gap-2 ${
                layout.headingRule === 'thin_bottom' || layout.headingRule === 'numbered_slate'
                  ? 'pb-1 border-b'
                  : ''
              }`}
              style={{ borderColor: layout.headingRule === 'thin_bottom' ? colors.accent : colors.border }}
            >
              {layout.headingRule === 'left_bar' && (
                <span className="w-1 h-4 shrink-0" style={{ backgroundColor: colors.accent }} />
              )}
              <h4
                className="text-xs font-bold"
                style={{ color: colors.heading, fontFamily: fonts.headingCss }}
              >
                {layout.headingRule === 'numbered_slate' ? '02. Methodology & Comparative Findings' : '2. Methodology & Comparative Findings'}
              </h4>
            </div>

            <p className="text-[10.5px] leading-relaxed" style={{ lineHeight: template.lineSpacing }}>
              This section demonstrates how headings, body text ({template.fonts.body}, {template.sizes.bodyPt}pt), callouts, and structured tables export consistently to Word (.docx) and PDF.
            </p>

            {/* Callout */}
            <div
              className="p-2.5 text-[10px] leading-snug"
              style={{
                backgroundColor: colors.accentSoft,
                borderLeft: `3px solid ${colors.accent}`,
                borderTop: layout.calloutStyle === 'plain_border' || layout.calloutStyle === 'slate_box' ? `1px solid ${colors.border}` : undefined,
                borderRight: layout.calloutStyle === 'plain_border' || layout.calloutStyle === 'slate_box' ? `1px solid ${colors.border}` : undefined,
                borderBottom: layout.calloutStyle === 'plain_border' || layout.calloutStyle === 'slate_box' ? `1px solid ${colors.border}` : undefined,
              }}
            >
              <strong style={{ color: colors.heading }}>Key Note:</strong> All citations and body text remain decoupled so you can switch templates anytime for 0 credits.
            </div>

            {/* Table */}
            <table className="w-full text-[10px] border-collapse" style={{ borderColor: colors.border }}>
              <thead>
                <tr style={{ backgroundColor: colors.tableHeaderBg, color: colors.tableHeaderText }}>
                  <th className="text-left px-2 py-1.5 border font-semibold" style={{ borderColor: colors.border }}>Metric</th>
                  <th className="text-left px-2 py-1.5 border font-semibold" style={{ borderColor: colors.border }}>Baseline</th>
                  <th className="text-left px-2 py-1.5 border font-semibold" style={{ borderColor: colors.border }}>Observed</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: colors.pageBg }}>
                  <td className="px-2 py-1 border" style={{ borderColor: colors.border }}>Efficiency</td>
                  <td className="px-2 py-1 border" style={{ borderColor: colors.border }}>78.4%</td>
                  <td className="px-2 py-1 border" style={{ borderColor: colors.border }}>91.2%</td>
                </tr>
                <tr style={{ backgroundColor: colors.tableStripeBg }}>
                  <td className="px-2 py-1 border" style={{ borderColor: colors.border }}>Reliability</td>
                  <td className="px-2 py-1 border" style={{ borderColor: colors.border }}>96.0%</td>
                  <td className="px-2 py-1 border" style={{ borderColor: colors.border }}>99.4%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className={`pt-2 border-t text-[9.5px] flex ${
              layout.headerFooterStyle === 'page_number_center' ? 'justify-center' : 'justify-between'
            }`}
            style={{ borderColor: colors.border === '#000000' ? '#E5E7EB' : colors.border, color: colors.muted }}
          >
            {layout.headerFooterStyle !== 'page_number_center' && <span>{s.studentName}</span>}
            <span>{layout.headerFooterStyle === 'page_number_center' ? '2' : 'Page 2'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Full 3-slide Deck Preview rendered directly from SlideTemplate tokens.
 */
const SlideFullPreview: React.FC<{
  template: SlideTemplate;
  sample?: TemplatePreviewSample;
  blankCanvas?: boolean;
}> = ({ template, sample, blankCanvas = false }) => {
  const s = getSafeSample(sample);
  const { colors, fonts, layout } = template;

  if (template.vectorKind && template.safeZone) {
    const contentZone = template.safeZone.content;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#5B6472] dark:text-slate-400 uppercase tracking-wider">
              Slide 1 — Title Canvas {blankCanvas ? '(Blank Vector)' : '(With Sample Text)'}
            </p>
            <SlideTemplateThumbnail template={template} sample={sample} blankCanvas={blankCanvas} />
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#5B6472] dark:text-slate-400 uppercase tracking-wider">
              Slide 2 — Content Canvas {blankCanvas ? '(Blank Vector)' : '(Safe Content Zone)'}
            </p>
            <div
              className="w-full aspect-video rounded border overflow-hidden select-none relative text-left"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, fontFamily: fonts.bodyCss }}
            >
              <SlideVectorBackground template={template} variant="content" />
              {!blankCanvas && (
                <div
                  className="absolute z-10 flex flex-col justify-start gap-1.5"
                  style={{
                    left: `${(contentZone.x / 13.333) * 100}%`,
                    top: `${(contentZone.y / 7.5) * 100}%`,
                    width: `${(contentZone.w / 13.333) * 100}%`,
                    height: `${(contentZone.h / 7.5) * 100}%`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[9.5px] font-bold truncate"
                      style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                    >
                      Core Research Objectives
                    </span>
                    <span className="text-[6.5px] font-mono" style={{ color: colors.muted }}>
                      02
                    </span>
                  </div>
                  <ul className="space-y-1 text-[7.5px] leading-snug">
                    {[
                      'Evaluate hybrid solar-storage dispatch under peak load.',
                      'Quantify outage reduction across academic buildings.',
                      'Compare lifecycle cost against diesel backup generation.',
                    ].map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-xs shrink-0 mt-1"
                          style={{ backgroundColor: colors.accent }}
                        />
                        <span className="line-clamp-1" style={{ color: colors.body }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Slide 1: Title Slide */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-[#5B6472] dark:text-slate-400 uppercase tracking-wider">
            Slide 1 — Title Slide
          </p>
          <SlideTemplateThumbnail template={template} sample={sample} />
        </div>

        {/* Slide 2: Structured Bullets */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-[#5B6472] dark:text-slate-400 uppercase tracking-wider">
            Slide 2 — Structured Content
          </p>
          <div
            className="w-full aspect-video rounded border overflow-hidden p-3 flex flex-col justify-between text-left"
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.body, fontFamily: fonts.bodyCss }}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 pb-1 border-b" style={{ borderColor: colors.border }}>
                <span
                  className="text-[9.5px] font-bold truncate"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  Core Research Objectives
                </span>
                {layout.headerStyle === 'index_badge_panel' ? (
                  <span className="px-1 py-0.5 text-[6.5px] font-mono font-bold" style={{ backgroundColor: colors.accent, color: colors.accentText }}>
                    02
                  </span>
                ) : (
                  <span className="h-[3px] w-6 rounded-xs" style={{ backgroundColor: colors.accent }} />
                )}
              </div>
              <ul className="space-y-1.5 pt-1 text-[8px] leading-snug">
                {[
                  'Evaluate hybrid solar-storage dispatch under peak load.',
                  'Quantify outage reduction across academic buildings.',
                  'Compare lifecycle cost against diesel backup generation.',
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-xs shrink-0 mt-1"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <span className="line-clamp-1">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-1 border-t flex justify-between text-[6.5px]" style={{ borderColor: colors.border, color: colors.muted }}>
              <span className="truncate">{s.courseCode}</span>
              <span>02</span>
            </div>
          </div>
        </div>

        {/* Slide 3: Two-Column / Data Comparison */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-[#5B6472] dark:text-slate-400 uppercase tracking-wider">
            Slide 3 — Comparison &amp; Data
          </p>
          <div
            className="w-full aspect-video rounded border overflow-hidden p-3 flex flex-col justify-between text-left"
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.body, fontFamily: fonts.bodyCss }}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 pb-1 border-b" style={{ borderColor: colors.border }}>
                <span
                  className="text-[9.5px] font-bold truncate"
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                >
                  Comparative Performance
                </span>
                <span className="text-[6.5px] uppercase font-semibold" style={{ color: colors.accent }}>
                  Data
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div
                  className="p-2 rounded-xs border space-y-1"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <div className="text-[7px] font-bold uppercase" style={{ color: colors.muted }}>Baseline Grid</div>
                  <div className="text-xs font-bold" style={{ color: colors.heading }}>78.4%</div>
                  <div className="text-[7px]" style={{ color: colors.muted }}>Higher diesel fuel cost</div>
                </div>
                <div
                  className="p-2 rounded-xs border space-y-1"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.accent,
                    borderLeftWidth: 3,
                  }}
                >
                  <div className="text-[7px] font-bold uppercase" style={{ color: colors.accent }}>Microgrid</div>
                  <div className="text-xs font-bold" style={{ color: colors.heading }}>99.1%</div>
                  <div className="text-[7px]" style={{ color: colors.muted }}>38% lower annual cost</div>
                </div>
              </div>
            </div>
            <div className="pt-1 border-t flex justify-between text-[6.5px]" style={{ borderColor: colors.border, color: colors.muted }}>
              <span className="truncate">{s.title.slice(0, 26)}</span>
              <span>03</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Responsive Preview & Switch Modal usable both pre-generation and post-generation (0 credits).
 */
export const StudioTemplateModal: React.FC<StudioTemplateModalProps> = ({
  isOpen,
  mode,
  initialTemplateId,
  initialPaletteId,
  onClose,
  onConfirm,
  sample,
  titleLabel,
}) => {
  const [activeId, setActiveId] = useState<string>(initialTemplateId);
  const [showSampleText, setShowSampleText] = useState<boolean>(false);
  const [activePaletteId, setActivePaletteId] = useState<string>(
    initialPaletteId ||
      (mode === 'document'
        ? getDefaultDocumentPaletteId(initialTemplateId)
        : getDefaultSlidePaletteId(initialTemplateId))
  );

  React.useEffect(() => {
    if (isOpen) {
      setActiveId(initialTemplateId);
      setActivePaletteId(
        initialPaletteId ||
          (mode === 'document'
            ? getDefaultDocumentPaletteId(initialTemplateId)
            : getDefaultSlidePaletteId(initialTemplateId))
      );
    }
  }, [isOpen, initialTemplateId, initialPaletteId, mode]);

  if (!isOpen) return null;

  const isDoc = mode === 'document';
  const activeDocTpl = isDoc ? resolveDocumentTemplate(activeId, activePaletteId) : null;
  const activeSlideTpl = !isDoc ? resolveSlideTemplate(activeId, activePaletteId) : null;
  const activeMeta = isDoc ? activeDocTpl! : activeSlideTpl!;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={titleLabel || (isDoc ? 'Document Template Preview' : 'Slide Template Preview')}
      data-template-preview-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isDoc ? (
                <FileText size={16} className="text-[#2563EB] shrink-0" />
              ) : (
                <Presentation size={16} className="text-[#2563EB] shrink-0" />
              )}
              <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-white truncate">
                {titleLabel || (isDoc ? 'Document Template Preview (A4)' : 'Slide Template Preview (16:9)')}
              </h3>
            </div>
            <p className="text-xs text-[#5B6472] dark:text-slate-400 mt-0.5">
              Preview templates and color palettes anytime — 0 credits used. Exported files match this layout.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 text-[#5B6472] hover:text-[#111827] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Flipper Strip */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          {(isDoc ? DOCUMENT_TEMPLATES : SLIDE_TEMPLATES).map((tpl) => {
            const selected = tpl.id === activeMeta.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setActiveId(tpl.id);
                  setActivePaletteId(tpl.palettes[0].id);
                }}
                data-preview-switch-id={tpl.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors min-h-[36px] cursor-pointer ${
                  selected
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-200 border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB]'
                }`}
              >
                {tpl.name}
              </button>
            );
          })}
        </div>

        {/* Preview Canvas */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#111827] dark:text-white">{activeMeta.name}</h4>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border border-[#E5E7EB] dark:border-slate-700 text-[#5B6472] dark:text-slate-300">
                  {activeMeta.category === 'minimal'
                    ? 'Minimal & Academic'
                    : isDoc
                    ? 'Seminar & Executive'
                    : 'Seminar & Pitch'}
                </span>
              </div>
              <p className="text-xs text-[#5B6472] dark:text-slate-400 mt-0.5">
                {activeMeta.tagline} · Best for: {activeMeta.bestFor}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {!isDoc && activeSlideTpl?.vectorKind && (
                  <button
                    type="button"
                    onClick={() => setShowSampleText((prev) => !prev)}
                    className="px-2.5 py-1 rounded-md border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-[#111827] dark:text-slate-200 hover:border-[#2563EB] cursor-pointer"
                  >
                    {showSampleText ? 'Show Blank Canvas' : 'Show Sample Text'}
                  </button>
                )}
                <PaletteSwatchRow
                  palettes={activeMeta.palettes}
                  activePaletteId={activeMeta.activePaletteId}
                  onSelectPalette={setActivePaletteId}
                  size="md"
                />
              </div>
              <span className="text-[11px] font-mono text-[#5B6472] dark:text-slate-400">
                {isDoc
                  ? `${activeDocTpl!.fonts.body} ${activeDocTpl!.sizes.bodyPt}pt · ${activeDocTpl!.lineSpacing}x`
                  : `16:9 · ${activeSlideTpl!.fonts.heading} / ${activeSlideTpl!.fonts.body}`}
              </span>
            </div>
          </div>

          {isDoc ? (
            <DocumentFullPreview template={activeDocTpl!} sample={sample} />
          ) : (
            <SlideFullPreview
              template={activeSlideTpl!}
              sample={sample}
              blankCanvas={Boolean(activeSlideTpl?.vectorKind) && !showSampleText}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <span className="text-xs text-[#5B6472] dark:text-slate-400">
            0 credits — styling applies immediately to preview &amp; export.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-[#111827] dark:text-slate-200 min-h-[40px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(
                  activeMeta.id as DocumentTemplateId | SlideTemplateId,
                  activeMeta.activePaletteId
                );
                onClose();
              }}
              data-confirm-template="true"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-xs font-semibold min-h-[40px] cursor-pointer"
            >
              <Check size={14} />
              <span>Use This Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudioTemplatePicker: React.FC<StudioTemplatePickerProps> = ({
  mode,
  selectedDocumentTemplateId,
  selectedDocumentPaletteId,
  selectedSlideTemplateId,
  selectedSlidePaletteId,
  onSelectDocumentTemplate,
  onSelectSlideTemplate,
  onSelectDocumentPalette,
  onSelectSlidePalette,
  sample,
  compact = false,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | TemplateCategory>('all');
  const [showSampleOnVectorCards, setShowSampleOnVectorCards] = useState<boolean>(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<DocumentTemplateId | SlideTemplateId | null>(null);

  const isDoc = mode === 'document';

  const visibleDocTemplates = useMemo(() => {
    if (categoryFilter === 'all') return DOCUMENT_TEMPLATES;
    return DOCUMENT_TEMPLATES.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  const visibleSlideTemplates = useMemo(() => {
    if (categoryFilter === 'all') return SLIDE_TEMPLATES;
    return SLIDE_TEMPLATES.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  const activeSelection = isDoc ? selectedDocumentTemplateId : selectedSlideTemplateId;
  const activePaletteSelection = isDoc
    ? selectedDocumentPaletteId || getDefaultDocumentPaletteId(selectedDocumentTemplateId)
    : selectedSlidePaletteId || getDefaultSlidePaletteId(selectedSlideTemplateId);
  const totalCount = isDoc ? DOCUMENT_TEMPLATES.length : SLIDE_TEMPLATES.length;

  return (
    <div className="space-y-3" data-template-picker-mode={mode}>
      {/* Header & Category Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-sm font-semibold text-[#111827] dark:text-white flex items-center gap-2">
            {isDoc ? (
              <FileText size={15} className="text-[#2563EB]" />
            ) : (
              <Presentation size={15} className="text-[#2563EB]" />
            )}
            <span>{isDoc ? 'Document Template (A4 Portrait)' : 'Slide Template (16:9 Widescreen)'}</span>
          </h3>
          <p className="text-xs text-[#5B6472] dark:text-slate-400 mt-0.5">
            Choose a layout and color palette before generating. Switch anytime after generation for 0 credits.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Template category filter">
          {!isDoc && (
            <button
              type="button"
              onClick={() => setShowSampleOnVectorCards((prev) => !prev)}
              data-toggle-blank-canvas="true"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 hover:border-[#2563EB] transition-colors min-h-[36px] cursor-pointer"
            >
              {showSampleOnVectorCards ? 'Blank Canvas' : 'Sample Text'}
            </button>
          )}
          {[
            { id: 'all' as const, label: `All (${totalCount})` },
            { id: 'minimal' as const, label: 'Minimal & Academic' },
            { id: 'designed' as const, label: isDoc ? 'Seminar & Executive' : 'Seminar & Pitch' },
          ].map((pill) => {
            const active = categoryFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-template-filter={pill.id}
                onClick={() => setCategoryFilter(pill.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] cursor-pointer ${
                  active
                    ? 'bg-[#111827] text-white border-[#111827] dark:bg-white dark:text-[#111827] dark:border-white'
                    : 'bg-white dark:bg-slate-800 text-[#5B6472] dark:text-slate-300 border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB]'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Cards Grid */}
      <div
        className={
          compact
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
        }
      >
        {isDoc
          ? visibleDocTemplates.map((baseTpl) => {
              const selected = baseTpl.id === selectedDocumentTemplateId;
              const resolvedTpl = resolveDocumentTemplate(
                baseTpl.id,
                selected ? selectedDocumentPaletteId : undefined
              );
              return (
                <div
                  key={baseTpl.id}
                  data-template-card={baseTpl.id}
                  data-template-selected={selected ? 'true' : 'false'}
                  data-template-palette={resolvedTpl.activePaletteId}
                  onClick={() => onSelectDocumentTemplate(baseTpl.id, baseTpl.palettes[0].id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDocumentTemplate(baseTpl.id, baseTpl.palettes[0].id);
                    }
                  }}
                  className={`rounded-lg border p-3 transition-colors flex flex-col justify-between gap-2.5 cursor-pointer bg-white dark:bg-slate-900 ${
                    selected
                      ? 'border-[#2563EB] ring-1 ring-[#2563EB]'
                      : 'border-[#E5E7EB] dark:border-slate-800 hover:border-[#2563EB]/70'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="relative">
                      <DocumentTemplateThumbnail template={resolvedTpl} sample={sample} />
                      {selected && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-semibold">
                          <Check size={11} />
                          <span>Selected</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#111827] dark:text-white truncate">
                          {baseTpl.name}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-slate-700 text-[#5B6472] dark:text-slate-400 shrink-0">
                          {baseTpl.category === 'minimal' ? 'Minimal' : 'Designed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5B6472] dark:text-slate-400 leading-snug line-clamp-2">
                        {baseTpl.tagline}
                      </p>
                    </div>

                    {/* Curated Color Swatches directly under the selected template */}
                    {selected && (
                      <div className="pt-1">
                        <PaletteSwatchRow
                          palettes={baseTpl.palettes}
                          activePaletteId={resolvedTpl.activePaletteId}
                          onSelectPalette={(pId) => {
                            if (onSelectDocumentPalette) onSelectDocumentPalette(pId);
                            else onSelectDocumentTemplate(baseTpl.id, pId);
                          }}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#E5E7EB] dark:border-slate-800">
                    <span className="text-[10px] font-mono text-[#5B6472] dark:text-slate-400 truncate">
                      {baseTpl.fonts.body} · {baseTpl.sizes.bodyPt}pt
                    </span>
                    <button
                      type="button"
                      data-template-preview-btn={baseTpl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplateId(baseTpl.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-[11px] font-medium text-[#111827] dark:text-slate-200 cursor-pointer min-h-[32px]"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              );
            })
          : visibleSlideTemplates.map((baseTpl) => {
              const selected = baseTpl.id === selectedSlideTemplateId;
              const resolvedTpl = resolveSlideTemplate(
                baseTpl.id,
                selected ? selectedSlidePaletteId : undefined
              );
              return (
                <div
                  key={baseTpl.id}
                  data-template-card={baseTpl.id}
                  data-template-selected={selected ? 'true' : 'false'}
                  data-template-palette={resolvedTpl.activePaletteId}
                  onClick={() => onSelectSlideTemplate(baseTpl.id, baseTpl.palettes[0].id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSlideTemplate(baseTpl.id, baseTpl.palettes[0].id);
                    }
                  }}
                  className={`rounded-lg border p-3 transition-colors flex flex-col justify-between gap-2.5 cursor-pointer bg-white dark:bg-slate-900 ${
                    selected
                      ? 'border-[#2563EB] ring-1 ring-[#2563EB]'
                      : 'border-[#E5E7EB] dark:border-slate-800 hover:border-[#2563EB]/70'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="relative">
                      <SlideTemplateThumbnail
                        template={resolvedTpl}
                        sample={sample}
                        blankCanvas={Boolean(resolvedTpl.vectorKind) && !showSampleOnVectorCards}
                      />
                      {selected && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-semibold">
                          <Check size={11} />
                          <span>Selected</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#111827] dark:text-white truncate">
                          {baseTpl.name}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-slate-700 text-[#5B6472] dark:text-slate-400 shrink-0">
                          {baseTpl.category === 'minimal' ? 'Minimal' : 'Designed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5B6472] dark:text-slate-400 leading-snug line-clamp-2">
                        {baseTpl.tagline}
                      </p>
                    </div>

                    {/* Curated Color Swatches directly under the selected slide template */}
                    {selected && (
                      <div className="pt-1">
                        <PaletteSwatchRow
                          palettes={baseTpl.palettes}
                          activePaletteId={resolvedTpl.activePaletteId}
                          onSelectPalette={(pId) => {
                            if (onSelectSlidePalette) onSelectSlidePalette(pId);
                            else onSelectSlideTemplate(baseTpl.id, pId);
                          }}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#E5E7EB] dark:border-slate-800">
                    <span className="text-[10px] font-mono text-[#5B6472] dark:text-slate-400 truncate">
                      16:9 · {baseTpl.fonts.heading}
                    </span>
                    <button
                      type="button"
                      data-template-preview-btn={baseTpl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplateId(baseTpl.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-[11px] font-medium text-[#111827] dark:text-slate-200 cursor-pointer min-h-[32px]"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Preview Modal */}
      <StudioTemplateModal
        isOpen={Boolean(previewTemplateId)}
        mode={mode}
        initialTemplateId={previewTemplateId || activeSelection}
        initialPaletteId={
          previewTemplateId && previewTemplateId === activeSelection
            ? activePaletteSelection
            : undefined
        }
        onClose={() => setPreviewTemplateId(null)}
        onConfirm={(chosenId, chosenPaletteId) => {
          if (isDoc) {
            onSelectDocumentTemplate(chosenId as DocumentTemplateId, chosenPaletteId);
            onSelectDocumentPalette?.(chosenPaletteId);
          } else {
            onSelectSlideTemplate(chosenId as SlideTemplateId, chosenPaletteId);
            onSelectSlidePalette?.(chosenPaletteId);
          }
        }}
        sample={sample}
      />
    </div>
  );
};

export default StudioTemplatePicker;
