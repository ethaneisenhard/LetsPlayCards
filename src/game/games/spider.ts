import { buildDeck, shuffleDeck } from '../deck';
import type { Card, Rank } from '../types';
import { EngineError, type EngineState } from '../state';
import type { CardGame, GameAction } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';
import { canStackSolitaire } from './klondike';

const SOL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const solRank = (r: Rank): number => SOL_RANKS.indexOf(r);

export interface SpiderState {
  columns: Card[][];
  stock: Card[];
  removedSequences: number;
  won: boolean;
}

function isCompleteRun(run: Card[]): boolean {
  if (run.length !== 13) return false;
  if (run[0].rank !== 'K') return false;
  for (let i = 1; i < run.length; i++) {
    if (run[i].suit !== run[0].suit) return false;
    if (solRank(run[i].rank) !== solRank(run[i - 1].rank) - 1) return false;
  }
  return true;
}

function removeCompleted(columns: Card[][]): { columns: Card[][]; removed: number } {
  let removed = 0;
  const next = columns.map((col) => {
    if (col.length < 13) return col;
    const run = col.slice(col.length - 13);
    if (isCompleteRun(run)) {
      removed += 1;
      return col.slice(0, col.length - 13);
    }
    return col;
  });
  return { columns: next, removed };
}

function finalize(
  state: EngineState,
  columns: Card[][],
  removedSequences: number,
  stock: Card[],
): EngineState {
  const { columns: clean, removed } = removeCompleted(columns);
  const total = removedSequences + removed;
  const won = total >= 8;
  const gs: SpiderState = { columns: clean, stock, removedSequences: total, won };
  return { ...state, game: { ...state.game, status: won ? 'finished' : 'playing', gameState: gs } };
}

export function spiderDealRow(state: EngineState): EngineState {
  const gs = state.game.gameState as SpiderState;
  if (gs.columns.some((col) => col.length === 0)) {
    throw new EngineError('Cannot deal a row while a column is empty');
  }
  if (gs.stock.length < 10) throw new EngineError('Not enough cards in the stock to deal a row');
  const deal = gs.stock.slice(0, 10);
  const columns = gs.columns.map((col, i) => [...col, deal[i]]);
  return finalize(state, columns, gs.removedSequences, gs.stock.slice(10));
}

export function spiderMove(state: EngineState, action: GameAction): EngineState {
  const gs = state.game.gameState as SpiderState;
  const fromIndex = Number(action.fromIndex);
  const toIndex = Number(action.toIndex);
  const cardId = String(action.cardId);
  const count = Number(action.count) || 1;
  if (fromIndex === toIndex) throw new EngineError('Cannot move a run onto itself');

  const columns = gs.columns.map((col) => [...col]);
  const from = columns[fromIndex];
  if (!from || from.length === 0) throw new EngineError(`Column ${fromIndex} is empty`);
  if (count < 1 || count > from.length) throw new EngineError(`Cannot move ${count} cards from column ${fromIndex}`);

  const run = from.slice(from.length - count);
  if (run[0].id !== cardId) throw new EngineError(`Card ${cardId} is not the base of a movable run`);
  for (let i = 1; i < run.length; i++) {
    if (run[i].suit !== run[0].suit) throw new EngineError('Cannot move a run of mixed suits');
    if (solRank(run[i].rank) !== solRank(run[i - 1].rank) - 1) {
      throw new EngineError('Cannot move a run that is not descending');
    }
  }

  const to = columns[toIndex];
  if (!to) throw new EngineError(`Invalid column ${toIndex}`);
  const top = to.length ? to[to.length - 1] : null;
  if (!canStackSolitaire(top, run[0], { sameSuitOnly: true, emptyAcceptsAny: true })) {
    throw new EngineError('Run must build down within a single suit');
  }

  columns[fromIndex] = from.slice(0, from.length - count);
  columns[toIndex] = [...to, ...run];
  return finalize(state, columns, gs.removedSequences, gs.stock);
}

export const spiderGame: CardGame = {
  type: 'spider',
  config: GAME_CONFIGS.spider,
  family: 'solo',
  deck: { copies: 2 },
  setup(state) {
    const { game } = state;
    const deck = shuffleDeck(buildDeck({ copies: 2 }));
    const columns: Card[][] = [];
    let idx = 0;
    for (let i = 0; i < 10; i++) {
      const n = i < 4 ? 6 : 5;
      columns.push(deck.slice(idx, idx + n));
      idx += n;
    }
    const gs: SpiderState = { columns, stock: deck.slice(idx), removedSequences: 0, won: false };
    return { game: { ...game, status: 'playing', deck: [], gameState: gs }, players: state.players };
  },
  reduce(state, action) {
    if (action.intent === 'deal-row') return spiderDealRow(state);
    if (action.intent === 'move') return spiderMove(state, action);
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as SpiderState).won;
  },
  score(state) {
    const gs = state.game.gameState as SpiderState;
    const id = state.players[0]?.id ?? 'solo';
    return { [id]: gs.removedSequences };
  },
};
