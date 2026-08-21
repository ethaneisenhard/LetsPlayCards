import { createDeck, shuffleDeck } from '../deck';
import type { Suit } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface CrazyEightsState {
  chosenSuit: Suit | null;
  winner: string | null;
}

export const crazyEightsGame: CardGame = {
  type: 'crazy_eights',
  config: GAME_CONFIGS.crazy_eights,
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
    let remaining = deck.slice(idx);
    while (remaining[0] && remaining[0].rank === '8') {
      remaining = [...remaining.slice(1), remaining[0]];
    }
    const discard = [remaining[0]];
    remaining = remaining.slice(1);
    return {
      game: {
        ...game,
        status: 'playing',
        deck: remaining,
        tableCards: [],
        discardPile: discard,
        currentSeat: 0,
        gameState: { chosenSuit: null, winner: null } satisfies CrazyEightsState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as CrazyEightsState;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    if (action.intent === 'draw') {
      let deck = [...game.deck];
      if (deck.length === 0) {
        if (game.discardPile.length <= 1) throw new EngineError('No cards left to draw');
        const top = game.discardPile[game.discardPile.length - 1];
        deck = shuffleDeck(game.discardPile.slice(0, -1));
        const card = deck[0];
        deck = deck.slice(1);
        return {
          game: { ...game, deck, discardPile: [top] },
          players: updatePlayerHand(players, player.id, [...player.hand, card]),
        };
      }
      const card = deck[0];
      deck = deck.slice(1);
      return {
        game: { ...game, deck },
        players: updatePlayerHand(players, player.id, [...player.hand, card]),
      };
    }

    if (action.intent === 'pass') {
      return {
        game: { ...game, currentSeat: nextSeat(orderedSeats(players), player.seat) },
        players,
      };
    }

    if (action.intent === 'play') {
      const cardId = String(action.cardId);
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) throw new EngineError('Card not in hand');
      const top = game.discardPile[game.discardPile.length - 1];
      const suitMatch = gs.chosenSuit ? card.suit === gs.chosenSuit : card.suit === top.suit;
      const matches = suitMatch || card.rank === top.rank || card.rank === '8';
      if (!matches) throw new EngineError('Card does not match the discard');

      const hand = removeCard(player.hand, cardId);
      const won = hand.length === 0;
      const chosenSuit = card.rank === '8' ? (action.suit as Suit) : null;
      if (card.rank === '8' && !chosenSuit) throw new EngineError('Choose a suit for your 8');

      return {
        game: {
          ...game,
          status: won ? 'finished' : 'playing',
          discardPile: [...game.discardPile, card],
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { chosenSuit, winner: won ? player.id : null } satisfies CrazyEightsState,
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as CrazyEightsState).winner;
  },
  score(state) {
    const gs = state.game.gameState as CrazyEightsState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
