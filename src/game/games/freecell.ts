import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, type EngineState } from '../state';
import type { CardGame, GameAction } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';
import { foundationComplete } from '../primitives/tableau';
import { canStackSolitaire, canBuildSolitaire } from './klondike';

export interface FreeCellState {
  columns: Card[][];
  freecells: (Card | null)[];
  foundations: Card[][];
  won: boolean;
}

function finish(state: EngineState, gs: FreeCellState): EngineState {
  const won = gs.foundations.every(foundationComplete);
  return {
    ...state,
    game: { ...state.game, status: won ? 'finished' : 'playing', gameState: { ...gs, won } },
  };
}

export function freecellMove(state: EngineState, action: GameAction): EngineState {
  const gs = state.game.gameState as FreeCellState;
  const from = String(action.from);
  const to = String(action.to);
  const toIndex = Number(action.toIndex);
  const cardId = String(action.cardId);
  if (!['column', 'freecell', 'foundation'].includes(from)) throw new EngineError(`Invalid source: ${from}`);
  if (!['column', 'freecell', 'foundation'].includes(to)) throw new EngineError(`Invalid destination: ${to}`);

  const columns = gs.columns.map((col) => [...col]);
  const freecells = [...gs.freecells];
  const foundations = gs.foundations.map((f) => [...f]);
  let card: Card;

  if (from === 'column') {
    const i = Number(action.fromIndex);
    const col = columns[i];
    if (!col || col.length === 0) throw new EngineError(`Column ${i} is empty`);
    card = col[col.length - 1];
    if (card.id !== cardId) throw new EngineError(`Card ${cardId} is not on top of column ${i}`);
    columns[i] = col.slice(0, -1);
  } else if (from === 'freecell') {
    const i = Number(action.fromIndex);
    const cell = freecells[i];
    if (cell === undefined || cell === null) throw new EngineError(`Freecell ${i} is empty`);
    card = cell;
    if (card.id !== cardId) throw new EngineError(`Card ${cardId} is not in freecell ${i}`);
    freecells[i] = null;
  } else {
    const i = Number(action.fromIndex);
    const f = foundations[i];
    if (!f || f.length === 0) throw new EngineError(`Foundation ${i} is empty`);
    card = f[f.length - 1];
    if (card.id !== cardId) throw new EngineError(`Card ${cardId} is not on top of foundation ${i}`);
    foundations[i] = f.slice(0, -1);
  }

  if (to === 'column') {
    if (from === 'column' && Number(action.fromIndex) === toIndex) {
      throw new EngineError('Cannot move a card onto itself');
    }
    const col = columns[toIndex];
    if (!col) throw new EngineError(`Invalid column ${toIndex}`);
    const top = col.length ? col[col.length - 1] : null;
    if (!canStackSolitaire(top, card, { emptyAcceptsAny: true })) {
      throw new EngineError('Cards must descend in rank and alternate color');
    }
    columns[toIndex] = [...col, card];
  } else if (to === 'freecell') {
    const cell = freecells[toIndex];
    if (cell === undefined) throw new EngineError(`Invalid freecell ${toIndex}`);
    if (cell !== null) throw new EngineError(`Freecell ${toIndex} is occupied`);
    freecells[toIndex] = card;
  } else {
    const f = foundations[toIndex];
    if (!f) throw new EngineError(`Invalid foundation ${toIndex}`);
    if (!canBuildSolitaire(f, card)) throw new EngineError('Foundation builds A→K by suit');
    foundations[toIndex] = [...f, card];
  }

  return finish(state, { ...gs, columns, freecells, foundations });
}

export const freecellGame: CardGame = {
  type: 'freecell',
  config: GAME_CONFIGS.freecell,
  family: 'solo',
  deck: {},
  setup(state) {
    const { game } = state;
    const deck = shuffleDeck(createDeck());
    const columns: Card[][] = [];
    let idx = 0;
    for (let i = 0; i < 8; i++) {
      const n = i < 4 ? 7 : 6;
      columns.push(deck.slice(idx, idx + n));
      idx += n;
    }
    const gs: FreeCellState = {
      columns,
      freecells: [null, null, null, null],
      foundations: [[], [], [], []],
      won: false,
    };
    return { game: { ...game, status: 'playing', deck: [], gameState: gs }, players: state.players };
  },
  reduce(state, action) {
    if (action.intent === 'move') return freecellMove(state, action);
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as FreeCellState).won;
  },
  score(state) {
    const gs = state.game.gameState as FreeCellState;
    const id = state.players[0]?.id ?? 'solo';
    return { [id]: gs.foundations.reduce((sum, f) => sum + f.length, 0) };
  },
};
