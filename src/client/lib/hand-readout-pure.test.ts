import { describe, expect, it } from 'vitest';
import { cardWords, handCountLine, handReadout } from './hand-readout-pure';

const aceH = { id: 'AH', suit: 'hearts' as const, rank: 'A' as const };
const sevenD = { id: '7D', suit: 'diamonds' as const, rank: '7' as const };
const queenS = { id: 'QS', suit: 'spades' as const, rank: 'Q' as const };

describe('handReadout', () => {
  it('names cards in everyday words', () => {
    expect(cardWords(aceH)).toBe('Ace of hearts');
    expect(handReadout([aceH, sevenD, queenS])).toBe(
      'Ace of hearts, 7 of diamonds, Queen of spades',
    );
    expect(handReadout([])).toBe('No cards');
    expect(handCountLine(1)).toBe('1 card');
    expect(handCountLine(10)).toBe('10 cards');
  });
});
