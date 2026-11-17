import JSZip from 'jszip';
import { AcademicDocument } from '../types';
import { renderVisualBlockToPng } from './visualRenderer';

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates an OpenXML (.docx) Blob from an AcademicDocument with
 * Title Page, Table of Contents, Numbered Headings, Tables, Optional Visuals, and Formatted References.
 */
export async function generateDocxBlob(doc: AcademicDocument): Promise<Blob> {
  const zip = new JSZip();
  const designStyle = doc.metadata?.visualPreferences?.designStyle || 'classic_academic';
  const isClassic = designStyle === 'classic_academic';
  const bodyFont = isClassic ? 'Times New Roman' : 'Calibri';
  const headingColor = isClassic ? '111827' : '1E3A8A';

  const mediaRels: Array<{ rId: string; target: string }> = [];
  let mediaCounter = 0;

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 4. word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}" w:cs="${bodyFont}"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="360" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="360" w:after="180"/>
      <w:jc w:val="${isClassic ? 'center' : 'left'}"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="${headingColor}"/>
      <w:sz w:val="32"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="${headingColor}"/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr>
      <w:spacing w:before="180" w:after="100"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:i/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>`
  );

  // 5. Build word/document.xml body XML
  let bodyXml = '';

  const meta = doc.metadata || {};
  const institution = meta.institution || 'INSTITUTION OF HIGHER LEARNING';
  const faculty = meta.faculty || meta.department || 'FACULTY OF ACADEMIC STUDIES';
  const studentName = meta.studentName || 'STUDENT RESEARCHER';
  const studentId = meta.studentId || '';
  const courseCode = meta.courseCode || doc.subject || '';
  const courseTitle = meta.courseTitle || doc.title || '';
  const lecturerName = meta.lecturerName || '';
  const submissionDate = meta.submissionDate || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // COVER / TITLE PAGE
  if (meta.includeCoverPage !== false) {
    bodyXml += `
      <!-- Cover Page Header -->
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="720" w:after="120"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(institution.toUpperCase())}</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="1440"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(faculty.toUpperCase())}</w:t></w:r>
      </w:p>

      <!-- Main Title -->
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="720" w:after="240"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>${escapeXml(doc.title.toUpperCase())}</w:t></w:r>
      </w:p>

      <!-- Purpose Subtitle -->
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="1800"/></w:pPr>
        <w:r><w:rPr><w:i/><w:sz w:val="22"/></w:rPr><w:t>A ${escapeXml(doc.docType.replace('_', ' ').toUpperCase())} SUBMITTED IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR ${escapeXml(courseCode.toUpperCase())}</w:t></w:r>
      </w:p>

      <!-- Student Details -->
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>BY</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>${escapeXml(studentName.toUpperCase())}</w:t></w:r>
      </w:p>
      ${studentId ? `
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="1000"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>MATRIC / ID: ${escapeXml(studentId)}</w:t></w:r>
      </w:p>` : `<w:p><w:pPr><w:spacing w:after="1000"/></w:pPr></w:p>`}

      <!-- Lecturer / Date -->
      ${lecturerName ? `
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>COURSE LECTURER / SUPERVISOR:</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="720"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(lecturerName)}</w:t></w:r>
      </w:p>` : ''}

      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="720"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(submissionDate.toUpperCase())}</w:t></w:r>
      </w:p>

      <!-- Page Break after Cover Page -->
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    `;
  }

  // TABLE OF CONTENTS (if enabled)
  if (meta.includeTableOfContents !== false && doc.outline && doc.outline.length > 0) {
    bodyXml += `
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="360"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>TABLE OF CONTENTS</w:t></w:r>
      </w:p>
    `;

    doc.outline.forEach((item, index) => {
      const indent = item.level === 1 ? '0' : item.level === 2 ? '360' : '720';
      const weight = item.level === 1 ? '<w:b/>' : '';
      bodyXml += `
        <w:p>
          <w:pPr><w:ind w:left="${indent}"/><w:spacing w:after="80"/></w:pPr>
          <w:r><w:rPr>${weight}<w:sz w:val="22"/></w:rPr><w:t>${item.level === 1 ? `CHAPTER ${index + 1}: ` : ''}${escapeXml(item.title)}</w:t></w:r>
        </w:p>
      `;
    });

    bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }

  // SECTIONS & CONTENT
  const sections = doc.sections || [];
  sections.forEach((section, sIdx) => {
    const isChapter = section.level === 1;
    
    // Add page break before major chapters (except first if no TOC/cover)
    if (isChapter && sIdx > 0) {
      bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    // Section Heading
    const styleVal = isChapter ? 'Heading1' : section.level === 2 ? 'Heading2' : 'Heading3';
    const headingSize = isChapter ? '32' : section.level === 2 ? '28' : '24';
    const headingPrefix = isChapter ? `CHAPTER ${sIdx + 1}: ` : '';

    bodyXml += `
      <w:p>
        <w:pPr><w:pStyle w:val="${styleVal}"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:sz w:val="${headingSize}"/></w:rPr>
          <w:t>${headingPrefix}${escapeXml(section.title)}</w:t>
        </w:r>
      </w:p>
    `;

    // Process Content Paragraphs
    if (section.content && section.content.trim()) {
      const rawParagraphs = section.content.split(/\n\s*\n/);
      rawParagraphs.forEach((pText) => {
        const trimmed = pText.trim();
        if (!trimmed) return;

        // Check if markdown table
        if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
          const rows = trimmed.split('\n').filter(r => r.trim().startsWith('|'));
          if (rows.length >= 2) {
            bodyXml += `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>`;
            rows.forEach((rowStr, rIdx) => {
              if (rowStr.includes('---')) return; // skip markdown divider
              bodyXml += `<w:tr>`;
              const cells = rowStr.split('|').filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1);
              cells.forEach(cellText => {
                const isHeader = rIdx === 0;
                bodyXml += `
                  <w:tc>
                    <w:tcPr><w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="120"/><w:right w:w="120"/></w:tcMar></w:tcPr>
                    <w:p>
                      <w:r><w:rPr>${isHeader ? '<w:b/>' : ''}<w:sz w:val="20"/></w:rPr><w:t>${escapeXml(cellText.trim())}</w:t></w:r>
                    </w:p>
                  </w:tc>
                `;
              });
              bodyXml += `</w:tr>`;
            });
            bodyXml += `</w:tbl>`;
            return;
          }
        }

        // Bullet point check
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n');
          items.forEach(item => {
            const cleanItem = item.replace(/^[-*]\s+/, '');
            bodyXml += `
              <w:p>
                <w:pPr><w:ind w:left="720"/></w:pPr>
                <w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>•  ${escapeXml(cleanItem)}</w:t></w:r>
              </w:p>
            `;
          });
          return;
        }

        // Standard Body Paragraph
        bodyXml += `
          <w:p>
            <w:pPr><w:ind w:firstLine="720"/><w:spacing w:after="180" w:line="360" w:lineRule="auto"/></w:pPr>
            <w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r>
          </w:p>
        `;
      });
    } else {
      bodyXml += `
        <w:p>
          <w:pPr><w:spacing w:after="180"/></w:pPr>
          <w:r><w:rPr><w:i/><w:color w:val="777777"/><w:sz w:val="22"/></w:rPr><w:t>[Section in development]</w:t></w:r>
        </w:p>
      `;
    }

    // Optional Visual Elements for this section (only when generated/enabled)
    if (Array.isArray(section.visuals) && section.visuals.length > 0) {
      section.visuals.forEach((vis) => {
        if (vis.kind === 'comparison_table' && vis.headers && vis.rows && vis.rows.length > 0) {
          bodyXml += `
            <w:p>
              <w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr>
              <w:r><w:rPr><w:b/><w:color w:val="${headingColor}"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(vis.title)}</w:t></w:r>
            </w:p>
            <w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:color="E2E8F0"/></w:tblBorders></w:tblPr>
              <w:tr>
                ${vis.headers
                  .map(
                    (h) => `
                  <w:tc>
                    <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="2563EB"/><w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar></w:tcPr>
                    <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(h)}</w:t></w:r></w:p>
                  </w:tc>`
                  )
                  .join('')}
              </w:tr>
              ${vis.rows
                .map(
                  (row, rIdx) => `
                <w:tr>
                  ${vis.headers!
                    .map(
                      (_, cIdx) => `
                    <w:tc>
                      <w:tcPr>${rIdx % 2 === 1 ? '<w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>' : ''}<w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar></w:tcPr>
                      <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(row[cIdx] ?? '')}</w:t></w:r></w:p>
                    </w:tc>`
                    )
                    .join('')}
                </w:tr>`
                )
                .join('')}
            </w:tbl>
          `;
          if (vis.caption) {
            bodyXml += `
              <w:p>
                <w:pPr><w:spacing w:before="60" w:after="180"/></w:pPr>
                <w:r><w:rPr><w:i/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(vis.caption)}</w:t></w:r>
              </w:p>
            `;
          }
          return;
        }

        const rendered = renderVisualBlockToPng(vis, designStyle);
        if (!rendered) return;

        mediaCounter += 1;
        const fileName = `visual_${mediaCounter}.png`;
        const rId = `rIdImg${mediaCounter}`;
        zip.file(`word/media/${fileName}`, dataUrlToUint8Array(rendered.dataUrl));
        mediaRels.push({ rId, target: `media/${fileName}` });

        // Fit cleanly within 6 inches (5486400 EMUs) wide, preserving aspect ratio
        const cx = 5486400;
        const cy = Math.round(cx * (rendered.height / rendered.width));

        bodyXml += `
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="180" w:after="80"/></w:pPr>
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="${cx}" cy="${cy}"/>
                  <wp:docPr id="${mediaCounter}" name="${escapeXml(vis.title)}"/>
                  <wp:cNvGraphicFramePr>
                    <a:graphicFrameLocks noChangeAspect="1"/>
                  </wp:cNvGraphicFramePr>
                  <a:graphic>
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic>
                        <pic:nvPicPr>
                          <pic:cNvPr id="${mediaCounter}" name="${escapeXml(fileName)}"/>
                          <pic:cNvPicPr/>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip r:embed="${rId}"/>
                          <a:stretch><a:fillRect/></a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
                          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="180"/></w:pPr>
            <w:r><w:rPr><w:i/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(vis.caption || vis.title)}</w:t></w:r>
          </w:p>
        `;
      });
    }
  });

  // REFERENCES / BIBLIOGRAPHY SECTION
  if (doc.references && doc.references.length > 0) {
    bodyXml += `
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>REFERENCES</w:t></w:r>
      </w:p>
    `;

    doc.references.forEach(ref => {
      let refText = '';
      if (doc.citationStyle === 'IEEE') {
        refText = `${ref.authors}, "${ref.title}", ${ref.year ? ref.year + '.' : ''} ${ref.doi ? `DOI: ${ref.doi}` : ''}`;
      } else {
        // APA / Harvard default
        refText = `${ref.authors} (${ref.year || 'n.d.'}). ${ref.title}. ${ref.doi ? `https://doi.org/${ref.doi}` : ''}`;
      }

      bodyXml += `
        <w:p>
          <w:pPr>
            <w:ind w:left="720" w:hanging="720"/>
            <w:spacing w:after="160" w:line="360" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="22"/></w:rPr>
            <w:t>${escapeXml(refText.trim())}</w:t>
          </w:r>
        </w:p>
      `;
    });
  }

  // 5b. [Content_Types].xml & word/_rels/document.xml.rels (include PNGs only if visuals were embedded)
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>${mediaRels.length > 0 ? '\n  <Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${mediaRels
    .map(
      (m) =>
        `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.target}"/>`
    )
    .join('\n  ')}
</Relationships>`
  );

  // 6. Complete word/document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * Triggers a native browser file download for the generated DOCX.
 */
export function downloadDocx(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
