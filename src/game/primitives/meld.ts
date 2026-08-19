import type { Card } from '../types';
import { rankValue } from '../gameTypes';

export interface Meld {
  kind: 'set' | 'run';
  cards: Card[];
  rank: string;
}

/** Find all sets (N+ of a rank) and runs (N+ consecutive in a suit). */
export function findMelds(hand: Card[], setMin = 3, runMin = 3): Meld[] {
  const melds: Meld[] = [];

  const byRank = new Map<string, Card[]>();
  for (const c of hand) {
    const arr = byRank.get(c.rank) ?? [];
    arr.push(c);
    byRank.set(c.rank, arr);
  }
  for (const [rank, cards] of byRank) {
    if (cards.length >= setMin) melds.push({ kind: 'set', cards, rank });
  }

  const bySuit = new Map<string, Card[]>();
  for (const c of hand) {
    const arr = bySuit.get(c.suit) ?? [];
    arr.push(c);
    bySuit.set(c.suit, arr);
  }
  for (const cards of bySuit.values()) {
    const sorted = [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
    let run: Card[] = [];
    for (const c of sorted) {
      const last = run[run.length - 1];
      if (!last || rankValue(c.rank) === rankValue(last.rank) + 1) {
        run.push(c);
      } else {
        if (run.length >= runMin) melds.push({ kind: 'run', cards: run, rank: run[run.length - 1].rank });
        run = [c];
      }
    }
    if (run.length >= runMin) melds.push({ kind: 'run', cards: run, rank: run[run.length - 1].rank });
  }

  return melds;
}

/** Rummy deadwood value: A=1, 2-10 face value, J/Q/K=10. */
export function cardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  return Math.min(10, rankValue(card.rank) + 2);
}

export function deadwood(cards: Card[]): number {
  return cards.reduce((s, c) => s + cardValue(c), 0);
}
