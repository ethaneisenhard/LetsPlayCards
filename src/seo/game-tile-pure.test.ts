import { describe, expect, it } from 'vitest';
import { GAME_CATALOG } from '../game/registry/catalog';
import {
  catalogGradientCss,
  catalogTilesForSlugs,
  playerCountLabel,
  renderGameTile,
  renderGameTileGrid,
  renderLivePlayCta,
  rulesHref,
  soloHref,
} from './game-tile-pure';

describe('solo + rules hrefs', () => {
  it('starts a live game at /solo/<type>, not home or the rules page', () => {
    expect(soloHref('war')).toBe('/solo/war');
    expect(soloHref('go_fish')).toBe('/solo/go_fish');
    expect(rulesHref('war')).toBe('/games/war/');
  });
});

describe('catalogGradientCss', () => {
  it('turns every catalog color into a to-bottom-right gradient', () => {
    for (const entry of GAME_CATALOG) {
      const css = catalogGradientCss(entry.config.color);
      expect(css.startsWith('linear-gradient(to bottom right, rgba('), entry.type).toBe(true);
      expect(css).toMatch(/rgba\(\d+,\d+,\d+,0\.6\).+rgba\(\d+,\d+,\d+,0\.6\)/);
    }
  });
});

describe('playerCountLabel', () => {
  it('matches the Home cards (same number vs a range)', () => {
    expect(playerCountLabel(2, 2)).toBe('2 players');
    expect(playerCountLabel(2, 6)).toBe('2–6 players');
    expect(playerCountLabel(1, 1)).toBe('1 players');
  });
});

describe('renderGameTile', () => {
  const war = GAME_CATALOG.find((e) => e.type === 'war')!;

  it('looks like a Home card: emoji, gradient, name, tagline, player count', () => {
    const html = renderGameTile(war);
    expect(html).toContain(war.config.emoji);
    expect(html).toContain(war.config.name);
    expect(html).toContain(war.config.tagline);
    expect(html).toContain('2 players');
    expect(html).toContain('background-image:linear-gradient(to bottom right');
    expect(html).toContain('class="tile-main" href="/solo/war"');
    expect(html).toContain('class="tile-play" href="/solo/war"');
    expect(html).toContain('class="tile-rules" href="/games/war/"');
    expect(html).not.toContain('href="/"');
  });

  it('does not label a rules link as Play', () => {
    const html = renderGameTile(war);
    expect(html).not.toMatch(/href="\/games\/war\/"[^>]*>Play/);
    expect(html).toMatch(/href="\/solo\/war">Play<\/a>/);
  });
});

describe('renderGameTileGrid', () => {
  it('renders history play slugs as Home-style cards that start those games', () => {
    const html = renderGameTileGrid(catalogTilesForSlugs(['war', 'go_fish']));
    expect(html).toContain('class="game-tiles"');
    expect(html).toContain('href="/solo/war"');
    expect(html).toContain('href="/solo/go_fish"');
    expect(html).toContain(GAME_CATALOG.find((e) => e.type === 'war')!.config.tagline);
    expect(html).toContain(GAME_CATALOG.find((e) => e.type === 'go_fish')!.config.tagline);
  });
});

describe('renderLivePlayCta', () => {
  it('opens that game, not home', () => {
    expect(renderLivePlayCta('War', 'war')).toContain('href="/solo/war"');
    expect(renderLivePlayCta('Go Fish', 'go_fish')).toContain('href="/solo/go_fish"');
    expect(renderLivePlayCta('War', 'war')).not.toContain('href="/"');
  });
});
