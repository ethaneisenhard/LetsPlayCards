// Static site generator for the SEO glossary.
// Emits public/games/index.html, public/games/<slug>/index.html,
// public/sitemap.xml, and public/robots.txt. Run via `tsx scripts/build-glossary.ts`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GLOSSARY, GLOSSARY_LIST } from '../src/content/glossary';
import { GAME_CATALOG } from '../src/game/registry/catalog';

const BASE_URL = 'https://letsplaycards.devbyethan.workers.dev';
const OUT_DIR = join(process.cwd(), 'public', 'games');

const FAMILY_LABEL: Record<string, string> = {
  trick: 'Trick-Taking', meld: 'Rummy & Melding', betting: 'Betting Games',
  shedding: 'Shedding Games', collecting: 'Collecting Games', compare: 'War & Compare',
  solo: 'Solitaire Games', unique: 'Unique Games',
};

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0f1a;color:#e6e9ef;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:#c9a84c;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:40px 24px 80px}
.crumb{font-size:13px;color:#6b7280;margin-bottom:24px}
.crumb a{color:#8b93a1}
h1{font-size:2.4rem;line-height:1.15;margin:0 0 8px;letter-spacing:-.02em}
.lead{font-size:1.15rem;color:#a7b0bf;margin:0 0 32px}
.meta{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:40px}
.pill{font-size:13px;color:#cbd2dc;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:4px 12px;border-radius:999px}
section{margin-bottom:36px}
h2{font-size:1.35rem;margin:0 0 10px;color:#fff;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:8px}
p{margin:0;color:#c3cad5}
.faq{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px 22px;margin-bottom:14px}
.faq h3{font-size:1rem;margin:0 0 6px;color:#fff}
.faq p{margin:0;font-size:.95rem}
.play{margin:48px 0;padding:22px 26px;border-radius:16px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-align:center}
.play a{color:#fff;font-weight:700;font-size:1.05rem;text-decoration:none}
.related{margin-top:40px}
.related .tags{display:flex;flex-wrap:wrap;gap:8px}
.related a{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:999px;font-size:14px}
.back{display:inline-block;margin-bottom:28px;font-size:14px}
footer{margin-top:64px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);color:#6b7280;font-size:13px}
.hub h1{font-size:3rem}
.hub .intro{color:#a7b0bf;max-width:640px}
.fam{margin:48px 0}
.fam h2{font-size:1.5rem}
.gamelist{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-top:16px}
.gamelist a{display:block;padding:16px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:#e6e9ef;text-decoration:none}
.gamelist a:hover{border-color:#c9a84c}
.gamelist .n{font-weight:700;font-size:1.02rem}
.gamelist .d{font-size:12px;color:#8b93a1;margin-top:3px}
.live{display:inline-block;font-size:10px;color:#34d399;border:1px solid rgba(52,211,153,.4);padding:1px 7px;border-radius:999px;margin-left:6px;vertical-align:middle}
`;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function faqJsonLd(entry: (typeof GLOSSARY_LIST)[number]) {
  if (!entry.faq.length) return '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entry.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function articleJsonLd(entry: (typeof GLOSSARY_LIST)[number], url: string) {
  const catalog = entry.type ? GAME_CATALOG.find((e) => e.type === entry.type) : undefined;
  const schema = {
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
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
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
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<nav class="crumb"><a href="/">Let's Play Cards</a> › <a href="/games/">Card Game Glossary</a> › ${esc(entry.name)}</nav>
<a class="back" href="/games/">← All card games</a>
<h1>${esc(entry.name)} Rules</h1>
<p class="lead">${esc(entry.intro)}</p>
<div class="meta">${pills}</div>
${sections}
${entry.faq.length ? `<section><h2>Frequently Asked Questions</h2>${faqs}</section>` : ''}
${playCta}
<div class="related"><h2>Related Games</h2><div class="tags">${related}</div></div>
<footer>${esc(entry.name)} rules from the Let's Play Cards glossary. Play free card games with friends — no account needed.</footer>
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
          (e) => `<a href="/games/${e.slug}/"><span class="n">${esc(e.name)}${e.status === 'live' ? '<span class="live">LIVE</span>' : ''}</span><span class="d">${esc(e.playerCount)} · ${esc(e.timeMinutes)}</span></a>`,
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
<style>${CSS}</style>
</head>
<body>
<div class="wrap hub">
<nav class="crumb"><a href="/">Let's Play Cards</a> › Card Game Glossary</nav>
<h1>Card Game Glossary</h1>
<p class="intro">Learn how to play every popular card game with a single deck of 52 cards. Each guide covers setup, rules, scoring, strategy, and answers the questions players ask most.</p>
${famBlocks}
<footer>${GLOSSARY_LIST.length} card games documented. Play free card games with friends — no account needed.</footer>
</div>
</body>
</html>`;
}

function renderSitemap(): string {
  const urls = [
    `<url><loc>${BASE_URL}/</loc><changefreq>daily</changefreq></url>`,
    `<url><loc>${BASE_URL}/games/</loc><changefreq>weekly</changefreq></url>`,
    ...GLOSSARY_LIST.map(
      (e) => `<url><loc>${BASE_URL}/games/${e.slug}/</loc><changefreq>monthly</changefreq></url>`,
    ),
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;

mkdirSync(OUT_DIR, { recursive: true });

// Index page
writeFileSync(join(OUT_DIR, 'index.html'), renderIndex());

// Per-game pages
for (const entry of GLOSSARY_LIST) {
  const dir = join(OUT_DIR, entry.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), renderPage(entry));
}

// sitemap + robots
writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), renderSitemap());
writeFileSync(join(process.cwd(), 'public', 'robots.txt'), robots);

console.log(`Glossary built: ${GLOSSARY_LIST.length} game pages + index + sitemap.xml + robots.txt`);
