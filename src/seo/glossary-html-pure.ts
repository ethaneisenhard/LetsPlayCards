/** Pre-rendered glossary / rules pages. I/O lives in scripts/build-glossary.ts. */

import { GLOSSARY_LIST, type GlossaryEntry } from '../content/glossary';
import { GAME_ORIGINS } from '../content/history';
import { GAME_CATALOG } from '../game/registry/catalog';
import {
  catalogTilesForSlugs,
  renderComingSoonCta,
  renderGameTileGrid,
  renderLivePlayCta,
} from './game-tile-pure';
import { SSG_CSS, esc, jsonLdScript } from './ssg-html-pure';
import { SITE_ORIGIN } from './static-routes-pure';

const FAMILY_LABEL: Record<string, string> = {
  trick: 'Trick-Taking',
  meld: 'Rummy & Melding',
  betting: 'Betting Games',
  shedding: 'Shedding Games',
  collecting: 'Collecting Games',
  compare: 'War & Compare',
  solo: 'Solitaire Games',
  unique: 'Unique Games',
};

function faqJsonLd(entry: GlossaryEntry) {
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

function articleJsonLd(entry: GlossaryEntry, url: string) {
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

function playCta(entry: GlossaryEntry): string {
  if (entry.status === 'live' && entry.type) {
    return renderLivePlayCta(entry.name, entry.type);
  }
  if (entry.status === 'planned') {
    return renderComingSoonCta(entry.name);
  }
  return '';
}

export function renderGlossaryPage(entry: GlossaryEntry, baseUrl = SITE_ORIGIN): string {
  const url = `${baseUrl}/games/${entry.slug}/`;
  const catalog = entry.type ? GAME_CATALOG.find((e) => e.type === entry.type) : undefined;
  const family = catalog?.family ?? '';

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

  const related = renderGameTileGrid(catalogTilesForSlugs(entry.related));

  const origin = GAME_ORIGINS[entry.slug];
  const originHtml = origin
    ? `<section class="origin"><h2>Where this game comes from</h2><p>${esc(origin)} <a href="/history/">Read the history of playing cards</a></p></section>`
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
${playCta(entry)}
<div class="related"><h2>Related Games</h2>${related}</div>
<footer>${esc(entry.name)} rules from the Let's Play Cards glossary. <a href="/history/">History of playing cards</a> · Play free — no account needed.</footer>
</div>
</body>
</html>`;
}

export function renderGlossaryIndex(baseUrl = SITE_ORIGIN): string {
  const byFamily = new Map<string, GlossaryEntry[]>();
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
      const tiles = renderGameTileGrid(catalogTilesForSlugs(entries.map((e) => e.slug)));
      return `<div class="fam"><h2>${esc(label)}</h2>${tiles}</div>`;
    })
    .join('\n');

  const collectionJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Card Game Glossary — Rules for Every Card Game',
    description: 'The complete glossary of card game rules: trick-taking, rummy, betting, solitaire, and more.',
    url: `${baseUrl}/games/`,
    isPartOf: { '@type': 'WebSite', name: "Let's Play Cards", url: baseUrl },
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card Game Glossary — Rules for ${GLOSSARY_LIST.length}+ Card Games</title>
<meta name="description" content="The complete card game glossary: learn how to play Hearts, Spades, Rummy, Blackjack, Euchre, Cribbage and more — with full rules, strategy, and FAQs.">
<link rel="canonical" href="${baseUrl}/games/">
<meta property="og:type" content="website">
<meta property="og:title" content="Card Game Glossary — Rules for Every Card Game">
<meta property="og:description" content="Learn how to play ${GLOSSARY_LIST.length}+ card games with our complete rules glossary — from trick-taking to solitaire.">
<meta property="og:url" content="${baseUrl}/games/">
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

