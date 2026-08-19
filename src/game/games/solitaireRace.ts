import { createDeck, shuffleDeck } from '../deck';
import { EngineError, publicView, type EngineState } from '../state';
import type { CardGame, GameAction } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';
import { dealKlondikeFromDeck, drawFromBoard, moveOnBoard, type KlondikeState } from './klondike';
import { foundationComplete } from '../primitives/tableau';

/**
 * Solitaire Race — every player is dealt the IDENTICAL Klondike tableau from a
 * single shuffled deck, then races to build all four foundations (A→K). No turn
 * gating: each player plays their own board independently; first to finish wins.
 * One player is plain solitaire (finish to win).
 */
export interface SolitaireRaceState {
  boards: Record<string, KlondikeState>;
  winner: string | null;
}

function gs(state: EngineState): SolitaireRaceState {
  return state.game.gameState as SolitaireRaceState;
}

export const solitaireRaceGame: CardGame = {
  type: 'solitaire_race',
  config: GAME_CONFIGS.solitaire_race,
  family: 'unique',
  deck: {},
  setup(state) {
    const { game, players } = state;
    // One shuffle for everyone → a fair, identical puzzle to race through.
    const deck = shuffleDeck(createDeck());
    const boards: Record<string, KlondikeState> = {};
    for (const p of players) {
      boards[p.id] = dealKlondikeFromDeck(deck);
    }
    return { game: { ...game, status: 'playing', deck: [], gameState: { boards, winner: null } }, players };
  },

  reduce(state, action) {
    const playerId = action.playerId;
    if (!playerId) throw new EngineError('Missing playerId');
    const cur = gs(state);
    if (cur.winner) throw new EngineError('The race is already over');
    const board = cur.boards[playerId];
    if (!board) throw new EngineError('Player not found');

    let nextBoard: KlondikeState;
    if (action.intent === 'draw-stock') nextBoard = drawFromBoard(board);
    else if (action.intent === 'move') nextBoard = moveOnBoard(board, action);
    else throw new EngineError(`Unknown intent: ${action.intent}`);

    const won = nextBoard.foundations.every(foundationComplete);
    const boards = { ...cur.boards, [playerId]: nextBoard };
    return {
      ...state,
      game: {
        ...state.game,
        status: won ? 'finished' : 'playing',
        gameState: { boards, winner: won ? playerId : null },
      },
    };
  },

  /** Hide opponents' boards — reveal only their foundation progress + finished flag. */
  view(state, viewerId) {
    const pv = publicView(state, viewerId);
    const cur = gs(state);
    const masked: Record<string, unknown> = {};
    for (const [pid, board] of Object.entries(cur.boards)) {
      if (pid === viewerId) {
        masked[pid] = board;
      } else {
        masked[pid] = {
          foundations: board.foundations.map((f) => f.length),
          won: board.foundations.every(foundationComplete),
        };
      }
    }
    return { ...pv, game: { ...pv.game, gameState: { boards: masked, winner: cur.winner } } };
  },

  isTerminal(state) {
    return gs(state).winner !== null;
  },

  score(state) {
    const winner = gs(state).winner;
    return winner ? { [winner]: 1 } : {};
  },
};
