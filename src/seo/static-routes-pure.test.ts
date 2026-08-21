import { describe, expect, it } from 'vitest';
import { HISTORY_CANONICAL_PATH } from '../content/history';
import {
  normalizePath,
  renderRobotsTxt,
  renderSitemapXml,
  sitemapLocs,
  staticSeoRoute,
} from './static-routes-pure';

describe('staticSeoRoute', () => {
  it('serves the history article as pre-rendered HTML', () => {
    expect(staticSeoRoute('/history')).toEqual({ kind: 'asset', path: '/history/index.html' });
    expect(staticSeoRoute('/history/')).toEqual({ kind: 'asset', path: '/history/index.html' });
  });

  it('301s the long history slug to /history/', () => {
    expect(staticSeoRoute('/history-of-playing-cards')).toEqual({
      kind: 'redirect',
      to: HISTORY_CANONICAL_PATH,
      status: 301,
    });
    expect(staticSeoRoute('/history-of-playing-cards/')).toEqual({
      kind: 'redirect',
      to: HISTORY_CANONICAL_PATH,
      status: 301,
    });
  });

  it('serves glossary pages the same way as before', () => {
    expect(staticSeoRoute('/games')).toEqual({ kind: 'asset', path: '/games/index.html' });
    expect(staticSeoRoute('/games/')).toEqual({ kind: 'asset', path: '/games/index.html' });
    expect(staticSeoRoute('/games/war')).toEqual({ kind: 'asset', path: '/games/war/index.html' });
    expect(staticSeoRoute('/games/go_fish/')).toEqual({
      kind: 'asset',
      path: '/games/go_fish/index.html',
    });
  });

  it('leaves the SPA and live rooms alone', () => {
    expect(staticSeoRoute('/')).toBeNull();
    expect(staticSeoRoute('/playground')).toBeNull();
    expect(staticSeoRoute('/solo/go_fish')).toBeNull();
    expect(staticSeoRoute('/game/ABC123')).toBeNull();
  });

  it('never rewrites /history/img files to the article HTML', () => {
    expect(staticSeoRoute('/history/img/suit-marks.svg')).toBeNull();
    expect(staticSeoRoute('/history/img/german-marks.webp')).toBeNull();
    expect(staticSeoRoute('/history/img/french-pips.webp')).toBeNull();
    expect(staticSeoRoute('/history/img/italian-pips.webp')).toBeNull();
    expect(staticSeoRoute('/history/img/ming-1400.webp')).toBeNull();
    expect(staticSeoRoute('/history/img/italian-15c.webp')).toBeNull();
  });
});

describe('sitemap + robots', () => {
  it('lists home, glossary hub, history, and each game', () => {
    const locs = sitemapLocs(['war', 'go_fish']);
    expect(locs).toContain('https://letsplaycards.devbyethan.workers.dev/');
    expect(locs).toContain('https://letsplaycards.devbyethan.workers.dev/games/');
    expect(locs).toContain('https://letsplaycards.devbyethan.workers.dev/history/');
    expect(locs).toContain('https://letsplaycards.devbyethan.workers.dev/games/war/');
    expect(locs).not.toContain('https://letsplaycards.devbyethan.workers.dev/history-of-playing-cards/');
  });

  it('emits a sitemap urlset and a robots Sitemap line', () => {
    const xml = renderSitemapXml(['war']);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('/history/</loc>');
    expect(renderRobotsTxt()).toContain('Sitemap: https://letsplaycards.devbyethan.workers.dev/sitemap.xml');
  });
});

describe('normalizePath', () => {
  it('keeps root and strips other trailing slashes', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/history/')).toBe('/history');
  });
});
