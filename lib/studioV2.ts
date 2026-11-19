import {
  AcademicDocument,
  AcademicDocumentType,
  CitationStyle,
  StudioBrief,
  StudioContentBlock,
  StudioJob,
  StudioJobStep,
  StudioOutlineItem,
  StudioOutlineSectionKind,
  StudioReference,
  StudioSection,
  StudioVisualBlock,
} from '../types';

export const STUDIO_V2_LIMITS = {
  maxActiveJobsPerUser: 1,
  maxGenerationsPerDay: 5,
  maxTargetWords: 8000,
  stepLeaseMs: 55_000,
  stepTimeoutMs: 40_000,
  retrieveSourcesTimeoutMs: 22_000,
  perFileExtractTimeoutMs: 7_000,
  externalFetchTimeoutMs: 5_000,
  aiStepTimeoutMs: 38_000,
  visualStepTimeoutMs: 20_000,
  assemblyStepTimeoutMs: 15_000,
  maxExternalFetchRetries: 1,
  maxStepAttempts: 2,
  minSourcesByType: {
    assignment: 5,
    report: 8,
    project: 20,
    thesis: 20,
    term_paper: 8,
    seminar_paper: 8,
    lab_report: 5,
    proposal: 8,
    research_proposal: 8,
    literature_review: 12,
    case_study: 8,
    essay: 5,
    presentation: 5,
  } as Record<AcademicDocumentType, number>,
} as const;

export const STUDIO_DOWNLOAD_NOTICE = 'Review and cite your sources before submitting.';

export function getMinSourcesForType(docType: AcademicDocumentType): number {
  return STUDIO_V2_LIMITS.minSourcesByType[docType] ?? 5;
}

export function isStudioKillSwitchEnabled(env: Record<string, string | undefined> = {}): boolean {
  const raw = (env.STUDIO_V2_DISABLED || env.STUDIO_KILL_SWITCH || '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes';
}

export interface StudioLimitCheckInput {
  activeJobsCount: number;
  dailyGenerationsCount: number;
  targetWords: number;
  killSwitchEnabled?: boolean;
}

export function validateStudioLimits(input: StudioLimitCheckInput): { allowed: boolean; reason?: string } {
  if (input.killSwitchEnabled) {
    return {
      allowed: false,
      reason: 'Academic Studio generation is temporarily paused for maintenance. Please try again shortly.',
    };
  }
  if (input.activeJobsCount >= STUDIO_V2_LIMITS.maxActiveJobsPerUser) {
    return {
      allowed: false,
      reason: 'You already have a document generating. Wait for it to finish or cancel it before starting another.',
    };
  }
  if (input.dailyGenerationsCount >= STUDIO_V2_LIMITS.maxGenerationsPerDay) {
    return {
      allowed: false,
      reason: `You have reached the daily limit of ${STUDIO_V2_LIMITS.maxGenerationsPerDay} generations. Try again tomorrow.`,
    };
  }
  if (input.targetWords > STUDIO_V2_LIMITS.maxTargetWords) {
    return {
      allowed: false,
      reason: `Target length cannot exceed ${STUDIO_V2_LIMITS.maxTargetWords.toLocaleString()} words.`,
    };
  }
  return { allowed: true };
}

export function inferSectionKind(item: Pick<StudioOutlineItem, 'title' | 'kind'>): StudioOutlineSectionKind {
  if (item.kind) return item.kind;
  const lower = (item.title || '').trim().toLowerCase();
  if (/^cover(\s+page)?$|^title(\s+page|\s+slide)?$/.test(lower)) return 'cover';
  if (/^table of contents$|^outline(\s+slide)?$/.test(lower)) return 'toc';
  if (/^list of tables$/.test(lower)) return 'list_of_tables';
  if (/^list of figures$/.test(lower)) return 'list_of_figures';
  if (/^(certification|dedication|acknowledg(e)?ment(s)?|declaration|preface)$/.test(lower)) return 'front_matter';
  if (/^(abstract|executive summary)$/.test(lower)) return 'abstract';
  if (/^(references|bibliography|works cited)$/.test(lower)) return 'references';
  if (/^(appendi(x|ces))$/.test(lower)) return 'appendix';
  if (/conclusion|summary,\s*conclusion/.test(lower)) return 'conclusion';
  return 'body';
}

/**
 * Builds the deterministic background step plan from an approved outline and brief.
 * - Retrieval runs first.
 * - Body sections run in outline order; visuals follow their section when enabled.
 * - Abstract and Conclusion are written LAST from the finished body.
 * - Cover/front matter and final citation consistency pass run at the end.
 */
export function buildStudioJobPlan(
  outline: StudioOutlineItem[],
  brief: Pick<StudioBrief, 'fileFormat' | 'docType' | 'visualsEnabled'>
): StudioJobStep[] {
  const steps: Omit<StudioJobStep, 'index'>[] = [];
  const isSlides = brief.fileFormat === 'pptx' || brief.docType === 'presentation';

  steps.push({
    id: 'step_retrieve_sources',
    type: 'retrieve_sources',
    label: 'Retrieving verifiable sources',
    status: 'pending',
    attempts: 0,
  });

  const sorted = [...outline].sort((a, b) => a.order - b.order);
  const abstractItems: StudioOutlineItem[] = [];
  const conclusionItems: StudioOutlineItem[] = [];
  const bodyItems: StudioOutlineItem[] = [];

  for (const item of sorted) {
    const kind = inferSectionKind(item);
    if (kind === 'cover' || kind === 'toc' || kind === 'list_of_tables' || kind === 'list_of_figures' || kind === 'references') {
      continue;
    }
    if (kind === 'abstract') {
      abstractItems.push(item);
      continue;
    }
    if (kind === 'conclusion') {
      conclusionItems.push(item);
      continue;
    }
    bodyItems.push(item);
  }

  for (const item of bodyItems) {
    steps.push({
      id: `step_write_${item.id}`,
      type: 'write_section',
      label: isSlides ? `Writing slide: ${item.title}` : `Writing ${item.title}`,
      outlineItemId: item.id,
      status: 'pending',
      attempts: 0,
    });

    if (brief.visualsEnabled && item.plannedVisual) {
      steps.push({
        id: `step_visual_${item.id}`,
        type: 'generate_visual',
        label: `Preparing visual for ${item.title}`,
        outlineItemId: item.id,
        status: 'pending',
        attempts: 0,
      });
    }
  }

  // Abstract and Conclusion are always written LAST from the finished body
  for (const item of conclusionItems) {
    steps.push({
      id: `step_conclusion_${item.id}`,
      type: 'write_conclusion',
      label: `Writing ${item.title}`,
      outlineItemId: item.id,
      status: 'pending',
      attempts: 0,
    });
  }

  for (const item of abstractItems) {
    steps.push({
      id: `step_abstract_${item.id}`,
      type: 'write_abstract',
      label: `Writing ${item.title}`,
      outlineItemId: item.id,
      status: 'pending',
      attempts: 0,
    });
  }

  steps.push({
    id: 'step_cover_front_matter',
    type: 'cover_and_front_matter',
    label: 'Preparing cover page and front matter',
    status: 'pending',
    attempts: 0,
  });

  steps.push({
    id: 'step_final_consistency',
    type: 'final_consistency_pass',
    label: 'Formatting citations and checking consistency',
    status: 'pending',
    attempts: 0,
  });

  return steps.map((s, idx) => ({ ...s, index: idx }));
}

// ==========================================
// CITATION MATCHING & FORMATTING (NO AI)
// ==========================================

const CITATION_MARKER_REGEX = /\[@src:([a-zA-Z0-9_-]+)(?:,\s*([^\]]+))?\]/g;

export function extractCitationIds(text: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const regex = new RegExp(CITATION_MARKER_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text || '')) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function getShortAuthor(authors: string): string {
  const clean = (authors || 'Unknown').trim();
  if (!clean) return 'Unknown';
  const parts = clean.split(/;|,\s*&|\sand\s/i).map((p) => p.trim()).filter(Boolean);
  const firstAuthor = parts[0] || clean;
  const surname = firstAuthor.includes(',')
    ? firstAuthor.split(',')[0].trim()
    : firstAuthor.split(/\s+/).slice(-1)[0] || firstAuthor;

  if (parts.length === 1) return surname;
  if (parts.length === 2) {
    const second = parts[1].includes(',')
      ? parts[1].split(',')[0].trim()
      : parts[1].split(/\s+/).slice(-1)[0] || parts[1];
    return `${surname} & ${second}`;
  }
  return `${surname} et al.`;
}

export function formatInTextCitation(
  ref: StudioReference,
  style: CitationStyle,
  index1Based: number,
  locator?: string
): string {
  const author = getShortAuthor(ref.authors);
  const year = (ref.year || 'n.d.').trim();
  const loc = locator ? `, ${locator.trim()}` : '';

  switch (style) {
    case 'IEEE':
    case 'Vancouver':
      return `[${index1Based}${locator ? `, ${locator.trim()}` : ''}]`;
    case 'MLA':
      return `(${author.replace(' & ', ' and ')}${locator ? ` ${locator.trim()}` : ''})`;
    case 'Harvard':
    case 'Chicago':
      return `(${author.replace(' & ', ' and ')} ${year}${loc})`;
    case 'APA':
    case 'APA 7':
    default:
      return `(${author}, ${year}${loc})`;
  }
}

export function formatReferenceEntry(
  ref: StudioReference,
  style: CitationStyle,
  index1Based: number
): string {
  const authors = (ref.authors || 'Unknown Author').trim();
  const year = (ref.year || 'n.d.').trim();
  const title = (ref.title || 'Untitled Source').trim();
  const venue = ref.journal ? ` ${ref.journal}.` : ref.publisher ? ` ${ref.publisher}.` : '';
  const doiOrUrl = ref.doi
    ? `https://doi.org/${ref.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`
    : ref.url || ref.fileUrl || '';
  const webTag = ref.isWebSource ? ' [Web source]' : '';

  switch (style) {
    case 'IEEE':
      return `[${index1Based}] ${authors}, "${title},"${venue} ${year}.${doiOrUrl ? ` Available: ${doiOrUrl}` : ''}${webTag}`.trim();
    case 'Vancouver':
      return `${index1Based}. ${authors}. ${title}.${venue} ${year}.${doiOrUrl ? ` ${doiOrUrl}` : ''}${webTag}`.trim();
    case 'MLA':
      return `${authors}. "${title}."${venue} ${year}.${doiOrUrl ? ` ${doiOrUrl}.` : ''}${webTag}`.trim();
    case 'Chicago':
      return `${authors}. ${year}. "${title}."${venue}${doiOrUrl ? ` ${doiOrUrl}.` : ''}${webTag}`.trim();
    case 'Harvard':
      return `${authors} (${year}) '${title}',${venue}${doiOrUrl ? ` Available at: ${doiOrUrl}` : ''}${webTag}`.trim();
    case 'APA':
    case 'APA 7':
    default:
      return `${authors} (${year}). ${title}.${venue}${doiOrUrl ? ` ${doiOrUrl}` : ''}${webTag}`.trim();
  }
}

export interface ReconcileCitationsResult {
  updatedSections: StudioSection[];
  usedReferences: StudioReference[];
  formattedBibliography: string[];
  missingMarkerCount: number;
  uncitedSourceIds: string[];
}

/**
 * Replaces [@src:id] markers with formatted in-text citations in the chosen style.
 * Guarantees 1:1 correspondence: every in-text citation maps to a bibliography entry,
 * and every bibliography entry is cited at least once.
 */
export function reconcileCitationsAndReferences(
  sections: StudioSection[],
  references: StudioReference[],
  style: CitationStyle
): ReconcileCitationsResult {
  const refMap = new Map<string, StudioReference>();
  for (const r of references) {
    refMap.set(r.id, r);
  }

  const orderedUsedIds: string[] = [];
  const usedIndexMap = new Map<string, number>();

  const getOrAssignIndex = (id: string): number => {
    const existing = usedIndexMap.get(id);
    if (existing) return existing;
    const next = orderedUsedIds.length + 1;
    orderedUsedIds.push(id);
    usedIndexMap.set(id, next);
    return next;
  };

  let missingMarkerCount = 0;

  const updatedSections = sections.map((sec) => {
    const content = (sec.content || '').replace(
      new RegExp(CITATION_MARKER_REGEX.source, 'g'),
      (_full, rawId: string, locator?: string) => {
        const ref = refMap.get(rawId);
        if (!ref) {
          missingMarkerCount += 1;
          return '[source needed]';
        }
        const idx = getOrAssignIndex(rawId);
        return formatInTextCitation(ref, style, idx, locator);
      }
    );

    const missingInText = (content.match(/\[source needed\]/gi) || []).length;
    if (missingInText > 0 && !sec.content?.includes('[source needed]')) {
      // already counted above
    } else if (sec.content?.includes('[source needed]')) {
      missingMarkerCount += (sec.content.match(/\[source needed\]/gi) || []).length;
    }

    return {
      ...sec,
      content,
      wordCount: countWords(content),
    };
  });

  const usedReferences = orderedUsedIds
    .map((id) => refMap.get(id)!)
    .filter(Boolean);

  const formattedBibliography = usedReferences.map((ref, idx) =>
    formatReferenceEntry(ref, style, idx + 1)
  );

  const uncitedSourceIds = references
    .filter((r) => !usedIndexMap.has(r.id))
    .map((r) => r.id);

  return {
    updatedSections,
    usedReferences,
    formattedBibliography,
    missingMarkerCount,
    uncitedSourceIds,
  };
}

export function countWords(text: string): number {
  const trimmed = (text || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ==========================================
// VISUAL SCHEMA VALIDATION
// ==========================================

const VALID_VISUAL_KINDS = new Set([
  'chart',
  'diagram',
  'flowchart',
  'comparison_table',
  'infographic',
  'icon_callout',
  'illustration',
]);

export function validateVisualBlock(raw: unknown): {
  valid: boolean;
  block?: StudioVisualBlock;
  error?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Visual spec must be an object.' };
  }
  const v = raw as Record<string, any>;
  if (!VALID_VISUAL_KINDS.has(v.kind)) {
    return { valid: false, error: `Unsupported visual kind: ${String(v.kind)}` };
  }
  if (typeof v.title !== 'string' || !v.title.trim()) {
    return { valid: false, error: 'Visual spec requires a non-empty title.' };
  }

  if (v.kind === 'chart') {
    if (!Array.isArray(v.dataPoints) || v.dataPoints.length === 0) {
      return { valid: false, error: 'Chart visual requires non-empty dataPoints.' };
    }
    for (const dp of v.dataPoints) {
      if (!dp || typeof dp.label !== 'string' || typeof dp.value !== 'number' || !Number.isFinite(dp.value)) {
        return { valid: false, error: 'Chart dataPoints must have string labels and finite numeric values.' };
      }
    }
  }

  if (v.kind === 'comparison_table') {
    if (!Array.isArray(v.headers) || v.headers.length === 0 || !Array.isArray(v.rows) || v.rows.length === 0) {
      return { valid: false, error: 'Comparison table requires non-empty headers and rows.' };
    }
  }

  if (v.kind === 'flowchart' || v.kind === 'diagram') {
    const hasSteps = Array.isArray(v.steps) && v.steps.length > 0;
    const hasItems = Array.isArray(v.items) && v.items.length > 0;
    if (!hasSteps && !hasItems) {
      return { valid: false, error: 'Diagram/flowchart requires steps or items.' };
    }
  }

  const block: StudioVisualBlock = {
    id: typeof v.id === 'string' && v.id.trim() ? v.id : `vis_${Date.now()}`,
    kind: v.kind,
    title: v.title.trim(),
    caption: typeof v.caption === 'string' && v.caption.trim() ? v.caption.trim() : v.title.trim(),
    items: Array.isArray(v.items) ? v.items : undefined,
    steps: Array.isArray(v.steps) ? v.steps : undefined,
    chartType: v.chartType === 'line' ? 'line' : v.chartType === 'bar' ? 'bar' : undefined,
    xLabel: typeof v.xLabel === 'string' ? v.xLabel : undefined,
    yLabel: typeof v.yLabel === 'string' ? v.yLabel : undefined,
    dataPoints: Array.isArray(v.dataPoints) ? v.dataPoints : undefined,
    headers: Array.isArray(v.headers) ? v.headers : undefined,
    rows: Array.isArray(v.rows) ? v.rows : undefined,
  };

  return { valid: true, block };
}

// ==========================================
// STRUCTURED CONTENT BLOCKS CONVERTER
// ==========================================

export function sectionsToContentBlocks(
  doc: Pick<AcademicDocument, 'sections' | 'outline' | 'brief' | 'fileFormat'>
): StudioContentBlock[] {
  const blocks: StudioContentBlock[] = [];
  const outlineMap = new Map<string, StudioOutlineItem>();
  for (const item of doc.outline || []) {
    outlineMap.set(item.id, item);
  }

  const isSlides = doc.fileFormat === 'pptx' || doc.brief?.fileFormat === 'pptx';
  let tableCounter = 0;
  let figureCounter = 0;

  for (const sec of [...(doc.sections || [])].sort((a, b) => a.order - b.order)) {
    const outlineItem = outlineMap.get(sec.outlineItemId);
    const kind = outlineItem ? inferSectionKind(outlineItem) : 'body';
    if (kind === 'cover' || kind === 'toc' || kind === 'list_of_tables' || kind === 'list_of_figures' || kind === 'references') {
      continue;
    }

    const isFrontMatter = kind === 'front_matter' || kind === 'abstract';

    if (isSlides) {
      const lines = (sec.content || '')
        .split(/\r?\n/)
        .map((l) => l.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean);
      blocks.push({
        id: `blk_slide_${sec.id}`,
        sectionId: sec.id,
        type: 'slide',
        title: sec.title,
        bullets: lines.slice(0, 6),
        visual: sec.visuals?.[0],
      });
      continue;
    }

    blocks.push({
      id: `blk_h_${sec.id}`,
      sectionId: sec.id,
      type: 'heading',
      level: sec.level || 1,
      text: sec.title,
      isFrontMatter,
    });

    const lines = (sec.content || '').split(/\r?\n/);
    let i = 0;
    let listBuffer: { ordered: boolean; items: string[] } | null = null;

    const flushList = () => {
      if (listBuffer && listBuffer.items.length > 0) {
        blocks.push({
          id: `blk_list_${sec.id}_${blocks.length}`,
          sectionId: sec.id,
          type: 'list',
          ordered: listBuffer.ordered,
          items: listBuffer.items,
        });
      }
      listBuffer = null;
    };

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        flushList();
        i += 1;
        continue;
      }

      // Markdown table detection
      if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
        flushList();
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i += 1;
        }
        const parsed = tableLines
          .filter((tl) => !/^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(tl))
          .map((tl) => tl.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        if (parsed.length >= 2) {
          tableCounter += 1;
          blocks.push({
            id: `blk_tbl_${sec.id}_${tableCounter}`,
            sectionId: sec.id,
            type: 'table',
            caption: `Table ${tableCounter}: ${sec.title} Summary`,
            headers: parsed[0],
            rows: parsed.slice(1),
          });
        }
        continue;
      }

      const ulMatch = line.match(/^[-*]\s+(.+)$/);
      const olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (ulMatch || olMatch) {
        const ordered = Boolean(olMatch);
        const itemText = (ulMatch ? ulMatch[1] : olMatch![1]).trim();
        if (!listBuffer || listBuffer.ordered !== ordered) {
          flushList();
          listBuffer = { ordered, items: [] };
        }
        listBuffer.items.push(itemText);
        i += 1;
        continue;
      }

      flushList();
      const subHeading = line.match(/^(#{2,3})\s+(.+)$/);
      if (subHeading) {
        blocks.push({
          id: `blk_sh_${sec.id}_${blocks.length}`,
          sectionId: sec.id,
          type: 'heading',
          level: subHeading[1].length === 2 ? 2 : 3,
          text: subHeading[2].trim(),
          isFrontMatter,
        });
      } else {
        blocks.push({
          id: `blk_p_${sec.id}_${blocks.length}`,
          sectionId: sec.id,
          type: 'paragraph',
          text: line,
        });
      }
      i += 1;
    }
    flushList();

    for (const vis of sec.visuals || []) {
      if (vis.kind === 'comparison_table' && vis.headers && vis.rows) {
        tableCounter += 1;
        blocks.push({
          id: `blk_vtbl_${sec.id}_${tableCounter}`,
          sectionId: sec.id,
          type: 'table',
          caption: `Table ${tableCounter}: ${vis.caption || vis.title}`,
          headers: vis.headers,
          rows: vis.rows,
        });
      } else {
        figureCounter += 1;
        blocks.push({
          id: `blk_fig_${sec.id}_${figureCounter}`,
          sectionId: sec.id,
          type: 'figure',
          caption: `Figure ${figureCounter}: ${vis.caption || vis.title}`,
          visual: vis,
        });
      }
    }
  }

  return blocks;
}

// ==========================================
// JOB LEASE, CANCEL & RETRY HELPERS
// ==========================================

export function isJobLeaseExpired(
  job: Pick<StudioJob, 'status' | 'leaseUntil'>,
  nowMs: number = Date.now()
): boolean {
  if (job.status !== 'running' && job.status !== 'queued') return false;
  if (!job.leaseUntil) return true;
  const leaseMs = Date.parse(job.leaseUntil);
  if (!Number.isFinite(leaseMs)) return true;
  return leaseMs < nowMs;
}

export function applyStepCancel(job: StudioJob): StudioJob {
  return {
    ...job,
    status: 'cancelled',
    cancelRequested: true,
    leaseUntil: null,
    updatedAt: new Date().toISOString(),
  };
}

export function applyStepFailure(
  job: StudioJob,
  stepIndex: number,
  errorMessage: string
): {
  nextJob: StudioJob;
  willRetry: boolean;
  shouldUseFastFallback: boolean;
} {
  const plan = job.plan.map((s) => ({ ...s }));
  const step = plan[stepIndex];
  if (!step) {
    return {
      nextJob: {
        ...job,
        status: 'failed',
        error: errorMessage,
        leaseUntil: null,
        updatedAt: new Date().toISOString(),
      },
      willRetry: false,
      shouldUseFastFallback: false,
    };
  }

  const nextAttempts = (step.attempts || 0) + 1;
  if (nextAttempts < STUDIO_V2_LIMITS.maxStepAttempts) {
    step.attempts = nextAttempts;
    step.status = 'pending';
    step.error = errorMessage;
    return {
      nextJob: {
        ...job,
        plan,
        attempts: job.attempts + 1,
        leaseUntil: null,
        updatedAt: new Date().toISOString(),
      },
      willRetry: true,
      shouldUseFastFallback: true,
    };
  }

  // Max retries exhausted: flag this step as needs_attention and continue to next step
  step.attempts = nextAttempts;
  step.status = 'needs_attention';
  step.error = errorMessage;

  const nextStepIndex = stepIndex + 1;
  const isDone = nextStepIndex >= plan.length;
  const completedCount = plan.filter(
    (s) => s.status === 'completed' || s.status === 'needs_attention' || s.status === 'skipped'
  ).length;
  const progress = plan.length > 0 ? Math.round((completedCount / plan.length) * 100) : 100;

  return {
    nextJob: {
      ...job,
      plan,
      currentStep: nextStepIndex,
      progress,
      status: isDone ? 'completed_with_issues' : 'running',
      leaseUntil: null,
      updatedAt: new Date().toISOString(),
    },
    willRetry: false,
    shouldUseFastFallback: false,
  };
}

// ==========================================
// STRICT EDITOR MOUNTING GATE (NO PREMATURE EDITOR)
// ==========================================

export type StudioWorkspaceRenderMode =
  | 'none'
  | 'loading'
  | 'generating'
  | 'failed'
  | 'cancelled'
  | 'editor';

export interface StudioEditorGateResult {
  canMountEditor: boolean;
  mode: StudioWorkspaceRenderMode;
  relevantJob: StudioJob | null;
  hasPersistedContent: boolean;
}

export function hasPersistedDocumentContent(
  doc: Pick<AcademicDocument, 'sections' | 'contentBlocks'> | null | undefined
): boolean {
  if (!doc) return false;
  const hasSectionText = Array.isArray(doc.sections) && doc.sections.some((s) => (s.content || '').trim().length > 0);
  const hasBlocks = Array.isArray(doc.contentBlocks) && doc.contentBlocks.length > 0;
  return hasSectionText || hasBlocks;
}

/**
 * Determines whether the editable Academic Studio document editor and export controls
 * are allowed to mount for a given document and job list.
 *
 * Rules:
 * - Active generation (`queued` / `running`): NEVER mount editor or export controls.
 * - Failed or cancelled generation: NEVER mount editable editor or export controls.
 * - Completed (`completed` / `completed_with_issues`): Mount editor ONLY when persisted content is present.
 * - While job list is hydrating for an unfinished V2 document: show loading state (never flash editor).
 */
export function canMountStudioEditor(
  doc: Pick<AcademicDocument, 'id' | 'status' | 'sections' | 'contentBlocks' | 'brief'> | null | undefined,
  jobs: StudioJob[],
  isLoadingJobs: boolean = false
): StudioEditorGateResult {
  if (!doc || doc.status === 'planning') {
    return {
      canMountEditor: false,
      mode: 'none',
      relevantJob: null,
      hasPersistedContent: false,
    };
  }

  const hasContent = hasPersistedDocumentContent(doc);
  const docJobs = (jobs || [])
    .filter((j) => j.documentId === doc.id)
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));

  const activeJob = docJobs.find((j) => j.status === 'queued' || j.status === 'running') || null;
  if (activeJob) {
    return {
      canMountEditor: false,
      mode: 'generating',
      relevantJob: activeJob,
      hasPersistedContent: hasContent,
    };
  }

  const isV2Doc = Boolean(doc.brief && typeof doc.brief.title === 'string' && doc.brief.title.trim().length > 0);

  if (isLoadingJobs && isV2Doc && doc.status !== 'completed') {
    return {
      canMountEditor: false,
      mode: 'loading',
      relevantJob: null,
      hasPersistedContent: hasContent,
    };
  }

  const latestGenerateJob = docJobs.find((j) => j.jobKind === 'generate') || docJobs[0] || null;

  if (latestGenerateJob) {
    if (latestGenerateJob.status === 'failed') {
      return {
        canMountEditor: false,
        mode: 'failed',
        relevantJob: latestGenerateJob,
        hasPersistedContent: hasContent,
      };
    }
    if (latestGenerateJob.status === 'cancelled') {
      return {
        canMountEditor: false,
        mode: 'cancelled',
        relevantJob: latestGenerateJob,
        hasPersistedContent: hasContent,
      };
    }
    if (latestGenerateJob.status === 'completed' || latestGenerateJob.status === 'completed_with_issues') {
      if (hasContent) {
        return {
          canMountEditor: true,
          mode: 'editor',
          relevantJob: latestGenerateJob,
          hasPersistedContent: true,
        };
      }
      return {
        canMountEditor: false,
        mode: 'failed',
        relevantJob: latestGenerateJob,
        hasPersistedContent: false,
      };
    }
  }

  // Unfinished V2 doc whose job row hasn't arrived yet
  if (isV2Doc && doc.status === 'drafting' && !hasContent) {
    return {
      canMountEditor: false,
      mode: 'generating',
      relevantJob: null,
      hasPersistedContent: false,
    };
  }

  // Completed V2 doc or legacy Studio v1 doc (no V2 job)
  return {
    canMountEditor: true,
    mode: 'editor',
    relevantJob: null,
    hasPersistedContent: hasContent,
  };
}

/**
 * Sorts document sections into canonical academic reading order:
 * Front matter -> Abstract / Executive Summary -> Body sections (by outline/section order) -> Conclusion -> Appendix -> References.
 * Prevents Abstract (which is generated last from the finished body) from appearing after Conclusion.
 */
export function sortAcademicSections(
  sections: StudioSection[],
  outline?: StudioOutlineItem[]
): StudioSection[] {
  if (!Array.isArray(sections) || sections.length <= 1) return sections || [];
  const outlineOrderMap = new Map<string, number>();
  const outlineKindMap = new Map<string, StudioOutlineSectionKind>();
  (outline || []).forEach((item, idx) => {
    outlineOrderMap.set(item.id, typeof item.order === 'number' ? item.order : idx);
    outlineKindMap.set(item.id, inferSectionKind(item));
  });

  const bucketOf = (sec: StudioSection): number => {
    const kind =
      (sec.outlineItemId && outlineKindMap.get(sec.outlineItemId)) ||
      inferSectionKind({ title: sec.title });
    switch (kind) {
      case 'cover':
      case 'toc':
      case 'list_of_tables':
      case 'list_of_figures':
      case 'front_matter':
        return 0;
      case 'abstract':
        return 1;
      case 'body':
      case 'slide':
        return 2;
      case 'conclusion':
        return 3;
      case 'appendix':
        return 4;
      case 'references':
        return 5;
      default:
        return 2;
    }
  };

  return sections
    .map((sec, originalIdx) => ({ sec, originalIdx }))
    .sort((a, b) => {
      const ba = bucketOf(a.sec);
      const bb = bucketOf(b.sec);
      if (ba !== bb) return ba - bb;
      const oa = a.sec.outlineItemId && outlineOrderMap.has(a.sec.outlineItemId)
        ? outlineOrderMap.get(a.sec.outlineItemId)!
        : (typeof a.sec.order === 'number' ? a.sec.order : a.originalIdx);
      const ob = b.sec.outlineItemId && outlineOrderMap.has(b.sec.outlineItemId)
        ? outlineOrderMap.get(b.sec.outlineItemId)!
        : (typeof b.sec.order === 'number' ? b.sec.order : b.originalIdx);
      if (oa !== ob) return oa - ob;
      return a.originalIdx - b.originalIdx;
    })
    .map(({ sec }, idx) => ({ ...sec, order: idx + 1 }));
}

/**
 * Computes accurate outline completion metrics based on drafted sections.
 */
export function computeOutlineCompletion(sections: StudioSection[]): {
  completedCount: number;
  totalCount: number;
  percent: number;
} {
  const list = Array.isArray(sections) ? sections : [];
  const totalCount = list.length;
  if (totalCount === 0) return { completedCount: 0, totalCount: 0, percent: 0 };
  const completedCount = list.filter((s) => Boolean(s.content && s.content.trim().length > 0)).length;
  return {
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
  };
}

