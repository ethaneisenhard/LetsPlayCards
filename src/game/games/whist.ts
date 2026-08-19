import { createDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { legalPlays, trickWinner, type TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface WhistState {
  trump: Suit | null;
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  tricksWon: Record<string, number>;
  teamScore: [number, number];
  handsPlayed: number;
  winner: string | null;
}

const TARGET = 5;

export const whistGame: CardGame = {
  type: 'whist',
  config: GAME_CONFIGS.whist,
  family: 'trick',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const trump = deck[deck.length - 1].suit; // last dealt card = trump
    const n = players.length;
    const deal = Math.floor(deck.length / n);
    const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * deal, (i + 1) * deal) }));
    return {
      game: {
        ...game, status: 'playing', deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        gameState: {
          trump, currentTrick: [], leadSuit: null, tricksWon: Object.fromEntries(players.map((p) => [p.id, 0])),
          teamScore: [0, 0], handsPlayed: 0, winner: null,
        } satisfies WhistState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    if (action.intent !== 'play') throw new EngineError(`Unknown intent: ${action.intent}`);
    const { game, players } = state;
    const gs = game.gameState as WhistState;
    const seats = orderedSeats(players);
    const player = findPlayer(players, action.playerId!);
    if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
    const card = player.hand.find((c) => c.id === String(action.cardId));
    if (!card) throw new EngineError('Card not in hand');
    if (!legalPlays(player.hand, gs.leadSuit).some((c) => c.id === card.id)) throw new EngineError('Must follow suit');

    const nextPlayers = updatePlayerHand(players, player.id, removeCard(player.hand, card.id));
    const newTrick = [...gs.currentTrick, { playerId: player.id, card }];
    const leadSuit = gs.leadSuit ?? card.suit;

    if (newTrick.length < players.length) {
      return {
        game: {
          ...game, currentSeat: nextSeat(seats, player.seat),
          gameState: { ...gs, currentTrick: newTrick, leadSuit },
        },
        players: nextPlayers,
      };
    }

    const winnerId = trickWinner(newTrick, leadSuit, gs.trump ?? undefined);
    const tricksWon = { ...gs.tricksWon, [winnerId]: (gs.tricksWon[winnerId] ?? 0) + 1 };
    const winnerSeat = players.find((p) => p.id === winnerId)!.seat;
    const handsPlayed = gs.handsPlayed + 1;

    if (handsPlayed >= 13) {
      const teamScore = [...gs.teamScore] as [number, number];
      for (const team of [0, 1]) {
        const members = players.filter((p) => p.seat % 2 === team);
        const tricks = members.reduce((s, p) => s + (tricksWon[p.id] ?? 0), 0);
        teamScore[team] += Math.max(0, tricks - 6); // score tricks above the book
      }
      const winner = teamScore[0] >= TARGET && teamScore[0] > teamScore[1] ? '0' : teamScore[1] >= TARGET && teamScore[1] > teamScore[0] ? '1' : null;
      return {
        game: {
          ...game,
          status: winner ? 'finished' : 'playing',
          currentSeat: winner ? winnerSeat : nextSeat(seats, winnerSeat),
          gameState: {
            ...gs, currentTrick: [], leadSuit: null, tricksWon, handsPlayed: winner ? handsPlayed : 0,
            teamScore, winner,
          },
        },
        players: nextPlayers,
      };
    }

    return {
      game: {
        ...game, currentSeat: winnerSeat,
        gameState: { ...gs, currentTrick: [], leadSuit: null, tricksWon, handsPlayed },
      },
      players: nextPlayers,
    };
  },
  isTerminal(state) {
    return !!(state.game.gameState as WhistState).winner;
  },
  score(state) {
    const gs = state.game.gameState as WhistState;
    return { Team1: gs.teamScore[0], Team2: gs.teamScore[1] };
  },
};
