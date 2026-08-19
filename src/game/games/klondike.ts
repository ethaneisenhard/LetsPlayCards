import { createDeck, shuffleDeck, isRed } from '../deck';
import type { Card, Rank } from '../types';
import { EngineError, type EngineState } from '../state';
import type { CardGame, GameAction } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';
import { foundationComplete } from '../primitives/tableau';

// Solitaire rank order: Ace is LOW. (`rankValue` in gameTypes.ts puts Ace high
// for compare games, which is wrong for patience-style building, so we keep a
// local order here. The shared `canStackOn`/`canBuildFoundation` primitives
// inherit that Ace-high ordering, hence these solitaire-specific helpers.)
const SOL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const solRank = (r: Rank): number => SOL_RANKS.indexOf(r);

/** Descending, alternating-color tableau stack (Ace low). */
export function canStackSolitaire(
  top: Card | null,
  card: Card,
  opts: { sameSuitOnly?: boolean; emptyAcceptsAny?: boolean } = {},
): boolean {
  if (!top) return opts.emptyAcceptsAny ? true : card.rank === 'K';
  if (solRank(card.rank) !== solRank(top.rank) - 1) return false;
  if (opts.sameSuitOnly) return card.suit === top.suit;
  return isRed(card.suit) !== isRed(top.suit);
}

/** Ascending, same-suit foundation build (Ace low). */
export function canBuildSolitaire(foundation: Card[], card: Card): boolean {
  if (card.rank === 'A') return foundation.length === 0;
  const top = foundation[foundation.length - 1];
  if (!top) return false;
  return card.suit === top.suit && solRank(card.rank) === solRank(top.rank) + 1;
}

export interface KlondikeState {
  columns: Card[][];
  /** Face-down count per column. Missing on legacy rooms → infer top-only. */
  buried?: number[];
  foundations: Card[][];
  stock: Card[];
  waste: Card[];
  won: boolean;
}

/** Deal the classic 7-column Klondike layout from a 52-card deck. */
export function dealKlondikeFromDeck(deck: Card[]): KlondikeState {
  const columns: Card[][] = [];
  let idx = 0;
  for (let i = 0; i < 7; i++) {
    columns.push(deck.slice(idx, idx + i + 1));
    idx += i + 1;
  }
  return {
    columns,
    buried: [0, 1, 2, 3, 4, 5, 6],
    foundations: [[], [], [], []],
    stock: deck.slice(idx),
    waste: [],
    won: false,
  };
}

export function columnBuried(gs: Pick<KlondikeState, 'columns' | 'buried'>, index: number): number {
  const col = gs.columns[index] ?? [];
  const raw = gs.buried?.[index];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(Math.floor(raw), col.length));
  }
  return Math.max(0, col.length - 1);
}

function buryColumns(gs: KlondikeState, columns: Card[][]): number[] {
  return columns.map((col, i) => {
    let buried = columnBuried({ columns: gs.columns, buried: gs.buried }, i);
    if (col.length === 0) return 0;
    if (buried > col.length) buried = col.length;
    if (buried === col.length) return col.length - 1;
    return buried;
  });
}

function isLegalRun(cards: Card[]): boolean {
  for (let i = 1; i < cards.length; i++) {
    if (!canStackSolitaire(cards[i - 1], cards[i])) return false;
  }
  return true;
}

function finish(state: EngineState, gs: KlondikeState): EngineState {
  const won = gs.foundations.every(foundationComplete);
  return {
    ...state,
    game: { ...state.game, status: won ? 'finished' : 'playing', gameState: { ...gs, won } },
  };
}

/** Pure board transition: flip one card from stock to waste (or recycle the waste). */
export function drawFromBoard(gs: KlondikeState): KlondikeState {
  let { stock, waste } = gs;
  if (stock.length === 0) {
    if (waste.length === 0) throw new EngineError('No cards left to draw');
    // Classic: turn the waste face-down. Oldest drawn card is next to draw.
    stock = [...waste].reverse();
    waste = [];
  } else {
    const card = stock[stock.length - 1];
    stock = stock.slice(0, -1);
    waste = [...waste, card];
  }
  return { ...gs, stock, waste };
}

export function klondikeDraw(state: EngineState): EngineState {
  const gs = state.game.gameState as KlondikeState;
  return { ...state, game: { ...state.game, gameState: drawFromBoard(gs) } };
}

/** Pure board transition: move a card or face-up run. Throws on illegal moves. */
export function moveOnBoard(gs: KlondikeState, action: GameAction): KlondikeState {
  const from = String(action.from);
  const to = String(action.to);
  const toIndex = Number(action.toIndex);
  const cardId = String(action.cardId);
  if (!['waste', 'column', 'foundation'].includes(from)) throw new EngineError(`Invalid source: ${from}`);
  if (to !== 'column' && to !== 'foundation') throw new EngineError(`Invalid destination: ${to}`);

  const columns = gs.columns.map((col) => [...col]);
  const foundations = gs.foundations.map((f) => [...f]);
  let waste = [...gs.waste];
  let run: Card[];

  if (from === 'waste') {
    if (waste.length === 0) throw new EngineError('The waste pile is empty');
    const card = waste[waste.length - 1];
    if (card.id !== cardId) throw new EngineError(`Card ${cardId} is not on top of the waste`);
    waste = waste.slice(0, -1);
    run = [card];
  } else if (from === 'column') {
    const i = Number(action.fromIndex);
    const col = columns[i];
    if (!col || col.length === 0) throw new EngineError(`Column ${i} is empty`);
    const at = col.findIndex((card) => card.id === cardId);
    const buried = columnBuried(gs, i);
    if (at < 0) throw new EngineError(`Card ${cardId} is not in column ${i}`);
    if (at < buried) throw new EngineError('Cannot move a face-down card');
    run = col.slice(at);
    if (!isLegalRun(run)) throw new EngineError('That run is not a descending alternating-color sequence');
    const count = Number(action.count);
    if (Number.isFinite(count) && count > 0 && count !== run.length) {
      throw new EngineError(`Cannot move ${count} cards starting at ${cardId}`);
    }
    columns[i] = col.slice(0, at);
  } else {
    const i = Number(action.fromIndex);
    const f = foundations[i];
    if (!f || f.length === 0) throw new EngineError(`Foundation ${i} is empty`);
    const card = f[f.length - 1];
    if (card.id !== cardId) throw new EngineError(`Card ${cardId} is not on top of foundation ${i}`);
    foundations[i] = f.slice(0, -1);
    run = [card];
  }

  if (to === 'column') {
    if (from === 'column' && Number(action.fromIndex) === toIndex) {
      throw new EngineError('Cannot move a card onto itself');
    }
    const col = columns[toIndex];
    if (!col) throw new EngineError(`Invalid column ${toIndex}`);
    const top = col.length ? col[col.length - 1] : null;
    if (!canStackSolitaire(top, run[0])) throw new EngineError('Cards must descend in rank and alternate color');
    columns[toIndex] = [...col, ...run];
  } else {
    if (run.length !== 1) throw new EngineError('Foundations accept one card at a time');
    const f = foundations[toIndex];
    if (!f) throw new EngineError(`Invalid foundation ${toIndex}`);
    if (!canBuildSolitaire(f, run[0])) throw new EngineError('Foundation builds A→K by suit');
    foundations[toIndex] = [...f, run[0]];
  }

  return { ...gs, columns, foundations, waste, buried: buryColumns(gs, columns) };
}

export function klondikeMove(state: EngineState, action: GameAction): EngineState {
  const gs = state.game.gameState as KlondikeState;
  return finish(state, moveOnBoard(gs, action));
}

export const klondikeGame: CardGame = {
  type: 'klondike',
  config: GAME_CONFIGS.klondike,
  family: 'solo',
  deck: {},
  setup(state) {
    const { game } = state;
    const gs = dealKlondikeFromDeck(shuffleDeck(createDeck()));
    return { game: { ...game, status: 'playing', deck: [], gameState: gs }, players: state.players };
  },
  reduce(state, action) {
    if (action.intent === 'draw-stock') return klondikeDraw(state);
    if (action.intent === 'move') return klondikeMove(state, action);
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as KlondikeState).won;
  },
  score(state) {
    const gs = state.game.gameState as KlondikeState;
    const id = state.players[0]?.id ?? 'solo';
    return { [id]: gs.foundations.reduce((sum, f) => sum + f.length, 0) };
  },
};
