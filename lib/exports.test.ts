import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AcademicDocument } from '../types';
import { generatePdfBlob } from '../utils/pdfExport';
import { generatePptxBlob } from '../utils/pptxExport';

function buildSampleDoc(sectionCount: number, paragraphsPerSection: number): AcademicDocument {
  const paragraph =
    'Distributed consensus protocols ensure state machine replication across unreliable networks (Lamport, 1998). Fault tolerance requires quorum intersection across asynchronous rounds.';

  const sections = Array.from({ length: sectionCount }, (_, idx) => {
    const body = Array.from({ length: paragraphsPerSection }, () => paragraph).join('\n\n');
    const table =
      idx === 0
        ? '\n\n| Metric | Value | Notes |\n| --- | --- | --- |\n| Latency | 12ms | Median |\n| Throughput | 4500 req/s | Peak |'
        : '';
    return {
      id: `sec_${idx + 1}`,
      outlineItemId: `out_${idx + 1}`,
      title: `Section ${idx + 1}: Analysis & Findings`,
      level: 1 as const,
      order: idx + 1,
      content: `${body}${table}`,
      wordCount: 500,
      citations: [],
      status: 'drafted' as const,
      lastEditedAt: new Date().toISOString(),
    };
  });

  return {
    id: 'doc_test_1',
    userId: 'user_1',
    title: 'Fault-Tolerant Distributed Systems in Academic Environments',
    docType: 'research_proposal',
    subject: 'CSC 401',
    instructions: 'Formal academic tone',
    targetWordCount: 5000,
    currentWordCount: sectionCount * 500,
    citationStyle: 'APA',
    status: 'drafting',
    outline: [],
    sections,
    references: [
      {
        id: 'ref_1',
        title: 'The Part-Time Parliament',
        authors: 'Lamport, L.',
        year: '1998',
        sourceType: 'journal',
        doi: '10.1145/279227.279229',
        verified: true,
      },
    ],
    metadata: {
      studentName: 'Ada Lovelace',
      institution: 'University of Lagos',
      courseCode: 'CSC 401',
      includeCoverPage: true,
      includeReferences: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

describe('Academic Studio PDF & PPTX Exports', () => {
  it('exports a short document with citations and tables to PDF and PPTX blobs', async () => {
    const doc = buildSampleDoc(2, 2);
    const pdfBlob = generatePdfBlob(doc);
    assert.ok(pdfBlob.size > 1000);

    const pptxBlob = await generatePptxBlob(doc);
    assert.ok(pptxBlob.size > 2000);
  });

  it('exports a long (20+ page) document to PDF and PPTX without errors', async () => {
    const longDoc = buildSampleDoc(15, 18);
    const pdfBlob = generatePdfBlob(longDoc);
    assert.ok(pdfBlob.size > 5000);

    const pptxBlob = await generatePptxBlob(longDoc);
    assert.ok(pptxBlob.size > 5000);
  });
});
