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
export type DocumentHeaderFooterStyle =
  | 'page_number_center'
  | 'running_header_footer'
  | 'compact_meta_footer'
  | 'editorial_footer'
  | 'executive_band';

export interface DocumentTemplateColors {
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
}

export interface DocumentTemplatePalette {
  id: string;
  name: string;
  swatchPrimary: string;
  swatchSecondary: string;
  colors: Partial<DocumentTemplateColors>;
}

export interface DocumentTemplate {
  id: DocumentTemplateId;
  name: string;
  category: TemplateCategory;
  tagline: string;
  bestFor: string;
  isDefault?: boolean;
  fonts: {
    heading: string;
    body: string;
    mono: string;
    headingCss: string;
    bodyCss: string;
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
  colors: DocumentTemplateColors;
  palettes: readonly DocumentTemplatePalette[];
  activePaletteId: string;
  activePaletteName: string;
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
    activePaletteId: 'pure-black',
    activePaletteName: 'Pure Black',
    palettes: [
      {
        id: 'pure-black',
        name: 'Pure Black',
        swatchPrimary: '#000000',
        swatchSecondary: '#FFFFFF',
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
      },
      {
        id: 'charcoal-ink',
        name: 'Charcoal Slate',
        swatchPrimary: '#18181B',
        swatchSecondary: '#E4E4E7',
        colors: {
          pageBg: '#FFFFFF',
          text: '#27272A',
          heading: '#18181B',
          muted: '#52525B',
          accent: '#18181B',
          accentSoft: '#FAFAFA',
          border: '#E4E4E7',
          tableHeaderBg: '#F4F4F5',
          tableHeaderText: '#18181B',
          tableStripeBg: '#FAFAFA',
          coverBg: '#FFFFFF',
          coverText: '#18181B',
        },
      },
      {
        id: 'classic-navy-ink',
        name: 'Deep Navy Ink',
        swatchPrimary: '#0F2942',
        swatchSecondary: '#CBD5E1',
        colors: {
          pageBg: '#FFFFFF',
          text: '#111827',
          heading: '#0F2942',
          muted: '#475569',
          accent: '#0F2942',
          accentSoft: '#F8FAFC',
          border: '#CBD5E1',
          tableHeaderBg: '#F1F5F9',
          tableHeaderText: '#0F2942',
          tableStripeBg: '#F8FAFC',
          coverBg: '#FFFFFF',
          coverText: '#0F2942',
        },
      },
    ],
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
    activePaletteId: 'university-blue',
    activePaletteName: 'University Blue',
    palettes: [
      {
        id: 'university-blue',
        name: 'University Blue',
        swatchPrimary: '#1D4ED8',
        swatchSecondary: '#0F2942',
        colors: {
          heading: '#0F2942',
          accent: '#1D4ED8',
          accentSoft: '#EFF6FF',
          border: '#CBD5E1',
          tableHeaderBg: '#F1F5F9',
          tableHeaderText: '#0F2942',
          tableStripeBg: '#F8FAFC',
          coverText: '#0F2942',
        },
      },
      {
        id: 'forest-emerald',
        name: 'Forest Emerald',
        swatchPrimary: '#047857',
        swatchSecondary: '#064E3B',
        colors: {
          heading: '#064E3B',
          accent: '#047857',
          accentSoft: '#ECFDF5',
          border: '#A7F3D0',
          tableHeaderBg: '#ECFDF5',
          tableHeaderText: '#064E3B',
          tableStripeBg: '#F6FEF9',
          coverText: '#064E3B',
        },
      },
      {
        id: 'oxblood-burgundy',
        name: 'Oxblood Burgundy',
        swatchPrimary: '#881337',
        swatchSecondary: '#4C0519',
        colors: {
          heading: '#4C0519',
          accent: '#881337',
          accentSoft: '#FFF1F2',
          border: '#FECDD3',
          tableHeaderBg: '#FFF1F2',
          tableHeaderText: '#4C0519',
          tableStripeBg: '#FFF8F9',
          coverText: '#4C0519',
        },
      },
      {
        id: 'slate-graphite',
        name: 'Slate Graphite',
        swatchPrimary: '#334155',
        swatchSecondary: '#0F172A',
        colors: {
          heading: '#0F172A',
          accent: '#334155',
          accentSoft: '#F1F5F9',
          border: '#CBD5E1',
          tableHeaderBg: '#F1F5F9',
          tableHeaderText: '#0F172A',
          tableStripeBg: '#F8FAFC',
          coverText: '#0F172A',
        },
      },
    ],
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
      accent: '#0D9488',
      accentSoft: '#F0FDFA',
      border: '#94A3B8',
      tableHeaderBg: '#E2E8F0',
      tableHeaderText: '#0F172A',
      tableStripeBg: '#F8FAFC',
      coverBg: '#F8FAFC',
      coverText: '#0F172A',
    },
    activePaletteId: 'engineering-slate',
    activePaletteName: 'Engineering Slate',
    palettes: [
      {
        id: 'engineering-slate',
        name: 'Engineering Slate',
        swatchPrimary: '#0D9488',
        swatchSecondary: '#1E293B',
        colors: {
          heading: '#0F172A',
          text: '#1E293B',
          accent: '#0D9488',
          accentSoft: '#F0FDFA',
          border: '#94A3B8',
          tableHeaderBg: '#E2E8F0',
          tableHeaderText: '#0F172A',
          tableStripeBg: '#F8FAFC',
          coverBg: '#F8FAFC',
          coverText: '#0F172A',
        },
      },
      {
        id: 'blueprint-blue',
        name: 'Blueprint Blue',
        swatchPrimary: '#1D4ED8',
        swatchSecondary: '#1E3A8A',
        colors: {
          heading: '#1E3A8A',
          text: '#1E293B',
          accent: '#1D4ED8',
          accentSoft: '#EFF6FF',
          border: '#93C5FD',
          tableHeaderBg: '#DBEAFE',
          tableHeaderText: '#1E3A8A',
          tableStripeBg: '#F8FAFC',
          coverBg: '#EFF6FF',
          coverText: '#1E3A8A',
        },
      },
      {
        id: 'industrial-emerald',
        name: 'Industrial Green',
        swatchPrimary: '#059669',
        swatchSecondary: '#065F46',
        colors: {
          heading: '#065F46',
          text: '#1E293B',
          accent: '#059669',
          accentSoft: '#ECFDF5',
          border: '#6EE7B7',
          tableHeaderBg: '#D1FAE5',
          tableHeaderText: '#065F46',
          tableStripeBg: '#F6FEF9',
          coverBg: '#ECFDF5',
          coverText: '#065F46',
        },
      },
      {
        id: 'carbon-mono',
        name: 'Carbon Monochrome',
        swatchPrimary: '#111827',
        swatchSecondary: '#374151',
        colors: {
          heading: '#111827',
          text: '#1F2937',
          accent: '#374151',
          accentSoft: '#F3F4F6',
          border: '#9CA3AF',
          tableHeaderBg: '#E5E7EB',
          tableHeaderText: '#111827',
          tableStripeBg: '#F9FAFB',
          coverBg: '#F3F4F6',
          coverText: '#111827',
        },
      },
    ],
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
      pageBg: '#FAF8F5',
      text: '#18181B',
      heading: '#1E3A5F',
      muted: '#52525B',
      accent: '#1E3A5F',
      accentSoft: '#F1F5F9',
      border: '#D4D4D8',
      tableHeaderBg: '#1E3A5F',
      tableHeaderText: '#FFFFFF',
      tableStripeBg: '#F4F4F5',
      coverBg: '#FAF8F5',
      coverText: '#1E3A5F',
    },
    activePaletteId: 'editorial-navy',
    activePaletteName: 'Editorial Navy',
    palettes: [
      {
        id: 'editorial-navy',
        name: 'Editorial Navy',
        swatchPrimary: '#1E3A5F',
        swatchSecondary: '#FAF8F5',
        colors: {
          pageBg: '#FAF8F5',
          heading: '#1E3A5F',
          accent: '#1E3A5F',
          accentSoft: '#EEF2F7',
          border: '#D4D4D8',
          tableHeaderBg: '#1E3A5F',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#F4F5F7',
          coverBg: '#FAF8F5',
          coverText: '#1E3A5F',
        },
      },
      {
        id: 'terracotta-rust',
        name: 'Terracotta Rust',
        swatchPrimary: '#9A3412',
        swatchSecondary: '#FAF8F5',
        colors: {
          pageBg: '#FAF8F5',
          heading: '#9A3412',
          accent: '#9A3412',
          accentSoft: '#FFF7ED',
          border: '#E7E5E4',
          tableHeaderBg: '#9A3412',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#FBF5F0',
          coverBg: '#FAF8F5',
          coverText: '#9A3412',
        },
      },
      {
        id: 'botanical-olive',
        name: 'Botanical Pine',
        swatchPrimary: '#14532D',
        swatchSecondary: '#F8FAF7',
        colors: {
          pageBg: '#F8FAF7',
          heading: '#14532D',
          accent: '#14532D',
          accentSoft: '#ECFDF5',
          border: '#D1D5DB',
          tableHeaderBg: '#14532D',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#F1F6F2',
          coverBg: '#F8FAF7',
          coverText: '#14532D',
        },
      },
      {
        id: 'burgundy-ink',
        name: 'Wine Burgundy',
        swatchPrimary: '#7F1D1D',
        swatchSecondary: '#FAF7F7',
        colors: {
          pageBg: '#FAF7F7',
          heading: '#7F1D1D',
          accent: '#7F1D1D',
          accentSoft: '#FEF2F2',
          border: '#E5D5D5',
          tableHeaderBg: '#7F1D1D',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#F7EFEF',
          coverBg: '#FAF7F7',
          coverText: '#7F1D1D',
        },
      },
    ],
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
    tagline: 'Bold cover banner, accented section bars & shaded summary panels',
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
    activePaletteId: 'executive-navy',
    activePaletteName: 'Executive Navy',
    palettes: [
      {
        id: 'executive-navy',
        name: 'Executive Navy',
        swatchPrimary: '#0F2942',
        swatchSecondary: '#1D4ED8',
        colors: {
          heading: '#0F2942',
          accent: '#1D4ED8',
          accentSoft: '#EFF6FF',
          border: '#CBD5E1',
          tableHeaderBg: '#0F2942',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#F1F5F9',
          coverBg: '#0F2942',
          coverText: '#FFFFFF',
        },
      },
      {
        id: 'emerald-corp',
        name: 'Corporate Emerald',
        swatchPrimary: '#064E3B',
        swatchSecondary: '#059669',
        colors: {
          heading: '#064E3B',
          accent: '#059669',
          accentSoft: '#ECFDF5',
          border: '#A7F3D0',
          tableHeaderBg: '#064E3B',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#F0FDF9',
          coverBg: '#064E3B',
          coverText: '#FFFFFF',
        },
      },
      {
        id: 'obsidian-gold',
        name: 'Obsidian & Ochre',
        swatchPrimary: '#111827',
        swatchSecondary: '#B45309',
        colors: {
          heading: '#111827',
          accent: '#B45309',
          accentSoft: '#FFFBEB',
          border: '#D1D5DB',
          tableHeaderBg: '#111827',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#F9FAFB',
          coverBg: '#111827',
          coverText: '#FFFFFF',
        },
      },
      {
        id: 'crimson-exec',
        name: 'Crimson Executive',
        swatchPrimary: '#4C0519',
        swatchSecondary: '#BE123C',
        colors: {
          heading: '#4C0519',
          accent: '#BE123C',
          accentSoft: '#FFF1F2',
          border: '#FECDD3',
          tableHeaderBg: '#4C0519',
          tableHeaderText: '#FFFFFF',
          tableStripeBg: '#FFF7F8',
          coverBg: '#4C0519',
          coverText: '#FFFFFF',
        },
      },
    ],
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

const LEGACY_STYLES = new Set(['classic_academic', 'modern_clean', 'modern_professional', 'executive_report']);

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

export function getDefaultDocumentPaletteId(templateId?: DocumentTemplateId | string | null): string {
  const base = isValidDocumentTemplateId(templateId)
    ? DOCUMENT_TEMPLATE_MAP[templateId]
    : DOCUMENT_TEMPLATE_MAP[DEFAULT_DOCUMENT_TEMPLATE_ID];
  return base.palettes[0].id;
}

/**
 * Resolves a DocumentTemplate with optional curated paletteId overrides.
 * Backward-compatible: if `paletteIdOrLegacyStyle` is a legacy StudioDocumentStyle
 * (e.g. 'modern_clean') and `templateId` is omitted, maps to the corresponding template.
 */
export function resolveDocumentTemplate(
  templateId?: DocumentTemplateId | string | null,
  paletteIdOrLegacyStyle?: string | null,
  legacyStyle?: StudioDocumentStyle | string | null
): DocumentTemplate {
  let effectivePaletteId: string | null | undefined = paletteIdOrLegacyStyle;
  let effectiveLegacy: string | null | undefined = legacyStyle;

  if (!templateId && paletteIdOrLegacyStyle && LEGACY_STYLES.has(paletteIdOrLegacyStyle)) {
    effectiveLegacy = paletteIdOrLegacyStyle;
    effectivePaletteId = undefined;
  }

  const base = isValidDocumentTemplateId(templateId)
    ? DOCUMENT_TEMPLATE_MAP[templateId]
    : effectiveLegacy
    ? DOCUMENT_TEMPLATE_MAP[legacyStyleToDocumentTemplateId(effectiveLegacy)]
    : DOCUMENT_TEMPLATE_MAP[DEFAULT_DOCUMENT_TEMPLATE_ID];

  const matchedPalette =
    (effectivePaletteId
      ? base.palettes.find((p) => p.id === effectivePaletteId)
      : undefined) || base.palettes[0];

  return {
    ...base,
    colors: {
      ...base.colors,
      ...matchedPalette.colors,
    },
    activePaletteId: matchedPalette.id,
    activePaletteName: matchedPalette.name,
  };
}
