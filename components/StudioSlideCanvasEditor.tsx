import React from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { StudioCoverPageData, StudioSection } from '../types';
import { SlideTemplate } from '../lib/studioTemplates';
import { ResolvedCoverPage } from '../lib/studioCover';
import SlideVectorBackground from './SlideVectorBackground';

interface StudioSlideCanvasEditorProps {
  mode: 'cover' | 'slide';
  template: SlideTemplate;
  cover: ResolvedCoverPage;
  slideSection?: StudioSection | null;
  slideIndex: number;
  totalSlides: number;
  bulletsText: string;
  speakerNotes: string;
  onChangeCover: (patch: Partial<StudioCoverPageData>) => void;
  onChangeSlideTitle: (title: string) => void;
  onChangeSlideMeta: (patch: { kicker?: string; takeaway?: string; speakerNotes?: string }) => void;
  onChangeBulletsText: (nextText: string) => void;
  onAddSlide: () => void;
  onDuplicateSlide: () => void;
  onMoveSlide: (dir: -1 | 1) => void;
  onDeleteSlide: () => void;
}

const inlineFieldClass =
  'bg-transparent outline-none border border-transparent hover:border-[#2563EB]/40 focus:border-dashed focus:border-[#2563EB] rounded px-1.5 py-0.5 transition-colors';

function parseBullets(text: string): string[] {
  const lines = (text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s+/, ''));
  return lines.length > 0 ? lines : [''];
}

function serializeBullets(items: string[]): string {
  return items.map((item) => (item.trim() ? `- ${item}` : '')).join('\n');
}

/**
 * Interactive 16:9 Slide Canvas Editor for both Slide 1 (Cover) and Content/Closing Slides.
 * Renders directly inside the active SlideTemplate + Color Palette with zero credit cost.
 */
export const StudioSlideCanvasEditor: React.FC<StudioSlideCanvasEditorProps> = ({
  mode,
  template,
  cover,
  slideSection,
  slideIndex,
  totalSlides,
  bulletsText,
  speakerNotes,
  onChangeCover,
  onChangeSlideTitle,
  onChangeSlideMeta,
  onChangeBulletsText,
  onAddSlide,
  onDuplicateSlide,
  onMoveSlide,
  onDeleteSlide,
}) => {
  const { colors, fonts } = template;
  const isCover = mode === 'cover';
  const bullets = parseBullets(bulletsText);
  const wordCount = bulletsText.trim().split(/\s+/).filter(Boolean).length;
  const isDense = !isCover && (bullets.filter((b) => b.trim()).length > 6 || wordCount > 110);

  const isVector = Boolean(template.vectorKind && template.safeZone);
  const zone = isVector
    ? isCover
      ? template.safeZone!.title
      : template.safeZone!.content
    : { x: 0.8, y: 0.7, w: 11.733, h: 6.1 };

  const isDarkCover =
    isCover &&
    (template.vectorKind === 'editorial-split-dark' ||
      template.layout.titleLayout === 'dark_executive');
  const titleColor = isDarkCover ? colors.titleText : colors.heading;
  const mutedColor = isDarkCover ? colors.accentSoft || '#CBD5E1' : colors.muted;
  const isCenteredCover = isCover && template.vectorKind === 'swiss-monochrome';

  const updateBulletAt = (idx: number, val: string) => {
    const next = [...bullets];
    next[idx] = val;
    onChangeBulletsText(serializeBullets(next));
  };

  const addBulletAfter = (idx: number) => {
    const next = [...bullets];
    next.splice(idx + 1, 0, '');
    onChangeBulletsText(serializeBullets(next));
  };

  const removeBulletAt = (idx: number) => {
    if (bullets.length <= 1) {
      onChangeBulletsText('');
      return;
    }
    const next = bullets.filter((_, i) => i !== idx);
    onChangeBulletsText(serializeBullets(next));
  };

  return (
    <div className="space-y-4" data-slide-canvas-editor={mode}>
      {/* Slide Management Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
            {isCover ? 'Slide 1 · Cover Slide' : `Slide ${slideIndex + 2} of ${totalSlides + 1}`}
          </span>
          {isDense && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
              <AlertTriangle size={11} />
              <span>Dense slide — consider splitting</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={onAddSlide}
            data-slide-action="add"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-xs font-medium text-[#111827] dark:text-slate-200 min-h-[34px] cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Slide</span>
          </button>
          {!isCover && (
            <>
              <button
                type="button"
                onClick={onDuplicateSlide}
                data-slide-action="duplicate"
                title="Duplicate slide"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-xs font-medium text-[#5B6472] hover:text-[#111827] dark:hover:text-white min-h-[34px] cursor-pointer"
              >
                <Copy size={12} />
                <span className="hidden sm:inline">Duplicate</span>
              </button>
              <button
                type="button"
                onClick={() => onMoveSlide(-1)}
                disabled={slideIndex <= 0}
                data-slide-action="move-up"
                title="Move slide up"
                className="p-1.5 rounded-md border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-[#5B6472] disabled:opacity-35 min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => onMoveSlide(1)}
                disabled={slideIndex >= totalSlides - 1}
                data-slide-action="move-down"
                title="Move slide down"
                className="p-1.5 rounded-md border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-[#5B6472] disabled:opacity-35 min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                onClick={onDeleteSlide}
                disabled={totalSlides <= 1}
                data-slide-action="delete"
                title="Delete slide"
                className="p-1.5 rounded-md border border-[#E5E7EB] dark:border-slate-700 hover:border-red-400 text-[#5B6472] hover:text-red-600 disabled:opacity-35 min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live 16:9 Interactive Slide Canvas */}
      <div
        className="w-full aspect-video rounded-xl border shadow-sm overflow-hidden relative"
        style={{
          backgroundColor: isDarkCover ? colors.titleBg : colors.bg,
          borderColor: colors.border,
          color: colors.body,
          fontFamily: fonts.bodyCss,
        }}
      >
        {isVector && (
          <SlideVectorBackground template={template} variant={isCover ? 'title' : 'content'} />
        )}

        {/* Non-vector top/bottom bar accent for visual continuity */}
        {!isVector && !isCover && (
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: colors.accent }} />
        )}

        <div
          className={`absolute z-10 flex flex-col ${
            isCover ? 'justify-center gap-2 sm:gap-3' : 'justify-start gap-2'
          } ${isCenteredCover ? 'items-center text-center' : 'text-left'}`}
          style={{
            left: `${(zone.x / 13.333) * 100}%`,
            top: `${(zone.y / 7.5) * 100}%`,
            width: `${(zone.w / 13.333) * 100}%`,
            height: `${(zone.h / 7.5) * 100}%`,
          }}
        >
          {isCover ? (
            <>
              <input
                type="text"
                aria-label="Course Code"
                value={cover.courseCode}
                onChange={(e) => onChangeCover({ courseCode: e.target.value })}
                placeholder="COURSE CODE"
                className={`${inlineFieldClass} w-full text-[11px] sm:text-xs font-bold uppercase tracking-widest ${
                  isCenteredCover ? 'text-center' : 'text-left'
                }`}
                style={{ color: colors.accent }}
              />
              <textarea
                aria-label="Presentation Title"
                rows={2}
                value={cover.title}
                onChange={(e) => onChangeCover({ title: e.target.value })}
                placeholder="Presentation Title..."
                className={`${inlineFieldClass} w-full text-lg sm:text-3xl font-bold leading-tight resize-none ${
                  isCenteredCover ? 'text-center' : 'text-left'
                }`}
                style={{ color: titleColor, fontFamily: fonts.headingCss }}
              />
              <input
                type="text"
                aria-label="Presentation Subtitle"
                value={cover.subtitle}
                onChange={(e) => onChangeCover({ subtitle: e.target.value })}
                placeholder="Subtitle or topic tagline (optional)"
                className={`${inlineFieldClass} w-full text-xs sm:text-sm ${
                  isCenteredCover ? 'text-center' : 'text-left'
                }`}
                style={{ color: mutedColor }}
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 w-full">
                <input
                  type="text"
                  aria-label="Presenter Name"
                  value={cover.studentName}
                  onChange={(e) => onChangeCover({ studentName: e.target.value })}
                  placeholder="Presenter name"
                  className={`${inlineFieldClass} text-[11px] sm:text-xs font-medium`}
                  style={{ color: mutedColor }}
                />
                <input
                  type="text"
                  aria-label="Matric Number"
                  value={cover.studentId}
                  onChange={(e) => onChangeCover({ studentId: e.target.value })}
                  placeholder="Matric no."
                  className={`${inlineFieldClass} text-[11px] sm:text-xs font-mono`}
                  style={{ color: mutedColor }}
                />
                <input
                  type="text"
                  aria-label="Institution"
                  value={cover.institution}
                  onChange={(e) => onChangeCover({ institution: e.target.value })}
                  placeholder="Institution / Dept"
                  className={`${inlineFieldClass} text-[11px] sm:text-xs`}
                  style={{ color: mutedColor }}
                />
                <input
                  type="text"
                  aria-label="Presentation Date"
                  value={cover.submissionDate}
                  onChange={(e) => onChangeCover({ submissionDate: e.target.value })}
                  placeholder="Date"
                  className={`${inlineFieldClass} text-[11px] sm:text-xs`}
                  style={{ color: mutedColor }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Kicker + Slide Title */}
              <div className="shrink-0 space-y-0.5">
                <input
                  type="text"
                  aria-label="Slide Kicker"
                  value={slideSection?.kicker || ''}
                  onChange={(e) => onChangeSlideMeta({ kicker: e.target.value })}
                  placeholder="Optional section kicker..."
                  className={`${inlineFieldClass} w-full text-[10px] font-semibold uppercase tracking-wider`}
                  style={{ color: colors.accent }}
                />
                <input
                  type="text"
                  aria-label="Slide Title"
                  value={slideSection?.title || ''}
                  onChange={(e) => onChangeSlideTitle(e.target.value)}
                  placeholder="Slide Title..."
                  className={`${inlineFieldClass} w-full text-base sm:text-2xl font-bold`}
                  style={{ color: colors.heading, fontFamily: fonts.headingCss }}
                />
              </div>

              {/* Interactive Bullet Points */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2 group">
                    <span
                      className="w-2 h-2 rounded-xs shrink-0 mt-2"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <input
                      type="text"
                      aria-label={`Bullet point ${bIdx + 1}`}
                      value={b}
                      onChange={(e) => updateBulletAt(bIdx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addBulletAfter(bIdx);
                        } else if (e.key === 'Backspace' && !b && bullets.length > 1) {
                          e.preventDefault();
                          removeBulletAt(bIdx);
                        }
                      }}
                      placeholder="Type a bullet point..."
                      className={`${inlineFieldClass} flex-1 text-xs sm:text-sm leading-snug`}
                      style={{ color: colors.body }}
                    />
                    {bullets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBulletAt(bIdx)}
                        aria-label="Remove bullet"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addBulletAfter(bullets.length - 1)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border border-dashed border-[#2563EB]/50 text-[#2563EB] hover:bg-blue-50/50 cursor-pointer mt-1"
                >
                  <Plus size={11} />
                  <span>Add point</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Takeaway Strip on Executive Concentric content slides */}
        {!isCover && template.vectorKind === 'executive-concentric' && (
          <div
            className="absolute z-10 flex items-center"
            style={{
              left: `${(3.75 / 13.333) * 100}%`,
              top: `${(6.18 / 7.5) * 100}%`,
              width: `${(7.6 / 13.333) * 100}%`,
              height: `${(0.58 / 7.5) * 100}%`,
            }}
          >
            <input
              type="text"
              aria-label="Slide Takeaway"
              value={slideSection?.takeaway || ''}
              onChange={(e) => onChangeSlideMeta({ takeaway: e.target.value })}
              placeholder="Optional takeaway / summary strip..."
              className={`${inlineFieldClass} w-full text-[11px] sm:text-xs font-medium`}
              style={{ color: colors.heading }}
            />
          </div>
        )}
      </div>

      {/* Speaker Notes Compact Bar Below Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-3.5 space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
          {isCover ? 'Cover Speaker Notes (exported to .pptx)' : 'Speaker Notes (exported to .pptx)'}
        </label>
        <textarea
          rows={2}
          value={isCover ? cover.speakerNotes : speakerNotes}
          onChange={(e) =>
            isCover
              ? onChangeCover({ speakerNotes: e.target.value })
              : onChangeSlideMeta({ speakerNotes: e.target.value })
          }
          placeholder="Optional presenter talking points..."
          className="w-full p-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 rounded-lg text-xs leading-relaxed text-[#111827] dark:text-slate-200 outline-none focus:border-[#2563EB] resize-y"
        />
      </div>
    </div>
  );
};

export default StudioSlideCanvasEditor;
