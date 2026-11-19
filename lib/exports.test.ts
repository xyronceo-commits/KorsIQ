import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { AcademicDocument, DocumentTemplateId, SlideTemplateId } from '../types';
import { generateDocxBlob } from '../utils/docxExport';
import { generatePdfBlob, generatePdfDoc } from '../utils/pdfExport';
import { generatePptxBlob } from '../utils/pptxExport';
import {
  DEFAULT_DOCUMENT_TEMPLATE_ID,
  DEFAULT_SLIDE_TEMPLATE_ID,
  DOCUMENT_TEMPLATES,
  SLIDE_TEMPLATES,
  resolveDocumentTemplate,
  resolveSlideTemplate,
} from './studioTemplates';

function buildSampleDoc(
  sectionCount: number,
  paragraphsPerSection: number,
  overrides?: Partial<AcademicDocument>
): AcademicDocument {
  const paragraph =
    'Distributed consensus protocols ensure state machine replication across unreliable networks (Lamport, 1998). Fault tolerance requires quorum intersection across asynchronous rounds.';

  const sections = Array.from({ length: sectionCount }, (_, idx) => {
    const body = Array.from({ length: paragraphsPerSection }, () => paragraph).join('\n\n');
    const callout =
      idx === 0
        ? '\n\n> Key Finding: Quorum intersection guarantees safety across asynchronous network partitions.'
        : '';
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
      content: `${body}${callout}${table}`,
      wordCount: 500,
      citations: [],
      status: 'drafted' as const,
      lastEditedAt: new Date().toISOString(),
    };
  });

  const base: AcademicDocument = {
    id: 'doc_test_1',
    userId: 'user_1',
    title: 'Fault-Tolerant Distributed Systems in Academic Environments',
    docType: 'research_proposal',
    fileFormat: 'docx',
    subject: 'CSC 401',
    instructions: 'Formal academic tone',
    targetWordCount: 5000,
    currentWordCount: sectionCount * 500,
    citationStyle: 'APA',
    status: 'completed',
    outline: sections.map((s, i) => ({
      id: s.outlineItemId,
      title: s.title,
      level: 1,
      order: i,
      description: 'Core section',
      targetWords: 500,
      approved: true,
    })),
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
      includeTableOfContents: true,
      includeReferences: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  return {
    ...base,
    ...overrides,
    metadata: {
      ...base.metadata,
      ...(overrides?.metadata || {}),
    },
  };
}

async function readPdfHeader(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return Buffer.from(bytes.slice(0, 5)).toString('ascii');
}

describe('Template Registries & Defensive Resolution', () => {
  it('exposes exactly 5 document templates and 6 slide templates with required defaults', () => {
    assert.equal(DOCUMENT_TEMPLATES.length, 5);
    assert.equal(SLIDE_TEMPLATES.length, 6);
    assert.equal(DEFAULT_DOCUMENT_TEMPLATE_ID, 'university-standard');
    assert.equal(DEFAULT_SLIDE_TEMPLATE_ID, 'academic-classic');
  });

  it('falls back cleanly on null, undefined, unknown, and legacy template IDs', () => {
    assert.equal(resolveDocumentTemplate(undefined).id, 'university-standard');
    assert.equal(resolveDocumentTemplate(null).id, 'university-standard');
    assert.equal(resolveDocumentTemplate('unknown-template-xyz').id, 'university-standard');
    assert.equal(resolveDocumentTemplate(undefined, 'modern_clean').id, 'academic-clean');

    assert.equal(resolveSlideTemplate(undefined).id, 'academic-classic');
    assert.equal(resolveSlideTemplate(null).id, 'academic-classic');
    assert.equal(resolveSlideTemplate('nonexistent-deck').id, 'academic-classic');
  });

  it('exposes curated contrast-checked palettes for every document and slide template', () => {
    const docPaletteCounts = Object.fromEntries(
      DOCUMENT_TEMPLATES.map((t) => [t.id, t.palettes.length])
    );
    assert.deepEqual(docPaletteCounts, {
      'university-standard': 3,
      'academic-clean': 4,
      'technical-spec': 4,
      'seminar-editorial': 4,
      'executive-report': 4,
    });

    const slidePaletteCounts = Object.fromEntries(
      SLIDE_TEMPLATES.map((t) => [t.id, t.palettes.length])
    );
    assert.deepEqual(slidePaletteCounts, {
      'pure-minimal': 3,
      'academic-classic': 4,
      'technical-grid': 4,
      'seminar-editorial': 4,
      'modern-pitch': 5,
      'executive-dark': 4,
    });
  });

  it('resolves non-default curated palettes accurately and falls back cleanly on invalid palette IDs', () => {
    const emeraldExec = resolveDocumentTemplate('executive-report', 'emerald-corp');
    assert.equal(emeraldExec.id, 'executive-report');
    assert.equal(emeraldExec.activePaletteId, 'emerald-corp');
    assert.equal(emeraldExec.activePaletteName, 'Corporate Emerald');
    assert.equal(emeraldExec.colors.coverBg, '#064E3B');
    assert.equal(emeraldExec.colors.accent, '#059669');

    const terracottaDoc = resolveDocumentTemplate('seminar-editorial', 'terracotta-rust');
    assert.equal(terracottaDoc.activePaletteId, 'terracotta-rust');
    assert.equal(terracottaDoc.colors.accent, '#9A3412');

    // Unknown or cross-template paletteId falls back to template's default palette
    const fallbackDoc = resolveDocumentTemplate('executive-report', 'terracotta-rust');
    assert.equal(fallbackDoc.activePaletteId, 'executive-navy');
    assert.equal(fallbackDoc.colors.coverBg, '#0F2942');

    const luminousDark = resolveSlideTemplate('executive-dark', 'luminous-emerald');
    assert.equal(luminousDark.id, 'executive-dark');
    assert.equal(luminousDark.activePaletteId, 'luminous-emerald');
    assert.equal(luminousDark.colors.accent, '#10B981');
    assert.equal(luminousDark.colors.bg, '#0B1615');

    const crimsonPitch = resolveSlideTemplate('modern-pitch', 'signal-crimson');
    assert.equal(crimsonPitch.activePaletteId, 'signal-crimson');
    assert.equal(crimsonPitch.colors.accent, '#DC2626');

    // Cross-template or null paletteId on slide template falls back safely to default
    const fallbackSlide = resolveSlideTemplate('executive-dark', 'signal-crimson');
    assert.equal(fallbackSlide.activePaletteId, 'electric-blue');
    assert.equal(resolveSlideTemplate('executive-dark', null).activePaletteId, 'electric-blue');
  });
});

describe('Curated Palette Parity Across .docx, .pdf, and .pptx Exports', () => {
  it('applies non-default document palettes to .docx XML and A4 .pdf output', async () => {
    const doc = buildSampleDoc(2, 2, {
      fileFormat: 'docx',
      metadata: {
        documentTemplateId: 'executive-report',
        documentPaletteId: 'emerald-corp',
      },
    });

    const docxBlob = await generateDocxBlob(doc);
    assert.ok(docxBlob.size > 2000);
    const zip = await JSZip.loadAsync(await docxBlob.arrayBuffer());
    const docXml = await zip.file('word/document.xml')?.async('string');
    assert.ok(docXml && docXml.includes('064E3B'), 'Expected Corporate Emerald coverBg #064E3B in DOCX XML');
    assert.ok(docXml && docXml.includes('059669'), 'Expected Corporate Emerald accent #059669 in DOCX XML');

    const pdfBlob = generatePdfBlob(doc);
    assert.ok(pdfBlob.size > 1500);
    assert.equal(await readPdfHeader(pdfBlob), '%PDF-');

    const terracottaDoc = buildSampleDoc(2, 1, {
      fileFormat: 'pdf',
      metadata: {
        documentTemplateId: 'seminar-editorial',
        documentPaletteId: 'terracotta-rust',
      },
    });
    const terracottaDocx = await generateDocxBlob(terracottaDoc);
    const terracottaZip = await JSZip.loadAsync(await terracottaDocx.arrayBuffer());
    const terracottaXml = await terracottaZip.file('word/document.xml')?.async('string');
    assert.ok(terracottaXml && terracottaXml.includes('9A3412'), 'Expected Terracotta accent #9A3412 in DOCX XML');
    assert.equal(await readPdfHeader(generatePdfBlob(terracottaDoc)), '%PDF-');
  });

  it('applies non-default slide palettes to .pptx XML and 16:9 .pdf output', async () => {
    const darkEmeraldDeck = buildSampleDoc(3, 1, {
      docType: 'presentation',
      fileFormat: 'pptx',
      metadata: {
        slideTemplateId: 'executive-dark',
        slidePaletteId: 'luminous-emerald',
      },
    });

    const pptxBlob = await generatePptxBlob(darkEmeraldDeck);
    assert.ok(pptxBlob.size > 3000);
    const zip = await JSZip.loadAsync(await pptxBlob.arrayBuffer());
    const slide1Xml = await zip.file('ppt/slides/slide1.xml')?.async('string');
    assert.ok(slide1Xml && slide1Xml.includes('0B1615'), 'Expected Mint Emerald bg #0B1615 in slide1.xml');
    assert.ok(slide1Xml && slide1Xml.includes('10B981'), 'Expected Mint Emerald accent #10B981 in slide1.xml');

    const pdfBlob = generatePdfBlob(darkEmeraldDeck);
    assert.ok(pdfBlob.size > 1500);
    assert.equal(await readPdfHeader(pdfBlob), '%PDF-');

    const crimsonPitchDeck = buildSampleDoc(2, 1, {
      docType: 'presentation',
      fileFormat: 'pptx',
      metadata: {
        slideTemplateId: 'modern-pitch',
        slidePaletteId: 'signal-crimson',
      },
    });
    const crimsonZip = await JSZip.loadAsync(await (await generatePptxBlob(crimsonPitchDeck)).arrayBuffer());
    const crimsonSlide1 = await crimsonZip.file('ppt/slides/slide1.xml')?.async('string');
    assert.ok(crimsonSlide1 && crimsonSlide1.includes('DC2626'), 'Expected Signal Crimson accent #DC2626 in slide1.xml');
  });

  it('gracefully falls back during export when paletteId is invalid or missing', async () => {
    const doc = buildSampleDoc(1, 1, {
      metadata: {
        documentTemplateId: 'academic-clean',
        documentPaletteId: 'nonexistent-palette',
        slideTemplateId: 'academic-classic',
        slidePaletteId: 'nonexistent-palette',
      },
    });
    const docxZip = await JSZip.loadAsync(await (await generateDocxBlob(doc)).arrayBuffer());
    const docXml = await docxZip.file('word/document.xml')?.async('string');
    assert.ok(docXml && docXml.includes('1D4ED8'), 'Expected fallback to default University Blue accent #1D4ED8');

    const pptxZip = await JSZip.loadAsync(await (await generatePptxBlob(doc)).arrayBuffer());
    const slide1Xml = await pptxZip.file('ppt/slides/slide1.xml')?.async('string');
    assert.ok(slide1Xml && slide1Xml.includes('0F2942'), 'Expected fallback to default Academic Classic titleBg #0F2942');
  });
});

describe('Academic Studio Document Exports (.docx & .pdf across all 5 templates)', () => {
  for (const tpl of DOCUMENT_TEMPLATES) {
    it(`exports valid .docx and A4 portrait .pdf for document template "${tpl.id}"`, async () => {
      const doc = buildSampleDoc(2, 2, {
        fileFormat: 'docx',
        metadata: { documentTemplateId: tpl.id as DocumentTemplateId },
      });

      // 1. DOCX validation (valid OpenXML ZIP + template tokens reflected)
      const docxBlob = await generateDocxBlob(doc);
      assert.ok(docxBlob.size > 2000, `DOCX blob too small for ${tpl.id}`);
      const zip = await JSZip.loadAsync(await docxBlob.arrayBuffer());
      const docXml = await zip.file('word/document.xml')?.async('string');
      const stylesXml = await zip.file('word/styles.xml')?.async('string');
      const footerXml = await zip.file('word/footer1.xml')?.async('string');
      assert.ok(docXml && docXml.includes('w:body'), 'Missing word/document.xml');
      assert.ok(stylesXml && stylesXml.includes(tpl.fonts.body), `Styles missing font ${tpl.fonts.body}`);
      assert.ok(footerXml && footerXml.includes('PAGE'), 'Footer missing PAGE field');

      if (tpl.id === 'university-standard') {
        assert.ok(stylesXml.includes('Times New Roman'));
        assert.ok(stylesXml.includes('w:color w:val="000000"'));
      }
      if (tpl.id === 'executive-report') {
        assert.ok(docXml.includes('0F2942'), 'Executive banner cover fill missing in DOCX');
      }

      // 2. PDF validation (valid PDF header + A4 portrait geometry)
      const pdfDoc = generatePdfDoc(doc);
      const pageW = pdfDoc.internal.pageSize.getWidth();
      const pageH = pdfDoc.internal.pageSize.getHeight();
      assert.ok(pageH > pageW, `Expected A4 portrait for ${tpl.id}`);
      const pdfBlob = generatePdfBlob(doc);
      assert.ok(pdfBlob.size > 1500, `PDF blob too small for ${tpl.id}`);
      assert.equal(await readPdfHeader(pdfBlob), '%PDF-');
    });
  }

  it('exports a long (20+ page) document to DOCX and PDF without errors', async () => {
    const longDoc = buildSampleDoc(15, 18, {
      metadata: { documentTemplateId: 'academic-clean' },
    });
    const pdfBlob = generatePdfBlob(longDoc);
    assert.ok(pdfBlob.size > 5000);
    assert.equal(await readPdfHeader(pdfBlob), '%PDF-');

    const docxBlob = await generateDocxBlob(longDoc);
    assert.ok(docxBlob.size > 4000);
  });
});

describe('Academic Studio Slide Exports (.pptx & 16:9 .pdf across all 6 templates)', () => {
  for (const tpl of SLIDE_TEMPLATES) {
    it(`exports valid .pptx and 16:9 landscape .pdf for slide template "${tpl.id}"`, async () => {
      const deck = buildSampleDoc(3, 1, {
        docType: 'presentation',
        fileFormat: 'pptx',
        metadata: { slideTemplateId: tpl.id as SlideTemplateId },
        contentBlocks: [
          {
            id: 'blk_1',
            sectionId: 'sec_1',
            type: 'slide',
            title: 'Section 1: Analysis & Findings',
            bullets: ['Point 1', 'Point 2'],
            speakerNotes: 'Emphasize quorum safety during oral defense.',
          },
        ],
      });

      // 1. PPTX validation (valid ZIP + slides + notes)
      const pptxBlob = await generatePptxBlob(deck);
      assert.ok(pptxBlob.size > 3000, `PPTX blob too small for ${tpl.id}`);
      const zip = await JSZip.loadAsync(await pptxBlob.arrayBuffer());
      const slide1Xml = await zip.file('ppt/slides/slide1.xml')?.async('string');
      const slide2Xml = await zip.file('ppt/slides/slide2.xml')?.async('string');
      assert.ok(slide1Xml && slide1Xml.includes('Fault-Tolerant Distributed Systems'), `Missing title on slide 1 for ${tpl.id}`);
      assert.ok(slide2Xml && slide2Xml.includes('Section 1'), `Missing content on slide 2 for ${tpl.id}`);

      // Verify speaker notes XML generated
      const notesFiles = Object.keys(zip.files).filter((f) => f.startsWith('ppt/notesSlides/notesSlide'));
      assert.ok(notesFiles.length >= 1, `Expected speaker notes preserved for ${tpl.id}`);

      // 2. Slide PDF validation (16:9 landscape geometry)
      const pdfDoc = generatePdfDoc(deck);
      const pageW = pdfDoc.internal.pageSize.getWidth();
      const pageH = pdfDoc.internal.pageSize.getHeight();
      assert.ok(pageW > pageH, `Expected 16:9 landscape PDF for slide template ${tpl.id}`);
      assert.ok(Math.abs(pageW / pageH - 16 / 9) < 0.05, `Expected 16:9 ratio for ${tpl.id}`);

      const pdfBlob = generatePdfBlob(deck);
      assert.ok(pdfBlob.size > 1500, `Slide PDF blob too small for ${tpl.id}`);
      assert.equal(await readPdfHeader(pdfBlob), '%PDF-');
    });
  }
});

describe('Defensive Export Fallbacks (missing / null / unknown template IDs)', () => {
  it('succeeds across .docx, .pdf, and .pptx when template IDs are missing or invalid', async () => {
    const legacyDoc = buildSampleDoc(2, 1, {
      metadata: {
        documentTemplateId: 'bogus-doc-id' as any,
        slideTemplateId: 'bogus-slide-id' as any,
      },
    });
    const docxBlob = await generateDocxBlob(legacyDoc);
    const pdfBlob = generatePdfBlob(legacyDoc);
    const pptxBlob = await generatePptxBlob(legacyDoc);

    assert.ok(docxBlob.size > 2000);
    assert.ok(pdfBlob.size > 1500);
    assert.ok(pptxBlob.size > 3000);
    assert.equal(await readPdfHeader(pdfBlob), '%PDF-');

    const nullMetaDoc = buildSampleDoc(1, 1);
    delete (nullMetaDoc as any).metadata;
    delete (nullMetaDoc as any).brief;
    assert.ok((await generateDocxBlob(nullMetaDoc)).size > 1500);
    assert.ok(generatePdfBlob(nullMetaDoc).size > 1000);
    assert.ok((await generatePptxBlob(nullMetaDoc)).size > 2000);
  });
});
