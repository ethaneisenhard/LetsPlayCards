import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import { rankValue } from '../gameTypes';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface RummyState {
  melds: Record<string, Card[][]>;
  winner: string | null;
}

export function isValidMeld(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const sameRank = cards.every((c) => c.rank === cards[0].rank);
  if (sameRank) return true;
  const sameSuit = cards.every((c) => c.suit === cards[0].suit);
  if (!sameSuit) return false;
  const sorted = [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
  for (let i = 1; i < sorted.length; i++) {
    if (rankValue(sorted[i].rank) !== rankValue(sorted[i - 1].rank) + 1) return false;
  }
  return true;
}

export const rummyGame: CardGame = {
  type: 'rummy',
  config: GAME_CONFIGS.rummy,
  family: 'meld',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealCount = 10;
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
        gameState: { melds: Object.fromEntries(players.map((p) => [p.id, []])), winner: null } satisfies RummyState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as RummyState;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    if (action.intent === 'draw') {
      const source = action.source === 'discard' ? 'discard' : 'deck';
      if (source === 'discard') {
        if (game.discardPile.length === 0) throw new EngineError('Discard pile is empty');
        const card = game.discardPile[game.discardPile.length - 1];
        return {
          game: { ...game, discardPile: game.discardPile.slice(0, -1) },
          players: updatePlayerHand(players, player.id, [...player.hand, card]),
        };
      }
      let deck = [...game.deck];
      if (deck.length === 0) {
        const top = game.discardPile[game.discardPile.length - 1];
        deck = shuffleDeck(game.discardPile.slice(0, -1));
      }
      const card = deck[0];
      deck = deck.slice(1);
      return {
        game: { ...game, deck },
        players: updatePlayerHand(players, player.id, [...player.hand, card]),
      };
    }

    if (action.intent === 'meld') {
      const ids = (action.cardIds as string[]) ?? [];
      const cards = ids.map((id) => player.hand.find((c) => c.id === id)).filter(Boolean) as Card[];
      if (cards.length !== ids.length) throw new EngineError('Card not in hand');
      if (!isValidMeld(cards)) throw new EngineError('Not a valid set or run');
      let hand = player.hand;
      for (const id of ids) hand = removeCard(hand, id);
      const melds = { ...gs.melds, [player.id]: [...(gs.melds[player.id] ?? []), cards] };
      return {
        game: { ...game, gameState: { ...gs, melds } },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    if (action.intent === 'discard') {
      const cardId = String(action.cardId);
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) throw new EngineError('Card not in hand');
      const hand = removeCard(player.hand, cardId);
      const won = hand.length === 0;
      return {
        game: {
          ...game,
          status: won ? 'finished' : 'playing',
          discardPile: [...game.discardPile, card],
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, winner: won ? player.id : null } satisfies RummyState,
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as RummyState).winner;
  },
  score(state) {
    const gs = state.game.gameState as RummyState;
    return Object.fromEntries(Object.entries(gs.melds).map(([id, melds]) => [id, melds.length]));
  },
};
