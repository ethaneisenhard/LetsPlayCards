import type { Card } from '../../game/types';

export type TableauPileKind = 'stock' | 'waste' | 'column' | 'foundation' | 'freecell';

export type TableauPile = {
  key: string;
  kind: TableauPileKind;
  index: number;
  cards: Card[];
  buried: number;
};

export type TableauBoardView = {
  stock: TableauPile | null;
  waste: TableauPile | null;
  foundations: TableauPile[];
  freecells: TableauPile[];
  columns: TableauPile[];
  stockIntent: 'draw-stock' | 'deal-row' | null;
  reveal: 'top-only' | 'all';
};

function asCards(value: unknown): Card[] {
  return Array.isArray(value) ? (value.filter((c) => c && typeof c === 'object' && 'rank' in c) as Card[]) : [];
}

function pile(kind: TableauPileKind, index: number, cards: Card[], buried: number): TableauPile {
  return { key: `${kind}-${index}`, kind, index, cards, buried };
}

function columnBuriedFromState(
  reveal: 'top-only' | 'all',
  cards: Card[],
  buriedList: unknown,
  index: number,
): number {
  if (reveal === 'all') return 0;
  const raw = Array.isArray(buriedList) ? buriedList[index] : undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(Math.floor(raw), cards.length));
  }
  return Math.max(0, cards.length - 1);
}

function klondikeBoard(gs: Record<string, unknown>, reveal: 'top-only' | 'all'): TableauBoardView {
  const rawCols = Array.isArray(gs.columns) ? gs.columns : [];
  const cols = rawCols.map((col, i) => {
    const cards = asCards(col);
    return pile('column', i, cards, columnBuriedFromState(reveal, cards, gs.buried, i));
  });
  const foundations = (Array.isArray(gs.foundations) ? gs.foundations : []).map((f, i) =>
    pile('foundation', i, asCards(f), 0),
  );
  const stockCards = asCards(gs.stock);
  const wasteCards = asCards(gs.waste);
  const freecells = (Array.isArray(gs.freecells) ? gs.freecells : []).map((cell, i) =>
    pile('freecell', i, cell && typeof cell === 'object' && 'rank' in cell ? [cell as Card] : [], 0),
  );
  return {
    stock: gs.stock !== undefined ? pile('stock', 0, stockCards, stockCards.length) : null,
    waste: gs.waste !== undefined ? pile('waste', 0, wasteCards, 0) : null,
    foundations,
    freecells,
    columns: cols,
    stockIntent: gs.stock !== undefined ? 'draw-stock' : null,
    reveal,
  };
}

export function projectTableauBoard(
  gameType: string,
  gs: Record<string, unknown> | undefined,
  viewerId?: string,
): TableauBoardView | null {
  if (!gs) return null;
  if (gameType === 'solitaire_race') {
    const boards = gs.boards as Record<string, Record<string, unknown>> | undefined;
    const mine = viewerId ? boards?.[viewerId] : undefined;
    if (!mine) return null;
    return { ...klondikeBoard(mine, 'top-only'), stockIntent: 'draw-stock' };
  }
  if (gameType === 'klondike') return klondikeBoard(gs, 'top-only');
  if (gameType === 'freecell') return { ...klondikeBoard(gs, 'all'), stock: null, waste: null, stockIntent: null };
  if (gameType === 'spider') {
    const board = klondikeBoard(gs, 'all');
    return { ...board, foundations: [], freecells: [], stockIntent: 'deal-row' };
  }
  return null;
}

export type TableauSelection = { kind: TableauPileKind; index: number; cardId: string; count: number };

export function tableauMoveAction(
  gameType: string,
  from: TableauSelection,
  to: TableauPile,
): { intent: 'move'; [k: string]: unknown } {
  if (gameType === 'spider') {
    return {
      intent: 'move',
      fromIndex: from.index,
      toIndex: to.index,
      cardId: from.cardId,
      count: from.count,
    };
  }
  return {
    intent: 'move',
    from: from.kind,
    to: to.kind,
    fromIndex: from.index,
    toIndex: to.index,
    cardId: from.cardId,
    count: from.count,
  };
}

export function findTableauPile(board: TableauBoardView, key: string): TableauPile | null {
  const piles = [
    board.stock,
    board.waste,
    ...board.foundations,
    ...board.freecells,
    ...board.columns,
  ];
  return piles.find((p) => p && p.key === key) ?? null;
}
