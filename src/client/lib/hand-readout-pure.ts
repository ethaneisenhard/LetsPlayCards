import type { Card } from '../../game/types';

const RANK_WORD: Record<string, string> = {
  A: 'Ace',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
};

export function cardWords(card: { rank: string; suit: string }): string {
  const rank = RANK_WORD[card.rank] ?? card.rank;
  return `${rank} of ${card.suit}`;
}

/** Spoken / large-print list of the cards you are holding. */
export function handReadout(cards: readonly Card[]): string {
  if (cards.length === 0) return 'No cards';
  return cards.map(cardWords).join(', ');
}

export function handCountLine(n: number): string {
  return n === 1 ? '1 card' : `${n} cards`;
}
