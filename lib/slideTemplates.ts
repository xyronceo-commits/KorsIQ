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

export type SlideFooterStyle = 'minimal_num' | 'structured_band' | 'grid_bar' | 'editorial_clean' | 'accent_strip' | 'dark_muted';
export type SlideCardStyle = 'none' | 'clean_outline' | 'bordered_panel' | 'warm_callout' | 'kpi_accent' | 'elevated_dark';
export type SlideBulletAccent = 'dash' | 'blue_square' | 'index_dot' | 'terracotta_rule' | 'bold_bar' | 'electric_dot';

export interface SlideTemplate {
  id: SlideTemplateId;
  name: string;
  category: TemplateCategory;
  tagline: string;
  bestFor: string;
  isDefault?: boolean;
  colors: {
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
  };
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
    tagline: 'Pure white canvas, crisp black typography, hairline rules & high whitespace',
    bestFor: 'Thesis defenses, research colloquia & distraction-free lectures',
    colors: {
      bg: '#FFFFFF',
      surface: '#FAFAFA',
      titleBg: '#FFFFFF',
      titleText: '#0A0A0A',
      heading: '#0A0A0A',
      body: '#27272A',
      muted: '#71717A',
      accent: '#0A0A0A',
      accentText: '#FFFFFF',
      border: '#E4E4E7',
    },
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
    tagline: 'White slides with deep navy & academic blue top rule and structured footer',
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
      accent: '#1E293B',
      accentText: '#FFFFFF',
      border: '#CBD5E1',
    },
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
      titleBg: '#1E3A5F',
      titleText: '#FAF8F5',
      heading: '#18181B',
      body: '#27272A',
      muted: '#52525B',
      accent: '#9A3412',
      accentText: '#FFFFFF',
      border: '#E7E5E4',
    },
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
    tagline: 'High-contrast split-panel hero cover with bold geometric blue accents',
    bestFor: 'Project pitches, entrepreneurship classes, case competitions & demos',
    colors: {
      bg: '#FFFFFF',
      surface: '#F1F5F9',
      titleBg: '#0A0A0A',
      titleText: '#FFFFFF',
      heading: '#0A0A0A',
      body: '#1F2937',
      muted: '#4B5563',
      accent: '#1D4ED8',
      accentText: '#FFFFFF',
      border: '#E2E8F0',
    },
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
    tagline: 'Deep navy-slate canvas with elevated panels & crisp electric-blue highlights',
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

export function resolveSlideTemplate(id?: SlideTemplateId | string | null): SlideTemplate {
  if (isValidSlideTemplateId(id)) {
    return SLIDE_TEMPLATE_MAP[id];
  }
  return SLIDE_TEMPLATE_MAP[DEFAULT_SLIDE_TEMPLATE_ID];
}
