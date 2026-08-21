// Static site generator for crawlable SEO pages.
// Emits public/games/**/index.html, public/history/index.html,
// public/sitemap.xml, and public/robots.txt. Run via `tsx scripts/build-glossary.ts`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLOSSARY_LIST } from '../src/content/glossary';
import { renderGlossaryIndex, renderGlossaryPage } from '../src/seo/glossary-html-pure';
import { renderHistoryPage } from '../src/seo/history-html-pure';
import { SITE_ORIGIN, renderRobotsTxt, renderSitemapXml } from '../src/seo/static-routes-pure';

const BASE_URL = SITE_ORIGIN;
const GAMES_DIR = join(process.cwd(), 'public', 'games');
const HISTORY_DIR = join(process.cwd(), 'public', 'history');

mkdirSync(GAMES_DIR, { recursive: true });
mkdirSync(HISTORY_DIR, { recursive: true });

writeFileSync(join(GAMES_DIR, 'index.html'), renderGlossaryIndex(BASE_URL));
for (const entry of GLOSSARY_LIST) {
  const dir = join(GAMES_DIR, entry.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), renderGlossaryPage(entry, BASE_URL));
}

writeFileSync(join(HISTORY_DIR, 'index.html'), renderHistoryPage(BASE_URL));
writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), renderSitemapXml(GLOSSARY_LIST.map((e) => e.slug)));
writeFileSync(join(process.cwd(), 'public', 'robots.txt'), renderRobotsTxt());

console.log(
  `SEO pages built: ${GLOSSARY_LIST.length} game pages + glossary hub + /history + sitemap.xml + robots.txt`,
);
