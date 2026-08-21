import { describe, expect, it } from 'vitest';
import { GAME_CATALOG } from '../game/registry/catalog';
import { GLOSSARY } from './glossary';
import { GAME_ORIGINS, HISTORY_CENTURIES, HISTORY_MARKS, HISTORY_PAGE, historyImageSrcs } from './history';
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

  it('sends people into catalog games and the live lobby', () => {
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/games/war/"');
    expect(html).toContain('href="/games/go_fish/"');
    expect(html).toContain('width=device-width');
  });

  it('embeds a local symbols collection and an over-the-centuries strip', () => {
    expect(html).toContain('id="marks"');
    expect(html).toContain('id="centuries"');
    expect(html).toContain(HISTORY_MARKS.heading);
    expect(html).toContain(HISTORY_CENTURIES.heading);
    expect(html).toContain('Original drawing — not a photo of a real pack');
    expect(html).toMatch(/loading="lazy"/);
    for (const src of historyImageSrcs()) {
      expect(html).toContain(`src="${src}"`);
      expect(src.startsWith('/history/img/')).toBe(true);
    }
    expect(HISTORY_CENTURIES.figures.length).toBeGreaterThanOrEqual(6);
    for (const fig of HISTORY_CENTURIES.figures) {
      expect(fig.alt.length).toBeGreaterThan(20);
      expect(fig.credit.license.length).toBeGreaterThan(3);
      expect(html).toContain(fig.credit.license);
    }
  });
});
