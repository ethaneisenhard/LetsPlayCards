import type { Card, Suit } from '../types';
import { rankValue } from '../gameTypes';

export interface TrickPlay {
  playerId: string;
  card: Card;
}

/** Cards a player may legally play given the lead suit (and trump). */
export function legalPlays(hand: Card[], leadSuit: Suit | null, trump?: Suit): Card[] {
  if (!leadSuit) return hand;
  const followers = hand.filter((c) => c.suit === leadSuit);
  if (followers.length > 0) return followers;
  return hand; // void in the lead suit — may play anything.
}

/** Winner of a completed trick. Trump beats lead, lead beats off-suit. */
export function trickWinner(plays: TrickPlay[], leadSuit: Suit, trump?: Suit): string {
  let best: { playerId: string; score: number } | null = null;
  for (const p of plays) {
    const r = rankValue(p.card.rank);
    const score = p.card.suit === trump ? 2000 + r : p.card.suit === leadSuit ? 1000 + r : r;
    if (!best || score > best.score) best = { playerId: p.playerId, score };
  }
  return best!.playerId;
}

/** Points a set of cards carries in a point-trick game (Hearts-style). */
export function trickPoints(cards: Card[]): number {
  return cards.reduce(
    (sum, c) => sum + (c.suit === 'hearts' ? 1 : c.suit === 'spades' && c.rank === 'Q' ? 13 : 0),
    0,
  );
}
