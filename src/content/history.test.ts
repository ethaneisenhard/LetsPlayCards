import { describe, expect, it } from 'vitest';
import { GAME_CATALOG } from '../game/registry/catalog';
import { GLOSSARY } from './glossary';
import {
  GAME_ORIGINS,
  HISTORY_ASSET_VERSION,
  HISTORY_CENTURIES,
  HISTORY_MARKS,
  HISTORY_PAGE,
  historyImageSrcs,
} from './history';
import { renderHistoryPage } from '../seo/history-html-pure';

const CATALOG_SLUGS = new Set<string>(GAME_CATALOG.map((e) => e.type));

describe('HISTORY_PAGE', () => {
  it('covers the origin story, the 52-card pack, tarot, and family games', () => {
    const ids = HISTORY_PAGE.sections.map((s) => s.id);
    expect(ids).toEqual(['china', 'mamluk', 'fifty-two', 'tarot', 'games']);
    expect(HISTORY_PAGE.lead).toMatch(/suit/i);
    expect(HISTORY_PAGE.lead).toMatch(/deck/i);
  });

  it('answers the ranking FAQs in plain language', () => {
    const questions = HISTORY_PAGE.faq.map((f) => f.q.toLowerCase());
    expect(questions.some((q) => q.includes('invented'))).toBe(true);
    expect(questions.some((q) => q.includes('how many cards'))).toBe(true);
    expect(questions.some((q) => q.includes('four suits'))).toBe(true);
    expect(questions.some((q) => q.includes('tarot'))).toBe(true);
    for (const f of HISTORY_PAGE.faq) {
      expect(f.a.length).toBeGreaterThan(40);
    }
  });

  it('only CTAs games this site actually has', () => {
    expect(HISTORY_PAGE.playLinks.length).toBeGreaterThanOrEqual(8);
    for (const link of HISTORY_PAGE.playLinks) {
      expect(CATALOG_SLUGS.has(link.slug)).toBe(true);
      expect(GLOSSARY[link.slug]).toBeDefined();
    }
  });

  it('only annotates glossary slugs that exist', () => {
    for (const slug of Object.keys(GAME_ORIGINS)) {
      expect(GLOSSARY[slug], slug).toBeDefined();
      expect(GAME_ORIGINS[slug]!.length).toBeGreaterThan(40);
    }
  });
});

describe('renderHistoryPage', () => {
  const html = renderHistoryPage();

  it('is real HTML with title, canonical, Article + FAQ JSON-LD', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain(`<title>${HISTORY_PAGE.title}</title>`);
    expect(html).toContain('rel="canonical" href="https://letsplaycards.devbyethan.workers.dev/history/"');
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain(HISTORY_PAGE.h1);
    expect(html).toContain('id="china"');
    expect(html).not.toContain('id="root"');
  });

  it('starts those catalog games from Play, and keeps rules on /games/', () => {
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/solo/war"');
    expect(html).toContain('href="/solo/go_fish"');
    expect(html).toContain('href="/games/war/"');
    expect(html).toContain('href="/games/go_fish/"');
    expect(html).toContain('class="tile-play" href="/solo/war"');
    expect(html).not.toMatch(/class="play"><a href="\/"/);
    expect(html).toContain('width=device-width');
    const war = GAME_CATALOG.find((e) => e.type === 'war')!;
    expect(html).toContain(war.config.emoji);
    expect(html).toContain(war.config.tagline);
    expect(html).toContain('2 players');
  });

  it('embeds a local symbols collection and an over-the-centuries strip', () => {
    expect(html).toContain('id="marks"');
    expect(html).toContain('id="centuries"');
    expect(html).toContain(HISTORY_MARKS.heading);
    expect(html).toContain(HISTORY_CENTURIES.heading);
    expect(html).not.toContain('Original drawing — not a photo of a real pack');
    expect(html).not.toMatch(/suit-marks\.(svg|webp)/);
    expect(html).toContain(`<!-- history-visuals:${HISTORY_ASSET_VERSION} -->`);
    expect(html).toMatch(/loading="lazy"/);
    for (const src of historyImageSrcs()) {
      expect(html).toContain(`src="${src}?v=${HISTORY_ASSET_VERSION}"`);
      expect(src.startsWith('/history/img/')).toBe(true);
      expect(src.endsWith('.svg')).toBe(false);
    }
    expect(HISTORY_MARKS.figures.length).toBeGreaterThanOrEqual(5);
    expect(HISTORY_CENTURIES.figures.length).toBeGreaterThanOrEqual(6);
    for (const fig of [...HISTORY_MARKS.figures, ...HISTORY_CENTURIES.figures]) {
      expect(fig.kind).toBe('photo');
      expect(fig.alt.length).toBeGreaterThan(20);
      expect(fig.credit.license.length).toBeGreaterThan(3);
      expect(html).toContain(fig.credit.license);
    }
    const marksCopy = HISTORY_MARKS.figures.map((f) => `${f.caption} ${f.alt}`).join(' ');
    expect(marksCopy).toMatch(/China/i);
    expect(marksCopy).toMatch(/polo/i);
    expect(marksCopy).toMatch(/cups/i);
    expect(marksCopy).toMatch(/acorn/i);
    expect(marksCopy).toMatch(/spade/i);
  });

  it('puts pictures above the essay and eager-loads the first three', () => {
    const marksAt = html.indexOf('id="marks"');
    const centuriesAt = html.indexOf('id="centuries"');
    const chinaAt = html.indexOf('id="china"');
    expect(marksAt).toBeGreaterThan(0);
    expect(centuriesAt).toBeGreaterThan(marksAt);
    expect(chinaAt).toBeGreaterThan(centuriesAt);
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    expect(imgs.length).toBeGreaterThanOrEqual(3);
    for (const tag of imgs.slice(0, 3)) {
      expect(tag).not.toMatch(/loading="lazy"/);
    }
  });

  it('shows real historic cards in the marks section, not a drawing', () => {
    expect(HISTORY_ASSET_VERSION).toBe('tiles1');
    expect(html).toMatch(/\.game-tile \.n\{display:block/);
    expect(html).toMatch(/\.game-tile \.d\{display:block/);
    expect(html).toContain('class="game-tiles"');
    expect(html).toContain('class="marks-grid"');
    for (const fig of HISTORY_MARKS.figures) {
      expect(fig.kind).toBe('photo');
      expect(fig.src).toMatch(/\.webp$/);
      expect(html).toContain(`src="${fig.src}?v=${HISTORY_ASSET_VERSION}"`);
    }
  });
});
