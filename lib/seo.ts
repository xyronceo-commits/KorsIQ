export const CANONICAL_ORIGIN = 'https://korsiq.com.ng';

export const PUBLIC_HOME_SEO = {
  title: 'KorsIQ — AI Study Workspace & Academic Studio for Students',
  description:
    'KorsIQ is an AI-powered student productivity workspace for university students with Academic Studio, CGPA Calculator, Study Hub, timetables, and Study Circles.',
  canonical: `${CANONICAL_ORIGIN}/`,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
} as const;

export interface PageSeoConfig {
  title: string;
  description?: string;
  canonical?: string;
  robots: string;
}

function upsertMeta(name: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Updates document head metadata dynamically so public views remain indexable
 * while private workspace, auth, recovery, onboarding, and admin views are marked noindex.
 */
export function applyPageSeo(config: PageSeoConfig): void {
  if (typeof document === 'undefined') return;
  document.title = config.title;
  if (config.description) {
    upsertMeta('description', config.description);
  }
  upsertMeta('robots', config.robots);
  if (config.canonical) {
    upsertCanonical(config.canonical);
  }
}
