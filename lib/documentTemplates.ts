import { DocumentTemplateId, StudioDocumentStyle, TemplateCategory } from '../types';

export type DocumentCoverStyle =
  | 'formal_centered'
  | 'clean_academic'
  | 'technical_compact'
  | 'editorial_left'
  | 'executive_banner';

export type DocumentHeadingRule = 'none' | 'thin_bottom' | 'numbered_slate' | 'editorial_serif' | 'left_bar';
export type DocumentTableStyle = 'plain_black' | 'tinted_header' | 'crisp_grid' | 'editorial_rules' | 'striped_executive';
export type DocumentCalloutStyle = 'plain_border' | 'subtle_tint' | 'slate_box' | 'editorial_quote' | 'shaded_panel';
export type DocumentHeaderFooterStyle = 'page_number_center' | 'running_header_footer' | 'compact_meta_footer' | 'editorial_footer' | 'executive_band';

export interface DocumentTemplate {
  id: DocumentTemplateId;
  name: string;
  category: TemplateCategory;
  tagline: string;
  bestFor: string;
  isDefault?: boolean;
  fonts: {
    /** Word / PPTX font family name */
    heading: string;
    body: string;
    mono: string;
    /** CSS font stack for browser preview */
    headingCss: string;
    bodyCss: string;
    /** jsPDF built-in font name */
    pdfHeading: 'times' | 'helvetica' | 'courier';
    pdfBody: 'times' | 'helvetica' | 'courier';
  };
  sizes: {
    titlePt: number;
    h1Pt: number;
    h2Pt: number;
    h3Pt: number;
    bodyPt: number;
    captionPt: number;
  };
  lineSpacing: number;
  marginsIn: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colors: {
    pageBg: string;
    text: string;
    heading: string;
    muted: string;
    accent: string;
    accentSoft: string;
    border: string;
    tableHeaderBg: string;
    tableHeaderText: string;
    tableStripeBg: string;
    coverBg: string;
    coverText: string;
  };
  layout: {
    coverStyle: DocumentCoverStyle;
    headingRule: DocumentHeadingRule;
    tableStyle: DocumentTableStyle;
    calloutStyle: DocumentCalloutStyle;
    headerFooterStyle: DocumentHeaderFooterStyle;
  };
}

export const DEFAULT_DOCUMENT_TEMPLATE_ID: DocumentTemplateId = 'university-standard';

export const DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [
  {
    id: 'university-standard',
    name: 'Strict University Standard',
    category: 'minimal',
    tagline: 'Pure black-and-white academic submission formatting',
    bestFor: 'Assignments, theses, dissertations & APA/MLA/Harvard submissions',
    isDefault: true,
    fonts: {
      heading: 'Times New Roman',
      body: 'Times New Roman',
      mono: 'Courier New',
      headingCss: '"Times New Roman", Georgia, Cambria, serif',
      bodyCss: '"Times New Roman", Georgia, Cambria, serif',
      pdfHeading: 'times',
      pdfBody: 'times',
    },
    sizes: {
      titlePt: 16,
      h1Pt: 14,
      h2Pt: 12,
      h3Pt: 12,
      bodyPt: 12,
      captionPt: 10,
    },
    lineSpacing: 1.5,
    marginsIn: { top: 1, right: 1, bottom: 1, left: 1 },
    colors: {
      pageBg: '#FFFFFF',
      text: '#000000',
      heading: '#000000',
      muted: '#333333',
      accent: '#000000',
      accentSoft: '#FFFFFF',
      border: '#000000',
      tableHeaderBg: '#FFFFFF',
      tableHeaderText: '#000000',
      tableStripeBg: '#FFFFFF',
      coverBg: '#FFFFFF',
      coverText: '#000000',
    },
    layout: {
      coverStyle: 'formal_centered',
      headingRule: 'none',
      tableStyle: 'plain_black',
      calloutStyle: 'plain_border',
      headerFooterStyle: 'page_number_center',
    },
  },
  {
    id: 'academic-clean',
    name: 'Clean Academic',
    category: 'minimal',
    tagline: 'Crisp sans-serif pages with deep academic blue hierarchy',
    bestFor: 'Term papers, literature reviews & coursework essays',
    fonts: {
      heading: 'Calibri',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    sizes: {
      titlePt: 20,
      h1Pt: 14,
      h2Pt: 12,
      h3Pt: 11,
      bodyPt: 11,
      captionPt: 9.5,
    },
    lineSpacing: 1.35,
    marginsIn: { top: 0.9, right: 0.9, bottom: 0.9, left: 0.9 },
    colors: {
      pageBg: '#FFFFFF',
      text: '#111827',
      heading: '#0F2942',
      muted: '#5B6472',
      accent: '#1D4ED8',
      accentSoft: '#EFF6FF',
      border: '#CBD5E1',
      tableHeaderBg: '#F1F5F9',
      tableHeaderText: '#0F2942',
      tableStripeBg: '#F8FAFC',
      coverBg: '#FFFFFF',
      coverText: '#0F2942',
    },
    layout: {
      coverStyle: 'clean_academic',
      headingRule: 'thin_bottom',
      tableStyle: 'tinted_header',
      calloutStyle: 'subtle_tint',
      headerFooterStyle: 'running_header_footer',
    },
  },
  {
    id: 'technical-spec',
    name: 'Technical & Engineering',
    category: 'minimal',
    tagline: 'Numbered sections, compact metadata header & crisp grid tables',
    bestFor: 'Lab reports, engineering specs, CS & STEM documentation',
    fonts: {
      heading: 'Arial',
      body: 'Arial',
      mono: 'Consolas',
      headingCss: 'Arial, "Helvetica Neue", sans-serif',
      bodyCss: 'Arial, "Helvetica Neue", sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    sizes: {
      titlePt: 18,
      h1Pt: 13.5,
      h2Pt: 11.5,
      h3Pt: 10.5,
      bodyPt: 10.5,
      captionPt: 9,
    },
    lineSpacing: 1.25,
    marginsIn: { top: 0.85, right: 0.85, bottom: 0.85, left: 0.85 },
    colors: {
      pageBg: '#FFFFFF',
      text: '#1E293B',
      heading: '#0F172A',
      muted: '#475569',
      accent: '#1E293B',
      accentSoft: '#F8FAFC',
      border: '#94A3B8',
      tableHeaderBg: '#E2E8F0',
      tableHeaderText: '#0F172A',
      tableStripeBg: '#F8FAFC',
      coverBg: '#F8FAFC',
      coverText: '#0F172A',
    },
    layout: {
      coverStyle: 'technical_compact',
      headingRule: 'numbered_slate',
      tableStyle: 'crisp_grid',
      calloutStyle: 'slate_box',
      headerFooterStyle: 'compact_meta_footer',
    },
  },
  {
    id: 'seminar-editorial',
    name: 'Seminar Editorial',
    category: 'designed',
    tagline: 'Serif headings paired with airy sans-serif body and left-accented title',
    bestFor: 'Seminar papers, policy briefs, monographs & humanities reports',
    fonts: {
      heading: 'Georgia',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: 'Georgia, Cambria, "Times New Roman", serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'times',
      pdfBody: 'helvetica',
    },
    sizes: {
      titlePt: 22,
      h1Pt: 15,
      h2Pt: 12.5,
      h3Pt: 11,
      bodyPt: 11,
      captionPt: 9.5,
    },
    lineSpacing: 1.4,
    marginsIn: { top: 0.95, right: 0.95, bottom: 0.95, left: 1.0 },
    colors: {
      pageBg: '#FFFFFF',
      text: '#18181B',
      heading: '#1E3A5F',
      muted: '#52525B',
      accent: '#1E3A5F',
      accentSoft: '#F4F7FA',
      border: '#D4D4D8',
      tableHeaderBg: '#1E3A5F',
      tableHeaderText: '#FFFFFF',
      tableStripeBg: '#F8FAFC',
      coverBg: '#FFFFFF',
      coverText: '#1E3A5F',
    },
    layout: {
      coverStyle: 'editorial_left',
      headingRule: 'editorial_serif',
      tableStyle: 'editorial_rules',
      calloutStyle: 'editorial_quote',
      headerFooterStyle: 'editorial_footer',
    },
  },
  {
    id: 'executive-report',
    name: 'Executive Proposal / Report',
    category: 'designed',
    tagline: 'Bold navy cover banner, accented section bars & shaded summary panels',
    bestFor: 'Research proposals, capstone reports, business plans & grant pitches',
    fonts: {
      heading: 'Calibri',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    sizes: {
      titlePt: 22,
      h1Pt: 14.5,
      h2Pt: 12,
      h3Pt: 11,
      bodyPt: 11,
      captionPt: 9.5,
    },
    lineSpacing: 1.3,
    marginsIn: { top: 0.85, right: 0.85, bottom: 0.85, left: 0.85 },
    colors: {
      pageBg: '#FFFFFF',
      text: '#111827',
      heading: '#0F2942',
      muted: '#4B5563',
      accent: '#1D4ED8',
      accentSoft: '#EFF6FF',
      border: '#CBD5E1',
      tableHeaderBg: '#0F2942',
      tableHeaderText: '#FFFFFF',
      tableStripeBg: '#F1F5F9',
      coverBg: '#0F2942',
      coverText: '#FFFFFF',
    },
    layout: {
      coverStyle: 'executive_banner',
      headingRule: 'left_bar',
      tableStyle: 'striped_executive',
      calloutStyle: 'shaded_panel',
      headerFooterStyle: 'executive_band',
    },
  },
] as const;

const DOCUMENT_TEMPLATE_MAP: Record<string, DocumentTemplate> = Object.fromEntries(
  DOCUMENT_TEMPLATES.map((t) => [t.id, t])
);

export function isValidDocumentTemplateId(value: unknown): value is DocumentTemplateId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DOCUMENT_TEMPLATE_MAP, value);
}

export function legacyStyleToDocumentTemplateId(style?: StudioDocumentStyle | string | null): DocumentTemplateId {
  if (style === 'modern_clean' || style === 'modern_professional') return 'academic-clean';
  if (style === 'executive_report') return 'executive-report';
  return DEFAULT_DOCUMENT_TEMPLATE_ID;
}

export function documentTemplateToLegacyStyle(id?: DocumentTemplateId | string | null): StudioDocumentStyle {
  return id === 'university-standard' ? 'classic_academic' : 'modern_clean';
}

export function resolveDocumentTemplate(
  id?: DocumentTemplateId | string | null,
  legacyStyle?: StudioDocumentStyle | string | null
): DocumentTemplate {
  if (isValidDocumentTemplateId(id)) {
    return DOCUMENT_TEMPLATE_MAP[id];
  }
  if (legacyStyle) {
    const mapped = legacyStyleToDocumentTemplateId(legacyStyle);
    return DOCUMENT_TEMPLATE_MAP[mapped];
  }
  return DOCUMENT_TEMPLATE_MAP[DEFAULT_DOCUMENT_TEMPLATE_ID];
}
