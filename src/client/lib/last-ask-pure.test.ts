import { describe, expect, it } from 'vitest';
import { bookCounts, bookScoreLine, lastAskLine } from './last-ask-pure';

describe('lastAskLine', () => {
  it('formats a miss and a hit', () => {
    expect(
      lastAskLine({ fromName: 'You', toName: 'Alice', rank: '7', result: 'go_fish' }),
    ).toBe('You asked Alice for 7s — Go Fish!');
    expect(
      lastAskLine({ fromName: 'Alice', toName: 'You', rank: 'Q', result: 'success' }),
    ).toBe('Alice asked You for Qs — got them');
  });

  it('returns null when empty', () => {
    expect(lastAskLine(null)).toBeNull();
  });
});

describe('bookCounts', () => {
  it('counts books per player', () => {
    expect(bookCounts({ a: [[], []], b: [] })).toEqual({ a: 2, b: 0 });
    expect(bookScoreLine({ a: 2, b: 0 }, [{ id: 'a', name: 'You' }, { id: 'b', name: 'Alice' }])).toBe(
      'You 2 · Alice 0',
    );
  });
});
