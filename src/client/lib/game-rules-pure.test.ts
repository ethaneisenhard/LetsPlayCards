import { describe, expect, it } from 'vitest';
import { GAME_CONFIGS } from '../../game/registry/catalog';
import { firstSentence, rulesCardFor } from './game-rules-pure';

describe('rulesCardFor', () => {
  it('keeps catalog steps and a short win line', () => {
    const card = rulesCardFor(GAME_CONFIGS.war);
    expect(card.name).toBe('War');
    expect(card.players).toBe('2P');
    expect(card.steps.length).toBeGreaterThan(2);
    expect(card.win).toMatch(/52|win/i);
    expect(card.win.length).toBeLessThan(80);
  });

  it('uses the first sentence of a glossary Winning section', () => {
    expect(firstSentence('Own every card. Games run long.')).toBe('Own every card.');
    const card = rulesCardFor(GAME_CONFIGS.war, {
      sections: [{ heading: 'Winning', body: 'Own every card. Games run long.' }],
    });
    expect(card.win).toBe('Own every card.');
  });
});
