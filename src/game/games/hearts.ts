import { createDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { legalPlays, trickWinner, trickPoints, type TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface HeartsState {
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  scores: Record<string, number>;
  tricksPlayed: number;
  totalTricks: number;
  winner: string | null;
}

const TOTAL_POINTS = 26;

export const heartsGame: CardGame = {
  type: 'hearts',
  config: GAME_CONFIGS.hearts,
  family: 'trick',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealCount = Math.floor(deck.length / players.length);
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + dealCount);
      idx += dealCount;
      return { ...p, hand };
    });
    const lead = dealt.find((p) => p.hand.some((c) => c.rank === '2' && c.suit === 'clubs'));
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: lead?.seat ?? 0,
        gameState: {
          currentTrick: [],
          leadSuit: null,
          scores: Object.fromEntries(players.map((p) => [p.id, 0])),
          tricksPlayed: 0,
          totalTricks: dealCount,
          winner: null,
        } satisfies HeartsState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    if (action.intent !== 'play') throw new EngineError(`Unknown intent: ${action.intent}`);
    const { game, players } = state;
    const gs = game.gameState as HeartsState;
    const playerId = action.playerId!;
    const cardId = String(action.cardId);
    const player = findPlayer(players, playerId);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) throw new EngineError('Card not in hand');
    if (!legalPlays(player.hand, gs.leadSuit).some((c) => c.id === cardId)) {
      throw new EngineError('Must follow suit');
    }
    if (gs.tricksPlayed === 0 && gs.currentTrick.length === 0 && !(card.rank === '2' && card.suit === 'clubs')) {
      throw new EngineError('Must lead the 2 of clubs');
    }

    const nextPlayers = updatePlayerHand(players, playerId, removeCard(player.hand, cardId));
    const newTrick = [...gs.currentTrick, { playerId, card }];
    const leadSuit = gs.leadSuit ?? card.suit;

    if (newTrick.length < players.length) {
      const seat = nextSeat(orderedSeats(players), player.seat);
      return {
        game: { ...game, currentSeat: seat, gameState: { ...gs, currentTrick: newTrick, leadSuit } },
        players: nextPlayers,
      };
    }

    const winnerId = trickWinner(newTrick, leadSuit);
    const pts = trickPoints(newTrick.map((t) => t.card));
    const scores = { ...gs.scores, [winnerId]: (gs.scores[winnerId] ?? 0) + pts };
    const tricksPlayed = gs.tricksPlayed + 1;
    const winnerSeat = players.find((p) => p.id === winnerId)!.seat;

    if (tricksPlayed >= gs.totalTricks) {
      const moon = players.find((p) => (scores[p.id] ?? 0) === TOTAL_POINTS);
      const finalScores = moon
        ? Object.fromEntries(players.map((p) => [p.id, p.id === moon.id ? 0 : TOTAL_POINTS]))
        : scores;
      const winner = players.reduce((best, p) => ((finalScores[p.id] ?? 0) < (finalScores[best.id] ?? 0) ? p : best)).id;
      return {
        game: { ...game, status: 'finished', currentSeat: winnerSeat, gameState: { ...gs, currentTrick: [], leadSuit: null, scores: finalScores, tricksPlayed, winner } },
        players: nextPlayers,
      };
    }

    return {
      game: { ...game, currentSeat: winnerSeat, gameState: { ...gs, currentTrick: [], leadSuit: null, scores, tricksPlayed } },
      players: nextPlayers,
    };
  },
  isTerminal(state) {
    return !!(state.game.gameState as HeartsState).winner;
  },
  score(state) {
    return (state.game.gameState as HeartsState).scores;
  },
};
