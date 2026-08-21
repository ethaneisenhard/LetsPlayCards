import { HISTORY_CANONICAL_PATH, HISTORY_PAGE } from '../content/history';
import { SSG_CSS, esc, jsonLdScript } from './ssg-html-pure';
import { SITE_ORIGIN } from './static-routes-pure';

export function historyCanonicalUrl(baseUrl = SITE_ORIGIN): string {
  return `${baseUrl}${HISTORY_CANONICAL_PATH}`;
}

function articleJsonLd(url: string): string {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: HISTORY_PAGE.title,
    description: HISTORY_PAGE.metaDescription,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    author: { '@type': 'Organization', name: "Let's Play Cards" },
    publisher: { '@type': 'Organization', name: "Let's Play Cards" },
    dateModified: HISTORY_PAGE.dateModified,
  });
}

function faqJsonLd(): string {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HISTORY_PAGE.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });
}

export function renderHistoryPage(baseUrl = SITE_ORIGIN): string {
  const url = historyCanonicalUrl(baseUrl);
  const toc = HISTORY_PAGE.sections
    .map((s) => `<li><a href="#${esc(s.id)}">${esc(s.heading)}</a></li>`)
    .join('\n');

  const sections = HISTORY_PAGE.sections
    .map((s) => {
      const paras = s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n');
      return `<section id="${esc(s.id)}"><h2>${esc(s.heading)}</h2>\n${paras}</section>`;
    })
    .join('\n');

  const faqs = HISTORY_PAGE.faq
    .map((f) => `<div class="faq"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`)
    .join('\n');

  const plays = HISTORY_PAGE.playLinks
    .map(
      (g) =>
        `<a href="/games/${esc(g.slug)}/"><span class="n">${esc(g.name)}</span><span class="d">${esc(g.tease)}</span></a>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(HISTORY_PAGE.title)}</title>
<meta name="description" content="${esc(HISTORY_PAGE.metaDescription)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(HISTORY_PAGE.title)}">
<meta property="og:description" content="${esc(HISTORY_PAGE.metaDescription)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:site_name" content="Let's Play Cards">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(HISTORY_PAGE.title)}">
<meta name="twitter:description" content="${esc(HISTORY_PAGE.metaDescription)}">
${articleJsonLd(url)}
${faqJsonLd()}
<style>${SSG_CSS}</style>
</head>
<body>
<div class="wrap">
<nav class="crumb"><a href="/">Let's Play Cards</a> › History of Playing Cards</nav>
<a class="back" href="/games/">← Card game rules</a>
<h1>${esc(HISTORY_PAGE.h1)}</h1>
<p class="lead">${esc(HISTORY_PAGE.lead)}</p>
<nav class="toc" aria-label="On this page"><h2>On this page</h2><ol>${toc}</ol></nav>
${sections}
<section id="play">
<h2>Play the games that grew from this pack</h2>
<p>These are live on Let's Play Cards — same 52-card pack, in the browser.</p>
<div class="gamelist">${plays}</div>
</section>
<div class="play"><a href="/">▶ Play a free card game — no account needed</a></div>
<section id="faq"><h2>Frequently asked questions</h2>
${faqs}
</section>
<p class="note">This page follows the usual account in museum and playing-card scholarship: Chinese paper cards, the Mamluk pack in Istanbul, European records from the 1370s, and French suit marks around 1480. Where historians disagree — especially about the Tang “leaf game” — the page says so. No invented quotes.</p>
<footer>History of playing cards from Let's Play Cards. <a href="/games/">Browse game rules</a> · <a href="/">Play now</a></footer>
</div>
</body>
</html>`;
}
