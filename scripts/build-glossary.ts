// Static site generator for crawlable SEO pages.
// Emits public/games/**/index.html, public/history/index.html,
// public/sitemap.xml, and public/robots.txt. Run via `tsx scripts/build-glossary.ts`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLOSSARY, GLOSSARY_LIST } from '../src/content/glossary';
import { GAME_ORIGINS } from '../src/content/history';
import { GAME_CATALOG } from '../src/game/registry/catalog';
import { renderHistoryPage } from '../src/seo/history-html-pure';
import { SSG_CSS, esc, jsonLdScript } from '../src/seo/ssg-html-pure';
import { SITE_ORIGIN, renderRobotsTxt, renderSitemapXml } from '../src/seo/static-routes-pure';

const BASE_URL = SITE_ORIGIN;
const GAMES_DIR = join(process.cwd(), 'public', 'games');
const HISTORY_DIR = join(process.cwd(), 'public', 'history');

const FAMILY_LABEL: Record<string, string> = {
  trick: 'Trick-Taking', meld: 'Rummy & Melding', betting: 'Betting Games',
  shedding: 'Shedding Games', collecting: 'Collecting Games', compare: 'War & Compare',
  solo: 'Solitaire Games', unique: 'Unique Games',
};

function faqJsonLd(entry: (typeof GLOSSARY_LIST)[number]) {
  if (!entry.faq.length) return '';
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entry.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });
}

function articleJsonLd(entry: (typeof GLOSSARY_LIST)[number], url: string) {
  const catalog = entry.type ? GAME_CATALOG.find((e) => e.type === entry.type) : undefined;
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.title,
    description: entry.metaDescription,
    url,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: "Let's Play Cards" },
    publisher: { '@type': 'Organization', name: "Let's Play Cards" },
    about: catalog?.config.description ?? entry.intro,
    dateModified: new Date().toISOString().slice(0, 10),
  });
}

function renderPage(entry: (typeof GLOSSARY_LIST)[number]): string {
  const url = `${BASE_URL}/games/${entry.slug}/`;
  const catalog = entry.type ? GAME_CATALOG.find((e) => e.type === entry.type) : undefined;
  const family = catalog?.family ?? '';
  const isLive = entry.status === 'live';

  const pills = [
    `<span class="pill">👥 ${entry.playerCount} players</span>`,
    `<span class="pill">⏱ ${entry.timeMinutes}</span>`,
    `<span class="pill">🎯 Difficulty ${'●'.repeat(entry.difficulty)}${'○'.repeat(5 - entry.difficulty)}</span>`,
    family ? `<span class="pill">🃏 ${FAMILY_LABEL[family] ?? family}</span>` : '',
  ].join('\n');

  const sections = entry.sections
    .map((s) => `<section><h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p></section>`)
    .join('\n');

  const faqs = entry.faq
    .map((f) => `<div class="faq"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`)
    .join('\n');

  const related = entry.related
    .map((slug) => GLOSSARY[slug])
    .filter(Boolean)
    .map((r) => `<a href="/games/${r!.slug}/">${esc(r!.name)}</a>`)
    .join('\n');

  const origin = GAME_ORIGINS[entry.slug];
  const originHtml = origin
    ? `<section class="origin"><h2>Where this game comes from</h2><p>${esc(origin)} <a href="/history/">Read the history of playing cards</a></p></section>`
    : '';

  const playCta = isLive
    ? `<div class="play"><a href="/">▶ Play ${esc(entry.name)} online — free</a></div>`
    : entry.status === 'planned'
      ? `<div class="play" style="background:linear-gradient(135deg,#334155,#1e293b)"><a href="/">${esc(entry.name)} is coming soon — see what's live</a></div>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(entry.title)}</title>
<meta name="description" content="${esc(entry.metaDescription)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(entry.title)}">
<meta property="og:description" content="${esc(entry.metaDescription)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Let's Play Cards">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(entry.title)}">
<meta name="twitter:description" content="${esc(entry.metaDescription)}">
${articleJsonLd(entry, url)}
${faqJsonLd(entry)}
<style>${SSG_CSS}</style>
</head>
<body>
<div class="wrap">
<nav class="crumb"><a href="/">Let's Play Cards</a> › <a href="/games/">Card Game Glossary</a> › ${esc(entry.name)}</nav>
<a class="back" href="/games/">← All card games</a>
<h1>${esc(entry.name)} Rules</h1>
<p class="lead">${esc(entry.intro)}</p>
<div class="meta">${pills}</div>
${sections}
${originHtml}
${entry.faq.length ? `<section><h2>Frequently Asked Questions</h2>${faqs}</section>` : ''}
${playCta}
<div class="related"><h2>Related Games</h2><div class="tags">${related}</div></div>
<footer>${esc(entry.name)} rules from the Let's Play Cards glossary. <a href="/history/">History of playing cards</a> · Play free — no account needed.</footer>
</div>
</body>
</html>`;
}

function renderIndex(): string {
  const byFamily = new Map<string, (typeof GLOSSARY_LIST)[number][]>();
  for (const entry of GLOSSARY_LIST) {
    const catalog = entry.type ? GAME_CATALOG.find((e) => e.type === entry.type) : undefined;
    const family = catalog?.family ?? 'documented';
    const arr = byFamily.get(family) ?? [];
    arr.push(entry);
    byFamily.set(family, arr);
  }

  const famBlocks = [...byFamily.entries()]
    .map(([family, entries]) => {
      const label = FAMILY_LABEL[family] ?? 'More Card Games';
      const items = entries
        .map(
          (e) => `<a href="/games/${e.slug}/"><span class="n">${esc(e.name)}${e.status === 'live' ? '<span class="live">LIVE</span>' : ''}</span>\n<span class="d">${esc(e.playerCount)} · ${esc(e.timeMinutes)}</span></a>`,
        )
        .join('\n');
      return `<div class="fam"><h2>${esc(label)}</h2><div class="gamelist">${items}</div></div>`;
    })
    .join('\n');

  const collectionJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Card Game Glossary — Rules for Every Card Game',
    description: 'The complete glossary of card game rules: trick-taking, rummy, betting, solitaire, and more.',
    url: `${BASE_URL}/games/`,
    isPartOf: { '@type': 'WebSite', name: "Let's Play Cards", url: BASE_URL },
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card Game Glossary — Rules for ${GLOSSARY_LIST.length}+ Card Games</title>
<meta name="description" content="The complete card game glossary: learn how to play Hearts, Spades, Rummy, Blackjack, Euchre, Cribbage and more — with full rules, strategy, and FAQs.">
<link rel="canonical" href="${BASE_URL}/games/">
<meta property="og:type" content="website">
<meta property="og:title" content="Card Game Glossary — Rules for Every Card Game">
<meta property="og:description" content="Learn how to play ${GLOSSARY_LIST.length}+ card games with our complete rules glossary — from trick-taking to solitaire.">
<meta property="og:url" content="${BASE_URL}/games/">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${collectionJsonLd}</script>
<style>${SSG_CSS}</style>
</head>
<body>
<div class="wrap hub">
<nav class="crumb"><a href="/">Let's Play Cards</a> › Card Game Glossary</nav>
<h1>Card Game Glossary</h1>
<p class="intro">Learn how to play every popular card game with a single deck of 52 cards. Each guide covers setup, rules, scoring, strategy, and answers the questions players ask most.</p>
<a class="history-banner" href="/history/"><div class="k">Background</div><div class="t">How cards started, how the 52-card pack happened, and how these games spread →</div></a>
${famBlocks}
<footer>${GLOSSARY_LIST.length} card games documented. <a href="/history/">History of playing cards</a> · Play free card games with friends — no account needed.</footer>
</div>
</body>
</html>`;
}

mkdirSync(GAMES_DIR, { recursive: true });
mkdirSync(HISTORY_DIR, { recursive: true });

writeFileSync(join(GAMES_DIR, 'index.html'), renderIndex());
for (const entry of GLOSSARY_LIST) {
  const dir = join(GAMES_DIR, entry.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), renderPage(entry));
}

writeFileSync(join(HISTORY_DIR, 'index.html'), renderHistoryPage(BASE_URL));
writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), renderSitemapXml(GLOSSARY_LIST.map((e) => e.slug)));
writeFileSync(join(process.cwd(), 'public', 'robots.txt'), renderRobotsTxt());

console.log(
  `SEO pages built: ${GLOSSARY_LIST.length} game pages + glossary hub + /history + sitemap.xml + robots.txt`,
);
