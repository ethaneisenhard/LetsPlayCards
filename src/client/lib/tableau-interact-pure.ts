import { canBuildSolitaire, canStackSolitaire } from '../../game/games/klondike';
import type { Card } from '../../game/types';
import type { TableauBoardView, TableauPile, TableauSelection } from './tableau-board-pure';

export type TableauClickResult =
  | { type: 'stock' }
  | { type: 'select'; sel: TableauSelection }
  | { type: 'deselect' }
  | { type: 'move'; to: TableauPile }
  | { type: 'ignore' };

export function selectionFromCard(pile: TableauPile, card: Card, at: number): TableauSelection | null {
  if (pile.kind === 'stock') return null;
  if (at < pile.buried || at < 0 || at >= pile.cards.length) return null;
  if (pile.cards[at]?.id !== card.id) return null;
  if (pile.kind === 'waste' && at !== pile.cards.length - 1) return null;
  return { kind: pile.kind, index: pile.index, cardId: card.id, count: pile.cards.length - at };
}

export function cardsInSelection(pile: TableauPile, sel: TableauSelection | null): Card[] {
  if (!sel || sel.kind !== pile.kind || sel.index !== pile.index) return [];
  const at = pile.cards.findIndex((card) => card.id === sel.cardId);
  if (at < 0) return [];
  return pile.cards.slice(at);
}

export function cardInSelection(pile: TableauPile, sel: TableauSelection | null, cardId: string): boolean {
  return cardsInSelection(pile, sel).some((card) => card.id === cardId);
}

function columnOpts(gameType: string): { sameSuitOnly?: boolean; emptyAcceptsAny?: boolean } {
  if (gameType === 'spider') return { sameSuitOnly: true, emptyAcceptsAny: true };
  if (gameType === 'freecell') return { emptyAcceptsAny: true };
  return {};
}

export function legalTableauDropKeys(
  gameType: string,
  board: TableauBoardView,
  sel: TableauSelection,
): string[] {
  const piles = [
    board.stock,
    board.waste,
    ...board.foundations,
    ...board.freecells,
    ...board.columns,
  ].filter((p): p is TableauPile => Boolean(p));
  const from = piles.find((p) => p.kind === sel.kind && p.index === sel.index);
  if (!from) return [];
  const at = from.cards.findIndex((card) => card.id === sel.cardId);
  if (at < from.buried || at < 0) return [];
  const run = from.cards.slice(at);
  if (run.length === 0) return [];
  const keys: string[] = [];
  const opts = columnOpts(gameType);
  for (const col of board.columns) {
    if (col.kind === sel.kind && col.index === sel.index) continue;
    const top = col.cards.length ? col.cards[col.cards.length - 1] : null;
    if (canStackSolitaire(top, run[0], opts)) keys.push(col.key);
  }
  if (run.length === 1 && gameType !== 'spider') {
    for (const f of board.foundations) {
      if (canBuildSolitaire(f.cards, run[0])) keys.push(f.key);
    }
    for (const cell of board.freecells) {
      if (cell.cards.length === 0) keys.push(cell.key);
    }
  }
  return keys;
}

export function autoFoundationKey(
  gameType: string,
  board: TableauBoardView,
  sel: TableauSelection,
): string | null {
  return legalTableauDropKeys(gameType, board, sel).find((key) => key.startsWith('foundation-')) ?? null;
}

export function resolveTableauClick(input: {
  pile: TableauPile;
  card: Card | null;
  at: number;
  sel: TableauSelection | null;
  legalKeys: ReadonlySet<string>;
}): TableauClickResult {
  const { pile, card, at, sel, legalKeys } = input;
  if (pile.kind === 'stock') return { type: 'stock' };

  const next = card ? selectionFromCard(pile, card, at) : null;

  if (!sel) {
    return next ? { type: 'select', sel: next } : { type: 'ignore' };
  }

  if (sel.kind === pile.kind && sel.index === pile.index) {
    if (card && sel.cardId === card.id) return { type: 'deselect' };
    return next ? { type: 'select', sel: next } : { type: 'ignore' };
  }

  if (legalKeys.has(pile.key)) return { type: 'move', to: pile };
  return next ? { type: 'select', sel: next } : { type: 'ignore' };
}

export function dragPastThreshold(dx: number, dy: number, threshold = 8): boolean {
  return dx * dx + dy * dy >= threshold * threshold;
}

/** First pile under the pointer that is not the drag source. */
export function resolveDropPileKey(hitKeys: Array<string | null | undefined>, sourceKey: string): string | null {
  for (const key of hitKeys) {
    if (key && key !== sourceKey) return key;
  }
  return null;
}

export function sourcePileKey(sel: TableauSelection): string {
  return `${sel.kind}-${sel.index}`;
}
