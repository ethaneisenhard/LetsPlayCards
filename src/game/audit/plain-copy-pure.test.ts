import { describe, expect, it } from 'vitest';
import { undefinedJargon } from './plain-copy-pure';

describe('undefinedJargon', () => {
  it('fails “book” first unless the sentence says four of a kind', () => {
    expect(undefinedJargon('Most books win.').map((h) => h.word)).toContain('book');
    expect(undefinedJargon('Four of a kind is a book (one point).')).toEqual([]);
    expect(undefinedJargon('Four cards with the same number or face is a set (one point).')).toEqual([]);
  });

  it('allows a banned word only when the same sentence defines it', () => {
    expect(undefinedJargon('Follow suit if you can.').map((h) => h.word)).toContain('follow suit');
    expect(
      undefinedJargon('Follow suit (same shape: hearts, diamonds, clubs, or spades) if you can.'),
    ).toEqual([]);
  });
});
