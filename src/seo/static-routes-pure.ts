import { HISTORY_ALIAS_PATHS, HISTORY_CANONICAL_PATH } from '../content/history';

export const SITE_ORIGIN = 'https://letsplaycards.devbyethan.workers.dev';

export type StaticSeoRoute =
  | { kind: 'asset'; path: string }
  | { kind: 'redirect'; to: string; status: 301 };

/** Strip a trailing slash except for `/`. */
export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Maps a request path to a pre-rendered HTML asset or a 301.
 * Returns null for SPA / API / game-room routes.
 */
export function staticSeoRoute(pathname: string): StaticSeoRoute | null {
  const path = normalizePath(pathname);

  // Image files under /history/img/* must fall through to ASSETS — never index.html.
  if (path === '/history/img' || path.startsWith('/history/img/')) {
    return null;
  }

  if (HISTORY_ALIAS_PATHS.some((alias) => normalizePath(alias) === path)) {
    return { kind: 'redirect', to: HISTORY_CANONICAL_PATH, status: 301 };
  }
  if (path === '/history' || path === normalizePath(HISTORY_CANONICAL_PATH)) {
    return { kind: 'asset', path: '/history/index.html' };
  }
  if (path === '/games') {
    return { kind: 'asset', path: '/games/index.html' };
  }
  const glossary = path.match(/^\/games\/([A-Za-z0-9_-]+)$/);
  if (glossary) {
    return { kind: 'asset', path: `/games/${glossary[1]}/index.html` };
  }
  return null;
}

export function sitemapLocs(glossarySlugs: readonly string[]): string[] {
  return [
    `${SITE_ORIGIN}/`,
    `${SITE_ORIGIN}/games/`,
    `${SITE_ORIGIN}${HISTORY_CANONICAL_PATH}`,
    ...glossarySlugs.map((slug) => `${SITE_ORIGIN}/games/${slug}/`),
  ];
}

export function renderSitemapXml(glossarySlugs: readonly string[]): string {
  const urls = sitemapLocs(glossarySlugs)
    .map((loc) => {
      const freq = loc === `${SITE_ORIGIN}/` ? 'daily' : loc.endsWith('/games/') ? 'weekly' : 'monthly';
      return `<url><loc>${loc}</loc><changefreq>${freq}</changefreq></url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function renderRobotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
