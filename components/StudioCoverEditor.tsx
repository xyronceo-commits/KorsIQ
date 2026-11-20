import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { StudioCoverPageData } from '../types';
import { DocumentTemplate } from '../lib/studioTemplates';
import { ResolvedCoverPage } from '../lib/studioCover';

interface StudioCoverEditorProps {
  cover: ResolvedCoverPage;
  template: DocumentTemplate;
  onChange: (patch: Partial<StudioCoverPageData>) => void;
}

const editableInputClass =
  'bg-transparent outline-none border border-transparent hover:border-[#2563EB]/35 focus:border-dashed focus:border-[#2563EB] rounded px-1.5 py-0.5 transition-colors';

/**
 * Click-to-edit A4 Document Cover Page styled strictly with the active DocumentTemplate + Color Palette.
 */
export const StudioCoverEditor: React.FC<StudioCoverEditorProps> = ({
  cover,
  template,
  onChange,
}) => {
  const { colors, fonts, layout } = template;
  const isBanner = layout.coverStyle === 'executive_banner';
  const isCentered = layout.coverStyle === 'formal_centered';
  const headerTextColor = isBanner ? colors.coverText : colors.heading;
  const headerMutedColor = isBanner ? colors.coverText : colors.muted;

  return (
    <div className="space-y-3" data-cover-page-editor="true">
      {/* Compact Cover Page Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
            Page 1 · Cover Page
          </span>
          <span className="text-xs text-[#5B6472] dark:text-slate-400">
            Click any field below to edit directly · 0 credits
          </span>
        </div>

        <button
          type="button"
          data-include-cover-toggle="true"
          onClick={() => onChange({ includeCoverPage: !cover.includeCoverPage })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium min-h-[36px] cursor-pointer transition-colors ${
            cover.includeCoverPage
              ? 'border-[#111827] bg-[#111827] text-white dark:border-white dark:bg-white dark:text-[#111827]'
              : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#5B6472]'
          }`}
        >
          {cover.includeCoverPage ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>Include Cover Page: {cover.includeCoverPage ? 'On' : 'Off'}</span>
        </button>
      </div>

      {!cover.includeCoverPage ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-[#E5E7EB] dark:border-slate-700 rounded-xl p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-[#111827] dark:text-white">
            Cover Page is turned off
          </p>
          <p className="text-xs text-[#5B6472] dark:text-slate-400">
            Your exported .docx and .pdf will start directly with the first section. Toggle it back on anytime.
          </p>
        </div>
      ) : (
        /* A4 Cover Page Visual Canvas */
        <div
          className="w-full rounded-xl border shadow-xs overflow-hidden"
          style={{
            backgroundColor: colors.pageBg,
            borderColor: colors.border === '#000000' ? '#D1D5DB' : colors.border,
            color: colors.text,
            fontFamily: fonts.bodyCss,
          }}
        >
          {/* Top Accent / Header Zone */}
          <div
            className={`px-6 sm:px-10 py-8 sm:py-10 ${
              isBanner ? 'border-b-4' : 'border-b'
            } ${isCentered ? 'text-center' : 'text-left'}`}
            style={{
              backgroundColor: isBanner
                ? colors.coverBg
                : layout.coverStyle === 'technical_compact'
                ? colors.coverBg
                : colors.pageBg,
              borderColor: isBanner ? colors.accent : colors.border === '#000000' ? '#E5E7EB' : colors.border,
            }}
          >
            {layout.coverStyle === 'clean_academic' && (
              <div className="h-1 w-full mb-6" style={{ backgroundColor: colors.accent }} />
            )}

            <div
              className={
                layout.coverStyle === 'editorial_left' ? 'border-l-4 pl-4 space-y-3' : 'space-y-3'
              }
              style={layout.coverStyle === 'editorial_left' ? { borderColor: colors.accent } : undefined}
            >
              {/* University / Institution */}
              <input
                type="text"
                aria-label="University or Institution"
                value={cover.institution}
                onChange={(e) => onChange({ institution: e.target.value })}
                placeholder="University / Institution name"
                className={`${editableInputClass} w-full text-xs sm:text-sm font-semibold uppercase tracking-widest ${
                  isCentered ? 'text-center' : 'text-left'
                }`}
                style={{ color: headerMutedColor }}
              />

              {/* Department & Faculty */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${
                  isCentered ? 'max-w-lg mx-auto' : ''
                }`}
              >
                <input
                  type="text"
                  aria-label="Department"
                  value={cover.department}
                  onChange={(e) => onChange({ department: e.target.value })}
                  placeholder="Department (optional)"
                  className={`${editableInputClass} w-full text-xs ${
                    isCentered ? 'text-center' : 'text-left'
                  }`}
                  style={{ color: headerMutedColor }}
                />
                <input
                  type="text"
                  aria-label="Faculty"
                  value={cover.faculty}
                  onChange={(e) => onChange({ faculty: e.target.value })}
                  placeholder="Faculty / School (optional)"
                  className={`${editableInputClass} w-full text-xs ${
                    isCentered ? 'text-center' : 'text-left'
                  }`}
                  style={{ color: headerMutedColor }}
                />
              </div>

              {/* Document Title */}
              <textarea
                aria-label="Document Title"
                rows={2}
                value={cover.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Enter document title..."
                className={`${editableInputClass} w-full text-xl sm:text-2xl font-bold leading-snug resize-none ${
                  isCentered ? 'text-center uppercase' : 'text-left'
                }`}
                style={{ color: headerTextColor, fontFamily: fonts.headingCss }}
              />

              {/* Subtitle / Document Type Label */}
              <input
                type="text"
                aria-label="Subtitle or Document Type"
                value={cover.subtitle}
                onChange={(e) => onChange({ subtitle: e.target.value })}
                placeholder="Subtitle / Document Type (e.g., Research Proposal, Term Paper)"
                className={`${editableInputClass} w-full text-xs sm:text-sm font-medium ${
                  isCentered ? 'text-center' : 'text-left'
                }`}
                style={{ color: isBanner ? colors.coverText : colors.accent }}
              />
            </div>
          </div>

          {/* Author, Course, Supervisor & Date Metadata Grid */}
          <div className="px-6 sm:px-10 py-7 sm:py-9 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: colors.muted }}>
                  Student / Author Name
                </span>
                <input
                  type="text"
                  aria-label="Student Name"
                  value={cover.studentName}
                  onChange={(e) => onChange({ studentName: e.target.value })}
                  placeholder="Full name"
                  className={`${editableInputClass} w-full text-sm font-semibold`}
                  style={{ color: colors.text }}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: colors.muted }}>
                  Matric / Registration Number
                </span>
                <input
                  type="text"
                  aria-label="Matric Number"
                  value={cover.studentId}
                  onChange={(e) => onChange({ studentId: e.target.value })}
                  placeholder="e.g. 210401045 (optional)"
                  className={`${editableInputClass} w-full text-sm font-mono`}
                  style={{ color: colors.text }}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: colors.muted }}>
                  Course Code
                </span>
                <input
                  type="text"
                  aria-label="Course Code"
                  value={cover.courseCode}
                  onChange={(e) => onChange({ courseCode: e.target.value })}
                  placeholder="e.g. CSC 401"
                  className={`${editableInputClass} w-full text-sm`}
                  style={{ color: colors.text }}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: colors.muted }}>
                  Course Title
                </span>
                <input
                  type="text"
                  aria-label="Course Title"
                  value={cover.courseTitle}
                  onChange={(e) => onChange({ courseTitle: e.target.value })}
                  placeholder="Course title (optional)"
                  className={`${editableInputClass} w-full text-sm`}
                  style={{ color: colors.text }}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: colors.muted }}>
                  Lecturer / Supervisor
                </span>
                <input
                  type="text"
                  aria-label="Supervisor Name"
                  value={cover.supervisorName}
                  onChange={(e) => onChange({ supervisorName: e.target.value })}
                  placeholder="Dr. / Prof. Name (optional)"
                  className={`${editableInputClass} w-full text-sm`}
                  style={{ color: colors.text }}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: colors.muted }}>
                  Submission Date
                </span>
                <input
                  type="text"
                  aria-label="Submission Date"
                  value={cover.submissionDate}
                  onChange={(e) => onChange({ submissionDate: e.target.value })}
                  placeholder="e.g. November 2026"
                  className={`${editableInputClass} w-full text-sm`}
                  style={{ color: colors.text }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioCoverEditor;
