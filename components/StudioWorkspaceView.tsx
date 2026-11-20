import React, { useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FileText,
  Layers,
  LayoutTemplate,
  PanelLeft,
  Plus,
  Presentation,
  RefreshCw,
  RotateCcw,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import {
  AcademicDocument,
  DocumentTemplateId,
  SlideTemplateId,
  StudioCoverPageData,
  StudioFileFormat,
  StudioReference,
  StudioReviewSuggestion,
  StudioSection,
  StudioVersion,
  UserProfile,
} from '../types';
import {
  documentTemplateToVisualPalette,
  getDocumentTemplateForDoc,
  getSlideTemplateForDoc,
  slideTemplateToVisualPalette,
} from '../lib/studioTemplates';
import { resolveDocumentCoverPage, resolveSlideCoverPage } from '../lib/studioCover';
import { wordsToEstimatedPages } from '../lib/studioV2';
import { BILLING_ENABLED } from '../lib/plans';
import StudioVisualCard from './StudioVisualCard';
import { StudioTemplateModal } from './StudioTemplatePicker';
import StudioCoverEditor from './StudioCoverEditor';
import StudioSlideCanvasEditor from './StudioSlideCanvasEditor';
import {
  StudioDocumentPreview,
  StudioSlideDeckPreview,
  getSectionAnchorId,
} from './StudioPreviewCanvas';
import {
  StudioInspectorDrawer,
  StudioInspectorTab,
} from './StudioInspectorDrawer';

interface StudioWorkspaceViewProps {
  doc: AcademicDocument;
  profile: UserProfile;
  activeVariant: 'primary' | 'document' | 'slides';
  onChangeVariant: (v: 'primary' | 'document' | 'slides') => void;
  activeIsSlides: boolean;
  activeSections: StudioSection[];
  outlineCompletion: { completedCount: number; totalCount: number; percent: number };
  activeSectionId: string | null;
  onSelectSectionId: (id: string) => void;
  workspaceMode: 'preview' | 'edit';
  onChangeWorkspaceMode: (mode: 'preview' | 'edit') => void;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
  rightDrawerTab: StudioInspectorTab | null;
  onChangeRightDrawerTab: (tab: StudioInspectorTab | null) => void;
  showExportMenu: boolean;
  onToggleExportMenu: (open: boolean) => void;
  showTemplateSwitchModal: boolean;
  onToggleTemplateSwitchModal: (open: boolean) => void;
  editorText: string;
  onEditorChangeWithHistory: (val: string) => void;
  onSlideMetaChange: (patch: { title?: string; speakerNotes?: string; kicker?: string; takeaway?: string }) => void;
  onCoverPageChange: (patch: Partial<StudioCoverPageData>) => void;
  onSectionTitleChange: (sectionId: string, title: string) => void;
  onAddSection: () => void;
  onDuplicateSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, dir: -1 | 1) => void;
  onDeleteSection: (sectionId: string) => void;
  onUpdateReference: (refId: string, patch: Partial<StudioReference>) => void;
  onDeleteReference: (refId: string) => void;
  selectedTextSnippet: string;
  onSelectTextSnippet: (snippet: string, range: { start: number; end: number } | null) => void;
  historyIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
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
  onBackToDocuments: () => void;
  onGenerateActiveSection: () => void;
  onBatchGenerateAll: () => void;
  onContextualAssist: (instruction: string) => void;
  onRunDocumentReview: () => void;
  onOpenAddRefModal: () => void;
  onInsertCitation: (ref: StudioReference) => void;
  onRemoveSectionVisual: (sectionId: string, visualId: string) => void;
  onSaveVersionSnapshot: () => void;
  onRestoreVersion: (v: StudioVersion) => void;
  onRequireVersionsUpgrade: () => void;
  onSwitchTemplateFree: (id: DocumentTemplateId | SlideTemplateId, paletteId?: string) => void;
  onDownloadFormat: (fmt: StudioFileFormat) => void;
  onConvertFormat: (target: 'convert_to_slides' | 'convert_to_document') => void;
}

export const StudioWorkspaceView: React.FC<StudioWorkspaceViewProps> = ({
  doc,
  profile,
  activeVariant,
  onChangeVariant,
  activeIsSlides,
  activeSections,
  outlineCompletion,
  activeSectionId,
  onSelectSectionId,
  workspaceMode,
  onChangeWorkspaceMode,
  isOutlineOpen,
  onToggleOutline,
  rightDrawerTab,
  onChangeRightDrawerTab,
  showExportMenu,
  onToggleExportMenu,
  showTemplateSwitchModal,
  onToggleTemplateSwitchModal,
  editorText,
  onEditorChangeWithHistory,
  onSlideMetaChange,
  onCoverPageChange,
  onSectionTitleChange,
  onAddSection,
  onDuplicateSection,
  onMoveSection,
  onDeleteSection,
  onUpdateReference,
  onDeleteReference,
  selectedTextSnippet,
  onSelectTextSnippet,
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  isSectionGenerating,
  batchProgress,
  isAssistLoading,
  isReviewLoading,
  reviewResult,
  versions,
  isVersionSaving,
  isVersionsAllowed,
  onBackToDocuments,
  onGenerateActiveSection,
  onBatchGenerateAll,
  onContextualAssist,
  onRunDocumentReview,
  onOpenAddRefModal,
  onInsertCitation,
  onRemoveSectionVisual,
  onSaveVersionSnapshot,
  onRestoreVersion,
  onRequireVersionsUpgrade,
  onSwitchTemplateFree,
  onDownloadFormat,
  onConvertFormat,
}) => {
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        onToggleExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showExportMenu, onToggleExportMenu]);

  const docTemplate = getDocumentTemplateForDoc(doc);
  const slideTemplate = getSlideTemplateForDoc(doc);
  const docCover = resolveDocumentCoverPage(doc);
  const slideCover = resolveSlideCoverPage(doc);
  const activeVisualPalette = activeIsSlides
    ? slideTemplateToVisualPalette(slideTemplate)
    : documentTemplateToVisualPalette(docTemplate);

  const isCoverSelected = activeSectionId === '__cover_page__';
  const isReferencesSelected = activeSectionId === '__references__';

  const sourceCount = doc.references.length;
  const hasSlidesVariant = Boolean(doc.convertedVariants?.slides);
  const hasDocVariant = Boolean(doc.convertedVariants?.document);
  const hasBothFormats = hasSlidesVariant || hasDocVariant;
  const totalWords = activeSections.reduce((sum, s) => sum + (s.wordCount || 0), 0) || doc.currentWordCount || 0;
  const hasDraftedContent = activeSections.some((s) => Boolean(s.content && s.content.trim().length > 0));

  const currentSection = activeSections.find((s) => s.id === activeSectionId) || activeSections[0] || null;
  const currentSectionIndex = currentSection
    ? activeSections.findIndex((s) => s.id === currentSection.id)
    : 0;

  // Resolve speaker notes for active slide in Edit mode
  const slideBlocks =
    activeVariant === 'slides' && doc.convertedVariants?.slides?.contentBlocks
      ? doc.convertedVariants.slides.contentBlocks
      : doc.contentBlocks || [];
  const activeSlideBlock = currentSection
    ? slideBlocks.find((b) => b.type === 'slide' && b.sectionId === currentSection.id)
    : undefined;
  const activeSlideNotes =
    activeSlideBlock && activeSlideBlock.type === 'slide'
      ? activeSlideBlock.speakerNotes || ''
      : '';

  const toggleDrawerTab = (tab: StudioInspectorTab) => {
    onChangeRightDrawerTab(rightDrawerTab === tab ? null : tab);
  };

  const handleOutlineClick = (secId: string) => {
    onSelectSectionId(secId);
    if (workspaceMode === 'preview' && !activeIsSlides) {
      const targetEl =
        secId === '__cover_page__'
          ? document.getElementById('studio-preview-cover')
          : secId === '__references__'
          ? document.getElementById('studio-preview-references')
          : document.getElementById(getSectionAnchorId(secId));
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onToggleOutline();
    }
  };

  const outlineListContent = (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      <div className="px-4 py-3.5 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
            {activeIsSlides ? 'Slides' : 'Outline'}
          </p>
          <p className="text-xs font-semibold text-[#111827] dark:text-white mt-0.5 tabular-nums">
            {outlineCompletion.completedCount}/{outlineCompletion.totalCount} ready · {outlineCompletion.percent}%
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleOutline}
          aria-label="Close outline"
          className="lg:hidden p-1.5 rounded-lg text-[#5B6472] hover:text-[#111827] hover:bg-slate-100 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1" aria-label="Document outline">
        {/* First-class Cover Page / Slide 1 entry */}
        <button
          type="button"
          data-outline-item="__cover_page__"
          onClick={() => handleOutlineClick('__cover_page__')}
          className={`w-full text-left py-2.5 px-3 rounded-lg transition-colors cursor-pointer flex items-start gap-2.5 ${
            isCoverSelected
              ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 font-semibold'
              : 'text-[#111827] dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-[#2563EB]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-snug truncate">
              {activeIsSlides ? '01. Cover Slide' : 'Cover Page'}
            </p>
            <p className="text-[11px] text-[#5B6472] dark:text-slate-400 mt-0.5 truncate">
              {activeIsSlides
                ? slideCover.title || 'Title & Presenter'
                : docCover.includeCoverPage
                ? 'Page 1 · Title & Metadata'
                : 'Hidden on export'}
            </p>
          </div>
        </button>

        {activeSections.map((sec, idx) => {
          const isActive = !isCoverSelected && !isReferencesSelected && sec.id === currentSection?.id;
          const hasText = Boolean(sec.content && sec.content.trim().length > 0);
          return (
            <button
              key={sec.id}
              type="button"
              data-outline-item={sec.id}
              onClick={() => handleOutlineClick(sec.id)}
              className={`w-full text-left py-2.5 px-3 rounded-lg transition-colors cursor-pointer flex items-start gap-2.5 ${
                isActive
                  ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 font-semibold'
                  : 'text-[#111827] dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  hasText ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug line-clamp-2">
                  {activeIsSlides ? `${String(idx + 2).padStart(2, '0')}. ${sec.title}` : sec.title}
                </p>
                <p className="text-[11px] text-[#5B6472] dark:text-slate-400 mt-0.5 tabular-nums">
                  {sec.wordCount || 0} words
                </p>
              </div>
            </button>
          );
        })}

        {/* First-class References / Bibliography entry at the end */}
        <button
          type="button"
          data-outline-item="__references__"
          onClick={() => handleOutlineClick('__references__')}
          className={`w-full text-left py-2.5 px-3 rounded-lg transition-colors cursor-pointer flex items-start gap-2.5 ${
            isReferencesSelected
              ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 font-semibold'
              : 'text-[#111827] dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-snug truncate">
              {activeIsSlides ? `${String(activeSections.length + 2).padStart(2, '0')}. References` : 'References'}
            </p>
            <p className="text-[11px] text-[#5B6472] dark:text-slate-400 mt-0.5 tabular-nums">
              {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
            </p>
          </div>
        </button>

        {/* Quick + Add Section / + Add Slide button in Edit mode */}
        <div className="pt-2 px-1">
          <button
            type="button"
            onClick={() => {
              onAddSection();
              if (workspaceMode !== 'edit') onChangeWorkspaceMode('edit');
            }}
            data-outline-add-btn="true"
            className="w-full py-2 px-3 rounded-lg border border-dashed border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-xs font-medium text-[#5B6472] hover:text-[#2563EB] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus size={13} />
            <span>{activeIsSlides ? 'Add Slide' : 'Add Section'}</span>
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <div
      className="h-[calc(100vh-3.5rem)] md:h-screen w-full flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-slate-950"
      data-studio-view="editor"
      data-workspace-mode={workspaceMode}
    >
      {/* SINGLE SLIM STICKY TOP BAR */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-30">
        {/* Left: Outline toggle + Back + Title + Muted Meta */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleOutline}
            aria-label={isOutlineOpen ? 'Hide outline rail' : 'Show outline rail'}
            title={isOutlineOpen ? 'Hide outline' : 'Show outline'}
            className={`p-2 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer shrink-0 ${
              isOutlineOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-white'
                : 'text-[#5B6472] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <PanelLeft size={16} />
          </button>

          <button
            type="button"
            onClick={onBackToDocuments}
            aria-label="Back to Documents"
            title="Back to Documents"
            className="p-2 rounded-lg text-[#5B6472] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0 flex-1">
            <h1
              className="text-xs sm:text-sm font-semibold text-[#111827] dark:text-white truncate"
              title={doc.title}
            >
              {doc.title}
            </h1>
            <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#5B6472] dark:text-slate-400">
              <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
              <span>Saved</span>
              <span>·</span>
              <span className="tabular-nums">
                {activeIsSlides
                  ? `${activeSections.length + 1} slides`
                  : `~${wordsToEstimatedPages(totalWords)} ${wordsToEstimatedPages(totalWords) === 1 ? 'page' : 'pages'}`}
              </span>
            </p>
          </div>
        </div>

        {/* Center: Segmented Preview | Edit Toggle + Subtle Document | Slides Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center p-0.5 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg"
            role="tablist"
            aria-label="Workspace mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={workspaceMode === 'preview'}
              data-workspace-mode-btn="preview"
              onClick={() => onChangeWorkspaceMode('preview')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[34px] cursor-pointer ${
                workspaceMode === 'preview'
                  ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827] font-semibold'
                  : 'text-[#5B6472] hover:text-[#111827] dark:text-slate-300'
              }`}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceMode === 'edit'}
              data-workspace-mode-btn="edit"
              onClick={() => onChangeWorkspaceMode('edit')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[34px] cursor-pointer ${
                workspaceMode === 'edit'
                  ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827] font-semibold'
                  : 'text-[#5B6472] hover:text-[#111827] dark:text-slate-300'
              }`}
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          </div>

          {hasBothFormats && (
            <div
              className="hidden md:inline-flex items-center p-0.5 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg"
              aria-label="Format view"
            >
              <button
                type="button"
                data-format-variant-btn="document"
                onClick={() => onChangeVariant(hasDocVariant ? 'document' : 'primary')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium min-h-[34px] cursor-pointer ${
                  !activeIsSlides
                    ? 'bg-white dark:bg-slate-900 text-[#111827] dark:text-white shadow-2xs font-semibold'
                    : 'text-[#5B6472] hover:text-[#111827] dark:text-slate-400'
                }`}
              >
                <FileText size={12} />
                <span>Document</span>
              </button>
              <button
                type="button"
                data-format-variant-btn="slides"
                onClick={() => onChangeVariant(hasSlidesVariant ? 'slides' : 'primary')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium min-h-[34px] cursor-pointer ${
                  activeIsSlides
                    ? 'bg-white dark:bg-slate-900 text-[#111827] dark:text-white shadow-2xs font-semibold'
                    : 'text-[#5B6472] hover:text-[#111827] dark:text-slate-400'
                }`}
              >
                <Presentation size={12} />
                <span>Slides</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Minimal Sources (N), AI Tools, Template, Single Export Dropdown */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            data-inspector-trigger="sources"
            onClick={() => toggleDrawerTab('sources')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium min-h-[38px] cursor-pointer transition-colors ${
              rightDrawerTab === 'sources'
                ? 'border-[#111827] bg-[#111827] text-white dark:border-white dark:bg-white dark:text-[#111827]'
                : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-200 hover:border-[#2563EB]'
            }`}
            title="Sources & citations"
          >
            <BookOpen size={14} />
            <span className="hidden md:inline">Sources ({sourceCount})</span>
            <span className="md:hidden tabular-nums">{sourceCount}</span>
          </button>

          <button
            type="button"
            data-inspector-trigger="ai"
            onClick={() => toggleDrawerTab('ai')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium min-h-[38px] cursor-pointer transition-colors ${
              rightDrawerTab === 'ai'
                ? 'border-[#111827] bg-[#111827] text-white dark:border-white dark:bg-white dark:text-[#111827]'
                : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-200 hover:border-[#2563EB]'
            }`}
            title="AI writing & review tools"
          >
            <Sliders size={14} />
            <span className="hidden lg:inline">AI Tools</span>
          </button>

          <button
            type="button"
            data-template-free-switch="true"
            data-inspector-trigger="template"
            onClick={() => toggleDrawerTab('template')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium min-h-[38px] cursor-pointer transition-colors ${
              rightDrawerTab === 'template'
                ? 'border-[#111827] bg-[#111827] text-white dark:border-white dark:bg-white dark:text-[#111827]'
                : 'border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-200 hover:border-[#2563EB]'
            }`}
            title="Switch visual template (0 credits)"
          >
            <LayoutTemplate size={14} className={rightDrawerTab === 'template' ? '' : 'text-[#2563EB]'} />
            <span className="hidden xl:inline">Template</span>
          </button>

          {/* Primary Blue Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              data-export-menu-trigger="true"
              onClick={() => onToggleExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-xs font-semibold min-h-[38px] cursor-pointer transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown size={13} />
            </button>

            {showExportMenu && (
              <div
                data-export-menu="true"
                className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg shadow-lg py-1.5 z-50 text-xs"
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5B6472]">
                  Download File
                </div>

                {!activeIsSlides && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleExportMenu(false);
                      onDownloadFormat('docx');
                    }}
                    className="w-full px-3 py-2 text-left text-[#111827] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">Word Document (.docx)</span>
                    <span className="text-[10px] font-mono text-[#5B6472]">A4</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onToggleExportMenu(false);
                    onDownloadFormat('pdf');
                  }}
                  className="w-full px-3 py-2 text-left text-[#111827] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">
                    {activeIsSlides ? 'Slide Deck PDF (.pdf)' : 'PDF Document (.pdf)'}
                  </span>
                  <span className="text-[10px] font-mono text-[#5B6472]">
                    {activeIsSlides ? '16:9' : 'A4'}
                  </span>
                </button>

                {activeIsSlides && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleExportMenu(false);
                      onDownloadFormat('pptx');
                    }}
                    className="w-full px-3 py-2 text-left text-[#111827] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">PowerPoint Deck (.pptx)</span>
                    <span className="text-[10px] font-mono text-[#5B6472]">16:9</span>
                  </button>
                )}

                <div className="my-1.5 border-t border-[#E5E7EB] dark:border-slate-800" />
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5B6472]">
                  Format Conversion
                </div>

                {!activeIsSlides ? (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleExportMenu(false);
                      if (hasSlidesVariant) {
                        onChangeVariant('slides');
                      } else {
                        onConvertFormat('convert_to_slides');
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-[#2563EB] hover:bg-blue-50/70 dark:hover:bg-blue-950/40 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Presentation size={13} />
                    <span>{hasSlidesVariant ? 'View Slides (.pptx)' : 'Convert to Slides (.pptx)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleExportMenu(false);
                      if (hasDocVariant) {
                        onChangeVariant('document');
                      } else {
                        onConvertFormat('convert_to_document');
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-[#2563EB] hover:bg-blue-50/70 dark:hover:bg-blue-950/40 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>{hasDocVariant ? 'View Document (.docx)' : 'Convert to Document (.docx)'}</span>
                  </button>
                )}

                <div className="my-1.5 border-t border-[#E5E7EB] dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    onToggleExportMenu(false);
                    onToggleTemplateSwitchModal(true);
                  }}
                  className="w-full px-3 py-2 text-left text-[#111827] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Change Template</span>
                  <span className="text-[10px] text-[#2563EB] font-semibold">Free</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Batch Generation Progress Bar (only when batch drafting is active) */}
      {batchProgress && (
        <div className="px-4 py-2.5 bg-[#EFF6FF] dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs font-medium text-[#1746A2] dark:text-blue-200 truncate">
              Drafting Section {batchProgress.current} of {batchProgress.total}: {batchProgress.title}
            </p>
          </div>
          <span className="text-xs font-semibold text-[#2563EB] shrink-0 tabular-nums">
            {Math.round((batchProgress.current / batchProgress.total) * 100)}%
          </span>
        </div>
      )}

      {/* MAIN FOCUS WORKSPACE BODY (Single clean scrolling zones, zero nested scrollboxes) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* COLLAPSIBLE LEFT OUTLINE RAIL (Desktop Docked) */}
        {isOutlineOpen && (
          <div className="hidden lg:block w-64 border-r border-[#E5E7EB] dark:border-slate-800 shrink-0 h-full overflow-hidden">
            {outlineListContent}
          </div>
        )}

        {/* COLLAPSIBLE LEFT OUTLINE RAIL (Tablet / Mobile Slide-over Drawer) */}
        {isOutlineOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex bg-black/35">
            <div className="w-[82vw] max-w-[300px] h-full shadow-2xl overflow-hidden">
              {outlineListContent}
            </div>
            <div className="flex-1" onClick={onToggleOutline} />
          </div>
        )}

        {/* CENTER CANVAS (70-80% width, generous whitespace, single clean scroll) */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 px-3 sm:px-6 lg:px-10">
          {/* Mobile Document | Slides switch when both exist */}
          {hasBothFormats && (
            <div className="md:hidden pt-3 flex justify-center">
              <div className="inline-flex items-center p-0.5 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => onChangeVariant(hasDocVariant ? 'document' : 'primary')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    !activeIsSlides ? 'bg-[#111827] text-white' : 'text-[#5B6472]'
                  }`}
                >
                  Document
                </button>
                <button
                  type="button"
                  onClick={() => onChangeVariant(hasSlidesVariant ? 'slides' : 'primary')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    activeIsSlides ? 'bg-[#111827] text-white' : 'text-[#5B6472]'
                  }`}
                >
                  Slides
                </button>
              </div>
            </div>
          )}

          {workspaceMode === 'preview' ? (
            activeIsSlides ? (
              <StudioSlideDeckPreview
                doc={doc}
                sections={activeSections}
                template={slideTemplate}
                activeSectionId={currentSection?.id || null}
                onSelectSectionId={onSelectSectionId}
                onEditCurrentSlide={(secId) => {
                  onSelectSectionId(secId);
                  onChangeWorkspaceMode('edit');
                }}
              />
            ) : (
              <StudioDocumentPreview
                doc={doc}
                sections={activeSections}
                template={docTemplate}
                onSelectSectionForEdit={(secId) => {
                  onSelectSectionId(secId);
                  onChangeWorkspaceMode('edit');
                }}
              />
            )
          ) : (
            /* DISTRACTION-FREE EDIT MODE */
            <div
              className={`w-full ${activeIsSlides ? 'max-w-[920px]' : 'max-w-[780px]'} mx-auto my-6 sm:my-8 space-y-4`}
              data-edit-mode={activeIsSlides ? 'slides' : 'document'}
              data-active-template-id={activeIsSlides ? slideTemplate.id : docTemplate.id}
              data-active-palette-id={
                activeIsSlides ? slideTemplate.activePaletteId : docTemplate.activePaletteId
              }
            >
              {/* Compact Top-of-Canvas Editing Bar */}
              <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onUndo}
                    disabled={historyIndex <= 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#5B6472] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 min-h-[36px] cursor-pointer"
                    title="Undo"
                  >
                    <RotateCcw size={13} />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRedo}
                    disabled={historyIndex >= historyLength - 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#5B6472] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 min-h-[36px] cursor-pointer"
                    title="Redo"
                  >
                    <span>Redo</span>
                  </button>
                </div>

                {!isCoverSelected && !isReferencesSelected && (
                  <div className="flex items-center gap-1.5">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E5E7EB] dark:border-slate-700 hover:border-[#2563EB] text-xs font-medium text-[#111827] dark:text-slate-200 disabled:opacity-40 min-h-[36px] cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>
                        {isAssistLoading
                          ? 'Rewriting...'
                          : BILLING_ENABLED
                          ? 'Rewrite (1)'
                          : 'Rewrite'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={onGenerateActiveSection}
                      disabled={isSectionGenerating || !!batchProgress}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1746A2] text-white text-xs font-semibold disabled:opacity-50 min-h-[36px] cursor-pointer"
                    >
                      <Edit3 size={12} />
                      <span>
                        {isSectionGenerating
                          ? 'Drafting...'
                          : BILLING_ENABLED
                          ? 'Write Section (3)'
                          : 'Write Section'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* 1. COVER PAGE / SLIDE 1 EDITOR */}
              {isCoverSelected ? (
                activeIsSlides ? (
                  <StudioSlideCanvasEditor
                    mode="cover"
                    template={slideTemplate}
                    cover={slideCover}
                    slideIndex={0}
                    totalSlides={activeSections.length}
                    bulletsText=""
                    speakerNotes={slideCover.speakerNotes}
                    onChangeCover={onCoverPageChange}
                    onChangeSlideTitle={() => {}}
                    onChangeSlideMeta={() => {}}
                    onChangeBulletsText={() => {}}
                    onAddSlide={onAddSection}
                    onDuplicateSlide={() => {}}
                    onMoveSlide={() => {}}
                    onDeleteSlide={() => {}}
                  />
                ) : (
                  <StudioCoverEditor
                    cover={docCover}
                    template={docTemplate}
                    onChange={onCoverPageChange}
                  />
                )
              ) : isReferencesSelected ? (
                /* 2. INLINE REFERENCES / BIBLIOGRAPHY EDITOR */
                <div
                  className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-5 sm:p-8 space-y-5 shadow-2xs"
                  data-references-editor="true"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
                        {activeIsSlides ? 'References Slide' : 'References / Bibliography'}
                      </span>
                      <h2 className="text-lg font-bold text-[#111827] dark:text-white mt-0.5">
                        Edit Sources ({doc.references.length})
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAddRefModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1746A2] text-white text-xs font-semibold min-h-[36px] cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Reference</span>
                    </button>
                  </div>

                  {doc.references.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <p className="text-sm font-medium text-[#111827] dark:text-white">
                        No references added yet
                      </p>
                      <p className="text-xs text-[#5B6472]">
                        Click "Add Reference" to add a citation. It syncs automatically with your Sources drawer and exports.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {doc.references.map((ref, idx) => (
                        <div
                          key={ref.id}
                          className="p-4 rounded-lg border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950/60 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-semibold text-[#5B6472]">
                              [{idx + 1}]
                            </span>
                            <button
                              type="button"
                              onClick={() => onDeleteReference(ref.id)}
                              aria-label={`Remove reference ${idx + 1}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#5B6472] hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={ref.authors}
                              onChange={(e) => onUpdateReference(ref.id, { authors: e.target.value })}
                              placeholder="Authors (e.g., Smith, J.)"
                              className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-md text-[#111827] dark:text-white outline-none focus:border-[#2563EB]"
                            />
                            <input
                              type="text"
                              value={ref.year || ''}
                              onChange={(e) => onUpdateReference(ref.id, { year: e.target.value })}
                              placeholder="Year (e.g., 2024)"
                              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-md text-[#111827] dark:text-white outline-none focus:border-[#2563EB]"
                            />
                          </div>
                          <input
                            type="text"
                            value={ref.title}
                            onChange={(e) => onUpdateReference(ref.id, { title: e.target.value })}
                            placeholder="Publication / Book / Article Title"
                            className="w-full px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-md text-[#111827] dark:text-white outline-none focus:border-[#2563EB]"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={ref.journal || ''}
                              onChange={(e) => onUpdateReference(ref.id, { journal: e.target.value })}
                              placeholder="Journal / Publisher (optional)"
                              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-md text-[#111827] dark:text-white outline-none focus:border-[#2563EB]"
                            />
                            <input
                              type="text"
                              value={ref.doi || ref.url || ''}
                              onChange={(e) =>
                                onUpdateReference(
                                  ref.id,
                                  e.target.value.startsWith('http')
                                    ? { url: e.target.value }
                                    : { doi: e.target.value }
                                )
                              }
                              placeholder="DOI or URL (optional)"
                              className="px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 rounded-md text-[#111827] dark:text-white outline-none focus:border-[#2563EB]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeIsSlides ? (
                /* 3. INTERACTIVE 16:9 SLIDE CANVAS EDITOR */
                <StudioSlideCanvasEditor
                  mode="slide"
                  template={slideTemplate}
                  cover={slideCover}
                  slideSection={currentSection}
                  slideIndex={currentSectionIndex}
                  totalSlides={activeSections.length}
                  bulletsText={editorText}
                  speakerNotes={activeSlideNotes}
                  onChangeCover={onCoverPageChange}
                  onChangeSlideTitle={(title) => onSlideMetaChange({ title })}
                  onChangeSlideMeta={(patch) => onSlideMetaChange(patch)}
                  onChangeBulletsText={onEditorChangeWithHistory}
                  onAddSlide={onAddSection}
                  onDuplicateSlide={() => currentSection && onDuplicateSection(currentSection.id)}
                  onMoveSlide={(dir) => currentSection && onMoveSection(currentSection.id, dir)}
                  onDeleteSlide={() => currentSection && onDeleteSection(currentSection.id)}
                />
              ) : (
                /* 4. DISTRACTION-FREE DOCUMENT SECTION EDITOR */
                <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-5 sm:p-9 space-y-5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
                      Section {currentSectionIndex + 1} of {activeSections.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#5B6472] tabular-nums mr-1">
                        {editorText.trim().split(/\s+/).filter(Boolean).length} words · Autosaved
                      </span>
                      {currentSection && (
                        <>
                          <button
                            type="button"
                            onClick={() => onMoveSection(currentSection.id, -1)}
                            disabled={currentSectionIndex <= 0}
                            title="Move section up"
                            className="p-1.5 rounded border border-[#E5E7EB] dark:border-slate-700 text-[#5B6472] hover:border-[#2563EB] disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveSection(currentSection.id, 1)}
                            disabled={currentSectionIndex >= activeSections.length - 1}
                            title="Move section down"
                            className="p-1.5 rounded border border-[#E5E7EB] dark:border-slate-700 text-[#5B6472] hover:border-[#2563EB] disabled:opacity-35 cursor-pointer"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSection(currentSection.id)}
                            disabled={activeSections.length <= 1}
                            title="Delete section"
                            className="p-1.5 rounded border border-[#E5E7EB] dark:border-slate-700 text-[#5B6472] hover:text-red-600 hover:border-red-400 disabled:opacity-35 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      aria-label="Section Heading"
                      value={currentSection?.title || ''}
                      onChange={(e) => currentSection && onSectionTitleChange(currentSection.id, e.target.value)}
                      placeholder="Section heading..."
                      style={{ fontFamily: docTemplate.fonts.headingCss }}
                      className="w-full text-lg sm:text-xl font-bold text-[#111827] dark:text-white leading-snug bg-transparent border border-transparent hover:border-[#2563EB]/35 focus:border-dashed focus:border-[#2563EB] rounded px-1.5 py-1 outline-none"
                    />

                    {/* Empty-state helper copy ONLY when section has no text yet */}
                    {!editorText.trim() && (
                      <p className="text-xs text-[#5B6472]">
                        Draft the next paragraph yourself, or click Write Section above for a suggested draft.
                      </p>
                    )}

                    <div className="relative">
                      <textarea
                        value={editorText}
                        onChange={(e) => onEditorChangeWithHistory(e.target.value)}
                        onSelect={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          const sel = target.value.substring(target.selectionStart, target.selectionEnd);
                          if (sel && sel.trim().length > 3) {
                            onSelectTextSnippet(sel, {
                              start: target.selectionStart,
                              end: target.selectionEnd,
                            });
                          }
                        }}
                        rows={18}
                        placeholder="Start writing..."
                        style={{ fontFamily: docTemplate.fonts.bodyCss }}
                        className="w-full min-h-[460px] p-1 bg-transparent border-0 text-[15px] leading-[1.7] text-[#111827] dark:text-slate-100 outline-none resize-y"
                      />

                      {selectedTextSnippet && (
                        <div className="sticky bottom-3 bg-[#111827] text-white p-3 rounded-lg shadow-xl flex items-center justify-between gap-3 text-xs border border-slate-800">
                          <div className="truncate flex-1">
                            <span className="text-blue-400 font-semibold">Selected: </span>
                            <span className="italic truncate">"{selectedTextSnippet}"</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onContextualAssist('Elevate academic tone and vocabulary')}
                              className="px-2.5 py-1 bg-[#2563EB] hover:bg-blue-500 rounded text-xs font-semibold cursor-pointer"
                            >
                              {BILLING_ENABLED ? 'Rewrite — 1 credit' : 'Rewrite'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectTextSnippet('', null)}
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Visuals (if present) */}
                  {currentSection?.visuals && currentSection.visuals.length > 0 && (
                    <div className="pt-5 border-t border-[#E5E7EB] dark:border-slate-800 space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6472]">
                        Visual Figures ({currentSection.visuals.length})
                      </p>
                      {currentSection.visuals.map((vis) => (
                        <StudioVisualCard
                          key={vis.id}
                          block={vis}
                          designStyle={doc.metadata?.visualPreferences?.designStyle}
                          palette={activeVisualPalette}
                          onRemove={() => onRemoveSectionVisual(currentSection.id, vis.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLLAPSIBLE RIGHT INSPECTOR DRAWER (Closed by Default) */}
        <StudioInspectorDrawer
          activeTab={rightDrawerTab}
          onChangeTab={(tab) => onChangeRightDrawerTab(tab)}
          onClose={() => onChangeRightDrawerTab(null)}
          doc={doc}
          profile={profile}
          activeIsSlides={activeIsSlides}
          hasDraftedContent={hasDraftedContent}
          editorText={editorText}
          selectedTextSnippet={selectedTextSnippet}
          isSectionGenerating={isSectionGenerating}
          batchProgress={batchProgress}
          isAssistLoading={isAssistLoading}
          isReviewLoading={isReviewLoading}
          reviewResult={reviewResult}
          versions={versions}
          isVersionSaving={isVersionSaving}
          isVersionsAllowed={isVersionsAllowed}
          onGenerateActiveSection={onGenerateActiveSection}
          onBatchGenerateAll={onBatchGenerateAll}
          onContextualAssist={onContextualAssist}
          onRunDocumentReview={onRunDocumentReview}
          onOpenAddRefModal={onOpenAddRefModal}
          onInsertCitation={(ref) => {
            onInsertCitation(ref);
            if (workspaceMode !== 'edit') {
              onChangeWorkspaceMode('edit');
            }
          }}
          onSaveVersionSnapshot={onSaveVersionSnapshot}
          onRestoreVersion={onRestoreVersion}
          onRequireVersionsUpgrade={onRequireVersionsUpgrade}
          onSwitchTemplateFree={onSwitchTemplateFree}
          onOpenFullTemplateModal={() => onToggleTemplateSwitchModal(true)}
        />
      </div>

      {/* Full Visual Template Gallery Modal (0 credits) */}
      <StudioTemplateModal
        isOpen={showTemplateSwitchModal}
        mode={activeIsSlides ? 'slide' : 'document'}
        initialTemplateId={activeIsSlides ? slideTemplate.id : docTemplate.id}
        initialPaletteId={
          activeIsSlides ? slideTemplate.activePaletteId : docTemplate.activePaletteId
        }
        onClose={() => onToggleTemplateSwitchModal(false)}
        onConfirm={onSwitchTemplateFree}
        sample={{
          title: doc.title,
          courseCode: doc.metadata?.courseCode || doc.brief?.courseCode,
          courseTitle: doc.metadata?.courseTitle || doc.brief?.courseTitle,
          studentName: doc.metadata?.studentName || doc.brief?.studentName,
          institution: doc.metadata?.institution || doc.brief?.institution,
          date: doc.metadata?.submissionDate || doc.brief?.date,
        }}
        titleLabel={
          activeIsSlides
            ? 'Switch Slide Template (Free — 0 Credits)'
            : 'Switch Document Template (Free — 0 Credits)'
        }
      />
    </div>
  );
};

export default StudioWorkspaceView;
