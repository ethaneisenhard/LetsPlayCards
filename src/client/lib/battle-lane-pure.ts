import type { Card } from '../../game/types';

export type BattleSlot = {
  playerId: string;
  cards: Card[];
};

/** One reserved slot per seated player so the lane never mounts/unmounts. */
export function reservedBattleSlots(
  players: { id: string; seat: number }[],
  roundCards: Record<string, Card[] | undefined>,
): BattleSlot[] {
  return [...players]
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({ playerId: p.id, cards: roundCards[p.id] ?? [] }));
}
