import { rankValue } from '../../game/gameTypes';
import type { Card, Suit } from '../../game/types';

const SUIT_ORDER: Record<Suit, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };

export function sortHandByRank(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const r = rankValue(a.rank) - rankValue(b.rank);
    return r !== 0 ? r : SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  });
}

export function sortHandBySuit(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const s = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return s !== 0 ? s : rankValue(a.rank) - rankValue(b.rank);
  });
}

/** Cluster the same number or face (both 2s, both Queens). Keeps first-seen group order — not low-to-high. */
export function groupHandByPairs(cards: readonly Card[]): Card[] {
  const order: string[] = [];
  const buckets = new Map<string, Card[]>();
  for (const card of cards) {
    const list = buckets.get(card.rank);
    if (list) list.push(card);
    else {
      buckets.set(card.rank, [card]);
      order.push(card.rank);
    }
  }
  return order.flatMap((rank) => buckets.get(rank) ?? []);
}

export function moveCardInHand(cards: readonly Card[], cardId: string, delta: number): Card[] {
  const i = cards.findIndex((c) => c.id === cardId);
  if (i < 0 || delta === 0) return [...cards];
  return moveCardToIndex(cards, cardId, i + delta);
}

export function moveCardToIndex(cards: readonly Card[], cardId: string, toIndex: number): Card[] {
  const i = cards.findIndex((c) => c.id === cardId);
  if (i < 0) return [...cards];
  const j = Math.max(0, Math.min(cards.length - 1, toIndex));
  if (j === i) return [...cards];
  const next = [...cards];
  const [card] = next.splice(i, 1);
  next.splice(j, 0, card);
  return next;
}

/** Which hand slot a pointer is over in the overlapping fan. */
export function dropIndexFromOffset(
  offsetX: number,
  count: number,
  gap: number,
  cardWidth: number,
): number {
  if (count <= 1) return 0;
  const step = gap > 0 ? gap : cardWidth;
  return Math.max(0, Math.min(count - 1, Math.round(offsetX / step)));
}

/** Keep the player's arrangement; drop gone cards; append newly dealt ones. */
export function syncHandOrder(prev: readonly Card[], incoming: readonly Card[]): Card[] {
  const byId = new Map(incoming.map((c) => [c.id, c]));
  const kept: Card[] = [];
  for (const card of prev) {
    const next = byId.get(card.id);
    if (next) kept.push(next);
  }
  const seen = new Set(kept.map((c) => c.id));
  return [...kept, ...incoming.filter((c) => !seen.has(c.id))];
}
