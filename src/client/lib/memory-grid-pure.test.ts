import { describe, expect, it } from 'vitest';
import { projectMemoryGrid } from './memory-grid-pure';

const ace = { id: 'AS', suit: 'spades' as const, rank: 'A' as const };

describe('projectMemoryGrid', () => {
  it('hides face-down unmatched cards', () => {
    const cells = projectMemoryGrid([
      { card: ace, faceUp: false, matched: false },
      { card: ace, faceUp: true, matched: false },
    ]);
    expect(cells[0].card).toBeNull();
    expect(cells[1].card).toEqual(ace);
  });
});
