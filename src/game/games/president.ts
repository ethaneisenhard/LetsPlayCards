import { createDeck, shuffleDeck } from '../deck';
import type { Card, Rank } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EnginePlayer, type EngineState } from '../state';
import { orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface PresidentState {
  lastPlay: { playerId: string; cards: Card[] } | null;
  passedSince: string[];
  rankOrder: string[];
  winner: string | null;
}

/** President rank power: 3 is lowest, 2 is highest. */
const PRESIDENT_ORDER: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

export function presidentRank(rank: string): number {
  return PRESIDENT_ORDER.indexOf(rank as Rank);
}

function nextActiveSeat(players: EnginePlayer[], currentSeat: number): number {
  const seats = orderedSeats(players);
  const start = seats.indexOf(currentSeat);
  for (let i = 1; i <= seats.length; i++) {
    const seat = seats[(start + i) % seats.length];
    const p = players.find((x) => x.seat === seat);
    if (p && p.hand.length > 0) return seat;
  }
  return currentSeat;
}

export const presidentGame: CardGame = {
  type: 'president',
  config: GAME_CONFIGS.president,
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
        gameState: {
          lastPlay: null,
          passedSince: [],
          rankOrder: [],
          winner: null,
        } satisfies PresidentState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as PresidentState;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
    if (player.hand.length === 0) throw new EngineError('You are out');

    if (action.intent === 'pass') {
      if (!gs.lastPlay) throw new EngineError('Nothing to pass on — you must lead');
      const passedSince = [...gs.passedSince, player.id];
      const active = players.filter((p) => p.hand.length > 0);
      if (passedSince.length >= active.length - 1) {
        // Everyone else passed: clear the pile and let the last player lead again.
        const leadSeat = players.find((p) => p.id === gs.lastPlay!.playerId)!.seat;
        return {
          game: { ...game, currentSeat: leadSeat, gameState: { ...gs, lastPlay: null, passedSince: [] } },
          players,
        };
      }
      return {
        game: {
          ...game,
          currentSeat: nextActiveSeat(players, player.seat),
          gameState: { ...gs, passedSince },
        },
        players,
      };
    }

    if (action.intent === 'play') {
      const cardIds = Array.isArray(action.cards) ? action.cards.map(String) : [];
      if (cardIds.length === 0) throw new EngineError('Play at least one card');
      const found: Card[] = [];
      for (const id of cardIds) {
        const card = player.hand.find((c) => c.id === id);
        if (!card) throw new EngineError('Card not in hand');
        found.push(card);
      }
      const ranks = new Set(found.map((c) => c.rank));
      if (ranks.size !== 1) throw new EngineError('All cards must be the same rank');
      if (gs.lastPlay) {
        if (found.length !== gs.lastPlay.cards.length) {
          throw new EngineError('Must play the same number of cards');
        }
        if (presidentRank(found[0].rank) <= presidentRank(gs.lastPlay.cards[0].rank)) {
          throw new EngineError('Must beat the previous play');
        }
      }

      let hand = player.hand;
      for (const id of cardIds) hand = removeCard(hand, id);
      const nextPlayers = updatePlayerHand(players, player.id, hand);

      if (hand.length === 0) {
        const rankOrder = [...gs.rankOrder, player.id];
        return {
          game: {
            ...game,
            status: 'finished',
            gameState: {
              ...gs,
              lastPlay: { playerId: player.id, cards: found },
              passedSince: [],
              rankOrder,
              winner: player.id,
            },
          },
          players: nextPlayers,
        };
      }

      return {
        game: {
          ...game,
          currentSeat: nextActiveSeat(nextPlayers, player.seat),
          gameState: { ...gs, lastPlay: { playerId: player.id, cards: found }, passedSince: [] },
        },
        players: nextPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as PresidentState).winner;
  },
  score(state) {
    const gs = state.game.gameState as PresidentState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
