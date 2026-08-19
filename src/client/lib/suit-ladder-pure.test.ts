import { describe, expect, it } from 'vitest';
import { suitLaddersFromPlayed } from './suit-ladder-pure';

describe('suitLaddersFromPlayed', () => {
  it('labels open and closed suits', () => {
    const rows = suitLaddersFromPlayed({
      hearts: { min: 6, max: 8 },
      diamonds: null,
      clubs: null,
      spades: null,
    });
    expect(rows[0]).toMatchObject({ suit: 'hearts', label: '6–8' });
    expect(rows[1].label).toBe('closed');
  });
});
