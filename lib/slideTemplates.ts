import { SlideTemplateId, TemplateCategory } from '../types';

export type SlideTitleLayout =
  | 'minimal_left'
  | 'classic_academic_band'
  | 'technical_framed'
  | 'editorial_asymmetric'
  | 'pitch_split_hero'
  | 'dark_executive';

export type SlideHeaderStyle =
  | 'plain_hairline'
  | 'top_rule_kicker'
  | 'index_badge_panel'
  | 'editorial_serif_bar'
  | 'bold_accent_pill'
  | 'dark_elevated';

export type SlideFooterStyle =
  | 'minimal_num'
  | 'structured_band'
  | 'grid_bar'
  | 'editorial_clean'
  | 'accent_strip'
  | 'dark_muted';

export type SlideCardStyle =
  | 'none'
  | 'clean_outline'
  | 'bordered_panel'
  | 'warm_callout'
  | 'kpi_accent'
  | 'elevated_dark';

export type SlideBulletAccent =
  | 'dash'
  | 'blue_square'
  | 'index_dot'
  | 'terracotta_rule'
  | 'bold_bar'
  | 'electric_dot';

export interface SlideTemplateColors {
  bg: string;
  surface: string;
  titleBg: string;
  titleText: string;
  heading: string;
  body: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
}

export interface SlideTemplatePalette {
  id: string;
  name: string;
  swatchPrimary: string;
  swatchSecondary: string;
  colors: Partial<SlideTemplateColors>;
}

export interface SlideTemplate {
  id: SlideTemplateId;
  name: string;
  category: TemplateCategory;
  tagline: string;
  bestFor: string;
  isDefault?: boolean;
  colors: SlideTemplateColors;
  palettes: readonly SlideTemplatePalette[];
  activePaletteId: string;
  activePaletteName: string;
  fonts: {
    heading: string;
    body: string;
    mono: string;
    headingCss: string;
    bodyCss: string;
    pdfHeading: 'times' | 'helvetica' | 'courier';
    pdfBody: 'times' | 'helvetica' | 'courier';
  };
  layout: {
    titleLayout: SlideTitleLayout;
    headerStyle: SlideHeaderStyle;
    footerStyle: SlideFooterStyle;
    cardStyle: SlideCardStyle;
    bulletAccent: SlideBulletAccent;
  };
}

export const DEFAULT_SLIDE_TEMPLATE_ID: SlideTemplateId = 'academic-classic';

export const SLIDE_TEMPLATES: readonly SlideTemplate[] = [
  {
    id: 'pure-minimal',
    name: 'Pure Minimal',
    category: 'minimal',
    tagline: 'Pure white canvas, crisp typography, hairline rules & high whitespace',
    bestFor: 'Thesis defenses, research colloquia & distraction-free lectures',
    colors: {
      bg: '#FFFFFF',
      surface: '#FAFAFA',
      titleBg: '#FFFFFF',
      titleText: '#18181B',
      heading: '#18181B',
      body: '#27272A',
      muted: '#71717A',
      accent: '#18181B',
      accentText: '#FFFFFF',
      border: '#E4E4E7',
    },
    activePaletteId: 'stark-black',
    activePaletteName: 'Stark Black',
    palettes: [
      {
        id: 'stark-black',
        name: 'Stark Black',
        swatchPrimary: '#18181B',
        swatchSecondary: '#FFFFFF',
        colors: {
          bg: '#FFFFFF',
          surface: '#FAFAFA',
          titleBg: '#FFFFFF',
          titleText: '#18181B',
          heading: '#18181B',
          body: '#27272A',
          muted: '#71717A',
          accent: '#18181B',
          accentText: '#FFFFFF',
          border: '#E4E4E7',
        },
      },
      {
        id: 'ink-navy',
        name: 'Deep Navy Ink',
        swatchPrimary: '#0F2942',
        swatchSecondary: '#FFFFFF',
        colors: {
          bg: '#FFFFFF',
          surface: '#F8FAFC',
          titleBg: '#FFFFFF',
          titleText: '#0F2942',
          heading: '#0F2942',
          body: '#1E293B',
          muted: '#64748B',
          accent: '#0F2942',
          accentText: '#FFFFFF',
          border: '#CBD5E1',
        },
      },
      {
        id: 'warm-charcoal',
        name: 'Warm Charcoal',
        swatchPrimary: '#292524',
        swatchSecondary: '#FAFAF9',
        colors: {
          bg: '#FAFAF9',
          surface: '#F5F5F4',
          titleBg: '#FAFAF9',
          titleText: '#292524',
          heading: '#292524',
          body: '#44403C',
          muted: '#78716C',
          accent: '#292524',
          accentText: '#FFFFFF',
          border: '#E7E5E4',
        },
      },
    ],
    fonts: {
      heading: 'Calibri',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    layout: {
      titleLayout: 'minimal_left',
      headerStyle: 'plain_hairline',
      footerStyle: 'minimal_num',
      cardStyle: 'none',
      bulletAccent: 'dash',
    },
  },
  {
    id: 'academic-classic',
    name: 'Academic Classic',
    category: 'minimal',
    tagline: 'White slides with deep top rule, section kicker & structured footer',
    bestFor: 'University seminars, class presentations & coursework defenses',
    isDefault: true,
    colors: {
      bg: '#FFFFFF',
      surface: '#F8FAFC',
      titleBg: '#0F2942',
      titleText: '#FFFFFF',
      heading: '#0F2942',
      body: '#1F2937',
      muted: '#64748B',
      accent: '#1D4ED8',
      accentText: '#FFFFFF',
      border: '#CBD5E1',
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
          titleBg: '#0F2942',
          titleText: '#FFFFFF',
          heading: '#0F2942',
          accent: '#1D4ED8',
          accentText: '#FFFFFF',
          border: '#CBD5E1',
        },
      },
      {
        id: 'faculty-green',
        name: 'Faculty Emerald',
        swatchPrimary: '#047857',
        swatchSecondary: '#064E3B',
        colors: {
          titleBg: '#064E3B',
          titleText: '#FFFFFF',
          heading: '#064E3B',
          accent: '#047857',
          accentText: '#FFFFFF',
          border: '#A7F3D0',
        },
      },
      {
        id: 'law-burgundy',
        name: 'Law Burgundy',
        swatchPrimary: '#881337',
        swatchSecondary: '#4C0519',
        colors: {
          titleBg: '#4C0519',
          titleText: '#FFFFFF',
          heading: '#4C0519',
          accent: '#881337',
          accentText: '#FFFFFF',
          border: '#FECDD3',
        },
      },
      {
        id: 'charcoal-academic',
        name: 'Graphite Black',
        swatchPrimary: '#18181B',
        swatchSecondary: '#3F3F46',
        colors: {
          titleBg: '#18181B',
          titleText: '#FFFFFF',
          heading: '#18181B',
          accent: '#3F3F46',
          accentText: '#FFFFFF',
          border: '#D4D4D8',
        },
      },
    ],
    fonts: {
      heading: 'Calibri',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    layout: {
      titleLayout: 'classic_academic_band',
      headerStyle: 'top_rule_kicker',
      footerStyle: 'structured_band',
      cardStyle: 'clean_outline',
      bulletAccent: 'blue_square',
    },
  },
  {
    id: 'technical-grid',
    name: 'Technical / Engineering',
    category: 'minimal',
    tagline: 'Slate-tinted canvas, bordered panels & numbered slide index badges',
    bestFor: 'Engineering reviews, lab findings, data & system architecture decks',
    colors: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      titleBg: '#0F172A',
      titleText: '#F8FAFC',
      heading: '#0F172A',
      body: '#1E293B',
      muted: '#475569',
      accent: '#0D9488',
      accentText: '#FFFFFF',
      border: '#CBD5E1',
    },
    activePaletteId: 'teal-grid',
    activePaletteName: 'Cyber Teal',
    palettes: [
      {
        id: 'teal-grid',
        name: 'Cyber Teal',
        swatchPrimary: '#0D9488',
        swatchSecondary: '#0F172A',
        colors: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          titleBg: '#0F172A',
          heading: '#0F172A',
          accent: '#0D9488',
          accentText: '#FFFFFF',
          border: '#CBD5E1',
        },
      },
      {
        id: 'cobalt-spec',
        name: 'Cobalt Blue',
        swatchPrimary: '#2563EB',
        swatchSecondary: '#0F172A',
        colors: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          titleBg: '#0F172A',
          heading: '#0F172A',
          accent: '#2563EB',
          accentText: '#FFFFFF',
          border: '#BFDBFE',
        },
      },
      {
        id: 'emerald-lab',
        name: 'Lab Emerald',
        swatchPrimary: '#059669',
        swatchSecondary: '#064E3B',
        colors: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          titleBg: '#064E3B',
          heading: '#064E3B',
          accent: '#059669',
          accentText: '#FFFFFF',
          border: '#A7F3D0',
        },
      },
      {
        id: 'mono-blueprint',
        name: 'Monochrome Grid',
        swatchPrimary: '#18181B',
        swatchSecondary: '#52525B',
        colors: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          titleBg: '#18181B',
          heading: '#18181B',
          accent: '#52525B',
          accentText: '#FFFFFF',
          border: '#D4D4D8',
        },
      },
    ],
    fonts: {
      heading: 'Arial',
      body: 'Arial',
      mono: 'Consolas',
      headingCss: 'Arial, "Helvetica Neue", sans-serif',
      bodyCss: 'Arial, "Helvetica Neue", sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    layout: {
      titleLayout: 'technical_framed',
      headerStyle: 'index_badge_panel',
      footerStyle: 'grid_bar',
      cardStyle: 'bordered_panel',
      bulletAccent: 'index_dot',
    },
  },
  {
    id: 'seminar-editorial',
    name: 'Seminar Editorial',
    category: 'designed',
    tagline: 'Warm off-white canvas, editorial serif headings & asymmetric split cover',
    bestFor: 'Humanities seminars, policy briefings, literature & law talks',
    colors: {
      bg: '#FAF8F5',
      surface: '#FFFFFF',
      titleBg: '#1E293B',
      titleText: '#FAF8F5',
      heading: '#18181B',
      body: '#27272A',
      muted: '#52525B',
      accent: '#9A3412',
      accentText: '#FFFFFF',
      border: '#E7E5E4',
    },
    activePaletteId: 'terracotta-ivory',
    activePaletteName: 'Terracotta & Ivory',
    palettes: [
      {
        id: 'terracotta-ivory',
        name: 'Terracotta & Ivory',
        swatchPrimary: '#9A3412',
        swatchSecondary: '#1E293B',
        colors: {
          bg: '#FAF8F5',
          surface: '#FFFFFF',
          titleBg: '#1E293B',
          titleText: '#FAF8F5',
          heading: '#18181B',
          accent: '#9A3412',
          accentText: '#FFFFFF',
          border: '#E7E5E4',
        },
      },
      {
        id: 'navy-linen',
        name: 'Navy & Linen',
        swatchPrimary: '#1E3A5F',
        swatchSecondary: '#0F172A',
        colors: {
          bg: '#FAF8F5',
          surface: '#FFFFFF',
          titleBg: '#0F172A',
          titleText: '#FAF8F5',
          heading: '#0F172A',
          accent: '#1E3A5F',
          accentText: '#FFFFFF',
          border: '#E2E8F0',
        },
      },
      {
        id: 'forest-paper',
        name: 'Forest & Paper',
        swatchPrimary: '#166534',
        swatchSecondary: '#14532D',
        colors: {
          bg: '#F8FAF7',
          surface: '#FFFFFF',
          titleBg: '#14532D',
          titleText: '#F8FAF7',
          heading: '#14532D',
          accent: '#166534',
          accentText: '#FFFFFF',
          border: '#D1FAE5',
        },
      },
      {
        id: 'plum-editorial',
        name: 'Burgundy & Ivory',
        swatchPrimary: '#881337',
        swatchSecondary: '#27272A',
        colors: {
          bg: '#FAF7F8',
          surface: '#FFFFFF',
          titleBg: '#27272A',
          titleText: '#FAF7F8',
          heading: '#27272A',
          accent: '#881337',
          accentText: '#FFFFFF',
          border: '#F3E8EC',
        },
      },
    ],
    fonts: {
      heading: 'Georgia',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: 'Georgia, Cambria, "Times New Roman", serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'times',
      pdfBody: 'helvetica',
    },
    layout: {
      titleLayout: 'editorial_asymmetric',
      headerStyle: 'editorial_serif_bar',
      footerStyle: 'editorial_clean',
      cardStyle: 'warm_callout',
      bulletAccent: 'terracotta_rule',
    },
  },
  {
    id: 'modern-pitch',
    name: 'Modern Pitch',
    category: 'designed',
    tagline: 'High-contrast split-panel hero cover with bold geometric accents',
    bestFor: 'Project pitches, entrepreneurship classes, case competitions & demos',
    colors: {
      bg: '#FFFFFF',
      surface: '#F1F5F9',
      titleBg: '#0F172A',
      titleText: '#FFFFFF',
      heading: '#0F172A',
      body: '#1F2937',
      muted: '#4B5563',
      accent: '#2563EB',
      accentText: '#FFFFFF',
      border: '#E2E8F0',
    },
    activePaletteId: 'electric-cobalt',
    activePaletteName: 'Cobalt Pitch',
    palettes: [
      {
        id: 'electric-cobalt',
        name: 'Cobalt Pitch',
        swatchPrimary: '#2563EB',
        swatchSecondary: '#0F172A',
        colors: {
          titleBg: '#0F172A',
          heading: '#0F172A',
          accent: '#2563EB',
          accentText: '#FFFFFF',
          surface: '#F1F5F9',
          border: '#E2E8F0',
        },
      },
      {
        id: 'emerald-venture',
        name: 'Venture Green',
        swatchPrimary: '#059669',
        swatchSecondary: '#064E3B',
        colors: {
          titleBg: '#064E3B',
          heading: '#064E3B',
          accent: '#059669',
          accentText: '#FFFFFF',
          surface: '#ECFDF5',
          border: '#A7F3D0',
        },
      },
      {
        id: 'signal-crimson',
        name: 'Signal Red',
        swatchPrimary: '#DC2626',
        swatchSecondary: '#111827',
        colors: {
          titleBg: '#111827',
          heading: '#111827',
          accent: '#DC2626',
          accentText: '#FFFFFF',
          surface: '#FEF2F2',
          border: '#FECACA',
        },
      },
      {
        id: 'amber-bold',
        name: 'Bold Amber',
        swatchPrimary: '#D97706',
        swatchSecondary: '#111827',
        colors: {
          titleBg: '#111827',
          heading: '#111827',
          accent: '#D97706',
          accentText: '#FFFFFF',
          surface: '#FFFBEB',
          border: '#FDE68A',
        },
      },
      {
        id: 'monochrome-pitch',
        name: 'Stark Monochrome',
        swatchPrimary: '#18181B',
        swatchSecondary: '#09090B',
        colors: {
          titleBg: '#09090B',
          heading: '#09090B',
          accent: '#18181B',
          accentText: '#FFFFFF',
          surface: '#F4F4F5',
          border: '#E4E4E7',
        },
      },
    ],
    fonts: {
      heading: 'Segoe UI',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: '"Segoe UI", Calibri, Arial, sans-serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    layout: {
      titleLayout: 'pitch_split_hero',
      headerStyle: 'bold_accent_pill',
      footerStyle: 'accent_strip',
      cardStyle: 'kpi_accent',
      bulletAccent: 'bold_bar',
    },
  },
  {
    id: 'executive-dark',
    name: 'Executive Dark',
    category: 'designed',
    tagline: 'Deep matte dark canvas with elevated panels & projector-safe highlights',
    bestFor: 'Keynotes, capstone showcases, tech talks & high-impact presentations',
    colors: {
      bg: '#0F172A',
      surface: '#1E293B',
      titleBg: '#0F172A',
      titleText: '#F8FAFC',
      heading: '#F8FAFC',
      body: '#CBD5E1',
      muted: '#94A3B8',
      accent: '#3B82F6',
      accentText: '#FFFFFF',
      border: '#334155',
    },
    activePaletteId: 'electric-blue',
    activePaletteName: 'Electric Blue',
    palettes: [
      {
        id: 'electric-blue',
        name: 'Electric Blue',
        swatchPrimary: '#3B82F6',
        swatchSecondary: '#0F172A',
        colors: {
          bg: '#0F172A',
          surface: '#1E293B',
          titleBg: '#0F172A',
          titleText: '#F8FAFC',
          heading: '#F8FAFC',
          body: '#CBD5E1',
          muted: '#94A3B8',
          accent: '#3B82F6',
          accentText: '#FFFFFF',
          border: '#334155',
        },
      },
      {
        id: 'luminous-emerald',
        name: 'Mint Emerald',
        swatchPrimary: '#10B981',
        swatchSecondary: '#0B1615',
        colors: {
          bg: '#0B1615',
          surface: '#132624',
          titleBg: '#0B1615',
          titleText: '#ECFDF5',
          heading: '#ECFDF5',
          body: '#D1FAE5',
          muted: '#6EE7B7',
          accent: '#10B981',
          accentText: '#052E16',
          border: '#1F3D39',
        },
      },
      {
        id: 'warm-amber',
        name: 'Warm Amber',
        swatchPrimary: '#F59E0B',
        swatchSecondary: '#141210',
        colors: {
          bg: '#141210',
          surface: '#231F1B',
          titleBg: '#141210',
          titleText: '#FFFBEB',
          heading: '#FFFBEB',
          body: '#E7E5E4',
          muted: '#A8A29E',
          accent: '#F59E0B',
          accentText: '#141210',
          border: '#3F3831',
        },
      },
      {
        id: 'crisp-silver',
        name: 'Crisp Monochrome',
        swatchPrimary: '#E4E4E7',
        swatchSecondary: '#09090B',
        colors: {
          bg: '#09090B',
          surface: '#18181B',
          titleBg: '#09090B',
          titleText: '#FAFAFA',
          heading: '#FAFAFA',
          body: '#D4D4D8',
          muted: '#A1A1AA',
          accent: '#E4E4E7',
          accentText: '#09090B',
          border: '#27272A',
        },
      },
    ],
    fonts: {
      heading: 'Segoe UI',
      body: 'Calibri',
      mono: 'Consolas',
      headingCss: '"Segoe UI", Calibri, Arial, sans-serif',
      bodyCss: 'Calibri, "Segoe UI", Arial, sans-serif',
      pdfHeading: 'helvetica',
      pdfBody: 'helvetica',
    },
    layout: {
      titleLayout: 'dark_executive',
      headerStyle: 'dark_elevated',
      footerStyle: 'dark_muted',
      cardStyle: 'elevated_dark',
      bulletAccent: 'electric_dot',
    },
  },
] as const;

const SLIDE_TEMPLATE_MAP: Record<string, SlideTemplate> = Object.fromEntries(
  SLIDE_TEMPLATES.map((t) => [t.id, t])
);

export function isValidSlideTemplateId(value: unknown): value is SlideTemplateId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SLIDE_TEMPLATE_MAP, value);
}

export function getDefaultSlidePaletteId(templateId?: SlideTemplateId | string | null): string {
  const base = isValidSlideTemplateId(templateId)
    ? SLIDE_TEMPLATE_MAP[templateId]
    : SLIDE_TEMPLATE_MAP[DEFAULT_SLIDE_TEMPLATE_ID];
  return base.palettes[0].id;
}

/**
 * Resolves a SlideTemplate with optional curated paletteId overrides.
 * Falls back cleanly to the template's default palette when paletteId is missing or invalid.
 */
export function resolveSlideTemplate(
  templateId?: SlideTemplateId | string | null,
  paletteId?: string | null
): SlideTemplate {
  const base = isValidSlideTemplateId(templateId)
    ? SLIDE_TEMPLATE_MAP[templateId]
    : SLIDE_TEMPLATE_MAP[DEFAULT_SLIDE_TEMPLATE_ID];

  const matchedPalette =
    (paletteId ? base.palettes.find((p) => p.id === paletteId) : undefined) || base.palettes[0];

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
