import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, updatePlayerHand, type EngineState } from '../state';
import { compareHands, evaluate5 } from '../primitives/poker';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

const STARTING_CHIPS = 100;
const ANTE = 1;

interface FiveCardDrawState {
  phase: 'draw' | 'finished';
  /** Total chips in the middle (antes, all-in for a single round). */
  pot: number;
  /** Play-money chip stacks. */
  chips: Record<string, number>;
  /** Whether each player has drawn (or declared stand via an empty draw). */
  drawn: Record<string, boolean>;
  /** Winning player ids in seat order (ties split the pot). */
  winners: string[];
}

function gs(state: EngineState): FiveCardDrawState {
  return state.game.gameState as FiveCardDrawState;
}

export const fiveCardDrawGame: CardGame = {
  type: 'five_card_draw',
  config: GAME_CONFIGS.five_card_draw,
  family: 'betting',
  deck: {},

  setup(state) {
    const { game, players } = state;
    if (players.length < 2) throw new EngineError('Five-Card Draw needs at least 2 players');
    if (players.length > 6) throw new EngineError('Five-Card Draw supports at most 6 players');

    const deck = shuffleDeck(createDeck());
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + 5);
      idx += 5;
      return { ...p, hand };
    });

    // Everyone antes 1 chip from a 100-chip stack.
    const chips = Object.fromEntries(players.map((p) => [p.id, STARTING_CHIPS - ANTE]));

    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          phase: 'draw',
          pot: players.length * ANTE,
          chips,
          drawn: Object.fromEntries(players.map((p) => [p.id, false])),
          winners: [],
        } satisfies FiveCardDrawState,
      },
      players: dealt,
    };
  },

  reduce(state, action) {
    const { game, players } = state;
    const s = gs(state);
    const playerId = action.playerId!;
    const player = findPlayer(players, playerId);
    if (!player) throw new EngineError('Player not found');
    if (game.status !== 'playing' || s.phase !== 'draw') {
      throw new EngineError('Game is not in the draw phase');
    }

    if (action.intent === 'draw') {
      if (s.drawn[playerId]) throw new EngineError('You have already drawn');
      const raw = action.cardIds;
      if (raw !== undefined && !Array.isArray(raw)) throw new EngineError('cardIds must be an array');
      const cardIds = (raw as string[]) ?? [];
      if (cardIds.length > 5) throw new EngineError('Cannot discard more than 5 cards');

      const ids = new Set(cardIds);
      if (ids.size !== cardIds.length) throw new EngineError('Cannot discard the same card twice');
      for (const id of cardIds) {
        if (!player.hand.some((c) => c.id === id)) throw new EngineError(`Card ${id} not in hand`);
      }

      let deck = game.deck;
      const kept = player.hand.filter((c) => !ids.has(c.id));
      const drawn: Card[] = [];
      for (let i = 0; i < cardIds.length; i++) {
        if (deck.length === 0) throw new EngineError('Not enough cards left to draw');
        drawn.push(deck[0]);
        deck = deck.slice(1);
      }

      const nextPlayers = updatePlayerHand(players, playerId, [...kept, ...drawn]);
      return {
        ...state,
        game: { ...game, deck, gameState: { ...s, drawn: { ...s.drawn, [playerId]: true } } },
        players: nextPlayers,
      };
    }

    if (action.intent === 'showdown') {
      const allDrawn = players.every((p) => s.drawn[p.id] === true);
      if (!allDrawn) throw new EngineError('All players must draw (or stand) before showdown');

      const evaluated = players.map((p) => ({ id: p.id, ev: evaluate5(p.hand) }));
      let best = evaluated[0];
      for (const e of evaluated) if (compareHands(e.ev, best.ev) > 0) best = e;
      const winnerIds = evaluated.filter((e) => compareHands(e.ev, best.ev) === 0).map((e) => e.id);

      // Seat order so the remainder goes to the earliest winner.
      const seatOrder = [...players].sort((a, b) => a.seat - b.seat).map((p) => p.id);
      const winners = seatOrder.filter((id) => winnerIds.includes(id));

      const pot = s.pot;
      const base = Math.floor(pot / winners.length);
      const remainder = pot - base * winners.length;
      const chips = { ...s.chips };
      winners.forEach((id, i) => {
        chips[id] += base + (i === 0 ? remainder : 0);
      });

      return {
        ...state,
        game: {
          ...game,
          status: 'finished',
          gameState: { ...s, phase: 'finished', winners, pot, chips },
        },
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },

  isTerminal(state) {
    return gs(state).phase === 'finished';
  },

  score(state) {
    return { ...gs(state).chips };
  },
};
