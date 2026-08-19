import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

export interface ThirtyOneState {
  /** Face-up discard pool, seeded with 3 cards. */
  widow: Card[];
  lives: Record<string, number>;
  phase: 'playing' | 'knocked';
  knockedBy: string | null;
  /** Players still owed a final turn after a knock (in seat order). */
  finalTurnQueue: string[];
  eliminated: string[];
  winner: string | null;
}

const START_LIVES = 3;
const HAND_SIZE = 3;
const WIDOW_SIZE = 3;

export function cardValue(rank: string): number {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

/** Best single-suit total for a 3-card hand. */
export function bestSuitTotal(hand: Card[]): number {
  const bySuit: Record<string, number> = {};
  for (const c of hand) bySuit[c.suit] = (bySuit[c.suit] ?? 0) + cardValue(c.rank);
  return Math.max(0, ...Object.values(bySuit));
}

function resolveKnock(state: EngineState, gs: ThirtyOneState): EngineState {
  const { game, players } = state;
  const active = players.filter((p) => !gs.eliminated.includes(p.id));
  const scores = active.map((p) => ({ id: p.id, score: bestSuitTotal(p.hand) }));
  const lowest = Math.min(...scores.map((s) => s.score));
  const losers = scores.filter((s) => s.score === lowest).map((s) => s.id);

  let lives = { ...gs.lives };
  let eliminated = [...gs.eliminated];
  for (const id of losers) {
    lives = { ...lives, [id]: (lives[id] ?? START_LIVES) - 1 };
    if (lives[id] <= 0) eliminated = [...eliminated, id];
  }

  const remaining = players.filter((p) => !eliminated.includes(p.id));
  if (remaining.length === 1) {
    return {
      game: {
        ...game,
        status: 'finished',
        gameState: {
          ...gs,
          lives,
          eliminated,
          phase: 'playing',
          knockedBy: null,
          finalTurnQueue: [],
          winner: remaining[0].id,
        } satisfies ThirtyOneState,
      },
      players,
    };
  }

  // Re-deal for the next round.
  const deck = shuffleDeck(createDeck());
  let idx = 0;
  const dealt = players.map((p) => {
    if (eliminated.includes(p.id)) return p;
    const hand = deck.slice(idx, idx + HAND_SIZE);
    idx += HAND_SIZE;
    return { ...p, hand };
  });
  const widow = deck.slice(idx, idx + WIDOW_SIZE);
  idx += WIDOW_SIZE;
  const knockerSeat = gs.knockedBy ? findPlayer(players, gs.knockedBy)?.seat ?? 0 : 0;
  return {
    game: {
      ...game,
      status: 'playing',
      deck: deck.slice(idx),
      currentSeat: nextSeat(orderedSeats(players), knockerSeat),
      gameState: {
        widow,
        lives,
        phase: 'playing',
        knockedBy: null,
        finalTurnQueue: [],
        eliminated,
        winner: null,
      } satisfies ThirtyOneState,
    },
    players: dealt,
  };
}

export const thirtyOneGame: CardGame = {
  type: 'thirty_one',
  config: GAME_CONFIGS.thirty_one,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + HAND_SIZE);
      idx += HAND_SIZE;
      return { ...p, hand };
    });
    const widow = deck.slice(idx, idx + WIDOW_SIZE);
    idx += WIDOW_SIZE;
    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          widow,
          lives: Object.fromEntries(players.map((p) => [p.id, START_LIVES])),
          phase: 'playing',
          knockedBy: null,
          finalTurnQueue: [],
          eliminated: [],
          winner: null,
        } satisfies ThirtyOneState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as ThirtyOneState;
    const player = findPlayer(players, String(action.playerId));
    if (!player) throw new EngineError('Player not found');
    if (gs.eliminated.includes(player.id)) throw new EngineError('You are eliminated');

    if (gs.phase === 'knocked') {
      if (gs.finalTurnQueue[0] !== player.id) throw new EngineError('Not your turn');
    } else if (player.seat !== game.currentSeat) {
      throw new EngineError('Not your turn');
    }

    if (action.intent === 'knock') {
      if (gs.phase === 'knocked') throw new EngineError('Already knocked');
      const seats = orderedSeats(players).filter((s) => s !== player.seat);
      const queue = [...seats.filter((s) => s > player.seat), ...seats.filter((s) => s < player.seat)]
        .map((s) => players.find((p) => p.seat === s)!.id)
        .filter((id) => !gs.eliminated.includes(id));
      return {
        game: {
          ...game,
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, phase: 'knocked', knockedBy: player.id, finalTurnQueue: queue },
        },
        players,
      };
    }

    if (action.intent === 'swap') {
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      const from = action.from === 'widow' ? 'widow' : 'stock';

      let deck = [...game.deck];
      let widow = [...gs.widow];
      let newHand: Card[];
      if (from === 'widow') {
        const idx = action.widowIndex !== undefined ? Number(action.widowIndex) : 0;
        if (!Number.isInteger(idx) || idx < 0 || idx >= widow.length) throw new EngineError('Invalid widow card');
        const taken = widow[idx];
        newHand = [...removeCard(player.hand, card.id), taken];
        widow = [...widow.slice(0, idx), ...widow.slice(idx + 1), card];
      } else {
        if (deck.length === 0) throw new EngineError('Stock is empty');
        const [taken, ...rest] = deck;
        deck = rest;
        newHand = [...removeCard(player.hand, card.id), taken];
        widow = [...widow, card];
      }

      if (bestSuitTotal(newHand) === 31) {
        return {
          game: {
            ...game,
            status: 'finished',
            deck,
            gameState: { ...gs, widow, winner: player.id } satisfies ThirtyOneState,
          },
          players: updatePlayerHand(players, player.id, newHand),
        };
      }

      if (gs.phase === 'knocked') {
        const queue = gs.finalTurnQueue.filter((id) => id !== player.id);
        if (queue.length === 0) {
          return resolveKnock(
            { game: { ...game, deck }, players: updatePlayerHand(players, player.id, newHand) },
            { ...gs, widow },
          );
        }
        return {
          game: {
            ...game,
            deck,
            currentSeat: nextSeat(orderedSeats(players), player.seat),
            gameState: { ...gs, widow, finalTurnQueue: queue },
          },
          players: updatePlayerHand(players, player.id, newHand),
        };
      }

      return {
        game: {
          ...game,
          deck,
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, widow },
        },
        players: updatePlayerHand(players, player.id, newHand),
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as ThirtyOneState).winner;
  },
  score(state) {
    const gs = state.game.gameState as ThirtyOneState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
