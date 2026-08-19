import type { Card } from '../types';
import { rankValue } from '../gameTypes';
import { isRed } from '../deck';

/**
 * Can `card` be placed on top of `top`? Descending rank; alternating color by
 * default (Klondike/FreeCell), or same suit when `sameSuitOnly` (Spider).
 * Empty column accepts only a king unless `emptyAcceptsAny`.
 */
export function canStackOn(
  top: Card | null,
  card: Card,
  opts: { sameSuitOnly?: boolean; emptyAcceptsAny?: boolean } = {},
): boolean {
  if (!top) return opts.emptyAcceptsAny ? true : card.rank === 'K';
  if (rankValue(card.rank) !== rankValue(top.rank) - 1) return false;
  if (opts.sameSuitOnly) return card.suit === top.suit;
  return isRed(card.suit) !== isRed(top.suit);
}

/** Can `card` be placed on a foundation (ascending, same suit, ace starts)? */
export function canBuildFoundation(foundation: Card[], card: Card): boolean {
  if (card.rank === 'A') return foundation.length === 0;
  const top = foundation[foundation.length - 1];
  if (!top) return false;
  return card.suit === top.suit && rankValue(card.rank) === rankValue(top.rank) + 1;
}

/** A completed foundation is a king on top (Klondike/FreeCell). */
export function foundationComplete(foundation: Card[]): boolean {
  return foundation.length > 0 && foundation[foundation.length - 1].rank === 'K';
}
