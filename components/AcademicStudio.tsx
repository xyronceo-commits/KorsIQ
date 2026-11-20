import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Trash2,
  Search,
  Edit3 as Wand2,
  Check,
  X,
  ShieldAlert,
  Crown,
} from 'lucide-react';
import {
  AcademicDocument,
  AcademicDocumentType,
  CitationStyle,
  Course,
  DocumentTemplateId,
  SlideTemplateId,
  StudioBrief,
  StudioCoverPageData,
  StudioFileFormat,
  StudioJob,
  StudioOutlineItem,
  StudioSection,
  StudioReference,
  StudioReviewSuggestion,
  StudioVersion,
  StudioVisualBlock,
  StudioVisualPreferences,
  StudioWeeklyQuota,
  UserFile,
  UserProfile,
  hasStudioPrivileges,
  hasFullStudioPrivileges
} from '../types';
import { DBService } from '../services/db';
import { GeminiService } from '../services/gemini';
import { generateDocxBlob, downloadDocx } from '../utils/docxExport';
import { downloadPdf } from '../utils/pdfExport';
import { downloadPptx } from '../utils/pptxExport';
import { DEFAULT_VISUAL_PREFERENCES, hasAnyVisualElementEnabled } from '../utils/visualRenderer';
import { BILLING_ENABLED, can } from '../lib/plans';
import {
  canMountStudioEditor,
  computeDocumentCardProgress,
  computeOutlineCompletion,
  formatQuotaResetLabel,
  resolveTargetPagesForDoc,
  selectStudioHomeStatusBar,
  sortAcademicSections,
} from '../lib/studioV2';
import {
  documentTemplateToLegacyStyle,
  getDocumentTemplateForDoc,
  getSlideTemplateForDoc,
  isSlideDocument,
  resolveDocumentTemplate,
  resolveSlideTemplate,
} from '../lib/studioTemplates';
import SubscriptionCheckoutModal from './SubscriptionCheckoutModal';
import StudioVisualDesignPanel from './StudioVisualDesignPanel';
import StudioVisualCard from './StudioVisualCard';
import StudioBriefForm from './StudioBriefForm';
import StudioOutlineReview from './StudioOutlineReview';
import StudioJobProgress from './StudioJobProgress';
import { StudioInspectorTab } from './StudioInspectorDrawer';
import { StudioWorkspaceView } from './StudioWorkspaceView';
import { AILiveStatus } from './AILiveStatus';

interface AcademicStudioProps {
  userId: string;
  profile: UserProfile;
  courses?: Course[];
  addNotification?: (type: any, title: string, message: string, link?: any) => void;
  setProfile?: (p: UserProfile) => void;
  onNavigateTab?: (tab: string) => void;
  onFocusModeChange?: (focused: boolean) => void;
}

const DOCUMENT_TYPES: { id: AcademicDocumentType; label: string; desc: string; defaultWords: number }[] = [
  { id: 'assignment', label: 'Course Assignment', desc: 'Standard university coursework, problem set essays, or topical responses.', defaultWords: 1500 },
  { id: 'term_paper', label: 'Term Paper', desc: 'Comprehensive semester research paper integrating deep literature review.', defaultWords: 3500 },
  { id: 'essay', label: 'Academic Essay', desc: 'Argumentative, descriptive, or analytical thesis-driven essay.', defaultWords: 2000 },
  { id: 'research_proposal', label: 'Research Proposal', desc: 'Formal proposal outlining problem statement, methodology, and timeline.', defaultWords: 4000 },
  { id: 'thesis', label: 'Final Year Project / Thesis', desc: 'Multi-chapter dissertation (Chapters 1–5: Intro, Literature, Methodology, Findings, Conclusion).', defaultWords: 10000 },
  { id: 'literature_review', label: 'Literature Review', desc: 'Systematic or narrative synthesis of published peer-reviewed scholarship.', defaultWords: 4000 },
  { id: 'case_study', label: 'Case Study Analysis', desc: 'In-depth empirical investigation of an organizational or real-world scenario.', defaultWords: 2500 },
  { id: 'lab_report', label: 'Scientific Lab Report', desc: 'Empirical report with abstract, experimental setup, data, and discussion.', defaultWords: 2000 },
  { id: 'seminar_paper', label: 'Seminar Paper', desc: 'Conference or seminar paper prepared for scholarly presentation.', defaultWords: 3000 },
];

const CITATION_STYLES: { id: CitationStyle; label: string; desc: string }[] = [
  { id: 'APA', label: 'APA 7th Edition', desc: 'Author-Date standard (e.g. Smith, 2023) widely used in social sciences and sciences.' },
  { id: 'Harvard', label: 'Harvard Style', desc: 'Author-Date referencing common in business, humanities, and international institutions.' },
  { id: 'MLA', label: 'MLA 9th Edition', desc: 'Author-Page standard (e.g. Smith 45) preferred in literature, arts, and humanities.' },
  { id: 'IEEE', label: 'IEEE Style', desc: 'Numbered bracket citation [1] standard in engineering, computing, and technology.' },
];

export const AcademicStudio: React.FC<AcademicStudioProps> = ({
  userId,
  profile,
  courses = [],
  addNotification,
  setProfile,
  onNavigateTab,
  onFocusModeChange
}) => {
  // Subscription Entitlement Check
  const isPremium = can('academicStudio', profile?.tier) && (BILLING_ENABLED ? hasStudioPrivileges(profile) : true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'plus' | 'studio'>('studio');

  // Studio Document State
  const activeDocStorageKey = userId ? `scolaris_studio_active_doc_${userId}` : '';
  const [documents, setDocuments] = useState<AcademicDocument[]>([]);
  const [activeDocId, setActiveDocIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !userId) return null;
    try {
      return sessionStorage.getItem(`scolaris_studio_active_doc_${userId}`) || null;
    } catch {
      return null;
    }
  });
  const setActiveDocId = (id: string | null) => {
    setActiveDocIdState(id);
    if (typeof window !== 'undefined' && activeDocStorageKey) {
      try {
        if (id) sessionStorage.setItem(activeDocStorageKey, id);
        else sessionStorage.removeItem(activeDocStorageKey);
      } catch {
        // Non-blocking
      }
    }
  };
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Active Document Workspace State
  const activeDocument = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || null;
  }, [documents, activeDocId]);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [, setActiveRightTab] = useState<'assistant' | 'references' | 'review' | 'versions'>('assistant');

  // Creation Wizard State
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<AcademicDocumentType>('assignment');
  const [newDocSubject, setNewDocSubject] = useState('');
  const [newDocWords, setNewDocWords] = useState(1500);
  const [newDocCitation, setNewDocCitation] = useState<CitationStyle>('APA');
  const [newDocFormat, setNewDocFormat] = useState<'docx' | 'pdf' | 'pptx' | 'other'>('docx');
  const [newDocOtherFormat, setNewDocOtherFormat] = useState('');
  const [newDocVisualPrefs, setNewDocVisualPrefs] = useState<StudioVisualPreferences>(DEFAULT_VISUAL_PREFERENCES);
  const [showVisualPrefsModal, setShowVisualPrefsModal] = useState(false);
  const [newDocInstructions, setNewDocInstructions] = useState('');
  const [newDocDepartment, setNewDocDepartment] = useState(profile.department || '');
  const [newDocInstitution] = useState(profile.university || '');
  const [newDocLecturer, setNewDocLecturer] = useState('');
  const [newDocReferences, setNewDocReferences] = useState<StudioReference[]>([]);
  const [isPlanningLoading, setIsPlanningLoading] = useState(false);

  // Editor State
  const [editorText, setEditorText] = useState('');
  const [isSectionGenerating, setIsSectionGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [isAssistLoading, setIsAssistLoading] = useState(false);
  const [selectedTextSnippet, setSelectedTextSnippet] = useState('');
  const [editorSelectionRange, setEditorSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // Document Review State
  const [reviewResult, setReviewResult] = useState<{
    academicQualityScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: StudioReviewSuggestion[];
  } | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  // Studio v2 Brief -> Outline -> Background Job State
  const [v2View, setV2View] = useState<'list' | 'brief' | 'outline'>('list');
  const [v2Brief, setV2Brief] = useState<StudioBrief | null>(null);
  const [v2Outline, setV2Outline] = useState<StudioOutlineItem[]>([]);
  const [isDraftingV2Outline, setIsDraftingV2Outline] = useState(false);
  const [v2OutlineError, setV2OutlineError] = useState<string | null>(null);
  const [isStartingV2Job, setIsStartingV2Job] = useState(false);
  const [v2JobStartError, setV2JobStartError] = useState<string | null>(null);
  const [studioJobs, setStudioJobs] = useState<StudioJob[]>([]);
  const [weeklyQuota, setWeeklyQuota] = useState<StudioWeeklyQuota | null>(null);
  const [sessionCompletedJobIds, setSessionCompletedJobIds] = useState<string[]>([]);
  const [dismissedHomeJobIds, setDismissedHomeJobIds] = useState<string[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [activeVariant, setActiveVariant] = useState<'primary' | 'document' | 'slides'>('primary');
  const previousJobStatusRef = useRef<Record<string, string>>({});
  const tickInFlightRef = useRef(false);
  const draftOutlineInFlightRef = useRef(false);

  const hasActiveStudioJob = useMemo(
    () => studioJobs.some((j) => j.status === 'queued' || j.status === 'running'),
    [studioJobs]
  );

  const editorGate = useMemo(
    () => canMountStudioEditor(activeDocument, studioJobs, isLoadingJobs),
    [activeDocument, studioJobs, isLoadingJobs]
  );

  // Clean Focus Workspace UI State (Default to Preview on completion; Right Inspector Drawer CLOSED by default)
  const [workspaceMode, setWorkspaceMode] = useState<'preview' | 'edit'>('preview');
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [rightDrawerTab, setRightDrawerTab] = useState<StudioInspectorTab | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const isCompletedWorkspaceActive = Boolean(
    activeDocument && activeDocument.status !== 'planning' && editorGate.canMountEditor
  );

  // Auto-collapse main KorsIQ sidebar in App.tsx when viewing a completed document workspace
  useEffect(() => {
    onFocusModeChange?.(isCompletedWorkspaceActive);
    return () => {
      onFocusModeChange?.(false);
    };
  }, [isCompletedWorkspaceActive, onFocusModeChange]);

  // Default to Preview mode and closed inspector drawer when opening a document or when generation finishes
  useEffect(() => {
    if (activeDocId && isCompletedWorkspaceActive) {
      setWorkspaceMode('preview');
      setRightDrawerTab(null);
      setShowExportMenu(false);
    }
  }, [activeDocId, isCompletedWorkspaceActive]);

  // Resolve active format & canonical ordered sections for the selected variant (Document vs Slides)
  const activeIsSlides = useMemo(() => {
    if (!activeDocument) return false;
    if (activeVariant === 'slides') return true;
    if (activeVariant === 'document') return false;
    return isSlideDocument(activeDocument);
  }, [activeDocument, activeVariant]);

  const activeSections = useMemo(() => {
    if (!activeDocument) return [];
    if (activeVariant === 'slides' && activeDocument.convertedVariants?.slides?.sections) {
      return activeDocument.convertedVariants.slides.sections;
    }
    if (activeVariant === 'document' && activeDocument.convertedVariants?.document?.sections) {
      return sortAcademicSections(
        activeDocument.convertedVariants.document.sections,
        activeDocument.outline
      );
    }
    if (isSlideDocument(activeDocument)) {
      return activeDocument.sections || [];
    }
    return sortAcademicSections(activeDocument.sections || [], activeDocument.outline);
  }, [activeDocument, activeVariant]);

  const outlineCompletion = useMemo(
    () => computeOutlineCompletion(activeSections),
    [activeSections]
  );

  const applyServerDocPatch = (docRow: any) => {
    if (!docRow || !docRow.id) return;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docRow.id
          ? {
              ...d,
              status: docRow.status ?? d.status,
              sections: Array.isArray(docRow.sections) ? docRow.sections : d.sections,
              references: Array.isArray(docRow.references) ? docRow.references : d.references,
              contentBlocks: Array.isArray(docRow.content_blocks) ? docRow.content_blocks : d.contentBlocks,
              convertedVariants: docRow.converted_variants ?? d.convertedVariants,
              metadata: docRow.metadata ?? d.metadata,
              sourceCount: typeof docRow.source_count === 'number' ? docRow.source_count : d.sourceCount,
              currentWordCount: typeof docRow.current_word_count === 'number' ? docRow.current_word_count : d.currentWordCount,
            }
          : d
      )
    );
  };

  // Load jobs, user files, and reliably drive any queued/stalled active job step-by-step
  const refreshStudioV2Jobs = async () => {
    try {
      const res = await GeminiService.getStudioV2Jobs();
      let jobs: StudioJob[] = res.jobs || [];
      setStudioJobs(jobs);
      if (res.weeklyQuota) {
        setWeeklyQuota(res.weeklyQuota);
      }
      setIsLoadingJobs(false);

      // Drive active job via /tick so steps advance reliably even if serverless loopback HTTP fails
      const activeJob = jobs.find((j) => j.status === 'queued' || j.status === 'running');
      if (activeJob && !tickInFlightRef.current) {
        tickInFlightRef.current = true;
        try {
          const tick = await GeminiService.tickStudioV2Job(activeJob.id).catch(() => null);
          if (tick?.job) {
            jobs = jobs.map((j) => (j.id === tick.job.id ? tick.job : j));
            setStudioJobs(jobs);
          }
          if (tick?.document) {
            applyServerDocPatch(tick.document);
          }
        } finally {
          tickInFlightRef.current = false;
        }
      }

      let anyTransitioned = false;
      for (const j of jobs) {
        const prev = previousJobStatusRef.current[j.id];
        if (prev && (prev === 'queued' || prev === 'running') && prev !== j.status) {
          anyTransitioned = true;
          if (j.status === 'completed' || j.status === 'completed_with_issues') {
            setSessionCompletedJobIds((curr) => (curr.includes(j.id) ? curr : [j.id, ...curr]));
            addNotification?.('content', 'Document ready', 'Your Academic Studio document finished generating.', 'studio');
            showToast('Your document is ready to preview and download.');
          } else if (j.status === 'failed') {
            addNotification?.('content', 'Generation failed', j.error || 'Background generation failed.', 'studio');
            showToast('Document generation failed. You can retry without losing saved sections.');
          } else if (j.status === 'cancelled') {
            showToast('Generation cancelled. Saved progress preserved.');
          }
        }
        previousJobStatusRef.current[j.id] = j.status;
      }

      if (anyTransitioned && userId) {
        const docs = await DBService.getAcademicDocuments(userId, true);
        setDocuments(docs);
      }
    } catch {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    setIsLoadingJobs(true);
    GeminiService.reKickStudioV2Jobs().catch(() => {});
    refreshStudioV2Jobs();
    DBService.getUserFiles(userId).then(setUserFiles).catch(() => {});
  }, [userId]);

  // Poll active background jobs while any job is queued/running (stable boolean dependency)
  useEffect(() => {
    if (!hasActiveStudioJob || !userId) return;
    const timer = window.setInterval(() => {
      refreshStudioV2Jobs();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasActiveStudioJob, userId]);

  const handleV2DraftOutline = async (brief: StudioBrief) => {
    if (draftOutlineInFlightRef.current) return;
    draftOutlineInFlightRef.current = true;
    setIsDraftingV2Outline(true);
    setV2OutlineError(null);
    try {
      const res = await GeminiService.generateStudioV2Outline(brief);
      setV2Brief(brief);
      setV2Outline(res.outline || []);
      setV2View('outline');
    } catch (err: any) {
      const msg = err?.message || 'Could not draft outline right now. Please try again.';
      setV2OutlineError(msg);
      showToast(msg);
    } finally {
      draftOutlineInFlightRef.current = false;
      setIsDraftingV2Outline(false);
    }
  };

  const handleV2StartJob = async () => {
    if (!v2Brief || v2Outline.length === 0 || isStartingV2Job) return;
    if (weeklyQuota?.isBetaLimited && typeof weeklyQuota.remaining === 'number' && weeklyQuota.remaining <= 0) {
      const msg = `Weekly Free Beta limit reached (${weeklyQuota.limit}/week). ${formatQuotaResetLabel(weeklyQuota.resetAt)}.`;
      setV2JobStartError(msg);
      showToast(msg);
      return;
    }
    if (hasActiveStudioJob) {
      const msg = 'You already have a document generating. Wait for it to finish or cancel it first.';
      setV2JobStartError(msg);
      showToast(msg);
      return;
    }
    setIsStartingV2Job(true);
    setV2JobStartError(null);
    try {
      const res = await GeminiService.createStudioV2Job({ brief: v2Brief, outline: v2Outline });
      setV2View('list');
      setV2Brief(null);
      setV2Outline([]);
      if (res.weeklyQuota) {
        setWeeklyQuota(res.weeklyQuota);
      }
      if (res.job) {
        previousJobStatusRef.current[res.job.id] = res.job.status;
        setStudioJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      }
      const docs = await DBService.getAcademicDocuments(userId, true);
      setDocuments(docs);
      if (res.documentId) {
        setActiveVariant('primary');
        setActiveDocId(res.documentId);
      }
      showToast('Generation started.');
      window.setTimeout(() => {
        refreshStudioV2Jobs();
      }, 250);
    } catch (err: any) {
      if (err?.code === 'STUDIO_WEEKLY_LIMIT_REACHED') {
        setWeeklyQuota({
          isBetaLimited: true,
          limit: err.limit ?? 3,
          used: err.used ?? 3,
          remaining: 0,
          resetAt: err.resetAt ?? null,
        });
      }
      const msg = err?.message || 'Could not start generation.';
      setV2JobStartError(msg);
      showToast(msg);
    } finally {
      setIsStartingV2Job(false);
    }
  };

  const handleV2CancelJob = async (jobId: string) => {
    try {
      const res = await GeminiService.cancelStudioV2Job(jobId);
      if (res.job) {
        setStudioJobs((prev) => prev.map((j) => (j.id === jobId ? res.job : j)));
      }
      showToast('Cancelling at the next step...');
    } catch (err: any) {
      showToast(err?.message || 'Could not cancel job.');
    }
  };

  const handleV2ResumeJob = async (jobId: string) => {
    try {
      const res = await GeminiService.resumeStudioV2Job(jobId);
      if (res.job) {
        previousJobStatusRef.current[res.job.id] = res.job.status;
        setStudioJobs((prev) => prev.map((j) => (j.id === jobId ? res.job : j)));
      }
      showToast('Resuming generation...');
      window.setTimeout(() => {
        refreshStudioV2Jobs();
      }, 250);
    } catch (err: any) {
      showToast(err?.message || 'Could not resume job.');
    }
  };

  const handleV2Download = async (formatOverride?: StudioFileFormat) => {
    if (!activeDocument) return;
    const variant =
      activeVariant !== 'primary' ? activeDocument.convertedVariants?.[activeVariant] : undefined;
    const targetDoc: AcademicDocument = variant
      ? {
          ...activeDocument,
          fileFormat: variant.fileFormat,
          sections: variant.sections,
          contentBlocks: variant.contentBlocks,
        }
      : activeDocument;
    const fmt: StudioFileFormat =
      formatOverride || targetDoc.fileFormat || (targetDoc.metadata?.preferredFormat as StudioFileFormat) || 'docx';
    const safeTitle = (targetDoc.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      if (fmt === 'pdf') {
        downloadPdf(targetDoc, `${safeTitle}.pdf`);
      } else if (fmt === 'pptx') {
        await downloadPptx(targetDoc, `${safeTitle}.pptx`);
      } else {
        const blob = await generateDocxBlob(targetDoc);
        downloadDocx(blob, `${safeTitle}.docx`);
      }
      // Mark exported timestamp silently so document cards consistently display 100% completion
      const exportedDoc: AcademicDocument = {
        ...activeDocument,
        metadata: {
          ...(activeDocument.metadata || {}),
          lastExportedAt: new Date().toISOString(),
        },
      };
      void persistDocument(exportedDoc);
      showToast(`Downloaded ${safeTitle}.${fmt}`);
    } catch {
      showToast('Download failed. Please try again.');
    }
  };

  /**
   * Switch visual template and/or curated color palette post-generation with 0 AI calls and 0 credits.
   * Content stays decoupled from styling and re-exports immediately with the chosen template & palette.
   */
  const handleSwitchTemplateFree = async (
    chosenId: DocumentTemplateId | SlideTemplateId,
    chosenPaletteId?: string
  ) => {
    if (!activeDocument) return;
    const activeIsSlides =
      activeVariant === 'slides' ||
      (activeVariant === 'primary' && isSlideDocument(activeDocument));

    const prevTemplateId = activeIsSlides
      ? getSlideTemplateForDoc(activeDocument).id
      : getDocumentTemplateForDoc(activeDocument).id;

    const resolvedSlide = activeIsSlides
      ? resolveSlideTemplate(chosenId as SlideTemplateId, chosenPaletteId)
      : null;
    const resolvedDoc = !activeIsSlides
      ? resolveDocumentTemplate(chosenId as DocumentTemplateId, chosenPaletteId)
      : null;

    const effectivePaletteId = activeIsSlides
      ? resolvedSlide!.activePaletteId
      : resolvedDoc!.activePaletteId;

    const updatedMetadata = {
      ...(activeDocument.metadata || {}),
      ...(activeIsSlides
        ? {
            slideTemplateId: resolvedSlide!.id,
            slidePaletteId: effectivePaletteId,
          }
        : {
            documentTemplateId: resolvedDoc!.id,
            documentPaletteId: effectivePaletteId,
          }),
    };

    const updatedBrief = activeDocument.brief
      ? {
          ...activeDocument.brief,
          ...(activeIsSlides
            ? {
                slideTemplateId: resolvedSlide!.id,
                slidePaletteId: effectivePaletteId,
              }
            : {
                documentTemplateId: resolvedDoc!.id,
                documentPaletteId: effectivePaletteId,
                documentStyle: documentTemplateToLegacyStyle(resolvedDoc!.id),
              }),
        }
      : activeDocument.brief;

    const updatedDoc: AcademicDocument = {
      ...activeDocument,
      metadata: updatedMetadata,
      brief: updatedBrief,
    };

    await persistDocument(updatedDoc);
    if (activeIsSlides && resolvedSlide) {
      if (prevTemplateId === resolvedSlide.id) {
        showToast(`Palette switched to ${resolvedSlide.activePaletteName} (0 credits used).`);
      } else {
        showToast(
          `Template switched to ${resolvedSlide.name} · ${resolvedSlide.activePaletteName} (0 credits used).`
        );
      }
    } else if (resolvedDoc) {
      if (prevTemplateId === resolvedDoc.id) {
        showToast(`Palette switched to ${resolvedDoc.activePaletteName} (0 credits used).`);
      } else {
        showToast(
          `Template switched to ${resolvedDoc.name} · ${resolvedDoc.activePaletteName} (0 credits used).`
        );
      }
    }
  };

  const handleV2SwitchFormat = async (target: 'docx' | 'pdf' | 'convert_to_slides' | 'convert_to_document') => {
    if (!activeDocument) return;
    if (target === 'docx' || target === 'pdf') {
      // Instant, free, zero AI call — renders from the same stored content blocks
      const updated: AcademicDocument = {
        ...activeDocument,
        fileFormat: target,
        metadata: { ...activeDocument.metadata, preferredFormat: target },
      };
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setActiveVariant('primary');
      await DBService.saveAcademicDocument(updated);
      showToast(`Switched format to .${target} (instant, no AI call).`);
      return;
    }

    try {
      const res = await GeminiService.convertStudioV2Format(activeDocument.id, target);
      if (res.job) {
        previousJobStatusRef.current[res.job.id] = res.job.status;
        setStudioJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      }
      showToast('Converting format in the background. You will be notified when ready.');
    } catch (err: any) {
      showToast(err?.message || 'Could not start format conversion.');
    }
  };

  // Preview & Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTemplateSwitchModal, setShowTemplateSwitchModal] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [insufficientCreditsNotice, setInsufficientCreditsNotice] = useState<{
    required: number;
    balance: number;
    resetDate?: string;
  } | null>(null);

  // Quiet Upgrade & Editor History State
  const [showQuietUpgrade, setShowQuietUpgrade] = useState<{ feature: string; description: string } | null>(null);
  const [editorHistory, setEditorHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const isExportAllowed = can('studioExports', profile?.tier) && (BILLING_ENABLED ? hasFullStudioPrivileges(profile) : true);
  const isVersionsAllowed = can('fullAcademicStudio', profile?.tier) && (BILLING_ENABLED ? hasFullStudioPrivileges(profile) : true);

  const handleEditorChangeWithHistory = (newVal: string) => {
    handleEditorChange(newVal);
    setEditorHistory((prev) => {
      const updated = [...prev.slice(0, historyIndex + 1), newVal];
      if (updated.length > 25) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevVal = editorHistory[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      handleEditorChange(prevVal);
    }
  };

  const handleRedo = () => {
    if (historyIndex < editorHistory.length - 1) {
      const nextVal = editorHistory[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      handleEditorChange(nextVal);
    }
  };

  // Version History State
  const [versions, setVersions] = useState<StudioVersion[]>([]);
  const [isVersionSaving, setIsVersionSaving] = useState(false);
  const [versionNote, setVersionNote] = useState('');

  // Toast feedback helper
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // 1. Initial Load of Documents
  useEffect(() => {
    const loadDocs = async () => {
      setIsLoadingDocs(true);
      try {
        const list = await DBService.getAcademicDocuments(userId);
        setDocuments(list);
      } catch (err) {
        console.error('Failed to load academic documents:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    };
    loadDocs();
  }, [userId]);

  // Sync active section & editor text across activeVariant (Document vs Slides)
  useEffect(() => {
    if (!activeDocument || activeSections.length === 0) return;
    const isSentinelTarget =
      activeSectionId === '__cover_page__' || activeSectionId === '__references__';
    const stillExists =
      Boolean(activeSectionId) &&
      (isSentinelTarget || activeSections.some((s) => s.id === activeSectionId));
    if (!stillExists) {
      setActiveSectionId(activeSections[0].id);
    }
  }, [activeDocument, activeSections, activeSectionId]);

  useEffect(() => {
    if (!activeDocument || !activeSectionId) {
      setEditorText('');
      return;
    }
    const sec = activeSections.find((s) => s.id === activeSectionId);
    setEditorText(sec ? sec.content : '');
  }, [activeSectionId, activeDocument, activeSections]);

  // Load versions when document opens
  useEffect(() => {
    if (!activeDocId) return;
    const fetchVersions = async () => {
      const v = await DBService.getDocumentVersions(activeDocId, userId);
      setVersions(v);
    };
    fetchVersions();
  }, [activeDocId, userId]);

  // Helper: Save active document to DB & Cache
  const persistDocument = async (updated: AcademicDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    await DBService.saveAcademicDocument(updated);
  };

  // Helper: Auto-save current editor text (and optional visuals) to active variant's section
  const handleEditorChange = (newText: string, nextVisuals?: StudioVisualBlock[]) => {
    setEditorText(newText);
    if (!activeDocument || !activeSectionId) return;

    const words = newText.trim().split(/\s+/).filter(Boolean).length;
    const mapSection = (s: StudioSection): StudioSection =>
      s.id === activeSectionId
        ? {
            ...s,
            content: newText,
            ...(nextVisuals !== undefined ? { visuals: nextVisuals } : {}),
            wordCount: words,
            status: (words > 0 ? (s.status === 'empty' ? 'drafted' : s.status) : 'empty') as 'empty' | 'generating' | 'drafted' | 'approved',
            lastEditedAt: new Date().toISOString(),
          }
        : s;

    if (activeVariant !== 'primary' && activeDocument.convertedVariants?.[activeVariant]) {
      const targetVariant = activeDocument.convertedVariants[activeVariant]!;
      const updatedVariantSections = targetVariant.sections.map(mapSection);
      const updatedDoc: AcademicDocument = {
        ...activeDocument,
        convertedVariants: {
          ...activeDocument.convertedVariants,
          [activeVariant]: {
            ...targetVariant,
            sections: updatedVariantSections,
            updatedAt: new Date().toISOString(),
          },
        },
      };
      persistDocument(updatedDoc);
      return;
    }

    const updatedSections = activeDocument.sections.map(mapSection);
    const totalWords = updatedSections.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
    const updatedDoc: AcademicDocument = {
      ...activeDocument,
      sections: updatedSections,
      currentWordCount: totalWords,
      status: activeDocument.status === 'outline_approved' ? 'drafting' : activeDocument.status,
    };

    persistDocument(updatedDoc);
  };

  // Helper: Edit active slide title, kicker, takeaway, or speaker notes cleanly (0 credits)
  const handleSlideMetaChange = (patch: { title?: string; speakerNotes?: string; kicker?: string; takeaway?: string }) => {
    if (!activeDocument || !activeSectionId) return;
    const nowIso = new Date().toISOString();
    const mapSec = (s: StudioSection): StudioSection =>
      s.id === activeSectionId
        ? {
            ...s,
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.kicker !== undefined ? { kicker: patch.kicker } : {}),
            ...(patch.takeaway !== undefined ? { takeaway: patch.takeaway } : {}),
            lastEditedAt: nowIso,
          }
        : s;

    if (activeVariant === 'slides' && activeDocument.convertedVariants?.slides) {
      const variant = activeDocument.convertedVariants.slides;
      const nextSections = variant.sections.map(mapSec);
      let nextBlocks = variant.contentBlocks || [];
      if (patch.speakerNotes !== undefined || patch.title !== undefined) {
        const hasBlock = nextBlocks.some((b) => b.type === 'slide' && b.sectionId === activeSectionId);
        if (hasBlock) {
          nextBlocks = nextBlocks.map((b) =>
            b.type === 'slide' && b.sectionId === activeSectionId
              ? {
                  ...b,
                  ...(patch.title !== undefined ? { title: patch.title } : {}),
                  ...(patch.speakerNotes !== undefined ? { speakerNotes: patch.speakerNotes } : {}),
                }
              : b
          );
        } else {
          const curSec = nextSections.find((s) => s.id === activeSectionId);
          nextBlocks = [
            ...nextBlocks,
            {
              id: `blk_slide_${activeSectionId}`,
              sectionId: activeSectionId,
              type: 'slide',
              title: patch.title ?? curSec?.title ?? 'Slide',
              bullets: [],
              speakerNotes: patch.speakerNotes || '',
            },
          ];
        }
      }
      persistDocument({
        ...activeDocument,
        convertedVariants: {
          ...activeDocument.convertedVariants,
          slides: { ...variant, sections: nextSections, contentBlocks: nextBlocks, updatedAt: nowIso },
        },
      });
      return;
    }

    const nextSections = activeDocument.sections.map(mapSec);
    let nextBlocks = activeDocument.contentBlocks || [];
    if (patch.speakerNotes !== undefined || patch.title !== undefined) {
      const hasBlock = nextBlocks.some((b) => b.type === 'slide' && b.sectionId === activeSectionId);
      if (hasBlock) {
        nextBlocks = nextBlocks.map((b) =>
          b.type === 'slide' && b.sectionId === activeSectionId
            ? {
                ...b,
                ...(patch.title !== undefined ? { title: patch.title } : {}),
                ...(patch.speakerNotes !== undefined ? { speakerNotes: patch.speakerNotes } : {}),
              }
            : b
        );
      } else {
        const curSec = nextSections.find((s) => s.id === activeSectionId);
        nextBlocks = [
          ...nextBlocks,
          {
            id: `blk_slide_${activeSectionId}`,
            sectionId: activeSectionId,
            type: 'slide',
            title: patch.title ?? curSec?.title ?? 'Slide',
            bullets: [],
            speakerNotes: patch.speakerNotes || '',
          },
        ];
      }
    }
    persistDocument({
      ...activeDocument,
      sections: nextSections,
      contentBlocks: nextBlocks,
    });
  };

  // Helper: Persist inline Cover Page / Title Slide edits (0 credits, zero AI calls)
  const handleCoverPageChange = (patch: Partial<StudioCoverPageData>) => {
    if (!activeDocument) return;
    const nowIso = new Date().toISOString();
    const mergedCover: StudioCoverPageData = {
      ...(activeDocument.metadata?.coverPage || {}),
      ...patch,
    };
    const nextDoc: AcademicDocument = {
      ...activeDocument,
      title: patch.title !== undefined ? patch.title : activeDocument.title,
      metadata: {
        ...(activeDocument.metadata || {}),
        ...(patch.includeCoverPage !== undefined ? { includeCoverPage: patch.includeCoverPage } : {}),
        ...(patch.studentName !== undefined ? { studentName: patch.studentName } : {}),
        ...(patch.studentId !== undefined ? { studentId: patch.studentId } : {}),
        ...(patch.courseCode !== undefined ? { courseCode: patch.courseCode } : {}),
        ...(patch.courseTitle !== undefined ? { courseTitle: patch.courseTitle } : {}),
        ...(patch.department !== undefined ? { department: patch.department } : {}),
        ...(patch.faculty !== undefined ? { faculty: patch.faculty } : {}),
        ...(patch.institution !== undefined ? { institution: patch.institution } : {}),
        ...(patch.supervisorName !== undefined ? { lecturerName: patch.supervisorName } : {}),
        ...(patch.submissionDate !== undefined ? { submissionDate: patch.submissionDate } : {}),
        coverPage: mergedCover,
      },
      ...(activeVariant !== 'primary' && activeDocument.convertedVariants?.[activeVariant]
        ? {
            convertedVariants: {
              ...activeDocument.convertedVariants,
              [activeVariant]: {
                ...activeDocument.convertedVariants[activeVariant]!,
                coverPage: {
                  ...(activeDocument.convertedVariants[activeVariant]?.coverPage || mergedCover),
                  ...patch,
                },
                updatedAt: nowIso,
              },
            },
          }
        : {}),
      updatedAt: nowIso,
    };
    persistDocument(nextDoc);
  };

  // Helper: Update any section or slide list on the active variant (0 credits)
  const updateActiveSections = (updater: (secs: StudioSection[]) => StudioSection[], nextSelectId?: string) => {
    if (!activeDocument) return;
    const nowIso = new Date().toISOString();
    if (activeVariant !== 'primary' && activeDocument.convertedVariants?.[activeVariant]) {
      const variant = activeDocument.convertedVariants[activeVariant]!;
      const nextSecs = updater(variant.sections).map((s, idx) => ({ ...s, order: idx + 1 }));
      persistDocument({
        ...activeDocument,
        convertedVariants: {
          ...activeDocument.convertedVariants,
          [activeVariant]: { ...variant, sections: nextSecs, updatedAt: nowIso },
        },
        updatedAt: nowIso,
      });
    } else {
      const nextSecs = updater(activeDocument.sections).map((s, idx) => ({ ...s, order: idx + 1 }));
      const totalWords = nextSecs.reduce((acc, s) => acc + (s.wordCount || 0), 0);
      persistDocument({
        ...activeDocument,
        sections: nextSecs,
        currentWordCount: totalWords,
        updatedAt: nowIso,
      });
    }
    if (nextSelectId) setActiveSectionId(nextSelectId);
  };

  const handleSectionTitleChange = (sectionId: string, title: string) => {
    const nowIso = new Date().toISOString();
    updateActiveSections((secs) =>
      secs.map((s) => (s.id === sectionId ? { ...s, title, lastEditedAt: nowIso } : s))
    );
  };

  const handleAddSection = () => {
    const newId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();
    const newSec: StudioSection = {
      id: newId,
      outlineItemId: `out_${newId}`,
      title: activeIsSlides ? 'New Slide' : 'New Section',
      level: 1,
      order: activeSections.length + 1,
      content: activeIsSlides ? '- Key point' : '',
      wordCount: activeIsSlides ? 2 : 0,
      citations: [],
      status: 'drafted',
      lastEditedAt: nowIso,
    };
    updateActiveSections((secs) => [...secs, newSec], newId);
  };

  const handleDuplicateSection = (sectionId: string) => {
    const nowIso = new Date().toISOString();
    const newId = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    updateActiveSections((secs) => {
      const idx = secs.findIndex((s) => s.id === sectionId);
      if (idx < 0) return secs;
      const orig = secs[idx];
      const copy: StudioSection = {
        ...orig,
        id: newId,
        outlineItemId: `out_${newId}`,
        title: `${orig.title} (Copy)`,
        lastEditedAt: nowIso,
      };
      const next = [...secs];
      next.splice(idx + 1, 0, copy);
      return next;
    }, newId);
  };

  const handleMoveSection = (sectionId: string, dir: -1 | 1) => {
    updateActiveSections((secs) => {
      const idx = secs.findIndex((s) => s.id === sectionId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= secs.length) return secs;
      const next = [...secs];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (activeSections.length <= 1) return;
    const idx = activeSections.findIndex((s) => s.id === sectionId);
    const fallback = activeSections[Math.max(0, idx - 1)]?.id || activeSections[0]?.id;
    updateActiveSections(
      (secs) => secs.filter((s) => s.id !== sectionId),
      fallback && fallback !== sectionId ? fallback : '__cover_page__'
    );
  };

  const handleUpdateReference = (refId: string, patch: Partial<StudioReference>) => {
    if (!activeDocument) return;
    const nextRefs = (activeDocument.references || []).map((r) =>
      r.id === refId ? { ...r, ...patch } : r
    );
    persistDocument({
      ...activeDocument,
      references: nextRefs,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteReference = (refId: string) => {
    if (!activeDocument) return;
    const nextRefs = (activeDocument.references || []).filter((r) => r.id !== refId);
    persistDocument({
      ...activeDocument,
      references: nextRefs,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveSectionVisual = (sectionId: string, visualId: string) => {
    if (!activeDocument) return;
    const updatedSections = activeDocument.sections.map((s) =>
      s.id === sectionId
        ? { ...s, visuals: (s.visuals || []).filter((v) => v.id !== visualId) }
        : s
    );
    persistDocument({ ...activeDocument, sections: updatedSections });
    showToast('Visual element removed from section.');
  };

  // =========================================================
  // CREATION & OUTLINE PLANNING
  // =========================================================

  const handleStartCreation = () => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    setV2View('brief');
  };

  const handleGenerateOutline = async () => {
    if (!newDocTitle.trim()) {
      showToast('Please provide a document title or topic.');
      return;
    }

    setIsPlanningLoading(true);
    try {
      const planResult = await GeminiService.generateStudioPlan({
        title: newDocTitle.trim(),
        docType: newDocType,
        subject: newDocSubject.trim(),
        instructions: newDocInstructions.trim(),
        targetWordCount: newDocWords,
        citationStyle: newDocCitation,
        references: newDocReferences,
      });

      const initialOutline: StudioOutlineItem[] = (planResult.outline || []).map((item: any, idx: number) => ({
        id: item.id || `outline-sec-${idx + 1}`,
        title: item.title,
        level: item.level || 1,
        order: idx + 1,
        description: item.description || '',
        rationale: item.rationale || '',
        targetWords: item.targetWords || Math.round(newDocWords / Math.max(1, planResult.outline.length)),
        approved: false,
        personalInstructions: '',
        subsections: (item.subsections || []).map((sub: any, sIdx: number) => ({
          id: sub.id || `outline-sub-${idx + 1}-${sIdx + 1}`,
          title: sub.title,
          level: 2,
          order: sIdx + 1,
          description: sub.description || '',
          rationale: sub.rationale || '',
          targetWords: sub.targetWords || 200,
          approved: false,
        })),
      }));

      // Flatten into initial sections for writing workspace
      const initialSections: StudioSection[] = initialOutline.map((item, idx) => ({
        id: `sec-${Date.now()}-${idx + 1}`,
        outlineItemId: item.id,
        title: item.title,
        level: item.level,
        order: item.order,
        content: '',
        status: 'empty',
        wordCount: 0,
        citations: [],
        lastEditedAt: new Date().toISOString(),
      }));

      const newDoc: AcademicDocument = {
        id: crypto.randomUUID(),
        userId,
        title: newDocTitle.trim(),
        docType: newDocType,
        subject: newDocSubject.trim(),
        instructions: newDocInstructions.trim(),
        targetWordCount: newDocWords,
        currentWordCount: 0,
        citationStyle: newDocCitation,
        status: 'planning', // Student must review & approve outline first!
        outline: initialOutline,
        sections: initialSections,
        references: newDocReferences,
        metadata: {
          studentName: profile.name,
          department: newDocDepartment || profile.department || '',
          institution: newDocInstitution || profile.university || '',
          courseCode: newDocSubject.trim(),
          lecturerName: newDocLecturer.trim(),
          abstract: planResult.abstractPlan || '',
          includeCoverPage: true,
          includeTableOfContents: true,
          includeReferences: true,
          preferredFormat: newDocFormat,
          otherFormatLabel: newDocFormat === 'other' ? newDocOtherFormat.trim() || 'Other' : undefined,
          visualPreferences: newDocVisualPrefs,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      await DBService.saveAcademicDocument(newDoc);
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      setIsCreatingDoc(false);
      showToast('Academic plan & outline generated! Please review and approve your outline.');
    } catch (err: any) {
      console.error('Failed to generate studio plan:', err);
      if (err?.status === 402 || err?.code === 'INSUFFICIENT_CREDITS') {
        setIsCreatingDoc(false);
        setInsufficientCreditsNotice({
          required: err.required ?? 2,
          balance: err.balance ?? 0,
          resetDate: err.resetDate
        });
        return;
      }
      showToast(err?.message || 'Could not generate plan right now. Please try again.');
    } finally {
      setIsPlanningLoading(false);
    }
  };

  // Outline Editing Handlers
  const handleUpdateOutlineItemTitle = (itemId: string, newTitle: string) => {
    if (!activeDocument) return;
    const updatedOutline = activeDocument.outline.map((o) =>
      o.id === itemId ? { ...o, title: newTitle } : o
    );
    // Also sync matching section title
    const updatedSections = activeDocument.sections.map((s) =>
      s.outlineItemId === itemId ? { ...s, title: newTitle } : s
    );
    persistDocument({ ...activeDocument, outline: updatedOutline, sections: updatedSections });
  };

  const handleUpdateOutlineItemInstructions = (itemId: string, instructions: string) => {
    if (!activeDocument) return;
    const updated = activeDocument.outline.map((o) =>
      o.id === itemId ? { ...o, personalInstructions: instructions } : o
    );
    persistDocument({ ...activeDocument, outline: updated });
  };

  const handleMoveOutlineItem = (index: number, direction: 'up' | 'down') => {
    if (!activeDocument) return;
    const newItems = [...activeDocument.outline];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIdx, 0, moved);

    const reordered = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    // Sync sections order as well
    const reorderedSections = activeDocument.sections.map((sec) => {
      const match = reordered.find((o) => o.id === sec.outlineItemId);
      return match ? { ...sec, order: match.order } : sec;
    }).sort((a, b) => a.order - b.order);

    persistDocument({ ...activeDocument, outline: reordered, sections: reorderedSections });
  };

  const handleDeleteOutlineItem = (itemId: string) => {
    if (!activeDocument) return;
    if (activeDocument.outline.length <= 1) {
      showToast('A document must have at least one section.');
      return;
    }
    const filteredOutline = activeDocument.outline.filter((o) => o.id !== itemId);
    const filteredSections = activeDocument.sections.filter((s) => s.outlineItemId !== itemId);
    persistDocument({ ...activeDocument, outline: filteredOutline, sections: filteredSections });
  };

  const handleAddOutlineItem = () => {
    if (!activeDocument) return;
    const newOrder = activeDocument.outline.length + 1;
    const newItemId = `sec-custom-${Date.now()}`;
    const newItem: StudioOutlineItem = {
      id: newItemId,
      title: `Section ${newOrder}: Additional Analytical Dimension`,
      level: 1,
      order: newOrder,
      description: 'Custom research and analysis added by the student.',
      rationale: 'Deepens the investigation into specific course requirements.',
      targetWords: 350,
      approved: false,
    };

    const newSection: StudioSection = {
      id: `sec-${Date.now()}-${newOrder}`,
      outlineItemId: newItemId,
      title: newItem.title,
      level: 1,
      order: newOrder,
      content: '',
      status: 'empty',
      wordCount: 0,
      citations: [],
      lastEditedAt: new Date().toISOString(),
    };

    persistDocument({
      ...activeDocument,
      outline: [...activeDocument.outline, newItem],
      sections: [...activeDocument.sections, newSection],
    });
  };

  // APPROVE OUTLINE AND COMMIT TO WRITING
  const handleApproveEntireOutline = async () => {
    if (!activeDocument) return;
    const approvedOutline = activeDocument.outline.map((o) => ({ ...o, approved: true }));
    const updatedDoc: AcademicDocument = {
      ...activeDocument,
      status: 'outline_approved',
      outline: approvedOutline,
    };
    await persistDocument(updatedDoc);
    if (updatedDoc.sections.length > 0) {
      setActiveSectionId(updatedDoc.sections[0].id);
    }
    showToast('Outline approved! Academic Writing Workspace is now active.');
  };

  // =========================================================
  // SECTION-BY-SECTION GENERATION & WRITING ENGINE
  // =========================================================

  const handleGenerateActiveSection = async (mode: 'generate' | 'regenerate' | 'expand' | 'simplify' | 'academic_tone' | 'grammar' | 'citations' = 'generate') => {
    if (!activeDocument || !activeSectionId) return;
    const sec = activeDocument.sections.find((s) => s.id === activeSectionId);
    if (!sec) return;

    const outlineItem = activeDocument.outline.find((o) => o.id === sec.outlineItemId);
    const targetWordGoal = outlineItem?.targetWords || 400;

    setInsufficientCreditsNotice(null);
    setIsSectionGenerating(true);
    try {
      const result = await GeminiService.generateStudioSection({
        docTitle: activeDocument.title,
        docType: activeDocument.docType,
        sectionTitle: sec.title,
        sectionDescription: outlineItem?.description,
        sectionRationale: outlineItem?.rationale,
        targetWords: targetWordGoal,
        citationStyle: activeDocument.citationStyle,
        studentInstructions: outlineItem?.personalInstructions,
        references: activeDocument.references,
        existingContent: sec.content,
        mode,
        visualPreferences: activeDocument.metadata?.visualPreferences,
      });

      handleEditorChange(result.content, mode === 'generate' || mode === 'regenerate' ? (result.visuals || []) : undefined);
      showToast(`Section "${sec.title}" generated successfully!`);
    } catch (err: any) {
      console.error('Section generation failed:', err);
      if (err?.status === 402 || err?.code === 'INSUFFICIENT_CREDITS') {
        setInsufficientCreditsNotice({
          required: err.required ?? 3,
          balance: err.balance ?? 0,
          resetDate: err.resetDate
        });
        return;
      }
      showToast(err?.message || 'Section generation failed. Please try again.');
    } finally {
      setIsSectionGenerating(false);
    }
  };

  // BATCH GENERATE ALL EMPTY/APPROVED SECTIONS SEQUENTIALLY (10 credits total)
  const handleBatchGenerateAll = async () => {
    if (!activeDocument) return;
    const pendingSections = activeDocument.sections.filter((s) => !s.content || s.content.trim().length === 0);
    if (pendingSections.length === 0) {
      showToast('All sections already have content. Use single-section regeneration to rewrite.');
      return;
    }

    setInsufficientCreditsNotice(null);
    setBatchProgress({ current: 0, total: pendingSections.length, title: 'Starting sequential generation...' });

    let updatedSections = [...activeDocument.sections];

    for (let i = 0; i < pendingSections.length; i++) {
      const sec = pendingSections[i];
      const outlineItem = activeDocument.outline.find((o) => o.id === sec.outlineItemId);
      setBatchProgress({ current: i + 1, total: pendingSections.length, title: sec.title });

      try {
        const result = await GeminiService.generateStudioSection({
          docTitle: activeDocument.title,
          docType: activeDocument.docType,
          sectionTitle: sec.title,
          sectionDescription: outlineItem?.description,
          sectionRationale: outlineItem?.rationale,
          targetWords: outlineItem?.targetWords || 400,
          citationStyle: activeDocument.citationStyle,
          studentInstructions: outlineItem?.personalInstructions,
          references: activeDocument.references,
          mode: 'generate',
          isFullDocumentFirstSection: i === 0,
          isFullDocumentContinuation: i > 0,
          visualPreferences: activeDocument.metadata?.visualPreferences,
        });

        const words = result.content.trim().split(/\s+/).filter(Boolean).length;
        updatedSections = updatedSections.map((s) =>
          s.id === sec.id
            ? {
                ...s,
                content: result.content,
                visuals: result.visuals || [],
                wordCount: words,
                status: 'drafted',
                lastEditedAt: new Date().toISOString(),
              }
            : s
        );

        // Update UI progressively
        if (sec.id === activeSectionId) {
          setEditorText(result.content);
        }
      } catch (err: any) {
        console.warn(`Batch failed on section ${sec.title}:`, err);
        if (err?.status === 402 || err?.code === 'INSUFFICIENT_CREDITS') {
          setBatchProgress(null);
          setInsufficientCreditsNotice({
            required: err.required ?? 10,
            balance: err.balance ?? 0,
            resetDate: err.resetDate
          });
          return;
        }
        break;
      }
    }

    const totalWords = updatedSections.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
    const updatedDoc: AcademicDocument = {
      ...activeDocument,
      sections: updatedSections,
      currentWordCount: totalWords,
      status: 'drafting',
    };

    await persistDocument(updatedDoc);
    setBatchProgress(null);
    showToast('Batch generation complete! All sections drafted.');
  };

  // IN-CONTEXT AI TEXT ASSISTANT (1 credit)
  const handleContextualAssist = async (instruction: string) => {
    if (!activeDocument || !editorText) return;

    const textToTransform = selectedTextSnippet || editorText;
    setInsufficientCreditsNotice(null);
    setIsAssistLoading(true);

    try {
      const currentSec = activeDocument.sections.find((s) => s.id === activeSectionId);
      const res = await GeminiService.assistStudioText({
        selectedText: textToTransform,
        instruction,
        docTitle: activeDocument.title,
        sectionTitle: currentSec?.title,
      });

      if (selectedTextSnippet && editorSelectionRange) {
        const before = editorText.substring(0, editorSelectionRange.start);
        const after = editorText.substring(editorSelectionRange.end);
        handleEditorChange(before + res.text + after);
      } else {
        handleEditorChange(res.text);
      }
      setSelectedTextSnippet('');
      showToast('Text updated by AI assistant.');
    } catch (err: any) {
      console.error('Contextual assist error:', err);
      if (err?.status === 402 || err?.code === 'INSUFFICIENT_CREDITS') {
        setInsufficientCreditsNotice({
          required: err.required ?? 1,
          balance: err.balance ?? 0,
          resetDate: err.resetDate
        });
        return;
      }
      showToast(err?.message || 'AI assistance failed.');
    } finally {
      setIsAssistLoading(false);
    }
  };

  // =========================================================
  // DOCUMENT REVIEW & QUALITY AUDIT (1 credit)
  // =========================================================

  const handleRunDocumentReview = async () => {
    if (!activeDocument) return;
    const fullText = activeDocument.sections.map((s) => `## ${s.title}\n${s.content}`).join('\n\n');

    if (!fullText || fullText.trim().length < 50) {
      showToast('Please draft your document sections before running an audit.');
      return;
    }

    setInsufficientCreditsNotice(null);
    setIsReviewLoading(true);
    setActiveRightTab('review');
    try {
      const audit = await GeminiService.reviewStudioDocument({
        docTitle: activeDocument.title,
        docType: activeDocument.docType,
        fullContent: fullText,
        citationStyle: activeDocument.citationStyle,
        references: activeDocument.references,
      });

      setReviewResult({
        academicQualityScore: audit.academicQualityScore || 90,
        summary: audit.summary || 'Manuscript successfully reviewed against scholarly standards.',
        strengths: audit.strengths || [],
        weaknesses: audit.weaknesses || [],
        suggestions: (audit.suggestions || []).map((s: any) => ({
          ...s,
          status: 'pending',
        })),
      });
      showToast('Academic audit complete!');
    } catch (err: any) {
      console.error('Audit failed:', err);
      if (err?.status === 402 || err?.code === 'INSUFFICIENT_CREDITS') {
        setInsufficientCreditsNotice({
          required: err.required ?? 1,
          balance: err.balance ?? 0,
          resetDate: err.resetDate
        });
        return;
      }
      showToast(err?.message || 'Failed to complete document audit.');
    } finally {
      setIsReviewLoading(false);
    }
  };

  // =========================================================
  // REFERENCE CITATION INSERTION
  // =========================================================

  const handleInsertCitation = (ref: StudioReference) => {
    if (!activeDocument) return;
    let formatted = '';
    if (activeDocument.citationStyle === 'IEEE') {
      const refIdx = activeDocument.references.findIndex((r) => r.id === ref.id);
      formatted = `[${refIdx >= 0 ? refIdx + 1 : 1}]`;
    } else if (activeDocument.citationStyle === 'MLA') {
      formatted = `(${ref.authors.split(',')[0]} 12)`;
    } else {
      // APA & Harvard
      const firstAuthor = ref.authors.split('&')[0].split(',')[0].trim();
      formatted = `(${firstAuthor}, ${ref.year || 'n.d.'})`;
    }

    handleEditorChange(editorText + ' ' + formatted);
    showToast(`Inserted citation: ${formatted}`);
  };

  // Manual Add Reference
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefAuthors, setNewRefAuthors] = useState('');
  const [newRefYear, setNewRefYear] = useState('');
  const [newRefSnippet, setNewRefSnippet] = useState('');
  const [newRefDoi, setNewRefDoi] = useState('');

  const handleSaveManualReference = () => {
    if (!newRefTitle.trim() || !newRefAuthors.trim()) {
      showToast('Please enter both title and authors.');
      return;
    }
    const newRef: StudioReference = {
      id: `ref-${Date.now()}`,
      title: newRefTitle.trim(),
      authors: newRefAuthors.trim(),
      year: newRefYear.trim() || undefined,
      contentSnippet: newRefSnippet.trim() || undefined,
      doi: newRefDoi.trim() || undefined,
      sourceType: 'journal',
      verified: true,
    };

    if (activeDocument) {
      persistDocument({
        ...activeDocument,
        references: [...activeDocument.references, newRef],
      });
    } else {
      setNewDocReferences((prev) => [...prev, newRef]);
    }

    setNewRefTitle('');
    setNewRefAuthors('');
    setNewRefYear('');
    setNewRefSnippet('');
    setNewRefDoi('');
    setShowAddRefModal(false);
    showToast('Reference added to library.');
  };

  // =========================================================
  // DOCUMENT VERSIONS / SNAPSHOTS
  // =========================================================

  const handleSaveVersionSnapshot = async () => {
    if (!activeDocument) return;
    setIsVersionSaving(true);
    try {
      const snapJson = JSON.stringify(activeDocument);
      const v = await DBService.saveDocumentVersion(
        activeDocument.id,
        userId,
        activeDocument.title,
        snapJson,
        activeDocument.currentWordCount,
        versionNote.trim() || 'Manual revision snapshot'
      );
      setVersions((prev) => [v, ...prev]);
      setVersionNote('');
      showToast('Version snapshot saved.');
    } catch (err) {
      console.error('Failed to save version:', err);
      showToast('Could not save version snapshot.');
    } finally {
      setIsVersionSaving(false);
    }
  };

  const handleRestoreVersion = async (v: StudioVersion) => {
    if (!window.confirm(`Restore version from ${new Date(v.createdAt).toLocaleString()}? Unsaved edits will be replaced.`)) {
      return;
    }
    try {
      const parsed: AcademicDocument = JSON.parse(v.snapshot);
      await persistDocument(parsed);
      setEditorText(parsed.sections.find((s) => s.id === activeSectionId)?.content || '');
      showToast('Document restored to selected version.');
    } catch (err) {
      showToast('Failed to restore version snapshot.');
    }
  };

  // =========================================================
  // EXPORT HANDLERS (DOCX & PDF)
  // =========================================================

  const handleExportDocx = async () => {
    if (!activeDocument || !isExportAllowed) return;
    setIsExportingDocx(true);
    try {
      const blob = await generateDocxBlob(activeDocument);
      const safeTitle = activeDocument.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadDocx(blob, `${safeTitle}.docx`);
      showToast('Word document exported successfully!');
    } catch (err) {
      console.error('DOCX export failed:', err);
      showToast('Failed to export DOCX document.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    if (!activeDocument || !isExportAllowed) return;
    setIsExportingPdf(true);
    try {
      const safeTitle = activeDocument.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadPdf(activeDocument, `${safeTitle}.pdf`);
      showToast('PDF document exported successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('Failed to export PDF document.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportPptx = async () => {
    if (!activeDocument || !isExportAllowed) return;
    setIsExportingPptx(true);
    try {
      const safeTitle = activeDocument.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadPptx(activeDocument, `${safeTitle}.pptx`);
      showToast('PowerPoint presentation exported successfully!');
    } catch (err) {
      console.error('PPTX export failed:', err);
      showToast('Failed to export PowerPoint presentation.');
    } finally {
      setIsExportingPptx(false);
    }
  };

  // Document Management Operations
  const handleDuplicateDocument = async (docId: string) => {
    try {
      const dup = await DBService.duplicateAcademicDocument(docId, userId);
      if (dup) {
        setDocuments((prev) => [dup, ...prev]);
        showToast('Document duplicated successfully.');
      }
    } catch (err) {
      showToast('Failed to duplicate document.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this academic document? This cannot be undone.')) {
      return;
    }
    try {
      await DBService.deleteAcademicDocument(docId, userId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (activeDocId === docId) {
        setActiveDocId(null);
      }
      showToast('Document deleted.');
    } catch (err) {
      showToast('Failed to delete document.');
    }
  };

  // Filtered documents list for main dashboard
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || doc.docType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  return (
    <div
      className={
        isCompletedWorkspaceActive
          ? 'h-full flex flex-col overflow-hidden font-sans text-[#111827] dark:text-slate-100'
          : 'space-y-6 animate-in fade-in duration-500 pb-16 font-sans text-slate-900 dark:text-slate-100'
      }
    >
      {insufficientCreditsNotice && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold">
                Not enough credits ({insufficientCreditsNotice.balance} remaining, {insufficientCreditsNotice.required} required)
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                {insufficientCreditsNotice.resetDate
                  ? `Your monthly credits reset on ${new Date(insufficientCreditsNotice.resetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}. `
                  : ''}
                Upgrade your plan for up to 200 monthly AI credits.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCheckoutPlan('studio');
                setShowCheckoutModal(true);
              }}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold min-h-[40px] cursor-pointer"
            >
              Upgrade
            </button>
            <button
              type="button"
              onClick={() => setInsufficientCreditsNotice(null)}
              className="p-2 text-amber-700 hover:text-amber-900 rounded-lg cursor-pointer"
              aria-label="Dismiss credit alert"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Toast Banner */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* VIEW 1: MAIN DASHBOARD, BRIEF, OUTLINE & DOCUMENT LIST    */}
      {/* ========================================================= */}
      {!activeDocument && v2View === 'brief' && (
        <StudioBriefForm
          profile={profile}
          courses={courses}
          userFiles={userFiles}
          initialBrief={v2Brief || undefined}
          isSubmitting={isDraftingV2Outline}
          weeklyQuota={weeklyQuota}
          externalError={v2OutlineError}
          onCancel={() => {
            setV2OutlineError(null);
            setV2View('list');
          }}
          onSubmit={handleV2DraftOutline}
        />
      )}

      {!activeDocument && v2View === 'outline' && v2Brief && (
        <StudioOutlineReview
          brief={v2Brief}
          outline={v2Outline}
          onChangeOutline={setV2Outline}
          onChangeBrief={setV2Brief}
          onBackToBrief={() => {
            setV2JobStartError(null);
            setV2View('brief');
          }}
          onGenerate={handleV2StartJob}
          isStartingJob={isStartingV2Job || hasActiveStudioJob}
          weeklyQuota={weeklyQuota}
          onUpgradeClick={
            BILLING_ENABLED
              ? () => {
                  setCheckoutPlan('studio');
                  setShowCheckoutModal(true);
                }
              : undefined
          }
          errorMessage={
            v2JobStartError ||
            (hasActiveStudioJob
              ? 'You already have a document generating. Wait for it to finish or cancel it before starting another.'
              : null)
          }
        />
      )}

      {!activeDocument && v2View === 'list' && (
        <div className="space-y-6">
          {/* Top Clean Header / Studio Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-md text-[11px] font-semibold">
                    <span>Academic Studio</span>
                  </div>
                  {weeklyQuota?.isBetaLimited && typeof weeklyQuota.limit === 'number' && typeof weeklyQuota.remaining === 'number' && (
                    <span
                      data-studio-weekly-quota-pill="true"
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        weeklyQuota.remaining === 0
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                          : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#5B6472] dark:text-slate-300 border-[#E5E7EB] dark:border-slate-700'
                      }`}
                    >
                      {weeklyQuota.remaining === 0
                        ? `0 of ${weeklyQuota.limit} left · ${formatQuotaResetLabel(weeklyQuota.resetAt)}`
                        : `${weeklyQuota.remaining} of ${weeklyQuota.limit} weekly generations left`}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Academic Documents &amp; Presentations
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Fill in one brief, review your outline, generate the full document in the background, and download in your chosen format.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleStartCreation}
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <Plus size={16} />
                  <span>New Document</span>
                </button>
              </div>
            </div>
          </div>

          {/* Slim Single-Line Status Strip (Active job OR at most 1 freshly finished job in current session) */}
          {(() => {
            const homeBar = selectStudioHomeStatusBar({
              jobs: studioJobs,
              sessionCompletedJobIds,
              dismissedJobIds: dismissedHomeJobIds,
            });
            if (!homeBar) return null;
            const { mode, job } = homeBar;
            const jobDoc = documents.find((d) => d.id === job.documentId);
            const shortTitle = (jobDoc?.title || 'Document').length > 48
              ? `${(jobDoc?.title || 'Document').slice(0, 45)}...`
              : (jobDoc?.title || 'Document');
            const activeStepLabel = job.plan?.[job.currentStep]?.label || 'Working';
            const verb =
              job.jobKind === 'convert_to_slides'
                ? 'Converting to slides'
                : job.jobKind === 'convert_to_document'
                ? 'Converting to document'
                : 'Generating';

            if (mode === 'active') {
              return (
                <div
                  data-studio-home-status-bar="active"
                  className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg py-2 px-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-[#111827] dark:text-slate-100 truncate">
                      <strong className="font-semibold">{verb}:</strong> {shortTitle}{' '}
                      <span className="text-[#5B6472] dark:text-slate-400">— {activeStepLabel}...</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVariant(job.jobKind === 'convert_to_slides' ? 'slides' : 'primary');
                      setActiveDocId(job.documentId);
                    }}
                    className="text-xs font-semibold text-[#2563EB] hover:underline shrink-0 cursor-pointer px-1.5 py-1"
                  >
                    View
                  </button>
                </div>
              );
            }

            return (
              <div
                data-studio-home-status-bar="fresh_completed"
                className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg py-2 px-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-[#111827] dark:text-slate-100 truncate">
                    <strong className="font-semibold">Ready:</strong> {shortTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDismissedHomeJobIds((prev) => (prev.includes(job.id) ? prev : [...prev, job.id]));
                      setActiveVariant(job.jobKind === 'convert_to_slides' ? 'slides' : 'primary');
                      setActiveDocId(job.documentId);
                    }}
                    className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer px-1.5 py-1"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss status notice"
                    onClick={() =>
                      setDismissedHomeJobIds((prev) => (prev.includes(job.id) ? prev : [...prev, job.id]))
                    }
                    className="p-1 text-[#5B6472] hover:text-[#111827] dark:hover:text-white rounded cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Search, Filter & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by title or subject..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                All
              </button>
              {['assignment', 'term_paper', 'thesis', 'research_proposal'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Document Cards Grid */}
          {isLoadingDocs ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">No academic documents yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Start your first assignment, term paper, or dissertation outline. KorsIQ structures chapters based on your course syllabus and assignment instructions.
                </p>
              </div>
              <button
                onClick={handleStartCreation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Create New Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const docHasActiveJob = studioJobs.some(
                  (j) => j.documentId === doc.id && (j.status === 'queued' || j.status === 'running')
                );
                const cardProgress = computeDocumentCardProgress(doc, docHasActiveJob);
                const statusColor =
                  cardProgress.isComplete || doc.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : doc.status === 'review'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : doc.status === 'planning'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

                return (
                  <div
                    key={doc.id}
                    data-studio-doc-card={doc.id}
                    data-doc-progress-pct={cardProgress.percent}
                    onClick={() => setActiveDocId(doc.id)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {doc.docType.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${statusColor}`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
                          {doc.title}
                        </h3>
                        {doc.subject && (
                          <p className="text-xs text-slate-500 font-medium truncate">
                            {doc.subject}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{cardProgress.wordLabel}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{cardProgress.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              cardProgress.isComplete ? 'bg-emerald-600' : 'bg-[#2563EB]'
                            }`}
                            style={{ width: `${cardProgress.percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">
                          {doc.citationStyle} • {doc.sections.length} Sections
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateDocument(doc.id);
                            }}
                            title="Duplicate Document"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                            title="Delete Document"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: OUTLINE APPROVAL WORKSPACE                        */}
      {/* (When active document status === 'planning')              */}
      {/* ========================================================= */}
      {activeDocument && activeDocument.status === 'planning' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header & Back Action */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setActiveDocId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Documents</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowVisualPrefsModal(true)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold cursor-pointer"
              >
                Design &amp; Visuals{hasAnyVisualElementEnabled(activeDocument.metadata?.visualPreferences) ? ' (On)' : ''}
              </button>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1 rounded-md">
                Outline Approval Required
              </span>
            </div>
          </div>

          {/* Outline Inspection Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {activeDocument.docType.replace('_', ' ')} • {activeDocument.citationStyle} Citation
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {activeDocument.title}
              </h2>
              {activeDocument.metadata?.abstract && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Strategic Plan: </strong>
                  {activeDocument.metadata.abstract}
                </div>
              )}
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg flex items-start gap-3">
              <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Outline Verification Mandatory Before Generation
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                  You are in complete control of this manuscript. Review the recommended structure below, reorder chapters, edit titles, add custom guidance, or remove unwanted sections. KorsIQ will only generate approved sections.
                </p>
              </div>
            </div>

            {/* Editable Outline List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Document Outline ({activeDocument.outline.length} Sections)
                </h3>
                <button
                  onClick={handleAddOutlineItem}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Section</span>
                </button>
              </div>

              <div className="space-y-3">
                {activeDocument.outline.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-lg space-y-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateOutlineItemTitle(item.id, e.target.value)}
                          className="font-semibold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none w-full"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveOutlineItem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOutlineItem(idx, 'down')}
                          disabled={idx === activeDocument.outline.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOutlineItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                          title="Delete Section"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Section Rationale & Description */}
                    <div className="pl-8 space-y-1.5 text-xs">
                      {item.description && (
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      {item.rationale && (
                        <div className="text-xs text-blue-800 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 leading-relaxed">
                          <span className="font-semibold">Why AI Recommends This: </span>
                          {item.rationale}
                        </div>
                      )}

                      {/* Personal Student Guidance input */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={item.personalInstructions || ''}
                          onChange={(e) => handleUpdateOutlineItemInstructions(item.id, e.target.value)}
                          placeholder="Add custom instructions for this section (optional)..."
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval Action Footer */}
            <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                {isSlideDocument(activeDocument) ? (
                  <>
                    Planned deck: <strong>{activeDocument.outline.length} slides</strong>.
                  </>
                ) : (
                  <>
                    Estimated length:{' '}
                    <strong>
                      ~{resolveTargetPagesForDoc(activeDocument)} pages
                    </strong>{' '}
                    across {activeDocument.outline.length} sections.
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleApproveEntireOutline}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Check size={16} />
                <span>Approve Outline &amp; Begin Writing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3A: ACTIVE / FAILED / CANCELLED GENERATION VIEW      */}
      {/* Editor, toolbar, save & export controls are NOT mounted   */}
      {/* until the job completes and persisted content is verified */}
      {/* ========================================================= */}
      {activeDocument && activeDocument.status !== 'planning' && !editorGate.canMountEditor && (
        <div
          className="max-w-3xl mx-auto space-y-4"
          data-studio-view={editorGate.mode}
        >
          <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveDocId(null)}
                className="p-2 text-[#5B6472] hover:text-[#111827] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Back to Documents"
                aria-label="Back to Documents"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-[#111827] dark:text-white truncate max-w-xs sm:max-w-md">
                  {activeDocument.title}
                </h2>
                <p className="text-[11px] text-[#5B6472] dark:text-slate-400">
                  {editorGate.mode === 'generating'
                    ? 'Generating document...'
                    : editorGate.mode === 'loading'
                    ? 'Checking generation status...'
                    : editorGate.mode === 'failed'
                    ? 'Generation did not complete'
                    : 'Generation cancelled'}
                </p>
              </div>
            </div>
          </div>

          {editorGate.mode === 'loading' ? (
            <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-6">
              <AILiveStatus
                title="Checking generation status"
                statusText="Loading active job progress..."
                state="active"
                className="border-0 p-0 bg-transparent"
              />
            </div>
          ) : editorGate.relevantJob ? (
            <StudioJobProgress
              job={editorGate.relevantJob}
              documentTitle={activeDocument.title}
              draftedSections={activeDocument.sections}
              retrievalWarnings={(activeDocument.metadata as any)?.retrievalWarnings}
              showOpenButton={false}
              onCancel={handleV2CancelJob}
              onResume={handleV2ResumeJob}
              onDeleteDocument={handleDeleteDocument}
              onOpenDocument={(id) => setActiveDocId(id)}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-5 space-y-3">
              <AILiveStatus
                title={
                  editorGate.mode === 'generating'
                    ? `Preparing "${activeDocument.title}"`
                    : 'Generation stopped before completion'
                }
                statusText={
                  editorGate.mode === 'generating'
                    ? 'Initializing generation pipeline...'
                    : 'No completed document content is available yet.'
                }
                state={editorGate.mode === 'generating' ? 'active' : 'error'}
                className="border-0 p-0 bg-transparent"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveDocId(null)}
                  className="px-3.5 py-2 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-[#111827] dark:text-slate-200 min-h-[44px] cursor-pointer"
                >
                  Back to Documents
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3B: FOCUS ACADEMIC WORKSPACE (PREVIEW / EDIT)        */}
      {/* Mounted ONLY when verified completed with persisted text  */}
      {/* (or legacy v1 document without a V2 generation job)       */}
      {/* ========================================================= */}
      {activeDocument && activeDocument.status !== 'planning' && editorGate.canMountEditor && (
        <StudioWorkspaceView
          doc={activeDocument}
          profile={profile}
          activeVariant={activeVariant}
          onChangeVariant={setActiveVariant}
          activeIsSlides={activeIsSlides}
          activeSections={activeSections}
          outlineCompletion={outlineCompletion}
          activeSectionId={activeSectionId}
          onSelectSectionId={setActiveSectionId}
          workspaceMode={workspaceMode}
          onChangeWorkspaceMode={setWorkspaceMode}
          isOutlineOpen={isOutlineOpen}
          onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
          rightDrawerTab={rightDrawerTab}
          onChangeRightDrawerTab={setRightDrawerTab}
          showExportMenu={showExportMenu}
          onToggleExportMenu={setShowExportMenu}
          showTemplateSwitchModal={showTemplateSwitchModal}
          onToggleTemplateSwitchModal={setShowTemplateSwitchModal}
          editorText={editorText}
          onEditorChangeWithHistory={handleEditorChangeWithHistory}
          onSlideMetaChange={handleSlideMetaChange}
          onCoverPageChange={handleCoverPageChange}
          onSectionTitleChange={handleSectionTitleChange}
          onAddSection={handleAddSection}
          onDuplicateSection={handleDuplicateSection}
          onMoveSection={handleMoveSection}
          onDeleteSection={handleDeleteSection}
          onUpdateReference={handleUpdateReference}
          onDeleteReference={handleDeleteReference}
          selectedTextSnippet={selectedTextSnippet}
          onSelectTextSnippet={(snippet, range) => {
            setSelectedTextSnippet(snippet);
            setEditorSelectionRange(range);
          }}
          historyIndex={historyIndex}
          historyLength={editorHistory.length}
          onUndo={handleUndo}
          onRedo={handleRedo}
          isSectionGenerating={isSectionGenerating}
          batchProgress={batchProgress}
          isAssistLoading={isAssistLoading}
          isReviewLoading={isReviewLoading}
          reviewResult={reviewResult}
          versions={versions}
          isVersionSaving={isVersionSaving}
          isVersionsAllowed={isVersionsAllowed}
          onBackToDocuments={() => setActiveDocId(null)}
          onGenerateActiveSection={() => handleGenerateActiveSection('generate')}
          onBatchGenerateAll={handleBatchGenerateAll}
          onContextualAssist={handleContextualAssist}
          onRunDocumentReview={handleRunDocumentReview}
          onOpenAddRefModal={() => setShowAddRefModal(true)}
          onInsertCitation={handleInsertCitation}
          onRemoveSectionVisual={handleRemoveSectionVisual}
          onSaveVersionSnapshot={handleSaveVersionSnapshot}
          onRestoreVersion={handleRestoreVersion}
          onRequireVersionsUpgrade={() =>
            setShowQuietUpgrade({
              feature: 'Version History',
              description: 'Document versioning and revision history are available in the Academic Studio plan.',
            })
          }
          onSwitchTemplateFree={handleSwitchTemplateFree}
          onDownloadFormat={(fmt) => handleV2Download(fmt)}
          onConvertFormat={(target) => handleV2SwitchFormat(target)}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 1: NEW DOCUMENT CREATION WIZARD                     */}
      {/* ========================================================= */}
      {isCreatingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Step {wizardStep} of 4
                </span>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                  {wizardStep === 1
                    ? 'Manuscript Parameters'
                    : wizardStep === 2
                    ? 'Visual Design Customisation (Optional)'
                    : wizardStep === 3
                    ? 'Assignment Prompt & Instructions'
                    : 'Reference Materials & Sources'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreatingDoc(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* STEP 1: Title, Document Type, Subject, Words, Style */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Document Title or Working Topic *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g. Distributed Consensus in Cloud Infrastructure: An Empirical Comparison"
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Document Type
                    </label>
                    <select
                      value={newDocType}
                      onChange={(e) => {
                        const t = e.target.value as AcademicDocumentType;
                        setNewDocType(t);
                        const match = DOCUMENT_TYPES.find((d) => d.id === t);
                        if (match) setNewDocWords(match.defaultWords);
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:border-blue-600"
                    >
                      {DOCUMENT_TYPES.map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Citation Style
                    </label>
                    <select
                      value={newDocCitation}
                      onChange={(e) => setNewDocCitation(e.target.value as CitationStyle)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:border-blue-600"
                    >
                      {CITATION_STYLES.map((cs) => (
                        <option key={cs.id} value={cs.id}>
                          {cs.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Course Code / Subject
                    </label>
                    <input
                      type="text"
                      value={newDocSubject}
                      onChange={(e) => setNewDocSubject(e.target.value)}
                      placeholder="e.g. CSC 401"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Target Word Count Goal
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={newDocWords}
                      onChange={(e) => setNewDocWords(Number(e.target.value))}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Preferred Output Format */}
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Preferred Output Format *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'docx', label: 'Word (.docx)' },
                      { id: 'pdf', label: 'PDF (.pdf)' },
                      { id: 'pptx', label: 'PowerPoint (.pptx)' },
                      { id: 'other', label: 'Other' },
                    ].map((fmt) => {
                      const active = newDocFormat === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setNewDocFormat(fmt.id as 'docx' | 'pdf' | 'pptx' | 'other')}
                          className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                            active
                              ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      );
                    })}
                  </div>
                  {newDocFormat === 'other' && (
                    <input
                      type="text"
                      value={newDocOtherFormat}
                      onChange={(e) => setNewDocOtherFormat(e.target.value)}
                      placeholder="Specify format (e.g. LaTeX, Google Docs, Plain Text)"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-600"
                    />
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newDocTitle.trim()) {
                        showToast('Please enter a title or topic.');
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Next: Visual Design (Optional)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Optional Visual Design Customisation */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <StudioVisualDesignPanel
                  value={newDocVisualPrefs}
                  onChange={setNewDocVisualPrefs}
                  onSkip={() => setWizardStep(3)}
                />

                <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Next: Assignment Guidelines</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Assignment Instructions & Cover Details */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Assignment Instructions / Rubric Guidelines
                  </label>
                  <textarea
                    rows={5}
                    value={newDocInstructions}
                    onChange={(e) => setNewDocInstructions(e.target.value)}
                    placeholder="Paste assignment instructions, questions to address, or theoretical scope here..."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-600 leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">
                    The planning engine structures chapters based directly on these instructions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Department / Faculty
                    </label>
                    <input
                      type="text"
                      value={newDocDepartment}
                      onChange={(e) => setNewDocDepartment(e.target.value)}
                      placeholder="e.g. Department of Computer Science"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Lecturer / Supervisor Name
                    </label>
                    <input
                      type="text"
                      value={newDocLecturer}
                      onChange={(e) => setNewDocLecturer(e.target.value)}
                      placeholder="e.g. Prof. R. Sterling"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Next: References</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Reference Intelligence */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      Reference Material ({newDocReferences.length} added)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddRefModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      + Add Reference
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    KorsIQ grounds arguments in real references. Never fabricates citations.
                  </p>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateOutline}
                    disabled={isPlanningLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isPlanningLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Formulating Plan &amp; Outline...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={14} />
                        <span>{BILLING_ENABLED ? 'Generate Outline — 2 credits' : 'Generate Outline'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD REFERENCE MODAL                              */}
      {/* ========================================================= */}
      {showAddRefModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Add Reference Source
              </h3>
              <button
                onClick={() => setShowAddRefModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Paper / Book Title *
                </label>
                <input
                  type="text"
                  value={newRefTitle}
                  onChange={(e) => setNewRefTitle(e.target.value)}
                  placeholder="e.g. Deep Residual Learning for Image Recognition"
                  className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg text-xs outline-none border border-slate-200 dark:border-slate-700 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Authors *
                </label>
                <input
                  type="text"
                  value={newRefAuthors}
                  onChange={(e) => setNewRefAuthors(e.target.value)}
                  placeholder="e.g. He, K., Zhang, X., Ren, S., & Sun, J."
                  className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg text-xs outline-none border border-slate-200 dark:border-slate-700 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Year
                  </label>
                  <input
                    type="text"
                    value={newRefYear}
                    onChange={(e) => setNewRefYear(e.target.value)}
                    placeholder="2023"
                    className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg text-xs outline-none border border-slate-200 dark:border-slate-700 focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    DOI / Link
                  </label>
                  <input
                    type="text"
                    value={newRefDoi}
                    onChange={(e) => setNewRefDoi(e.target.value)}
                    placeholder="10.1109/CVPR.2016.90"
                    className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg text-xs outline-none border border-slate-200 dark:border-slate-700 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Relevant Excerpt / Key Findings
                </label>
                <textarea
                  rows={3}
                  value={newRefSnippet}
                  onChange={(e) => setNewRefSnippet(e.target.value)}
                  placeholder="Paste excerpt or key quotation for the AI to synthesize..."
                  className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg text-xs outline-none border border-slate-200 dark:border-slate-700 resize-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddRefModal(false)}
                className="px-3 py-1.5 text-slate-500 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualReference}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EXPORT & PRINT PREVIEW MODAL                     */}
      {/* ========================================================= */}
      {showExportModal && activeDocument && editorGate.canMountEditor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full p-6 space-y-5 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                  Export &amp; Print
                </span>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Manuscript Preview
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Export Actions */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <button
                onClick={handleExportDocx}
                disabled={isExportingDocx}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download size={13} />
                <span>{isExportingDocx ? 'Exporting...' : 'Microsoft Word (.docx)'}</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download size={13} />
                <span>{isExportingPdf ? 'Exporting...' : 'PDF Document (.pdf)'}</span>
              </button>

              <button
                onClick={handleExportPptx}
                disabled={isExportingPptx}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download size={13} />
                <span>{isExportingPptx ? 'Exporting...' : 'PowerPoint (.pptx)'}</span>
              </button>

              <div className="text-xs text-slate-500 ml-auto font-medium flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false);
                    setShowVisualPrefsModal(true);
                  }}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Change Design &amp; Visuals
                </button>
                <span>
                  {activeDocument.currentWordCount.toLocaleString()} words • {activeDocument.citationStyle}
                </span>
              </div>
            </div>

            {/* Live Visual Academic Preview */}
            <div
              className={`p-8 sm:p-10 bg-white text-slate-900 border border-slate-200 rounded-lg shadow-inner text-sm space-y-6 max-h-[480px] overflow-y-auto custom-scrollbar ${
                (activeDocument.metadata?.visualPreferences?.designStyle || 'classic_academic') === 'classic_academic'
                  ? 'font-serif'
                  : 'font-sans'
              }`}
            >
              {/* Cover Page */}
              <div className="text-center space-y-4 pb-8 border-b border-dashed border-slate-300">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {activeDocument.metadata?.institution || 'INSTITUTION OF HIGHER LEARNING'}
                </p>
                <p className="text-[11px] uppercase text-slate-500">
                  {activeDocument.metadata?.faculty || activeDocument.metadata?.department || 'FACULTY OF ACADEMIC STUDIES'}
                </p>
                <div className="py-4">
                  <h1 className="text-xl font-bold uppercase tracking-wide leading-tight max-w-xl mx-auto">
                    {activeDocument.title}
                  </h1>
                  <p className="text-xs italic mt-2 text-slate-600">
                    A {activeDocument.docType.replace('_', ' ').toUpperCase()} SUBMITTED FOR {activeDocument.metadata?.courseCode || activeDocument.subject || 'ACADEMIC COURSE'}
                  </p>
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="text-[10px] text-slate-400 font-sans uppercase">BY</p>
                  <p className="font-bold">{activeDocument.metadata?.studentName || profile.name}</p>
                  {activeDocument.metadata?.studentId && <p className="text-slate-500">ID: {activeDocument.metadata.studentId}</p>}
                </div>
                {activeDocument.metadata?.lecturerName && (
                  <p className="text-xs pt-2 text-slate-600">
                    SUPERVISOR / LECTURER: <strong>{activeDocument.metadata.lecturerName}</strong>
                  </p>
                )}
                <p className="text-xs font-sans text-slate-400 pt-2">
                  {activeDocument.metadata?.submissionDate || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Sections & Body Content */}
              <div className="space-y-6">
                {activeDocument.sections.map((sec, idx) => (
                  <div key={sec.id} className="space-y-3">
                    <h2
                      className={`text-base font-bold uppercase tracking-wide pb-1 ${
                        (activeDocument.metadata?.visualPreferences?.designStyle || 'classic_academic') === 'classic_academic'
                          ? 'border-b border-slate-200 text-slate-900'
                          : 'border-b-2 border-blue-600 text-blue-950'
                      }`}
                    >
                      {sec.level === 1 ? `CHAPTER ${idx + 1}: ` : ''}{sec.title}
                    </h2>
                    <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap indent-6">
                      {sec.content || '[Section under active development]'}
                    </div>
                    {Array.isArray(sec.visuals) && sec.visuals.length > 0 && (
                      <div className="space-y-3 pt-1">
                        {sec.visuals.map((vis) => (
                          <StudioVisualCard
                            key={vis.id}
                            block={vis}
                            designStyle={activeDocument.metadata?.visualPreferences?.designStyle}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* References List */}
              {activeDocument.references.length > 0 && (
                <div className="pt-6 border-t border-slate-200 space-y-2">
                  <h2 className="text-base font-bold uppercase tracking-wide">REFERENCES</h2>
                  <div className="space-y-1.5 text-xs font-sans pl-6 -indent-6">
                    {activeDocument.references.map((ref) => (
                      <p key={ref.id} className="leading-relaxed">
                        {ref.authors} ({ref.year || 'n.d.'}). {ref.title}. {ref.doi && `https://doi.org/${ref.doi}`}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: PREMIUM UPGRADE PROMPT                           */}
      {/* ========================================================= */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
              <Crown size={24} />
            </div>

            <div className="space-y-1 max-w-sm mx-auto">
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                Scholar Plan Feature
              </span>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                Unlock KorsIQ Academic Studio
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Academic Studio provides multi-chapter dissertation planning, student outline approval, section-by-section writing, real source citations, and Word &amp; PDF export.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-left space-y-1.5 text-xs border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Multi-chapter Thesis, Term Paper &amp; Proposal generation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Source Citations: APA, Harvard, MLA &amp; IEEE styles</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Direct export to formatted Microsoft Word (.docx) &amp; PDF</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCheckoutPlan('studio');
                  setShowCheckoutModal(true);
                  setShowUpgradeModal(false);
                }}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors min-h-[44px]"
              >
                Upgrade to Academic Studio
              </button>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL 5: QUIET UPGRADE PROMPT (SPEC: ONE CARD, ONE PRIMARY BUTTON) */}
      {/* ========================================================= */}
      {showQuietUpgrade && (
        <div className="fixed inset-0 z-50 bg-[#111827]/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg max-w-sm w-full p-6 space-y-4 shadow-lg text-left">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
                Plus &amp; Studio Feature
              </span>
              <h3 className="font-bold text-base text-[#111827] dark:text-white">
                {showQuietUpgrade.feature}
              </h3>
              <p className="text-xs text-[#5B6472] dark:text-slate-400 leading-relaxed">
                {showQuietUpgrade.description}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCheckoutPlan(showQuietUpgrade.feature.includes('Version') ? 'studio' : 'plus');
                  setShowQuietUpgrade(null);
                  setShowCheckoutModal(true);
                }}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm min-h-[44px]"
              >
                See plans &amp; Upgrade
              </button>
              <button
                type="button"
                onClick={() => setShowQuietUpgrade(null)}
                className="w-full py-2 text-[#5B6472] hover:text-[#111827] text-xs font-medium cursor-pointer min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Visual Design Customisation for Existing Document */}
      {showVisualPrefsModal && activeDocument && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                  Optional Visual Design
                </span>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Customize Document Design &amp; Visuals
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVisualPrefsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <StudioVisualDesignPanel
              value={activeDocument.metadata?.visualPreferences || DEFAULT_VISUAL_PREFERENCES}
              onChange={(nextPrefs) => {
                persistDocument({
                  ...activeDocument,
                  metadata: {
                    ...activeDocument.metadata,
                    visualPreferences: nextPrefs,
                  },
                });
              }}
            />

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowVisualPrefsModal(false);
                  showToast('Visual design preferences saved. Newly generated or regenerated sections will use these settings.');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer min-h-[40px]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Checkout Modal */}
      <SubscriptionCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        initialPlan={checkoutPlan}
        currentProfile={profile}
        onSubscriptionUpdated={(upd) => {
          if (setProfile) setProfile(upd);
          setShowCheckoutModal(false);
          showToast(`Upgraded to ${upd.tier === 'studio' ? 'Academic Studio' : 'Plus'}! Workspace unlocked.`);
          handleStartCreation();
        }}
      />
    </div>
  );
};

export default AcademicStudio;
