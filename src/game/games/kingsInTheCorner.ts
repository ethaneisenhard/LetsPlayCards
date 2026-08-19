import { createDeck, shuffleDeck, isRed } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

export interface KingsCornerState {
  /** Four corner piles — each can only be started by a King. */
  corners: Card[][];
  /** Center piles, each started by any card. */
  center: Card[][];
  /** Shared discard pile. */
  discard: Card[];
  winner: string | null;
}

const CORNERS = 4;

/** Solitaire face value: A=1 … K=13. */
export function faceValue(rank: string): number {
  const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return order.indexOf(rank) + 1;
}

export const kingsInTheCornerGame: CardGame = {
  type: 'kings_in_the_corner',
  config: GAME_CONFIGS.kings_in_the_corner,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealCount = 7;
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + dealCount);
      idx += dealCount;
      return { ...p, hand };
    });
    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          corners: [[], [], [], []],
          center: [],
          discard: [],
          winner: null,
        } satisfies KingsCornerState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as KingsCornerState;
    const player = findPlayer(players, String(action.playerId));
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    if (action.intent === 'draw') {
      if (game.deck.length === 0) throw new EngineError('Stock is empty');
      const [card, ...rest] = game.deck;
      return {
        game: { ...game, deck: rest, currentSeat: nextSeat(orderedSeats(players), player.seat) },
        players: updatePlayerHand(players, player.id, [...player.hand, card]),
      };
    }

    if (action.intent === 'play') {
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      const corner = Number(action.corner);
      if (!Number.isInteger(corner) || corner < 0 || corner >= CORNERS) throw new EngineError('Invalid corner');
      const pile = gs.corners[corner];
      if (pile.length === 0) {
        if (faceValue(card.rank) !== 13) throw new EngineError('Only a King can start an empty corner');
      } else {
        const top = pile[pile.length - 1];
        if (faceValue(card.rank) !== faceValue(top.rank) - 1) throw new EngineError('Card must be one rank lower');
        if (isRed(card.suit) === isRed(top.suit)) throw new EngineError('Card must alternate color');
      }
      const hand = removeCard(player.hand, card.id);
      const corners = gs.corners.map((p, i) => (i === corner ? [...p, card] : p));
      const won = hand.length === 0;
      return {
        game: {
          ...game,
          status: won ? 'finished' : 'playing',
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, corners, winner: won ? player.id : null },
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    if (action.intent === 'play-center') {
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      const hand = removeCard(player.hand, card.id);
      const won = hand.length === 0;
      return {
        game: {
          ...game,
          status: won ? 'finished' : 'playing',
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, center: [...gs.center, [card]], winner: won ? player.id : null },
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    if (action.intent === 'discard') {
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      const hand = removeCard(player.hand, card.id);
      const won = hand.length === 0;
      return {
        game: {
          ...game,
          status: won ? 'finished' : 'playing',
          discardPile: [...game.discardPile, card],
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, discard: [...gs.discard, card], winner: won ? player.id : null },
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as KingsCornerState).winner;
  },
  score(state) {
    const gs = state.game.gameState as KingsCornerState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
