import type { Suit } from '../../game/types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_MARK: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

export type SuitLadder = { suit: Suit; mark: string; label: string };

export function suitLaddersFromPlayed(
  played: Record<string, { min: number; max: number } | null> | undefined,
): SuitLadder[] {
  return SUITS.map((suit) => {
    const range = played?.[suit] ?? null;
    return {
      suit,
      mark: SUIT_MARK[suit],
      label: range ? `${RANK_LABEL[range.min]}–${RANK_LABEL[range.max]}` : 'closed',
    };
  });
}
