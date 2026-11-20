import JSZip from 'jszip';
import { AcademicDocument } from '../types';
import { renderVisualBlockToPng } from './visualRenderer';
import { formatReferenceEntry, inferSectionKind, STUDIO_DOWNLOAD_NOTICE } from '../lib/studioV2';
import { resolveDocumentCoverPage } from '../lib/studioCover';
import { latexToReadableMath } from '../lib/mathFormatter';
import {
  DocumentTemplate,
  documentTemplateToVisualPalette,
  getDocumentTemplateForDoc,
  stripHexHash,
} from '../lib/studioTemplates';

function formatDocxText(raw: string): string {
  return latexToReadableMath(raw || '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

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

function ptToHalfPt(pt: number): string {
  return String(Math.max(12, Math.round(pt * 2)));
}

function inToTwips(inches: number): string {
  return String(Math.max(360, Math.round(inches * 1440)));
}

function buildHeadingXml(
  text: string,
  level: 1 | 2 | 3,
  tpl: DocumentTemplate
): string {
  const styleVal = level === 1 ? 'Heading1' : level === 2 ? 'Heading2' : 'Heading3';
  const sizeVal = ptToHalfPt(level === 1 ? tpl.sizes.h1Pt : level === 2 ? tpl.sizes.h2Pt : tpl.sizes.h3Pt);
  const headingHex = stripHexHash(tpl.colors.heading, '000000');
  const accentHex = stripHexHash(tpl.colors.accent, '000000');
  const borderHex = stripHexHash(tpl.colors.border, 'CBD5E1');
  const headingFont = escapeXml(tpl.fonts.heading);

  let pBdr = '';
  let indXml = '';
  if (level === 1) {
    if (tpl.layout.headingRule === 'thin_bottom') {
      pBdr = `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="6" w:color="${accentHex}"/></w:pBdr>`;
    } else if (tpl.layout.headingRule === 'numbered_slate') {
      pBdr = `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="${borderHex}"/></w:pBdr>`;
    } else if (tpl.layout.headingRule === 'left_bar') {
      pBdr = `<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="${accentHex}"/></w:pBdr>`;
      indXml = `<w:ind w:left="140"/>`;
    } else if (tpl.layout.headingRule === 'editorial_serif') {
      pBdr = `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="6" w:color="${borderHex}"/></w:pBdr>`;
    }
  }

  const jcXml =
    level === 1 && tpl.layout.coverStyle === 'formal_centered'
      ? '<w:jc w:val="center"/>'
      : '<w:jc w:val="left"/>';

  return `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="${styleVal}"/>
        ${jcXml}
        ${indXml}
        ${pBdr}
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}" w:cs="${headingFont}"/>
          <w:b/>
          <w:color w:val="${headingHex}"/>
          <w:sz w:val="${sizeVal}"/>
          <w:szCs w:val="${sizeVal}"/>
        </w:rPr>
        <w:t>${escapeXml(text)}</w:t>
      </w:r>
    </w:p>
  `;
}

function buildTableXml(
  headers: string[],
  rows: string[][],
  tpl: DocumentTemplate,
  contentWidthTwips: number
): string {
  const borderHex = stripHexHash(tpl.colors.border, '000000');
  const headerBgHex = stripHexHash(tpl.colors.tableHeaderBg, 'FFFFFF');
  const headerTextHex = stripHexHash(tpl.colors.tableHeaderText, '000000');
  const stripeBgHex = stripHexHash(tpl.colors.tableStripeBg, 'FFFFFF');
  const textHex = stripHexHash(tpl.colors.text, '000000');
  const bodyFont = escapeXml(tpl.fonts.body);
  const cellSz = ptToHalfPt(Math.max(9.5, tpl.sizes.bodyPt - 1));
  const isStrictBlack = tpl.id === 'university-standard';

  const headerShd =
    headerBgHex !== 'FFFFFF'
      ? `<w:shd w:val="clear" w:color="auto" w:fill="${headerBgHex}"/>`
      : '';

  const outerBorder = isStrictBlack ? '6' : '4';

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${contentWidthTwips}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="${outerBorder}" w:color="${borderHex}"/>
          <w:bottom w:val="single" w:sz="${outerBorder}" w:color="${borderHex}"/>
          <w:left w:val="single" w:sz="${outerBorder}" w:color="${borderHex}"/>
          <w:right w:val="single" w:sz="${outerBorder}" w:color="${borderHex}"/>
          <w:insideH w:val="single" w:sz="4" w:color="${borderHex}"/>
          <w:insideV w:val="single" w:sz="4" w:color="${borderHex}"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        ${headers
          .map(
            (h) => `
          <w:tc>
            <w:tcPr>
              ${headerShd}
              <w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar>
            </w:tcPr>
            <w:p>
              <w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}" w:cs="${bodyFont}"/>
                  <w:b/>
                  <w:color w:val="${headerTextHex}"/>
                  <w:sz w:val="${cellSz}"/>
                  <w:szCs w:val="${cellSz}"/>
                </w:rPr>
                <w:t>${escapeXml(h)}</w:t>
              </w:r>
            </w:p>
          </w:tc>`
          )
          .join('')}
      </w:tr>
      ${rows
        .map((row, rIdx) => {
          const rowShd =
            rIdx % 2 === 1 && stripeBgHex !== 'FFFFFF'
              ? `<w:shd w:val="clear" w:color="auto" w:fill="${stripeBgHex}"/>`
              : '';
          return `
        <w:tr>
          ${headers
            .map(
              (_, cIdx) => `
            <w:tc>
              <w:tcPr>
                ${rowShd}
                <w:tcMar><w:top w:w="100"/><w:bottom w:w="100"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar>
              </w:tcPr>
              <w:p>
                <w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}" w:cs="${bodyFont}"/>
                    <w:color w:val="${textHex}"/>
                    <w:sz w:val="${cellSz}"/>
                    <w:szCs w:val="${cellSz}"/>
                  </w:rPr>
                  <w:t>${escapeXml(row[cIdx] ?? '')}</w:t>
                </w:r>
              </w:p>
            </w:tc>`
            )
            .join('')}
        </w:tr>`;
        })
        .join('')}
    </w:tbl>
  `;
}

function buildCalloutXml(text: string, tpl: DocumentTemplate): string {
  const accentHex = stripHexHash(tpl.colors.accent, '000000');
  const borderHex = stripHexHash(tpl.colors.border, '000000');
  const softHex = stripHexHash(tpl.colors.accentSoft, 'FFFFFF');
  const textHex = stripHexHash(tpl.colors.text, '000000');
  const bodyFont = escapeXml(tpl.fonts.body);
  const sz = ptToHalfPt(Math.max(10, tpl.sizes.bodyPt - 0.5));
  const shdXml = softHex !== 'FFFFFF' ? `<w:shd w:val="clear" w:color="auto" w:fill="${softHex}"/>` : '';
  const italicXml = tpl.layout.calloutStyle === 'editorial_quote' ? '<w:i/>' : '';
  const boxBorders =
    tpl.layout.calloutStyle === 'plain_border' || tpl.layout.calloutStyle === 'slate_box'
      ? `<w:top w:val="single" w:sz="4" w:space="6" w:color="${borderHex}"/><w:right w:val="single" w:sz="4" w:space="8" w:color="${borderHex}"/><w:bottom w:val="single" w:sz="4" w:space="6" w:color="${borderHex}"/>`
      : '';

  return `
    <w:p>
      <w:pPr>
        <w:ind w:left="360" w:right="240"/>
        <w:spacing w:before="140" w:after="160" w:line="300" w:lineRule="auto"/>
        ${shdXml}
        <w:pBdr>
          <w:left w:val="single" w:sz="18" w:space="10" w:color="${accentHex}"/>
          ${boxBorders}
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}" w:cs="${bodyFont}"/>
          ${italicXml}
          <w:color w:val="${textHex}"/>
          <w:sz w:val="${sz}"/>
          <w:szCs w:val="${sz}"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(text)}</w:t>
      </w:r>
    </w:p>
  `;
}

function buildCoverXml(
  doc: AcademicDocument,
  tpl: DocumentTemplate,
  contentWidthTwips: number,
  fields: {
    institution: string;
    faculty: string;
    studentName: string;
    studentId: string;
    courseCode: string;
    courseTitle: string;
    lecturerName: string;
    submissionDate: string;
  }
): string {
  const headingFont = escapeXml(tpl.fonts.heading);
  const bodyFont = escapeXml(tpl.fonts.body);
  const headingHex = stripHexHash(tpl.colors.heading, '000000');
  const textHex = stripHexHash(tpl.colors.text, '000000');
  const mutedHex = stripHexHash(tpl.colors.muted, '333333');
  const accentHex = stripHexHash(tpl.colors.accent, '000000');
  const borderHex = stripHexHash(tpl.colors.border, 'CBD5E1');
  const coverBgHex = stripHexHash(tpl.colors.coverBg, 'FFFFFF');
  const coverTextHex = stripHexHash(tpl.colors.coverText, '000000');
  const titleSz = ptToHalfPt(tpl.sizes.titlePt);
  const bodySz = ptToHalfPt(tpl.sizes.bodyPt);

  if (tpl.layout.coverStyle === 'executive_banner') {
    return `
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="${contentWidthTwips}" w:type="dxa"/>
          <w:tblBorders>
            <w:top w:val="none"/><w:left w:val="none"/><w:right w:val="none"/>
            <w:bottom w:val="single" w:sz="24" w:color="${accentHex}"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:shd w:val="clear" w:color="auto" w:fill="${coverBgHex}"/>
              <w:tcMar><w:top w:w="560"/><w:bottom w:w="560"/><w:left w:w="420"/><w:right w:w="420"/></w:tcMar>
            </w:tcPr>
            <w:p>
              <w:pPr><w:spacing w:after="120"/></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}"/><w:color w:val="${coverTextHex}"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(fields.institution.toUpperCase())}</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:spacing w:after="180"/></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}"/><w:b/><w:color w:val="${coverTextHex}"/><w:sz w:val="${titleSz}"/></w:rPr><w:t>${escapeXml(doc.title)}</w:t></w:r>
            </w:p>
            <w:p>
              <w:pPr><w:spacing w:after="0"/></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}"/><w:color w:val="${coverTextHex}"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml([fields.courseCode, fields.courseTitle].filter(Boolean).join(' — ') || doc.docType.replace('_', ' '))}</w:t></w:r>
            </w:p>
          </w:tc>
        </w:tr>
      </w:tbl>
      <w:p><w:pPr><w:spacing w:before="480" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="24"/></w:rPr><w:t>Prepared By</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="${bodySz}"/></w:rPr><w:t>${escapeXml(fields.studentName)}${fields.studentId ? ` (${escapeXml(fields.studentId)})` : ''}</w:t></w:r></w:p>
      <w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(fields.faculty)}</w:t></w:r></w:p>
      ${fields.lecturerName ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="20"/></w:rPr><w:t>Supervisor / Lecturer: ${escapeXml(fields.lecturerName)}</w:t></w:r></w:p>` : ''}
      <w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${accentHex}"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(fields.submissionDate)}</w:t></w:r></w:p>
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    `;
  }

  if (tpl.layout.coverStyle === 'technical_compact') {
    const metaRows = [
      ['Course', [fields.courseCode, fields.courseTitle].filter(Boolean).join(' — ') || 'N/A'],
      ['Author', `${fields.studentName}${fields.studentId ? ` (${fields.studentId})` : ''}`],
      ['Department', fields.faculty],
      ['Institution', fields.institution],
      ...(fields.lecturerName ? [['Supervisor', fields.lecturerName]] : []),
      ['Date', fields.submissionDate],
    ];
    return `
      <w:p>
        <w:pPr>
          <w:spacing w:before="240" w:after="120"/>
          <w:pBdr><w:bottom w:val="single" w:sz="12" w:space="6" w:color="${accentHex}"/></w:pBdr>
        </w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}"/><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="${titleSz}"/></w:rPr><w:t>${escapeXml(doc.title)}</w:t></w:r>
      </w:p>
      <w:p><w:pPr><w:spacing w:after="280"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(doc.docType.replace('_', ' ').toUpperCase())} · TECHNICAL SPECIFICATION</w:t></w:r></w:p>
      ${buildTableXml(['Field', 'Details'], metaRows, tpl, contentWidthTwips)}
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    `;
  }

  if (tpl.layout.coverStyle === 'editorial_left') {
    return `
      <w:p>
        <w:pPr>
          <w:spacing w:before="960" w:after="100"/>
          <w:ind w:left="240"/>
          <w:pBdr><w:left w:val="single" w:sz="24" w:space="12" w:color="${accentHex}"/></w:pBdr>
        </w:pPr>
        <w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml([fields.courseCode, fields.institution].filter(Boolean).join(' · ').toUpperCase())}</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr>
          <w:spacing w:after="200"/>
          <w:ind w:left="240"/>
          <w:pBdr><w:left w:val="single" w:sz="24" w:space="12" w:color="${accentHex}"/></w:pBdr>
        </w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}"/><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="${titleSz}"/></w:rPr><w:t>${escapeXml(doc.title)}</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr>
          <w:spacing w:after="720"/>
          <w:ind w:left="240"/>
          <w:pBdr><w:left w:val="single" w:sz="24" w:space="12" w:color="${accentHex}"/></w:pBdr>
        </w:pPr>
        <w:r><w:rPr><w:i/><w:color w:val="${mutedHex}"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(fields.faculty)}</w:t></w:r>
      </w:p>
      <w:p><w:pPr><w:spacing w:before="480" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${textHex}"/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(fields.studentName)}</w:t></w:r></w:p>
      ${fields.studentId ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="20"/></w:rPr><w:t>ID: ${escapeXml(fields.studentId)}</w:t></w:r></w:p>` : ''}
      ${fields.lecturerName ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="20"/></w:rPr><w:t>Instructor: ${escapeXml(fields.lecturerName)}</w:t></w:r></w:p>` : ''}
      <w:p><w:pPr><w:spacing w:before="240"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(fields.submissionDate)}</w:t></w:r></w:p>
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    `;
  }

  if (tpl.layout.coverStyle === 'clean_academic') {
    return `
      <w:p>
        <w:pPr>
          <w:spacing w:before="480" w:after="160"/>
          <w:pBdr><w:top w:val="single" w:sz="18" w:space="12" w:color="${accentHex}"/></w:pBdr>
        </w:pPr>
        <w:r><w:rPr><w:b/><w:color w:val="${accentHex}"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(fields.institution.toUpperCase())}</w:t></w:r>
      </w:p>
      <w:p><w:pPr><w:spacing w:after="480"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(fields.faculty)}</w:t></w:r></w:p>
      <w:p>
        <w:pPr><w:spacing w:before="240" w:after="240"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}"/><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="${titleSz}"/></w:rPr><w:t>${escapeXml(doc.title)}</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr>
          <w:spacing w:before="360" w:after="120"/>
          <w:pBdr><w:top w:val="single" w:sz="6" w:space="10" w:color="${borderHex}"/></w:pBdr>
        </w:pPr>
        <w:r><w:rPr><w:b/><w:color w:val="${textHex}"/><w:sz w:val="22"/></w:rPr><w:t>Prepared by: ${escapeXml(fields.studentName)}${fields.studentId ? ` (${escapeXml(fields.studentId)})` : ''}</w:t></w:r>
      </w:p>
      ${fields.courseCode ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="22"/></w:rPr><w:t>Course: ${escapeXml([fields.courseCode, fields.courseTitle].filter(Boolean).join(' — '))}</w:t></w:r></w:p>` : ''}
      ${fields.lecturerName ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="22"/></w:rPr><w:t>Lecturer / Supervisor: ${escapeXml(fields.lecturerName)}</w:t></w:r></w:p>` : ''}
      <w:p><w:pPr><w:spacing w:before="240"/></w:pPr><w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(fields.submissionDate)}</w:t></w:r></w:p>
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    `;
  }

  // formal_centered (Strict University Standard — pure black & white)
  return `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="720" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(fields.institution.toUpperCase())}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="1440"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(fields.faculty.toUpperCase())}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="720" w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="${titleSz}"/></w:rPr><w:t>${escapeXml(doc.title.toUpperCase())}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="1600"/></w:pPr>
      <w:r><w:rPr><w:i/><w:color w:val="${textHex}"/><w:sz w:val="24"/></w:rPr><w:t>A ${escapeXml(doc.docType.replace('_', ' ').toUpperCase())} SUBMITTED IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR ${escapeXml((fields.courseCode || 'THE COURSE').toUpperCase())}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
      <w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="24"/></w:rPr><w:t>BY</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="26"/></w:rPr><w:t>${escapeXml(fields.studentName.toUpperCase())}</w:t></w:r>
    </w:p>
    ${fields.studentId ? `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="900"/></w:pPr>
      <w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="24"/></w:rPr><w:t>MATRIC / ID: ${escapeXml(fields.studentId)}</w:t></w:r>
    </w:p>` : `<w:p><w:pPr><w:spacing w:after="900"/></w:pPr></w:p>`}
    ${fields.lecturerName ? `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr>
      <w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="22"/></w:rPr><w:t>COURSE LECTURER / SUPERVISOR:</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="720"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(fields.lecturerName)}</w:t></w:r>
    </w:p>` : ''}
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="600"/></w:pPr>
      <w:r><w:rPr><w:b/><w:color w:val="${textHex}"/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(fields.submissionDate.toUpperCase())}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
  `;
}

/**
 * Generates an OpenXML (.docx) Blob from an AcademicDocument using the active
 * DocumentTemplate from lib/documentTemplates.ts (A4 portrait, WYSIWYG parity).
 */
export async function generateDocxBlob(doc: AcademicDocument): Promise<Blob> {
  const zip = new JSZip();
  const tpl = getDocumentTemplateForDoc(doc);
  const visualPalette = documentTemplateToVisualPalette(tpl);

  const bodyFont = escapeXml(tpl.fonts.body);
  const headingFont = escapeXml(tpl.fonts.heading);
  const textHex = stripHexHash(tpl.colors.text, '000000');
  const headingHex = stripHexHash(tpl.colors.heading, '000000');
  const mutedHex = stripHexHash(tpl.colors.muted, '475569');
  const borderHex = stripHexHash(tpl.colors.border, 'CBD5E1');
  const bodySz = ptToHalfPt(tpl.sizes.bodyPt);
  const captionSz = ptToHalfPt(tpl.sizes.captionPt);

  const effectiveSpacing = doc.brief?.spacing === 'double' ? 2.0 : tpl.lineSpacing;
  const lineSpacingVal = String(Math.round(effectiveSpacing * 240));

  // A4 portrait dimensions in twips: 210mm x 297mm = 11906 x 16838
  const pageWidthTwips = 11906;
  const pageHeightTwips = 16838;
  const marginTop = inToTwips(tpl.marginsIn.top);
  const marginRight = inToTwips(tpl.marginsIn.right);
  const marginBottom = inToTwips(tpl.marginsIn.bottom);
  const marginLeft = inToTwips(tpl.marginsIn.left);
  const contentWidthTwips = Math.max(
    5000,
    pageWidthTwips - Number(marginLeft) - Number(marginRight)
  );

  const mediaRels: Array<{ rId: string; target: string }> = [];
  let mediaCounter = 0;

  // 1. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 2. word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}" w:cs="${bodyFont}"/>
        <w:color w:val="${textHex}"/>
        <w:sz w:val="${bodySz}"/>
        <w:szCs w:val="${bodySz}"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="${lineSpacingVal}" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="320" w:after="160"/>
      <w:jc w:val="${tpl.layout.coverStyle === 'formal_centered' ? 'center' : 'left'}"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}" w:cs="${headingFont}"/>
      <w:b/>
      <w:color w:val="${headingHex}"/>
      <w:sz w:val="${ptToHalfPt(tpl.sizes.h1Pt)}"/>
      <w:szCs w:val="${ptToHalfPt(tpl.sizes.h1Pt)}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:spacing w:before="220" w:after="100"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}" w:cs="${headingFont}"/>
      <w:b/>
      <w:color w:val="${headingHex}"/>
      <w:sz w:val="${ptToHalfPt(tpl.sizes.h2Pt)}"/>
      <w:szCs w:val="${ptToHalfPt(tpl.sizes.h2Pt)}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr>
      <w:spacing w:before="160" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${headingFont}" w:hAnsi="${headingFont}" w:cs="${headingFont}"/>
      <w:b/>
      <w:i/>
      <w:color w:val="${headingHex}"/>
      <w:sz w:val="${ptToHalfPt(tpl.sizes.h3Pt)}"/>
      <w:szCs w:val="${ptToHalfPt(tpl.sizes.h3Pt)}"/>
    </w:rPr>
  </w:style>
</w:styles>`
  );

  // 3. Header & Footer XML
  const meta = doc.metadata || {};
  const cover = resolveDocumentCoverPage(doc);
  const coverTitle = cover.title || doc.title || '';
  const institution = cover.institution;
  const faculty = [cover.department, cover.faculty].filter(Boolean).join(' · ');
  const studentName = cover.studentName;
  const studentId = cover.studentId;
  const courseCode = cover.courseCode;
  const courseTitle = cover.courseTitle;
  const lecturerName = cover.supervisorName;
  const submissionDate = cover.submissionDate;
  const docForCover: AcademicDocument = coverTitle && coverTitle !== doc.title ? { ...doc, title: coverTitle } : doc;

  const hasRunningHeader = tpl.layout.headerFooterStyle !== 'page_number_center';
  const headerXml = hasRunningHeader
    ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="${borderHex}"/></w:pBdr>
      <w:spacing w:after="0"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}"/><w:color w:val="${mutedHex}"/><w:sz w:val="18"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml((doc.title || '').slice(0, 64))}${courseCode ? `  |  ${escapeXml(courseCode)}` : ''}</w:t>
    </w:r>
  </w:p>
</w:hdr>`
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p/></w:hdr>`;

  const footerAlign = tpl.layout.headerFooterStyle === 'page_number_center' ? 'center' : 'right';
  const footerPrefix =
    tpl.layout.headerFooterStyle === 'page_number_center' ? '' : `${escapeXml(courseCode || studentName)}  —  Page `;
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="${footerAlign}"/>
      ${hasRunningHeader ? `<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="${borderHex}"/></w:pBdr>` : ''}
      <w:spacing w:after="0"/>
    </w:pPr>
    ${footerPrefix ? `<w:r><w:rPr><w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}"/><w:color w:val="${mutedHex}"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${footerPrefix}</w:t></w:r>` : ''}
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:rPr><w:rFonts w:ascii="${bodyFont}" w:hAnsi="${bodyFont}"/><w:color w:val="${mutedHex}"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>`;

  zip.file('word/header1.xml', headerXml);
  zip.file('word/footer1.xml', footerXml);

  // 4. Build word/document.xml body XML
  let bodyXml = '';

  // COVER / TITLE PAGE
  if (cover.includeCoverPage) {
    bodyXml += buildCoverXml(docForCover, tpl, contentWidthTwips, {
      institution,
      faculty,
      studentName,
      studentId,
      courseCode,
      courseTitle: courseTitle || cover.subtitle,
      lecturerName,
      submissionDate,
    });
  }

  // TABLE OF CONTENTS
  if (meta.includeTableOfContents !== false && doc.outline && doc.outline.length > 0) {
    bodyXml += buildHeadingXml('TABLE OF CONTENTS', 1, tpl);
    bodyXml += `
      <w:p>
        <w:fldSimple w:instr="TOC \\o &quot;1-3&quot; \\h \\z \\u">
          <w:r><w:rPr><w:color w:val="${mutedHex}"/><w:sz w:val="${captionSz}"/></w:rPr><w:t>Right-click and choose Update Field in Word to refresh page numbers.</w:t></w:r>
        </w:fldSimple>
      </w:p>
    `;

    doc.outline.forEach((item) => {
      const kind = inferSectionKind(item);
      if (kind === 'cover' || kind === 'toc') return;
      const indent = item.level === 1 ? '0' : item.level === 2 ? '360' : '720';
      const weight = item.level === 1 ? '<w:b/>' : '';
      bodyXml += `
        <w:p>
          <w:pPr><w:ind w:left="${indent}"/><w:spacing w:after="60"/></w:pPr>
          <w:r><w:rPr>${weight}<w:color w:val="${textHex}"/><w:sz w:val="${bodySz}"/></w:rPr><w:t>${escapeXml(item.title)}</w:t></w:r>
        </w:p>
      `;
    });

    const tableCaptions: string[] = [];
    const figureCaptions: string[] = [];
    (doc.sections || []).forEach((sec) => {
      (sec.visuals || []).forEach((vis) => {
        const cap = vis.caption || vis.title;
        if (vis.kind === 'comparison_table') tableCaptions.push(cap);
        else figureCaptions.push(cap);
      });
    });
    if (tableCaptions.length > 0) {
      bodyXml += buildHeadingXml('LIST OF TABLES', 2, tpl);
      bodyXml += tableCaptions
        .map(
          (c, idx) =>
            `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="${captionSz}"/></w:rPr><w:t>Table ${idx + 1}: ${escapeXml(c)}</w:t></w:r></w:p>`
        )
        .join('');
    }
    if (figureCaptions.length > 0) {
      bodyXml += buildHeadingXml('LIST OF FIGURES', 2, tpl);
      bodyXml += figureCaptions
        .map(
          (c, idx) =>
            `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="${captionSz}"/></w:rPr><w:t>Figure ${idx + 1}: ${escapeXml(c)}</w:t></w:r></w:p>`
        )
        .join('');
    }

    bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }

  // SECTIONS & CONTENT
  const sections = doc.sections || [];
  let chapterCounter = 0;
  sections.forEach((section, sIdx) => {
    const isChapter = section.level === 1;
    if (isChapter) chapterCounter += 1;

    if (isChapter && sIdx > 0 && tpl.layout.coverStyle === 'formal_centered') {
      bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    const headingPrefix =
      isChapter && tpl.layout.headingRule === 'numbered_slate'
        ? `${String(chapterCounter).padStart(2, '0')}. `
        : isChapter && tpl.layout.coverStyle === 'formal_centered'
        ? `CHAPTER ${chapterCounter}: `
        : '';

    bodyXml += buildHeadingXml(
      `${headingPrefix}${section.title}`,
      section.level === 1 ? 1 : section.level === 2 ? 2 : 3,
      tpl
    );

    if (section.content && section.content.trim()) {
      const rawParagraphs = section.content.split(/\n\s*\n/);
      rawParagraphs.forEach((pText) => {
        const trimmed = pText.trim();
        if (!trimmed) return;

        // Markdown subheadings
        if (trimmed.startsWith('### ')) {
          bodyXml += buildHeadingXml(formatDocxText(trimmed.replace(/^###\s+/, '')), 3, tpl);
          return;
        }
        if (trimmed.startsWith('## ')) {
          bodyXml += buildHeadingXml(formatDocxText(trimmed.replace(/^##\s+/, '')), 2, tpl);
          return;
        }

        // Blockquote / Callout
        if (trimmed.startsWith('> ')) {
          const cleanQuote = formatDocxText(
            trimmed
              .split('\n')
              .map((l) => l.replace(/^>\s?/, ''))
              .join(' ')
          );
          bodyXml += buildCalloutXml(cleanQuote, tpl);
          return;
        }

        // Markdown table
        if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
          const tableLines = trimmed.split('\n').filter((r) => r.trim().startsWith('|'));
          const dataLines = tableLines.filter((r) => !/^\|[\s:-]+\|/.test(r.trim()) && !r.includes('---'));
          if (dataLines.length >= 2) {
            const parseRow = (rowStr: string) =>
              rowStr
                .split('|')
                .filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1)
                .map((c) => formatDocxText(c.trim()));
            const headers = parseRow(dataLines[0]);
            const rows = dataLines.slice(1).map(parseRow);
            if (headers.length > 0) {
              bodyXml += buildTableXml(headers, rows, tpl, contentWidthTwips);
              return;
            }
          }
        }

        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n');
          items.forEach((item) => {
            const cleanItem = formatDocxText(item.replace(/^[-*]\s+/, '').trim());
            if (!cleanItem) return;
            bodyXml += `
              <w:p>
                <w:pPr><w:ind w:left="540" w:hanging="240"/><w:spacing w:after="100" w:line="${lineSpacingVal}" w:lineRule="auto"/></w:pPr>
                <w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="${bodySz}"/></w:rPr><w:t xml:space="preserve">•  ${escapeXml(cleanItem)}</w:t></w:r>
              </w:p>
            `;
          });
          return;
        }

        // Standard Body Paragraph
        const firstLineIndent = tpl.id === 'university-standard' ? '<w:ind w:firstLine="720"/>' : '';
        bodyXml += `
          <w:p>
            <w:pPr>${firstLineIndent}<w:spacing w:after="160" w:line="${lineSpacingVal}" w:lineRule="auto"/></w:pPr>
            <w:r><w:rPr><w:color w:val="${textHex}"/><w:sz w:val="${bodySz}"/></w:rPr><w:t xml:space="preserve">${escapeXml(formatDocxText(trimmed))}</w:t></w:r>
          </w:p>
        `;
      });
    } else {
      bodyXml += `
        <w:p>
          <w:pPr><w:spacing w:after="160"/></w:pPr>
          <w:r><w:rPr><w:i/><w:color w:val="${mutedHex}"/><w:sz w:val="${captionSz}"/></w:rPr><w:t>[Section in development]</w:t></w:r>
        </w:p>
      `;
    }

    // Optional Visual Elements
    if (Array.isArray(section.visuals) && section.visuals.length > 0) {
      section.visuals.forEach((vis) => {
        if (vis.kind === 'comparison_table' && vis.headers && vis.rows && vis.rows.length > 0) {
          bodyXml += `
            <w:p>
              <w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr>
              <w:r><w:rPr><w:b/><w:color w:val="${headingHex}"/><w:sz w:val="${bodySz}"/></w:rPr><w:t>${escapeXml(vis.title)}</w:t></w:r>
            </w:p>
          `;
          bodyXml += buildTableXml(vis.headers, vis.rows, tpl, contentWidthTwips);
          if (vis.caption) {
            bodyXml += `
              <w:p>
                <w:pPr><w:spacing w:before="60" w:after="160"/></w:pPr>
                <w:r><w:rPr><w:i/><w:color w:val="${mutedHex}"/><w:sz w:val="${captionSz}"/></w:rPr><w:t>${escapeXml(vis.caption)}</w:t></w:r>
              </w:p>
            `;
          }
          return;
        }

        const rendered = renderVisualBlockToPng(
          vis,
          doc.metadata?.visualPreferences?.designStyle,
          visualPalette
        );
        if (!rendered) return;

        mediaCounter += 1;
        const fileName = `visual_${mediaCounter}.png`;
        const rId = `rIdImg${mediaCounter}`;
        zip.file(`word/media/${fileName}`, dataUrlToUint8Array(rendered.dataUrl));
        mediaRels.push({ rId, target: `media/${fileName}` });

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
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
            <w:r><w:rPr><w:i/><w:color w:val="${mutedHex}"/><w:sz w:val="${captionSz}"/></w:rPr><w:t>${escapeXml(vis.caption || vis.title)}</w:t></w:r>
          </w:p>
        `;
      });
    }
  });

  // REFERENCES / BIBLIOGRAPHY SECTION
  if (doc.references && doc.references.length > 0) {
    bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    bodyXml += buildHeadingXml('REFERENCES', 1, tpl);

    doc.references.forEach((ref, rIdx) => {
      const refText = formatReferenceEntry(ref, doc.citationStyle || 'APA 7', rIdx + 1);
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:ind w:left="720" w:hanging="720"/>
            <w:spacing w:after="140" w:line="${lineSpacingVal}" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr><w:color w:val="${textHex}"/><w:sz w:val="${bodySz}"/></w:rPr>
            <w:t>${escapeXml(refText.trim())}</w:t>
          </w:r>
        </w:p>
      `;
    });
  }

  bodyXml += `
    <w:p>
      <w:pPr><w:spacing w:before="320"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:i/><w:color w:val="${mutedHex}"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(STUDIO_DOWNLOAD_NOTICE)}</w:t></w:r>
    </w:p>
  `;

  // 5. [Content_Types].xml & word/_rels/document.xml.rels
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>${mediaRels.length > 0 ? '\n  <Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`
  );

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdHdr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFtr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
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
      <w:headerReference w:type="default" r:id="rIdHdr1"/>
      <w:footerReference w:type="default" r:id="rIdFtr1"/>
      <w:titlePg/>
      <w:pgSz w:w="${pageWidthTwips}" w:h="${pageHeightTwips}"/>
      <w:pgMar w:top="${marginTop}" w:right="${marginRight}" w:bottom="${marginBottom}" w:left="${marginLeft}" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
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
