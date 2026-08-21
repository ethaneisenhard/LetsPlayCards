import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../content/glossary';
import { renderGlossaryPage } from './glossary-html-pure';

describe('renderGlossaryPage', () => {
  const war = renderGlossaryPage(GLOSSARY.war!);

  it('starts War from the green Play button', () => {
    expect(war).toContain('href="/solo/war"');
    expect(war).toContain('▶ Play War online — free');
    expect(war).not.toMatch(/class="play"><a href="\/"/);
  });

  it('keeps /games/war/ as the rules page, not the Play target', () => {
    expect(war).toContain('<link rel="canonical" href="https://letsplaycards.devbyethan.workers.dev/games/war/">');
    expect(war).not.toMatch(/class="play"><a href="\/games\/war\//);
  });

  it('shows related games as Home-style cards, not gold pills', () => {
    expect(war).toContain('class="game-tiles"');
    expect(war).toContain('class="game-tile"');
    expect(war).not.toContain('class="tags"');
    expect(war).toContain('href="/solo/slapjack"');
    expect(war).toContain('href="/games/slapjack/"');
  });
});
