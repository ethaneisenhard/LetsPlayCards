import { createDeck, shuffleDeck } from '../deck';
import type { Card, Rank, Suit } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { orderedSeats, nextSeat } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface SevensState {
  /** Per-suit played range (min..max); null means the suit is not open yet. */
  played: Record<Suit, { min: number; max: number } | null>;
  winner: string | null;
}

const RANK_NUMBER: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

export function rankNumber(rank: Rank): number {
  return RANK_NUMBER[rank];
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export function emptyPlayed(): Record<Suit, { min: number; max: number } | null> {
  return Object.fromEntries(SUITS.map((s) => [s, null])) as Record<Suit, { min: number; max: number } | null>;
}

/**
 * Cards legally playable: a 7 opens a suit; otherwise a card adjacent
 * (one rank up or down) to an already-played card of the same suit.
 */
export function legalSevensPlays(hand: Card[], played: SevensState['played']): Card[] {
  return hand.filter((card) => {
    const r = rankNumber(card.rank);
    const range = played[card.suit];
    if (!range) return r === 7;
    return r === range.min - 1 || r === range.max + 1;
  });
}

export const sevensGame: CardGame = {
  type: 'sevens',
  config: GAME_CONFIGS.sevens,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const hands: Card[][] = players.map(() => []);
    deck.forEach((card, i) => hands[i % players.length].push(card));
    const dealt = players.map((p, i) => ({ ...p, hand: hands[i] }));
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: { played: emptyPlayed(), winner: null } satisfies SevensState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as SevensState;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    if (action.intent === 'pass') {
      if (legalSevensPlays(player.hand, gs.played).length > 0) {
        throw new EngineError('You have a legal play');
      }
      return {
        game: { ...game, currentSeat: nextSeat(orderedSeats(players), player.seat) },
        players,
      };
    }

    if (action.intent === 'play') {
      const cardId = String(action.cardId);
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) throw new EngineError('Card not in hand');
      const legal = legalSevensPlays(player.hand, gs.played);
      if (!legal.some((c) => c.id === cardId)) throw new EngineError('Card is not a legal play');

      const r = rankNumber(card.rank);
      const range = gs.played[card.suit];
      const played = { ...gs.played };
      played[card.suit] = range
        ? { min: Math.min(range.min, r), max: Math.max(range.max, r) }
        : { min: 7, max: 7 };

      const hand = removeCard(player.hand, cardId);
      const nextPlayers = updatePlayerHand(players, player.id, hand);
      const won = hand.length === 0;

      return {
        game: {
          ...game,
          status: won ? 'finished' : 'playing',
          currentSeat: won ? game.currentSeat : nextSeat(orderedSeats(players), player.seat),
          gameState: { played, winner: won ? player.id : null } satisfies SevensState,
        },
        players: nextPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as SevensState).winner;
  },
  score(state) {
    const gs = state.game.gameState as SevensState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
