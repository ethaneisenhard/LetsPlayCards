import { describe, expect, it } from 'vitest';
import { centerBattleSlots, centerPileCards, hasSharedCenterPile, labeledCenterRows, laneSnapshotFromState } from './center-projection-pure';

const ace = { id: 'AS', suit: 'spades' as const, rank: 'A' as const };

describe('laneSnapshotFromState', () => {
  it('prefers War roundCards', () => {
    expect(laneSnapshotFromState({ roundCards: { a: [ace] } })).toEqual({ a: [ace] });
  });

  it('projects a trick into per-player slots', () => {
    expect(laneSnapshotFromState({ currentTrick: [{ playerId: 'p1', card: ace }] })).toEqual({
      p1: [ace],
    });
  });
});

describe('shared center pile', () => {
  it('treats an empty center array as a reserved pile', () => {
    expect(hasSharedCenterPile({ center: [] })).toBe(true);
    expect(centerPileCards({ center: [] })).toEqual([]);
    expect(hasSharedCenterPile({ roundCards: { a: [ace] } })).toBe(false);
  });

  it('exposes the face-up stack in order', () => {
    const two = { id: '2H', suit: 'hearts' as const, rank: '2' as const };
    expect(centerPileCards({ center: [ace, two] })).toEqual([ace, two]);
  });
});

describe('labeledCenterRows', () => {
  it('exposes a dealer row', () => {
    expect(labeledCenterRows({ dealer: [ace] })).toEqual([{ label: 'Dealer', cards: [ace] }]);
    expect(labeledCenterRows({ center: [ace] })).toEqual([]);
  });
});

describe('centerBattleSlots', () => {
  it('keeps empty seats for a trick game', () => {
    const slots = centerBattleSlots(
      [
        { id: 'p1', seat: 0 },
        { id: 'p2', seat: 1 },
      ],
      { currentTrick: [{ playerId: 'p1', card: ace }] },
    );
    expect(slots[0]).toEqual({ playerId: 'p1', cards: [ace] });
    expect(slots[1]).toEqual({ playerId: 'p2', cards: [] });
  });
});
