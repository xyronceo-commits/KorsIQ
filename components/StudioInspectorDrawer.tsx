import React from 'react';
import {
  BookOpen,
  Check,
  Edit3,
  Eye,
  History,
  Layers,
  Plus,
  Quote,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AcademicDocument,
  DocumentTemplateId,
  SlideTemplateId,
  StudioReference,
  StudioReviewSuggestion,
  StudioVersion,
  UserProfile,
} from '../types';
import {
  DOCUMENT_TEMPLATES,
  SLIDE_TEMPLATES,
  getDocumentTemplateForDoc,
  getSlideTemplateForDoc,
} from '../lib/studioTemplates';
import { BILLING_ENABLED } from '../lib/plans';
import { resolveTargetPagesForDoc, STUDIO_DOWNLOAD_NOTICE, wordsToEstimatedPages } from '../lib/studioV2';
import { PaletteSwatchRow } from './StudioTemplatePicker';

export type StudioInspectorTab = 'sources' | 'ai' | 'brief' | 'template';

interface StudioInspectorDrawerProps {
  activeTab: StudioInspectorTab | null;
  onChangeTab: (tab: StudioInspectorTab) => void;
  onClose: () => void;
  doc: AcademicDocument;
  profile: UserProfile;
  activeIsSlides: boolean;
  hasDraftedContent: boolean;
  editorText: string;
  selectedTextSnippet: string;
  isSectionGenerating: boolean;
  batchProgress: { current: number; total: number; title: string } | null;
  isAssistLoading: boolean;
  isReviewLoading: boolean;
  reviewResult: {
    academicQualityScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: StudioReviewSuggestion[];
  } | null;
  versions: StudioVersion[];
  isVersionSaving: boolean;
  isVersionsAllowed: boolean;
  onGenerateActiveSection: () => void;
  onBatchGenerateAll: () => void;
  onContextualAssist: (instruction: string) => void;
  onRunDocumentReview: () => void;
  onOpenAddRefModal: () => void;
  onInsertCitation: (ref: StudioReference) => void;
  onSaveVersionSnapshot: () => void;
  onRestoreVersion: (v: StudioVersion) => void;
  onRequireVersionsUpgrade: () => void;
  onSwitchTemplateFree: (id: DocumentTemplateId | SlideTemplateId, paletteId?: string) => void;
  onOpenFullTemplateModal: () => void;
}

export const StudioInspectorDrawer: React.FC<StudioInspectorDrawerProps> = ({
  activeTab,
  onChangeTab,
  onClose,
  doc,
  profile,
  activeIsSlides,
  hasDraftedContent,
  editorText,
  selectedTextSnippet,
  isSectionGenerating,
  batchProgress,
  isAssistLoading,
  isReviewLoading,
  reviewResult,
  versions,
  isVersionSaving,
  isVersionsAllowed,
  onGenerateActiveSection,
  onBatchGenerateAll,
  onContextualAssist,
  onRunDocumentReview,
  onOpenAddRefModal,
  onInsertCitation,
  onSaveVersionSnapshot,
  onRestoreVersion,
  onRequireVersionsUpgrade,
  onSwitchTemplateFree,
  onOpenFullTemplateModal,
}) => {
  if (!activeTab) return null;

  const sourceCount = doc.references.length;
  const activeDocTpl = getDocumentTemplateForDoc(doc);
  const activeSlideTpl = getSlideTemplateForDoc(doc);

  const tabs: Array<{ id: StudioInspectorTab; label: string }> = [
    { id: 'sources', label: `Sources (${sourceCount})` },
    { id: 'ai', label: 'AI Tools' },
    { id: 'brief', label: 'Brief' },
    { id: 'template', label: 'Template' },
  ];

  const drawerContent = (
    <aside
      data-studio-inspector-drawer="true"
      data-inspector-tab={activeTab}
      className="w-full sm:w-[340px] h-full bg-white dark:bg-slate-900 border-l border-[#E5E7EB] dark:border-slate-800 flex flex-col shrink-0"
    >
      {/* Drawer Header & Tabs */}
      <div className="px-4 pt-3 pb-0 border-b border-[#E5E7EB] dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-2 pb-2.5">
          <span className="text-xs font-semibold text-[#111827] dark:text-white">
            Workspace Inspector
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector drawer"
            className="p-1.5 rounded-lg text-[#5B6472] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto -mb-px" role="tablist">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChangeTab(t.id)}
                className={`px-2.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#111827] text-[#111827] dark:border-white dark:text-white font-semibold'
                    : 'border-transparent text-[#5B6472] hover:text-[#111827] dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drawer Body (single clean scroll) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#111827] dark:text-white">
                {sourceCount} {sourceCount === 1 ? 'Verifiable Source' : 'Verifiable Sources'}
              </span>
              <button
                type="button"
                onClick={onOpenAddRefModal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-xs font-semibold text-[#2563EB] cursor-pointer min-h-[36px]"
              >
                <Plus size={13} />
                <span>Add Source</span>
              </button>
            </div>

            <p className="text-[11px] text-[#5B6472] dark:text-slate-400 leading-relaxed">
              {STUDIO_DOWNLOAD_NOTICE}
            </p>

            {sourceCount === 0 ? (
              <div className="p-6 bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 rounded-lg text-center space-y-3">
                <BookOpen size={20} className="mx-auto text-[#5B6472]" />
                <p className="text-xs text-[#5B6472] dark:text-slate-400">
                  No sources attached yet. Attach journal articles, books, or uploaded readings to cite them cleanly.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddRefModal}
                  className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-xs font-semibold cursor-pointer min-h-[40px]"
                >
                  Attach Source
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {doc.references.map((ref) => {
                  const leadAuthor = (ref.authors || 'Source').split(',')[0].split(' ')[0];
                  const chipLabel = `(${leadAuthor}, ${ref.year || 'n.d.'})`;
                  return (
                    <div
                      key={ref.id}
                      className="p-3.5 bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 rounded-lg space-y-2"
                    >
                      <p className="text-xs font-semibold text-[#111827] dark:text-white leading-snug">
                        {ref.title}
                      </p>
                      <p className="text-[11px] text-[#5B6472] dark:text-slate-400 leading-snug">
                        {ref.authors} ({ref.year || 'n.d.'})
                        {ref.journal ? ` · ${ref.journal}` : ''}
                      </p>
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase text-[#5B6472]">
                          {ref.isStudentSource ? 'Uploaded' : ref.sourceType}
                        </span>
                        <button
                          type="button"
                          onClick={() => onInsertCitation(ref)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 hover:bg-[#2563EB] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          title={`Insert ${chipLabel} into active section`}
                        >
                          <Quote size={11} />
                          <span>Cite {chipLabel}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI TOOLS TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
                Active Section Tools
              </p>

              <button
                type="button"
                onClick={onGenerateActiveSection}
                disabled={isSectionGenerating || !!batchProgress}
                className="w-full py-2.5 px-3.5 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <Edit3 size={14} />
                <span>
                  {isSectionGenerating
                    ? 'Drafting...'
                    : BILLING_ENABLED
                    ? 'Write Section — 3 credits'
                    : 'Write Section'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onContextualAssist(
                    selectedTextSnippet
                      ? 'Elevate academic tone and vocabulary'
                      : 'Improve academic clarity, structure, and scholarly tone'
                  )
                }
                disabled={isSectionGenerating || isAssistLoading || !editorText}
                className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-[#111827] dark:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 min-h-[44px]"
              >
                <RefreshCw size={14} />
                <span>
                  {isAssistLoading
                    ? 'Rewriting...'
                    : BILLING_ENABLED
                    ? 'Rewrite Section — 1 credit'
                    : 'Rewrite Section'}
                </span>
              </button>

              <button
                type="button"
                onClick={onRunDocumentReview}
                disabled={isReviewLoading}
                className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-[#111827] dark:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 min-h-[44px]"
              >
                <ShieldCheck size={14} />
                <span>
                  {isReviewLoading
                    ? 'Checking...'
                    : BILLING_ENABLED
                    ? 'Check Citations — 1 credit'
                    : 'Check Citations'}
                </span>
              </button>
            </div>

            {/* Demoted secondary Regenerate Full Document action when content already exists */}
            <div className="pt-4 border-t border-[#E5E7EB] dark:border-slate-800 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
                Full Manuscript
              </p>
              <button
                type="button"
                onClick={onBatchGenerateAll}
                disabled={isSectionGenerating || !!batchProgress}
                className="w-full py-2.5 px-3.5 bg-[#F8FAFC] dark:bg-slate-800/70 border border-[#E5E7EB] dark:border-slate-700 hover:border-[#111827] dark:hover:border-slate-500 text-[#5B6472] hover:text-[#111827] dark:text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 min-h-[42px]"
              >
                <Layers size={14} />
                <span>
                  {batchProgress
                    ? 'Drafting Full Document...'
                    : hasDraftedContent
                    ? BILLING_ENABLED
                      ? 'Regenerate Full Document — 10 credits'
                      : 'Regenerate Full Document'
                    : BILLING_ENABLED
                    ? 'Generate Full Document — 10 credits'
                    : 'Generate Full Document'}
                </span>
              </button>
            </div>

            {reviewResult && (
              <div className="pt-4 border-t border-[#E5E7EB] dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111827] dark:text-white">
                    Citation &amp; Quality Review
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] text-xs font-bold">
                    {reviewResult.academicQualityScore}/100
                  </span>
                </div>
                <p className="text-xs text-[#5B6472] dark:text-slate-300 leading-relaxed">
                  {reviewResult.summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* BRIEF & VERSIONS TAB */}
        {activeTab === 'brief' && (
          <div className="space-y-5">
            <div className="p-3.5 bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 rounded-lg space-y-2 text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
                Document Brief
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-[#5B6472]">Type</span>
                <span className="font-medium text-[#111827] dark:text-white capitalize text-right">
                  {doc.docType.replace('_', ' ')}
                </span>
                <span className="text-[#5B6472]">Citations</span>
                <span className="font-medium text-[#111827] dark:text-white text-right">
                  {doc.citationStyle}
                </span>
                <span className="text-[#5B6472]">Level</span>
                <span className="font-medium text-[#111827] dark:text-white capitalize text-right">
                  {profile?.level || 'Undergraduate'}
                </span>
                <span className="text-[#5B6472]">Length</span>
                <span className="font-medium text-[#111827] dark:text-white text-right tabular-nums">
                  {activeIsSlides
                    ? `${Math.max(1, doc.sections.length + 1)} slides`
                    : `~${doc.currentWordCount > 0 ? wordsToEstimatedPages(doc.currentWordCount) : resolveTargetPagesForDoc(doc)} pages`}
                </span>
                {doc.subject && (
                  <>
                    <span className="text-[#5B6472]">Course</span>
                    <span className="font-medium text-[#111827] dark:text-white text-right truncate">
                      {doc.subject}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Version Snapshots */}
            <div className="space-y-2.5 pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111827] dark:text-white flex items-center gap-1.5">
                  <History size={14} className="text-[#5B6472]" />
                  <span>Version History</span>
                </span>
                <button
                  type="button"
                  disabled={isVersionSaving}
                  onClick={() => {
                    if (!isVersionsAllowed) onRequireVersionsUpgrade();
                    else onSaveVersionSnapshot();
                  }}
                  className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isVersionSaving ? 'Saving...' : '+ Save Snapshot'}
                </button>
              </div>

              {versions.length === 0 ? (
                <p className="text-xs text-[#5B6472] py-2">
                  No snapshots saved yet. Save a snapshot anytime before major edits.
                </p>
              ) : (
                <div className="space-y-2">
                  {versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-2.5 bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#111827] dark:text-white">
                          {ver.wordCount.toLocaleString()} words
                        </p>
                        <p className="text-[11px] text-[#5B6472] truncate">
                          {new Date(ver.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestoreVersion(ver)}
                        className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-xs font-medium text-[#2563EB] cursor-pointer shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEMPLATE TAB (0-Credit Instant Switch) */}
        {activeTab === 'template' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#111827] dark:text-white">
                  {activeIsSlides ? 'Slide Template (16:9)' : 'Document Template (A4)'}
                </p>
                <p className="text-[11px] text-[#5B6472] mt-0.5">
                  Switch anytime for 0 credits. Preview and exports update immediately.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenFullTemplateModal}
              className="w-full py-2 px-3 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] rounded-lg text-xs font-semibold text-[#111827] dark:text-white inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Eye size={14} className="text-[#2563EB]" />
              <span>Open Visual Template Gallery</span>
            </button>

            <div className="space-y-2">
              {activeIsSlides
                ? SLIDE_TEMPLATES.map((tpl) => {
                    const selected = tpl.id === activeSlideTpl.id;
                    const displayColors = selected ? activeSlideTpl.colors : tpl.colors;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        data-drawer-template-option={tpl.id}
                        onClick={() => onSwitchTemplateFree(tpl.id, tpl.palettes[0]?.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer flex items-start justify-between gap-2.5 ${
                          selected
                            ? 'border-[#2563EB] bg-[#EFF6FF]/60 dark:bg-blue-950/40'
                            : 'border-[#E5E7EB] dark:border-slate-800 hover:border-[#2563EB]/60 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className="w-5 h-5 rounded border shrink-0 mt-0.5"
                            style={{
                              backgroundColor: displayColors.bg,
                              borderColor: displayColors.accent,
                              boxShadow: `inset 0 4px 0 0 ${displayColors.accent}`,
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#111827] dark:text-white">
                              {tpl.name}
                            </p>
                            <p className="text-[11px] text-[#5B6472] dark:text-slate-400 line-clamp-2 mt-0.5">
                              {tpl.tagline}
                            </p>
                          </div>
                        </div>
                        {selected && <Check size={15} className="text-[#2563EB] shrink-0 mt-0.5" />}
                      </button>
                    );
                  })
                : DOCUMENT_TEMPLATES.map((tpl) => {
                    const selected = tpl.id === activeDocTpl.id;
                    const displayColors = selected ? activeDocTpl.colors : tpl.colors;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        data-drawer-template-option={tpl.id}
                        onClick={() => onSwitchTemplateFree(tpl.id, tpl.palettes[0]?.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer flex items-start justify-between gap-2.5 ${
                          selected
                            ? 'border-[#2563EB] bg-[#EFF6FF]/60 dark:bg-blue-950/40'
                            : 'border-[#E5E7EB] dark:border-slate-800 hover:border-[#2563EB]/60 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className="w-5 h-5 rounded border shrink-0 mt-0.5"
                            style={{
                              backgroundColor: displayColors.pageBg,
                              borderColor:
                                displayColors.border === '#000000'
                                  ? '#111827'
                                  : displayColors.border,
                              boxShadow: `inset 0 4px 0 0 ${displayColors.accent}`,
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#111827] dark:text-white">
                              {tpl.name}
                            </p>
                            <p className="text-[11px] text-[#5B6472] dark:text-slate-400 line-clamp-2 mt-0.5">
                              {tpl.tagline}
                            </p>
                          </div>
                        </div>
                        {selected && <Check size={15} className="text-[#2563EB] shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
            </div>

            {/* Curated Color Palette Section (0 credits, instant WYSIWYG parity) */}
            <div
              data-drawer-palette-section="true"
              className="pt-4 border-t border-[#E5E7EB] dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#111827] dark:text-white">
                  Color Palette
                </p>
                <span className="text-[11px] font-medium text-[#5B6472] dark:text-slate-400">
                  {activeIsSlides ? activeSlideTpl.activePaletteName : activeDocTpl.activePaletteName}
                </span>
              </div>
              <PaletteSwatchRow
                palettes={activeIsSlides ? activeSlideTpl.palettes : activeDocTpl.palettes}
                activePaletteId={
                  activeIsSlides ? activeSlideTpl.activePaletteId : activeDocTpl.activePaletteId
                }
                onSelectPalette={(nextPaletteId) =>
                  onSwitchTemplateFree(
                    activeIsSlides ? activeSlideTpl.id : activeDocTpl.id,
                    nextPaletteId
                  )
                }
                size="md"
              />
              <p className="text-[11px] text-[#5B6472] dark:text-slate-400">
                Curated, contrast-checked presets for {activeIsSlides ? activeSlideTpl.name : activeDocTpl.name}. Updates preview and downloads immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop docked inspector */}
      <div className="hidden lg:block h-full shrink-0">{drawerContent}</div>

      {/* Tablet / Mobile slide-over drawer */}
      <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/35">
        <div className="flex-1" onClick={onClose} />
        <div className="w-[90vw] max-w-[360px] h-full shadow-2xl">{drawerContent}</div>
      </div>
    </>
  );
};

export default StudioInspectorDrawer;
