import assert from 'node:assert/strict';
import {
  applyStepCancel,
  applyStepFailure,
  buildStudioJobPlan,
  canMountStudioEditor,
  computeDocumentCardProgress,
  computeOutlineCompletion,
  computeWeeklyStudioQuota,
  extractCitationIds,
  getMinSourcesForType,
  isBetaLimitedStudioUser,
  isJobLeaseExpired,
  isStudioKillSwitchEnabled,
  pagesToTargetWords,
  parseStudioOutlineResponse,
  reconcileCitationsAndReferences,
  resolveTargetPagesForDoc,
  selectStudioHomeStatusBar,
  sortAcademicSections,
  STUDIO_V2_LIMITS,
  validateStudioLimits,
  validateVisualBlock,
  WORDS_PER_ACADEMIC_PAGE,
  wordsToEstimatedPages,
} from './studioV2';
import {
  executeStudioJobStep,
  retrieveSourcesWithDiagnostics,
} from './studioV2Server';
import {
  AcademicDocument,
  StudioBrief,
  StudioJob,
  StudioOutlineItem,
  StudioReference,
  StudioSection,
} from '../types';

// 1. Step planner: retrieval first, body sections, visuals, conclusion & abstract LAST
{
  const outline: StudioOutlineItem[] = [
    { id: 'o1', title: 'Cover Page', level: 1, order: 0, description: '', targetWords: 0, kind: 'cover', approved: true },
    { id: 'o2', title: 'Abstract', level: 1, order: 1, description: '', targetWords: 200, kind: 'abstract', approved: true },
    { id: 'o3', title: 'Table of Contents', level: 1, order: 2, description: '', targetWords: 0, kind: 'toc', approved: true },
    { id: 'o4', title: 'Chapter 1: Introduction', level: 1, order: 3, description: '', targetWords: 500, kind: 'body', approved: true },
    { id: 'o5', title: 'Chapter 2: Methodology', level: 1, order: 4, description: '', targetWords: 600, kind: 'body', plannedVisual: true, approved: true },
    { id: 'o6', title: 'Chapter 3: Conclusion', level: 1, order: 5, description: '', targetWords: 300, kind: 'conclusion', approved: true },
    { id: 'o7', title: 'References', level: 1, order: 6, description: '', targetWords: 0, kind: 'references', approved: true },
  ];

  const plan = buildStudioJobPlan(outline, {
    fileFormat: 'docx',
    docType: 'project',
    visualsEnabled: true,
  });

  assert.equal(plan[0].type, 'retrieve_sources');
  assert.equal(plan[1].type, 'write_section');
  assert.equal(plan[1].outlineItemId, 'o4');
  assert.equal(plan[2].type, 'write_section');
  assert.equal(plan[2].outlineItemId, 'o5');
  assert.equal(plan[3].type, 'generate_visual');
  assert.equal(plan[3].outlineItemId, 'o5');
  assert.equal(plan[4].type, 'write_conclusion');
  assert.equal(plan[5].type, 'write_abstract');
  assert.equal(plan[6].type, 'cover_and_front_matter');
  assert.equal(plan[7].type, 'final_consistency_pass');
}

// 2. Citation matching, formatting, [source needed], and 1:1 reference filtering
{
  const refs: StudioReference[] = [
    {
      id: '12',
      title: 'Deep Learning in Nigerian Agriculture',
      authors: 'Okonkwo, C.; Adeyemi, T.',
      year: '2024',
      sourceType: 'journal',
      doi: '10.1234/agri.2024',
      verified: true,
    },
    {
      id: '99',
      title: 'Unused Reference',
      authors: 'Doe, J.',
      year: '2020',
      sourceType: 'book',
      url: 'https://example.com',
      verified: true,
    },
  ];

  const sections: StudioSection[] = [
    {
      id: 's1',
      outlineItemId: 'o4',
      title: 'Introduction',
      level: 1,
      order: 0,
      content: 'Yields improved [@src:12]. Unknown claim [@src:404].',
      status: 'drafted',
      wordCount: 6,
      citations: [],
      lastEditedAt: '',
    },
  ];

  assert.deepEqual(extractCitationIds(sections[0].content), ['12', '404']);

  const apa = reconcileCitationsAndReferences(sections, refs, 'APA 7');
  assert.ok(apa.updatedSections[0].content.includes('(Okonkwo & Adeyemi, 2024)'));
  assert.ok(apa.updatedSections[0].content.includes('[source needed]'));
  assert.equal(apa.usedReferences.length, 1);
  assert.equal(apa.usedReferences[0].id, '12');
  assert.deepEqual(apa.uncitedSourceIds, ['99']);
  assert.equal(apa.missingMarkerCount, 1);
  assert.ok(apa.formattedBibliography[0].includes('https://doi.org/10.1234/agri.2024'));

  // Reformatting to IEEE produces [1]
  const ieee = reconcileCitationsAndReferences(sections, refs, 'IEEE');
  assert.ok(ieee.updatedSections[0].content.includes('[1]'));
  assert.ok(ieee.formattedBibliography[0].startsWith('[1]'));
}

// 3. Limits & minimum sources
{
  assert.equal(getMinSourcesForType('assignment'), 5);
  assert.equal(getMinSourcesForType('report'), 8);
  assert.equal(getMinSourcesForType('project'), 20);

  assert.equal(isStudioKillSwitchEnabled({ STUDIO_V2_DISABLED: 'true' }), true);
  assert.equal(isStudioKillSwitchEnabled({}), false);

  assert.equal(
    validateStudioLimits({ activeJobsCount: 1, dailyGenerationsCount: 0, targetWords: 1500 }).allowed,
    false
  );
  assert.equal(
    validateStudioLimits({ activeJobsCount: 0, dailyGenerationsCount: 5, targetWords: 1500 }).allowed,
    false
  );
  assert.equal(
    validateStudioLimits({
      activeJobsCount: 0,
      dailyGenerationsCount: 0,
      targetWords: STUDIO_V2_LIMITS.maxTargetWords + 1,
    }).allowed,
    false
  );
  assert.equal(
    validateStudioLimits({ activeJobsCount: 0, dailyGenerationsCount: 1, targetWords: 2000 }).allowed,
    true
  );
}

// 4. Visual schema validation
{
  assert.equal(
    validateVisualBlock({
      kind: 'chart',
      title: 'Enrollment Growth',
      dataPoints: [{ label: '2024', value: 120 }],
    }).valid,
    true
  );
  assert.equal(
    validateVisualBlock({
      kind: 'chart',
      title: 'Broken Chart',
      dataPoints: [{ label: '2024', value: Number.NaN }],
    }).valid,
    false
  );
  assert.equal(
    validateVisualBlock({
      kind: 'comparison_table',
      title: 'Methods',
      headers: ['Method', 'Accuracy'],
      rows: [['CNN', '94%']],
    }).valid,
    true
  );
}

// 5. Cancel, retry/fallback, and lease expiry
{
  const baseJob: StudioJob = {
    id: 'job_1',
    userId: 'user_1',
    documentId: 'doc_1',
    jobKind: 'generate',
    status: 'running',
    plan: [
      { id: 's0', index: 0, type: 'write_section', label: 'Intro', status: 'running', attempts: 0 },
      { id: 's1', index: 1, type: 'write_conclusion', label: 'Conclusion', status: 'pending', attempts: 0 },
    ],
    currentStep: 0,
    totalSteps: 2,
    progress: 0,
    cancelRequested: false,
    leaseUntil: new Date(Date.now() - 10_000).toISOString(),
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(isJobLeaseExpired(baseJob), true);

  // First failure triggers retry on fast model
  const fail1 = applyStepFailure(baseJob, 0, 'Timeout');
  assert.equal(fail1.willRetry, true);
  assert.equal(fail1.shouldUseFastFallback, true);
  assert.equal(fail1.nextJob.plan[0].status, 'pending');

  // Second failure flags needs_attention and moves to next step
  const fail2 = applyStepFailure(fail1.nextJob, 0, 'Model error');
  assert.equal(fail2.willRetry, false);
  assert.equal(fail2.nextJob.plan[0].status, 'needs_attention');
  assert.equal(fail2.nextJob.currentStep, 1);
  assert.equal(fail2.nextJob.status, 'running');

  // Cancel keeps partial draft and sets status to cancelled
  const cancelled = applyStepCancel(fail2.nextJob);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelRequested, true);
  assert.equal(cancelled.leaseUntil, null);
}

// ==========================================
// IN-MEMORY SUPABASE MOCK FOR PIPELINE TESTS
// ==========================================

function createMockSupabase(initial: {
  jobs?: Record<string, any>;
  docs?: Record<string, any>;
  userFiles?: any[];
}) {
  const tables: Record<string, any[]> = {
    studio_jobs: Object.values(initial.jobs || {}).map((r) => ({ ...r })),
    academic_documents: Object.values(initial.docs || {}).map((r) => ({ ...r })),
    user_files: (initial.userFiles || []).map((r) => ({ ...r })),
    user_notifications: [],
  };

  const makeQuery = (table: string) => {
    const filters: Array<(row: any) => boolean> = [];
    let pendingUpdate: Record<string, any> | null = null;
    let pendingInsert: Record<string, any> | null = null;

    const execute = async () => {
      const rows = tables[table] || [];
      if (pendingInsert) {
        rows.push({ ...pendingInsert });
        return { data: pendingInsert, error: null };
      }
      const matched = rows.filter((r) => filters.every((f) => f(r)));
      if (pendingUpdate) {
        for (const r of matched) {
          Object.assign(r, pendingUpdate);
        }
        return { data: matched, error: null };
      }
      return { data: matched, error: null };
    };

    const api: any = {
      select() {
        return api;
      },
      update(patch: Record<string, any>) {
        pendingUpdate = patch;
        return api;
      },
      insert(row: Record<string, any>) {
        pendingInsert = row;
        return execute();
      },
      eq(col: string, val: any) {
        filters.push((r) => r[col] === val);
        return api;
      },
      neq(col: string, val: any) {
        filters.push((r) => r[col] !== null && r[col] !== undefined && r[col] !== val);
        return api;
      },
      in(col: string, vals: any[]) {
        filters.push((r) => vals.includes(r[col]));
        return api;
      },
      async maybeSingle() {
        const res = await execute();
        return { data: Array.isArray(res.data) ? res.data[0] || null : res.data, error: res.error };
      },
      then(resolve: any, reject: any) {
        return execute().then(resolve, reject);
      },
    };
    return api;
  };

  return {
    tables,
    client: {
      from(table: string) {
        return makeQuery(table);
      },
    } as any,
  };
}

const sampleBrief: StudioBrief = {
  title: 'Solar Microgrids in Rural Nigeria',
  docType: 'assignment',
  courseCode: 'EEE 401',
  courseTitle: 'Power Systems',
  supervisorName: 'Dr. Bello',
  studentName: 'Adaeze Okafor',
  matricNumber: '20/1022',
  department: 'Electrical Engineering',
  faculty: 'Engineering',
  institution: 'University of Lagos',
  date: '19 November 2026',
  instructions: 'Discuss technical design and rural impact of solar microgrids.',
  citationStyle: 'APA 7',
  targetLength: 1000,
  lengthUnit: 'words',
  documentStyle: 'classic_academic',
  visualsEnabled: false,
  fileFormat: 'docx',
  uploadedMaterialIds: [],
};

const sampleOutline: StudioOutlineItem[] = [
  { id: 'o_cov', title: 'Cover Page', level: 1, order: 0, description: '', targetWords: 0, kind: 'cover', approved: true },
  { id: 'o_intro', title: 'Introduction', level: 1, order: 1, description: 'Introduce solar microgrids', targetWords: 300, kind: 'body', approved: true },
  { id: 'o_body', title: 'System Design', level: 1, order: 2, description: 'Analyze microgrid topology', targetWords: 400, kind: 'body', approved: true },
  { id: 'o_conc', title: 'Conclusion', level: 1, order: 3, description: 'Synthesize findings', targetWords: 200, kind: 'conclusion', approved: true },
  { id: 'o_ref', title: 'References', level: 1, order: 4, description: '', targetWords: 0, kind: 'references', approved: true },
];

async function runAsyncTests() {
  // 6. No uploaded resources + external lookup timeout/failure -> non-blocking fallback straight to drafting
  {
    const plan = buildStudioJobPlan(sampleOutline, {
      fileFormat: 'docx',
      docType: 'assignment',
      visualsEnabled: false,
    });
    const mock = createMockSupabase({
      docs: {
        doc_no_res: {
          id: 'doc_no_res',
          user_id: 'u1',
          title: sampleBrief.title,
          doc_type: sampleBrief.docType,
          instructions: sampleBrief.instructions,
          citation_style: 'APA 7',
          status: 'drafting',
          brief: sampleBrief,
          outline: sampleOutline,
          sections: [],
          references: [],
          metadata: {},
          file_format: 'docx',
        },
      },
      jobs: {
        job_no_res: {
          id: 'job_no_res',
          user_id: 'u1',
          document_id: 'doc_no_res',
          job_kind: 'generate',
          status: 'queued',
          plan,
          current_step: 0,
          total_steps: plan.length,
          progress: 0,
          cancel_requested: false,
          lease_until: null,
          attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    // External fetch fails (simulating network outage / timeout)
    const failingFetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as any;

    const aiPromptsSeen: string[] = [];
    const mockAI = async ({ messages }: any) => {
      aiPromptsSeen.push(messages[0]?.content || '');
      return 'Solar microgrids provide resilient decentralized electricity for rural communities [source needed].';
    };

    // Step 0: retrieve_sources must NOT stall or fail — must transition cleanly to step 1 (drafting)
    const step0 = await executeStudioJobStep({
      supabaseAdmin: mock.client,
      jobId: 'job_no_res',
      stepIndex: 0,
      runAICall: mockAI,
      baseUrl: 'http://localhost:3000',
      fetchImpl: failingFetch,
      autoTriggerNext: false,
    });
    assert.equal(step0.status, 'running');
    assert.equal(step0.nextStep, 1);
    assert.equal(step0.resourceStatus, 'fallback_no_sources');

    // Run remaining steps to full completion
    let curStep = step0.nextStep!;
    while (curStep < plan.length) {
      const res = await executeStudioJobStep({
        supabaseAdmin: mock.client,
        jobId: 'job_no_res',
        stepIndex: curStep,
        runAICall: mockAI,
        baseUrl: 'http://localhost:3000',
        fetchImpl: failingFetch,
        autoTriggerNext: false,
      });
      if (res.status === 'completed' || res.status === 'completed_with_issues') break;
      assert.equal(res.status, 'running');
      curStep = res.nextStep!;
    }

    const finalJob = mock.tables.studio_jobs[0];
    const finalDoc = mock.tables.academic_documents[0];
    assert.equal(finalJob.status, 'completed');
    assert.equal(finalJob.progress, 100);
    assert.equal(finalDoc.status, 'completed');
    assert.equal(finalDoc.sections.length, 3);
    assert.ok(finalDoc.content_blocks.length > 0);
    assert.equal(aiPromptsSeen.length, 3);
    // No fabricated references
    assert.equal(finalDoc.references.length, 0);
  }

  // 7. Multiple uploaded resources where item index 0 fails -> skips file 0 with warning, extracts files 1 & 2, passes text into drafting
  {
    const uploadedBrief: StudioBrief = {
      ...sampleBrief,
      uploadedMaterialIds: ['f0', 'f1', 'f2'],
    };

    const mock = createMockSupabase({
      userFiles: [
        { id: 'f0', user_id: 'u1', file_name: 'corrupted_first.pdf', file_type: 'application/pdf', storage_path: 'users/u1/corrupted.pdf', scan_status: null, uploaded_at: '2026-10-01T00:00:00Z' },
        { id: 'f1', user_id: 'u1', file_name: 'lecture_notes.txt', file_type: 'text/plain', storage_path: 'users/u1/lecture_notes.txt', scan_status: 'clean', uploaded_at: '2026-10-02T00:00:00Z' },
        { id: 'f2', user_id: 'u1', file_name: 'case_study.txt', file_type: 'text/plain', storage_path: 'users/u1/case_study.txt', scan_status: 'clean', uploaded_at: '2026-10-03T00:00:00Z' },
      ],
    });

    const mockDownload = async (_uid: string, storagePath: string) => {
      if (storagePath.includes('corrupted.pdf')) {
        throw new Error('Corrupted storage stream on index 0');
      }
      if (storagePath.includes('lecture_notes.txt')) {
        return { buffer: Buffer.from('Lecture notes: Hybrid PV-battery microgrids reduce diesel generator runtime by 60 percent in off-grid villages.') };
      }
      return { buffer: Buffer.from('Case study: Rural microgrid deployment in Ogun State achieved 98 percent uptime across 120 households.') };
    };

    // External lookup returns empty so we test uploaded file extraction cleanly
    const emptyFetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ results: [], message: { items: [] } }),
    })) as any;

    const retrieval = await retrieveSourcesWithDiagnostics({
      supabaseAdmin: mock.client,
      userId: 'u1',
      brief: uploadedBrief,
      fetchImpl: emptyFetch,
      downloadFileBuffer: mockDownload,
      bypassCache: true,
    });

    assert.equal(retrieval.failedFiles, 1);
    assert.equal(retrieval.processedFiles, 2);
    assert.equal(retrieval.references.length, 2);
    assert.equal(retrieval.resourceStatus, 'partial');
    assert.ok(retrieval.warnings.some((w) => w.includes('corrupted_first.pdf')));
    assert.ok(retrieval.references[0].contentSnippet?.includes('Hybrid PV-battery microgrids'));
    assert.ok(retrieval.references[1].contentSnippet?.includes('Ogun State'));
  }

  // 8. Partial external lookup failure (OpenAlex fails, Crossref succeeds) -> preserves verified sources & notes limitation
  {
    const partialFetch = (async (url: string) => {
      if (url.includes('openalex.org')) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: {
            items: [
              {
                title: ['Decentralized Renewable Grids in West Africa'],
                author: [{ family: 'Adebayo', given: 'K.' }],
                published: { 'date-parts': [[2025]] },
                DOI: '10.1000/microgrid.2025',
                abstract: 'Empirical study of village solar grids.',
              },
            ],
          },
        }),
      };
    }) as any;

    const retrieval = await retrieveSourcesWithDiagnostics({
      supabaseAdmin: null,
      userId: 'u1',
      brief: { ...sampleBrief, title: 'Unique Partial External Lookup Topic' },
      fetchImpl: partialFetch,
      bypassCache: true,
    });

    assert.equal(retrieval.references.length, 1);
    assert.equal(retrieval.references[0].verified, true);
    assert.equal(retrieval.references[0].doi, '10.1000/microgrid.2025');
    assert.equal(retrieval.resourceStatus, 'partial');
    assert.ok(retrieval.warnings.some((w) => w.includes('OpenAlex')));
  }

  // 9. Drafting failure preserves previously completed sections safely across retries
  {
    const plan = buildStudioJobPlan(sampleOutline, {
      fileFormat: 'docx',
      docType: 'assignment',
      visualsEnabled: false,
    });
    const mock = createMockSupabase({
      docs: {
        doc_fail_sec: {
          id: 'doc_fail_sec',
          user_id: 'u1',
          title: sampleBrief.title,
          doc_type: sampleBrief.docType,
          instructions: sampleBrief.instructions,
          citation_style: 'APA 7',
          status: 'drafting',
          brief: sampleBrief,
          outline: sampleOutline,
          sections: [],
          references: [],
          metadata: {},
          file_format: 'docx',
        },
      },
      jobs: {
        job_fail_sec: {
          id: 'job_fail_sec',
          user_id: 'u1',
          document_id: 'doc_fail_sec',
          job_kind: 'generate',
          status: 'queued',
          plan,
          current_step: 0,
          total_steps: plan.length,
          progress: 0,
          cancel_requested: false,
          lease_until: null,
          attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });

    const emptyFetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ results: [], message: { items: [] } }),
    })) as any;

    let aiCallCount = 0;
    const flakyAI = async () => {
      aiCallCount += 1;
      if (aiCallCount === 1) {
        return 'Completed Introduction paragraph safely persisted.';
      }
      // Section 2 fails on both initial attempt and fast retry
      throw new Error('Upstream model timeout on section 2');
    };

    // Step 0: retrieve_sources
    const s0 = await executeStudioJobStep({
      supabaseAdmin: mock.client,
      jobId: 'job_fail_sec',
      stepIndex: 0,
      runAICall: flakyAI,
      baseUrl: 'http://localhost:3000',
      fetchImpl: emptyFetch,
      autoTriggerNext: false,
    });
    assert.equal(s0.nextStep, 1);

    // Step 1 (Introduction): succeeds and persists
    const s1 = await executeStudioJobStep({
      supabaseAdmin: mock.client,
      jobId: 'job_fail_sec',
      stepIndex: 1,
      runAICall: flakyAI,
      baseUrl: 'http://localhost:3000',
      fetchImpl: emptyFetch,
      autoTriggerNext: false,
    });
    assert.equal(s1.nextStep, 2);
    assert.equal(mock.tables.academic_documents[0].sections.length, 1);
    assert.ok(mock.tables.academic_documents[0].sections[0].content.includes('safely persisted'));

    // Step 2 (System Design) attempt 1: fails -> retries on fast fallback, preserving section 1
    const s2a = await executeStudioJobStep({
      supabaseAdmin: mock.client,
      jobId: 'job_fail_sec',
      stepIndex: 2,
      runAICall: flakyAI,
      baseUrl: 'http://localhost:3000',
      fetchImpl: emptyFetch,
      autoTriggerNext: false,
    });
    assert.equal(s2a.status, 'retrying');
    assert.equal(mock.tables.academic_documents[0].sections.length, 1);
    assert.ok(mock.tables.academic_documents[0].sections[0].content.includes('safely persisted'));

    // Step 2 attempt 2: exhausts retries -> flags needs_attention, advances to step 3, STILL preserves section 1!
    const s2b = await executeStudioJobStep({
      supabaseAdmin: mock.client,
      jobId: 'job_fail_sec',
      stepIndex: 2,
      runAICall: flakyAI,
      baseUrl: 'http://localhost:3000',
      fetchImpl: emptyFetch,
      autoTriggerNext: false,
    });
    assert.equal(s2b.status, 'running');
    assert.equal(s2b.nextStep, 3);
    assert.equal(mock.tables.studio_jobs[0].plan[2].status, 'needs_attention');
    assert.equal(mock.tables.academic_documents[0].sections.length, 1);
    assert.ok(mock.tables.academic_documents[0].sections[0].content.includes('safely persisted'));
  }

  // 10. Strict Editor Mounting Gate (canMountStudioEditor)
  {
    const baseDoc: Pick<AcademicDocument, 'id' | 'status' | 'sections' | 'contentBlocks' | 'brief'> = {
      id: 'doc_gate',
      status: 'drafting',
      brief: sampleBrief,
      sections: [
        {
          id: 's1',
          outlineItemId: 'o_intro',
          title: 'Introduction',
          level: 1,
          order: 1,
          content: 'Partial drafted text while running.',
          status: 'drafted',
          wordCount: 5,
          citations: [],
          lastEditedAt: '',
        },
      ],
      contentBlocks: [],
    };

    const makeJob = (status: StudioJob['status']): StudioJob => ({
      id: 'j_gate',
      userId: 'u1',
      documentId: 'doc_gate',
      jobKind: 'generate',
      status,
      plan: [],
      currentStep: 0,
      totalSteps: 5,
      progress: status === 'completed' ? 100 : 20,
      cancelRequested: status === 'cancelled',
      leaseUntil: null,
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Active generation: editor MUST NOT mount even if partial sections exist
    const runningGate = canMountStudioEditor(baseDoc, [makeJob('running')], false);
    assert.equal(runningGate.canMountEditor, false);
    assert.equal(runningGate.mode, 'generating');

    const queuedGate = canMountStudioEditor(baseDoc, [makeJob('queued')], false);
    assert.equal(queuedGate.canMountEditor, false);
    assert.equal(queuedGate.mode, 'generating');

    // Failed generation: editor MUST NOT mount even if partial sections exist
    const failedGate = canMountStudioEditor(baseDoc, [makeJob('failed')], false);
    assert.equal(failedGate.canMountEditor, false);
    assert.equal(failedGate.mode, 'failed');

    // Cancelled generation: editor MUST NOT mount
    const cancelledGate = canMountStudioEditor(baseDoc, [makeJob('cancelled')], false);
    assert.equal(cancelledGate.canMountEditor, false);
    assert.equal(cancelledGate.mode, 'cancelled');

    // Hydrating jobs on refresh: never flash editor prematurely
    const loadingGate = canMountStudioEditor(baseDoc, [], true);
    assert.equal(loadingGate.canMountEditor, false);
    assert.equal(loadingGate.mode, 'loading');

    // Completed job WITHOUT persisted content: editor MUST NOT mount
    const emptyCompletedGate = canMountStudioEditor(
      { ...baseDoc, status: 'completed', sections: [], contentBlocks: [] },
      [makeJob('completed')],
      false
    );
    assert.equal(emptyCompletedGate.canMountEditor, false);
    assert.equal(emptyCompletedGate.mode, 'failed');

    // Completed job WITH persisted content: editor mounts cleanly
    const completedGate = canMountStudioEditor(
      { ...baseDoc, status: 'completed' },
      [makeJob('completed')],
      false
    );
    assert.equal(completedGate.canMountEditor, true);
    assert.equal(completedGate.mode, 'editor');
  }

  // 11. Canonical academic section ordering (Abstract before Introduction, Conclusion at end) & outline completion
  {
    const unordered: StudioSection[] = [
      { id: 's_intro', outlineItemId: 'o2', title: '1.0 Introduction', level: 1, order: 2, content: 'Intro text', wordCount: 2, citations: [], status: 'drafted', lastEditedAt: '' },
      { id: 's_conc', outlineItemId: 'o3', title: '10.0 Conclusion', level: 1, order: 10, content: 'Conclusion text', wordCount: 2, citations: [], status: 'drafted', lastEditedAt: '' },
      { id: 's_abs', outlineItemId: 'o1', title: 'Abstract', level: 1, order: 1, content: 'Abstract text', wordCount: 2, citations: [], status: 'drafted', lastEditedAt: '' },
    ];
    const sorted = sortAcademicSections(unordered);
    assert.deepEqual(
      sorted.map((s) => s.title),
      ['Abstract', '1.0 Introduction', '10.0 Conclusion']
    );

    const completion = computeOutlineCompletion([
      ...sorted,
      { id: 's_empty', outlineItemId: 'o4', title: 'Appendix', level: 1, order: 4, content: '   ', wordCount: 0, citations: [], status: 'empty', lastEditedAt: '' },
    ]);
    assert.equal(completion.completedCount, 3);
    assert.equal(completion.totalCount, 4);
    assert.equal(completion.percent, 75);
  }

  // 12. Beta-only 3/week Academic Studio generation limit (rolling 7 days)
  {
    const nowMs = Date.parse('2026-11-19T12:00:00.000Z');
    const dayMs = 24 * 60 * 60 * 1000;

    // Free beta user -> limited; paid subscriber & admin -> NOT limited
    assert.equal(
      isBetaLimitedStudioUser({ billingEnabled: false, tier: 'free', isPro: false, isAdmin: false, nowMs }),
      true
    );
    assert.equal(
      isBetaLimitedStudioUser({
        billingEnabled: false,
        tier: 'studio',
        isPro: true,
        subscriptionStatus: 'active',
        subscriptionEnd: new Date(nowMs + 10 * dayMs).toISOString(),
        isAdmin: false,
        nowMs,
      }),
      false
    );
    assert.equal(
      isBetaLimitedStudioUser({ billingEnabled: false, tier: 'free', isPro: false, isAdmin: true, nowMs }),
      false
    );

    const sampleJobs = [
      // 3 valid generate jobs within 7 days
      { job_kind: 'generate', status: 'completed', created_at: new Date(nowMs - 5 * dayMs).toISOString() },
      { job_kind: 'generate', status: 'completed_with_issues', created_at: new Date(nowMs - 3 * dayMs).toISOString() },
      { job_kind: 'generate', status: 'running', created_at: new Date(nowMs - 1 * dayMs).toISOString() },
      // Must NOT count: failed, cancelled, slide conversion, or older than 7 days
      { job_kind: 'generate', status: 'failed', created_at: new Date(nowMs - 2 * dayMs).toISOString() },
      { job_kind: 'generate', status: 'cancelled', created_at: new Date(nowMs - 1 * dayMs).toISOString() },
      { job_kind: 'convert_to_slides', status: 'completed', created_at: new Date(nowMs - 1 * dayMs).toISOString() },
      { job_kind: 'generate', status: 'completed', created_at: new Date(nowMs - 9 * dayMs).toISOString() },
    ];

    const betaQuota = computeWeeklyStudioQuota({ jobs: sampleJobs, isBetaLimited: true, nowMs });
    assert.equal(betaQuota.isBetaLimited, true);
    assert.equal(betaQuota.limit, 3);
    assert.equal(betaQuota.used, 3);
    assert.equal(betaQuota.remaining, 0);
    assert.equal(betaQuota.resetAt, new Date(nowMs + 2 * dayMs).toISOString());

    // Paid user unaffected
    const paidQuota = computeWeeklyStudioQuota({ jobs: sampleJobs, isBetaLimited: false, nowMs });
    assert.equal(paidQuota.isBetaLimited, false);
    assert.equal(paidQuota.limit, null);
    assert.equal(paidQuota.remaining, null);
  }

  // 13. 100% completion progress for completed / exported docs (no misleading 62%)
  {
    const completedShortWords = computeDocumentCardProgress({
      status: 'completed',
      currentWordCount: 4626,
      targetWordCount: 7450,
      sections: [],
      outline: [],
      metadata: {},
    });
    assert.equal(completedShortWords.isComplete, true);
    assert.equal(completedShortWords.percent, 100);
    assert.equal(completedShortWords.wordLabel, '~14 pages · Ready');

    const completedSlides = computeDocumentCardProgress({
      status: 'completed',
      docType: 'presentation',
      fileFormat: 'pptx',
      currentWordCount: 950,
      targetWordCount: 1080,
      sections: Array.from({ length: 9 }, (_, i) => ({
        id: `sl${i + 1}`,
        outlineItemId: `o${i + 1}`,
        title: `Slide ${i + 2}`,
        level: 1 as const,
        order: i + 1,
        content: 'Bullet point',
        wordCount: 90,
        citations: [],
        status: 'drafted' as const,
        lastEditedAt: '',
      })),
      outline: [],
      metadata: { preferredFormat: 'pptx' },
    });
    assert.equal(completedSlides.isComplete, true);
    assert.equal(completedSlides.percent, 100);
    assert.equal(completedSlides.wordLabel, '10 slides · Ready');

    const exportedDoc = computeDocumentCardProgress({
      status: 'drafting',
      currentWordCount: 1200,
      targetWordCount: 3000,
      sections: [],
      outline: [],
      metadata: { lastExportedAt: '2026-11-19T12:00:00.000Z' },
    });
    assert.equal(exportedDoc.isComplete, true);
    assert.equal(exportedDoc.percent, 100);

    const activeDraft = computeDocumentCardProgress(
      {
        status: 'drafting',
        currentWordCount: 4626,
        targetWordCount: 7450,
        sections: [{ id: 's1', outlineItemId: 'o1', title: 'Intro', level: 1, order: 1, content: 'Draft', wordCount: 4626, citations: [], status: 'drafted', lastEditedAt: '' }],
        outline: [],
        metadata: {},
      },
      true
    );
    assert.equal(activeDraft.isComplete, false);
    assert.equal(activeDraft.percent, 62);
  }

  // 14. Clean slim update strip on Studio home (no persistent completed stacks, deduped by doc+kind)
  {
    const makeHomeJob = (id: string, documentId: string, jobKind: StudioJob['jobKind'], status: StudioJob['status'], updatedAt: string): StudioJob => ({
      id,
      userId: 'u1',
      documentId,
      jobKind,
      status,
      plan: [],
      currentStep: 0,
      totalSteps: 2,
      progress: status === 'completed' ? 100 : 40,
      cancelRequested: false,
      attempts: 1,
      createdAt: updatedAt,
      updatedAt,
    });

    // Historical completed jobs (including duplicate slide conversions) -> render NOTHING
    const historicalOnly = selectStudioHomeStatusBar({
      jobs: [
        makeHomeJob('j1', 'd1', 'convert_to_slides', 'completed', '2026-11-19T10:00:00Z'),
        makeHomeJob('j2', 'd1', 'convert_to_slides', 'completed', '2026-11-19T10:05:00Z'),
        makeHomeJob('j3', 'd1', 'generate', 'completed', '2026-11-19T09:00:00Z'),
      ],
      sessionCompletedJobIds: [],
      dismissedJobIds: [],
    });
    assert.equal(historicalOnly, null);

    // Freshly completed in current session -> 1 strip; disappears when dismissed
    const fresh = selectStudioHomeStatusBar({
      jobs: [makeHomeJob('j2', 'd1', 'convert_to_slides', 'completed', '2026-11-19T10:05:00Z')],
      sessionCompletedJobIds: ['j2'],
      dismissedJobIds: [],
    });
    assert.equal(fresh?.mode, 'fresh_completed');
    assert.equal(fresh?.job.id, 'j2');

    const dismissed = selectStudioHomeStatusBar({
      jobs: [makeHomeJob('j2', 'd1', 'convert_to_slides', 'completed', '2026-11-19T10:05:00Z')],
      sessionCompletedJobIds: ['j2'],
      dismissedJobIds: ['j2'],
    });
    assert.equal(dismissed, null);

    // Active running job takes priority
    const active = selectStudioHomeStatusBar({
      jobs: [
        makeHomeJob('j2', 'd1', 'convert_to_slides', 'completed', '2026-11-19T10:05:00Z'),
        makeHomeJob('j4', 'd2', 'generate', 'running', '2026-11-19T10:06:00Z'),
      ],
      sessionCompletedJobIds: ['j2'],
      dismissedJobIds: [],
    });
    assert.equal(active?.mode, 'active');
    assert.equal(active?.job.id, 'j4');
  }

  // 15. Page-to-word budget math & legacy targetWordCount fallback
  {
    assert.equal(WORDS_PER_ACADEMIC_PAGE, 325);
    assert.equal(pagesToTargetWords(1), 325);
    assert.equal(pagesToTargetWords(0), 325);
    assert.equal(pagesToTargetWords(-5), 325);
    assert.equal(pagesToTargetWords(10), 3250);
    assert.equal(pagesToTargetWords(40), 13000);
    assert.equal(pagesToTargetWords(99), 13000);

    assert.equal(wordsToEstimatedPages(0), 1);
    assert.equal(wordsToEstimatedPages(325), 1);
    assert.equal(wordsToEstimatedPages(1625), 5);
    assert.equal(wordsToEstimatedPages(3250), 10);

    // Explicit targetPages on brief takes precedence
    assert.equal(
      resolveTargetPagesForDoc({
        targetWordCount: 9000,
        brief: { targetPages: 12, targetLength: 12, lengthUnit: 'pages' } as StudioBrief,
        metadata: {},
      }),
      12
    );

    // Legacy document with only targetWordCount (no targetPages) derives pages seamlessly
    assert.equal(
      resolveTargetPagesForDoc({
        targetWordCount: 3250,
        metadata: {},
      }),
      10
    );
  }

  // 16. Resilient outline JSON parsing (standard, markdown-fenced, top-level array, truncated error)
  {
    const standard = parseStudioOutlineResponse(
      JSON.stringify({
        outline: [
          { id: 'sec_1', title: 'Cover Page', level: 1, order: 0, kind: 'cover', description: 'Title', targetWords: 0, plannedVisual: false },
          { id: 'sec_2', title: 'Introduction', level: 1, order: 1, kind: 'body', description: 'Overview', targetWords: 450, plannedVisual: true },
        ],
      }),
      true
    );
    assert.equal(standard.length, 2);
    assert.equal(standard[1].plannedVisual, true);
    assert.equal(standard[1].targetWords, 450);

    const fencedArray = parseStudioOutlineResponse(
      '```json\n[{"title":"Title Slide","kind":"slide","targetWords":40,"plannedVisual":false},{"title":"Key Findings","kind":"slide","targetWords":90,"plannedVisual":true}]\n```',
      false
    );
    assert.equal(fencedArray.length, 2);
    assert.equal(fencedArray[1].plannedVisual, false);

    assert.throws(
      () => parseStudioOutlineResponse('{"outline":[{"id":"sec_1","title":"Truncated', false),
      /incomplete outline|truncated/i
    );
  }

  console.log('All studioV2 tests passed!');
}

runAsyncTests().catch((err) => {
  console.error('studioV2 tests FAILED:', err);
  process.exit(1);
});
