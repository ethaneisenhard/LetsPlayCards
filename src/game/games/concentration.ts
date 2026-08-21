import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, publicView, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

export interface ConcentrationCell {
  card: Card;
  faceUp: boolean;
  matched: boolean;
}

export interface ConcentrationState {
  /** All 52 cards laid face-down. */
  grid: ConcentrationCell[];
  /** Indices currently flipped face-up this turn (0 or 1). */
  flipped: number[];
  pairs: Record<string, number>;
  winner: string | null;
}

export const concentrationGame: CardGame = {
  type: 'concentration',
  config: GAME_CONFIGS.concentration,
  family: 'collecting',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const grid: ConcentrationCell[] = deck.map((card) => ({ card, faceUp: false, matched: false }));
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          grid,
          flipped: [],
          pairs: Object.fromEntries(players.map((p) => [p.id, 0])),
          winner: null,
        } satisfies ConcentrationState,
      },
      players,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as ConcentrationState;
    const player = findPlayer(players, String(action.playerId));
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    if (action.intent !== 'flip') throw new EngineError(`Unknown intent: ${action.intent}`);

    const index = Number(action.index);
    if (!Number.isInteger(index) || index < 0 || index >= gs.grid.length) throw new EngineError('Invalid index');
    if (gs.grid[index].matched) throw new EngineError('Card already matched');
    if (gs.grid[index].faceUp) throw new EngineError('Card already face up');

    let grid = gs.grid.map((c, i) => (i === index ? { ...c, faceUp: true } : c));
    let flipped = [...gs.flipped];
    let pairs = { ...gs.pairs };

    if (flipped.length === 0) {
      flipped = [index];
      return {
        game: { ...game, gameState: { ...gs, grid, flipped } satisfies ConcentrationState },
        players,
      };
    }

    // Second flip of the turn.
    const firstIndex = flipped[0];
    const matched = grid[firstIndex].card.rank === grid[index].card.rank;

    let winner: string | null = null;
    let status = game.status;
    let currentSeat = game.currentSeat;

    if (matched) {
      grid = grid.map((c, i) => (i === firstIndex || i === index ? { ...c, matched: true } : c));
      pairs = { ...pairs, [player.id]: (pairs[player.id] ?? 0) + 1 };
      flipped = [];
      if (grid.every((c) => c.matched)) {
        status = 'finished';
        winner = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0][0];
      }
      // Same player goes again.
    } else {
      grid = grid.map((c, i) => (i === firstIndex || i === index ? { ...c, faceUp: false } : c));
      flipped = [];
      currentSeat = nextSeat(orderedSeats(players), player.seat);
    }

    return {
      game: {
        ...game,
        status,
        currentSeat,
        gameState: { ...gs, grid, flipped, pairs, winner } satisfies ConcentrationState,
      },
      players,
    };
  },
  view(state, viewerId) {
    const pv = publicView(state, viewerId);
    const gs = state.game.gameState as ConcentrationState;
    if (!Array.isArray(gs?.grid)) return pv;
    const grid = gs.grid.map((c) =>
      c.faceUp || c.matched ? c : { ...c, card: { id: c.card.id, rank: 'A' as const, suit: 'spades' as const } },
    );
    return { ...pv, game: { ...pv.game, gameState: { ...gs, grid } } };
  },
  isTerminal(state) {
    return !!(state.game.gameState as ConcentrationState).winner;
  },
  score(state) {
    return (state.game.gameState as ConcentrationState).pairs;
  },
};
