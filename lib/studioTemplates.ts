import { AcademicDocument, DocumentTemplateId, SlideTemplateId, StudioBrief } from '../types';
import {
  DEFAULT_DOCUMENT_TEMPLATE_ID,
  DOCUMENT_TEMPLATES,
  DocumentTemplate,
  documentTemplateToLegacyStyle,
  isValidDocumentTemplateId,
  legacyStyleToDocumentTemplateId,
  resolveDocumentTemplate,
} from './documentTemplates';
import {
  DEFAULT_SLIDE_TEMPLATE_ID,
  SLIDE_TEMPLATES,
  SlideTemplate,
  isValidSlideTemplateId,
  resolveSlideTemplate,
} from './slideTemplates';

export {
  DEFAULT_DOCUMENT_TEMPLATE_ID,
  DOCUMENT_TEMPLATES,
  documentTemplateToLegacyStyle,
  isValidDocumentTemplateId,
  legacyStyleToDocumentTemplateId,
  resolveDocumentTemplate,
  DEFAULT_SLIDE_TEMPLATE_ID,
  SLIDE_TEMPLATES,
  isValidSlideTemplateId,
  resolveSlideTemplate,
};
export type { DocumentTemplate, SlideTemplate };

export interface TemplateVisualPalette {
  primary: string;
  primarySoft: string;
  ink: string;
  muted: string;
  border: string;
  surface: string;
  headerBg: string;
  fontFamily: string;
}

export function isSlideBrief(brief?: Pick<StudioBrief, 'fileFormat' | 'docType'> | null): boolean {
  if (!brief) return false;
  return brief.fileFormat === 'pptx' || brief.docType === 'presentation';
}

export function isSlideDocument(
  doc?: Pick<AcademicDocument, 'fileFormat' | 'docType' | 'metadata'> | null
): boolean {
  if (!doc) return false;
  return (
    doc.fileFormat === 'pptx' ||
    doc.docType === 'presentation' ||
    doc.metadata?.preferredFormat === 'pptx'
  );
}

export function getDocumentTemplateForDoc(
  doc?: Pick<AcademicDocument, 'brief' | 'metadata'> | null
): DocumentTemplate {
  const id: DocumentTemplateId | string | undefined =
    doc?.metadata?.documentTemplateId || doc?.brief?.documentTemplateId;
  const legacyStyle =
    doc?.brief?.documentStyle || doc?.metadata?.visualPreferences?.designStyle;
  return resolveDocumentTemplate(id, legacyStyle);
}

export function getSlideTemplateForDoc(
  doc?: Pick<AcademicDocument, 'brief' | 'metadata'> | null
): SlideTemplate {
  const id: SlideTemplateId | string | undefined =
    doc?.metadata?.slideTemplateId || doc?.brief?.slideTemplateId;
  return resolveSlideTemplate(id);
}

export function documentTemplateToVisualPalette(tpl: DocumentTemplate): TemplateVisualPalette {
  return {
    primary: tpl.colors.accent,
    primarySoft: tpl.colors.accentSoft === '#FFFFFF' ? '#F8FAFC' : tpl.colors.accentSoft,
    ink: tpl.colors.text,
    muted: tpl.colors.muted,
    border: tpl.colors.border,
    surface: tpl.colors.pageBg,
    headerBg: tpl.colors.tableHeaderBg === '#FFFFFF' ? '#F8FAFC' : tpl.colors.accentSoft,
    fontFamily: tpl.fonts.bodyCss,
  };
}

export function slideTemplateToVisualPalette(tpl: SlideTemplate): TemplateVisualPalette {
  return {
    primary: tpl.colors.accent,
    primarySoft: tpl.colors.surface,
    ink: tpl.colors.heading,
    muted: tpl.colors.muted,
    border: tpl.colors.border,
    surface: tpl.colors.bg,
    headerBg: tpl.colors.surface,
    fontFamily: tpl.fonts.bodyCss,
  };
}

/** Strip leading '#' for OpenXML / PptxGenJS hex colors. */
export function stripHexHash(hex: string, fallback = '000000'): string {
  const cleaned = String(hex || '').replace(/^#/, '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned.toUpperCase();
  return fallback;
}

/** Convert '#RRGGBB' into an [r, g, b] tuple for jsPDF. */
export function hexToRgbTuple(hex: string, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const cleaned = String(hex || '').replace(/^#/, '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return fallback;
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ];
}
