import { describe, expect, it } from 'vitest';
import { reservedBattleSlots } from './battle-lane-pure';

describe('reservedBattleSlots', () => {
  it('keeps a slot for every player, even with no cards', () => {
    const slots = reservedBattleSlots(
      [
        { id: 'fake-1', seat: 1 },
        { id: 'fake-0', seat: 0 },
      ],
      {},
    );
    expect(slots).toEqual([
      { playerId: 'fake-0', cards: [] },
      { playerId: 'fake-1', cards: [] },
    ]);
  });

  it('fills cards without dropping empty seats', () => {
    const card = { id: 'c1', suit: 'spades' as const, rank: 'A' as const };
    const slots = reservedBattleSlots(
      [
        { id: 'you', seat: 0 },
        { id: 'alice', seat: 1 },
      ],
      { you: [card] },
    );
    expect(slots[0]?.cards).toEqual([card]);
    expect(slots[1]?.cards).toEqual([]);
  });
});
