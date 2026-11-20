import { AcademicDocument, StudioCoverPageData } from '../types';

export interface ResolvedCoverPage {
  title: string;
  subtitle: string;
  studentName: string;
  studentId: string;
  courseCode: string;
  courseTitle: string;
  department: string;
  faculty: string;
  institution: string;
  supervisorName: string;
  submissionDate: string;
  includeCoverPage: boolean;
  speakerNotes: string;
}

function cleanStr(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function formatDocTypeLabel(docType?: string): string {
  if (!docType) return '';
  return docType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Single source of truth for Document Cover Page fields across Preview, Edit, .docx, and .pdf exports.
 * Never returns `undefined` strings; hides empty optional fields cleanly in Preview/Export.
 */
export function resolveDocumentCoverPage(
  doc: AcademicDocument,
  variantOverride?: StudioCoverPageData
): ResolvedCoverPage {
  const cp = variantOverride || doc.convertedVariants?.document?.coverPage || doc.metadata?.coverPage || {};
  const brief = doc.brief;
  const meta = doc.metadata || {};

  const title =
    cp.title !== undefined ? cp.title : doc.title || brief?.title || '';
  const subtitle =
    cp.subtitle !== undefined ? cp.subtitle : formatDocTypeLabel(doc.docType);
  const studentName =
    cp.studentName !== undefined ? cp.studentName : cleanStr(brief?.studentName || meta.studentName);
  const studentId =
    cp.studentId !== undefined ? cp.studentId : cleanStr(brief?.matricNumber || meta.studentId);
  const courseCode =
    cp.courseCode !== undefined ? cp.courseCode : cleanStr(brief?.courseCode || meta.courseCode || doc.subject);
  const courseTitle =
    cp.courseTitle !== undefined ? cp.courseTitle : cleanStr(brief?.courseTitle || meta.courseTitle);
  const department =
    cp.department !== undefined ? cp.department : cleanStr(brief?.department || meta.department);
  const faculty =
    cp.faculty !== undefined ? cp.faculty : cleanStr(brief?.faculty || meta.faculty);
  const institution =
    cp.institution !== undefined ? cp.institution : cleanStr(brief?.institution || meta.institution);
  const supervisorName =
    cp.supervisorName !== undefined ? cp.supervisorName : cleanStr(brief?.supervisorName || meta.lecturerName);
  const submissionDate =
    cp.submissionDate !== undefined ? cp.submissionDate : cleanStr(brief?.date || meta.submissionDate);
  const includeCoverPage =
    cp.includeCoverPage !== undefined
      ? Boolean(cp.includeCoverPage)
      : meta.includeCoverPage !== false;
  const speakerNotes = cleanStr(cp.speakerNotes);

  return {
    title,
    subtitle,
    studentName,
    studentId,
    courseCode,
    courseTitle,
    department,
    faculty,
    institution,
    supervisorName,
    submissionDate,
    includeCoverPage,
    speakerNotes,
  };
}

/**
 * Single source of truth for Slide 1 (Cover / Title Slide) fields across Preview, Edit, .pptx, and 16:9 .pdf exports.
 */
export function resolveSlideCoverPage(
  doc: AcademicDocument,
  variantOverride?: StudioCoverPageData
): ResolvedCoverPage {
  const cp = variantOverride || doc.convertedVariants?.slides?.coverPage || doc.metadata?.coverPage || {};
  const base = resolveDocumentCoverPage(doc, cp);
  return {
    ...base,
    subtitle:
      cp.subtitle !== undefined
        ? cp.subtitle
        : [base.courseTitle, base.department].filter(Boolean).join(' · '),
  };
}
