import assert from 'node:assert/strict';
import {
  applyStepCancel,
  applyStepFailure,
  buildStudioJobPlan,
  extractCitationIds,
  getMinSourcesForType,
  isJobLeaseExpired,
  isStudioKillSwitchEnabled,
  reconcileCitationsAndReferences,
  STUDIO_V2_LIMITS,
  validateStudioLimits,
  validateVisualBlock,
} from './studioV2';
import { StudioJob, StudioOutlineItem, StudioReference, StudioSection } from '../types';

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

console.log('All studioV2 tests passed!');
