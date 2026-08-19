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

export function moveCardInHand(cards: readonly Card[], cardId: string, delta: number): Card[] {
  const i = cards.findIndex((c) => c.id === cardId);
  if (i < 0 || delta === 0) return [...cards];
  const j = Math.max(0, Math.min(cards.length - 1, i + delta));
  if (j === i) return [...cards];
  const next = [...cards];
  const [card] = next.splice(i, 1);
  next.splice(j, 0, card);
  return next;
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
