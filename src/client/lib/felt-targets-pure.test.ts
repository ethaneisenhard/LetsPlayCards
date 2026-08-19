import { describe, expect, it } from 'vitest';
import { cornerPilesFromState, fishingTableFromState, pegLine } from './felt-targets-pure';

const ace = { id: 'AS', suit: 'spades' as const, rank: 'A' as const };

describe('felt targets', () => {
  it('pads four corners', () => {
    expect(cornerPilesFromState([[ace]])).toHaveLength(4);
    expect(cornerPilesFromState([[ace]])[0].cards).toEqual([ace]);
  });

  it('reads cassino table and builds', () => {
    const f = fishingTableFromState({
      table: [ace],
      builds: [{ id: 'b1', value: 5, cards: [ace] }],
      center: [[ace]],
    });
    expect(f.table).toEqual([ace]);
    expect(f.builds[0]).toMatchObject({ id: 'b1', value: 5 });
    expect(f.center[0]).toEqual([ace]);
  });

  it('formats a peg line', () => {
    expect(pegLine({ phase: 'pegging', pegTotal: 12, scores: { a: 4, b: 8 } })).toBe('pegging · peg 12 · 4–8');
  });
});
