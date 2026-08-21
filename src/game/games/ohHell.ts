import { createDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { legalPlays, trickWinner, type TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface OhHellState {
  round: number;
  handSize: number;
  phase: 'dealing' | 'bidding' | 'playing' | 'scoring' | 'finished';
  trump: Suit | null;
  bids: Record<string, number>;
  tricksWon: Record<string, number>;
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  scores: Record<string, number>;
  winner: string | null;
}

const MAX_ROUNDS = 10;

export const ohHellGame: CardGame = {
  type: 'oh_hell',
  config: GAME_CONFIGS.oh_hell,
  family: 'trick',
  deck: {},
  setup(state) {
    const next = startRound(state, 1, 1);
    return { ...next, game: { ...next.game, status: 'playing' } };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as OhHellState;
    const seats = orderedSeats(players);

    if (action.intent === 'bid') {
      if (gs.phase !== 'bidding') throw new EngineError('Not bidding');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const amount = Number(action.amount);
      if (!Number.isInteger(amount) || amount < 0 || amount > gs.handSize) throw new EngineError(`Bid 0–${gs.handSize}`);
      const bids = { ...gs.bids, [player.id]: amount };
      const allBid = players.every((p) => bids[p.id] !== undefined);
      if (allBid) {
        const total = players.reduce((s, p) => s + bids[p.id], 0);
        if (total === gs.handSize) throw new EngineError('Total bids cannot equal the hand size');
        return { game: { ...game, currentSeat: 0, gameState: { ...gs, bids, phase: 'playing' } }, players };
      }
      return { game: { ...game, currentSeat: nextSeat(seats, player.seat), gameState: { ...gs, bids } }, players };
    }

    if (action.intent === 'play') {
      if (gs.phase !== 'playing') throw new EngineError('Not playing');
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
          game: { ...game, currentSeat: nextSeat(seats, player.seat), gameState: { ...gs, currentTrick: newTrick, leadSuit } },
          players: nextPlayers,
        };
      }

      const winnerId = trickWinner(newTrick, leadSuit, gs.trump ?? undefined);
      const tricksWon = { ...gs.tricksWon, [winnerId]: (gs.tricksWon[winnerId] ?? 0) + 1 };
      const winnerSeat = players.find((p) => p.id === winnerId)!.seat;
      const roundDone = newTrick.length === gs.handSize * 1 && players.every((p) => p.hand.length === 0);

      if (roundDone || Object.values(tricksWon).reduce((a, b) => a + b, 0) >= gs.handSize) {
        const scores = { ...gs.scores };
        for (const p of players) {
          scores[p.id] = (scores[p.id] ?? 0) + (tricksWon[p.id] === gs.bids[p.id] ? 10 + tricksWon[p.id] : 0);
        }
        const nextSize = gs.round % 2 === 1 ? gs.handSize + 1 : gs.handSize - 1;
        const nextRound = gs.round + 1;
        if (nextRound > MAX_ROUNDS) {
          const winner = players.reduce((b, p) => ((scores[p.id] ?? 0) > (scores[b.id] ?? 0) ? p : b)).id;
          return { game: { ...game, status: 'finished', gameState: { ...gs, scores, phase: 'finished', winner } }, players: nextPlayers };
        }
        const next = startRound({ game, players: nextPlayers }, nextRound, nextSize);
        return { ...next, game: { ...next.game, gameState: { ...next.game.gameState, scores } } };
      }

      return {
        game: { ...game, currentSeat: winnerSeat, gameState: { ...gs, currentTrick: [], leadSuit: null, tricksWon } },
        players: nextPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as OhHellState).phase === 'finished';
  },
  score(state) {
    return (state.game.gameState as OhHellState).scores;
  },
};

function startRound(state: EngineState, round: number, handSize: number): EngineState {
  const { game, players } = state;
  const deck = shuffleDeck(createDeck());
  const trump = deck[0].suit;
  const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * handSize, (i + 1) * handSize) }));
  return {
    game: {
      ...game, deck: deck.slice(players.length * handSize), tableCards: [], discardPile: [], currentSeat: 0,
      gameState: {
        round, handSize, phase: 'bidding', trump, bids: {},
        tricksWon: Object.fromEntries(players.map((p) => [p.id, 0])),
        currentTrick: [], leadSuit: null,
        scores: (game.gameState as OhHellState).scores ?? Object.fromEntries(players.map((p) => [p.id, 0])),
        winner: null,
      } satisfies OhHellState,
    },
    players: dealt,
  };
}
