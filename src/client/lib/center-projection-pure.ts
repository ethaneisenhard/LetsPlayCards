import type { Card } from '../../game/types';
import { reservedBattleSlots, type BattleSlot } from './battle-lane-pure';

export type CenterProjectable = {
  roundCards?: Record<string, Card[] | undefined>;
  currentTrick?: { playerId: string; card: Card }[];
  /** Shared face-up pile (ERS, slapjack, snap, beggar). Last card is the top. */
  center?: Card[];
};

export function hasSharedCenterPile(gs: CenterProjectable | undefined): boolean {
  return Array.isArray(gs?.center);
}

export function centerPileCards(gs: CenterProjectable | undefined): Card[] {
  return Array.isArray(gs?.center) ? gs.center : [];
}

export function laneSnapshotFromState(gs: CenterProjectable | undefined): Record<string, Card[]> {
  if (!gs) return {};
  if (gs.roundCards && Object.keys(gs.roundCards).length > 0) {
    return Object.fromEntries(
      Object.entries(gs.roundCards).map(([id, cards]) => [id, cards ?? []]),
    );
  }
  const snap: Record<string, Card[]> = {};
  for (const play of gs.currentTrick ?? []) {
    snap[play.playerId] = [...(snap[play.playerId] ?? []), play.card];
  }
  return snap;
}

function isCard(value: unknown): value is Card {
  return !!value && typeof value === 'object' && 'rank' in value && 'suit' in value;
}

/** Face-up extras on the felt (dealer row, etc.). */
export function labeledCenterRows(
  gs: Record<string, unknown> | undefined,
): { label: string; cards: Card[] }[] {
  if (!gs) return [];
  const rows: { label: string; cards: Card[] }[] = [];
  for (const [key, label] of [
    ['dealer', 'Dealer'],
    ['community', 'Community'],
    ['playerHand', 'Player'],
    ['bankerHand', 'Banker'],
    ['widow', 'Widow'],
  ] as const) {
    const value = gs[key];
    if (Array.isArray(value) && value.length > 0 && value.every(isCard)) {
      rows.push({ label, cards: value });
    }
  }
  return rows;
}

export function centerBattleSlots(
  players: { id: string; seat: number }[],
  gs: CenterProjectable | undefined,
): BattleSlot[] {
  return reservedBattleSlots(players, laneSnapshotFromState(gs));
}
