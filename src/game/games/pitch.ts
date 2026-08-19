import { createDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { rankValue } from '../gameTypes';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { legalPlays, trickWinner, type TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface PitchState {
  phase: 'bidding' | 'trump' | 'playing' | 'finished';
  bids: Record<string, number>;
  highBid: number;
  highBidder: string | null;
  trump: Suit | null;
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  captured: Record<string, Card[]>;
  tricksPlayed: number;
  scores: Record<string, number>;
  winner: string | null;
}

const TARGET = 21;
const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

const seatOf = (players: { id: string; seat: number }[], id: string): number =>
  players.find((p) => p.id === id)!.seat;

function gameValue(card: Card): number {
  if (card.rank === 'A') return 4;
  if (card.rank === 'K') return 3;
  if (card.rank === 'Q') return 2;
  if (card.rank === 'J') return 1;
  if (card.rank === '10') return 10;
  return 0;
}

export const pitchGame: CardGame = {
  type: 'pitch',
  config: GAME_CONFIGS.pitch,
  family: 'trick',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * 6, (i + 1) * 6) }));
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          phase: 'bidding',
          bids: {},
          highBid: 0,
          highBidder: null,
          trump: null,
          currentTrick: [],
          leadSuit: null,
          captured: Object.fromEntries(players.map((p) => [p.id, [] as Card[]])),
          tricksPlayed: 0,
          scores: Object.fromEntries(players.map((p) => [p.id, 0])),
          winner: null,
        } satisfies PitchState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as PitchState;
    const seats = orderedSeats(players);

    if (action.intent === 'bid') {
      if (gs.phase !== 'bidding') throw new EngineError('Bidding is over');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn to bid');
      const amount = Number(action.amount);
      if (!Number.isInteger(amount) || amount < 0 || amount > 4) throw new EngineError('Bid must be 0–4');
      if (amount > 0 && amount <= gs.highBid) throw new EngineError('Bid must exceed the current high');
      const bids = { ...gs.bids, [player.id]: amount };
      const highBid = amount > gs.highBid ? amount : gs.highBid;
      const highBidder = amount > gs.highBid ? player.id : gs.highBidder;
      const allBid = players.every((p) => bids[p.id] !== undefined);

      if (!allBid) {
        return {
          game: {
            ...game,
            currentSeat: nextSeat(seats, player.seat),
            gameState: { ...gs, bids, highBid, highBidder },
          },
          players,
        };
      }

      if (!highBidder) {
        // Everyone passed — redeal.
        const deck = shuffleDeck(createDeck());
        const redealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * 6, (i + 1) * 6) }));
        return {
          game: {
            ...game,
            currentSeat: 0,
            gameState: { ...gs, bids: {}, highBid: 0, highBidder: null, trump: null },
          },
          players: redealt,
        };
      }

      return {
        game: {
          ...game,
          currentSeat: seatOf(players, highBidder),
          gameState: { ...gs, bids, highBid, highBidder, phase: 'trump' },
        },
        players,
      };
    }

    if (action.intent === 'set-trump') {
      if (gs.phase !== 'trump') throw new EngineError('Trump already set');
      if (action.playerId !== gs.highBidder) throw new EngineError('Only the bidder names trump');
      const trump = String(action.suit) as Suit;
      if (!SUITS.includes(trump)) throw new EngineError('Invalid suit');
      return {
        game: {
          ...game,
          currentSeat: seatOf(players, gs.highBidder!),
          gameState: { ...gs, trump, phase: 'playing', currentTrick: [], leadSuit: null },
        },
        players,
      };
    }

    if (action.intent === 'play') {
      if (gs.phase !== 'playing') throw new EngineError('Not playing');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      if (!legalPlays(player.hand, gs.leadSuit, gs.trump!).some((c) => c.id === card.id)) {
        throw new EngineError('Must follow suit');
      }

      const newPlayers = updatePlayerHand(players, player.id, removeCard(player.hand, card.id));
      const newTrick = [...gs.currentTrick, { playerId: player.id, card }];
      const leadSuit = gs.leadSuit ?? card.suit;

      if (newTrick.length < players.length) {
        return {
          game: {
            ...game,
            currentSeat: nextSeat(seats, player.seat),
            gameState: { ...gs, currentTrick: newTrick, leadSuit },
          },
          players: newPlayers,
        };
      }

      const winnerId = trickWinner(newTrick, leadSuit, gs.trump!);
      const captured = { ...gs.captured };
      captured[winnerId] = [...(captured[winnerId] ?? []), ...newTrick.map((t) => t.card)];
      const tricksPlayed = gs.tricksPlayed + 1;
      const winnerSeat = players.find((p) => p.id === winnerId)!.seat;

      if (tricksPlayed >= 6) {
        // Award the four game points.
        let high = { rank: -1, holder: null as string | null };
        let low = { rank: 99, holder: null as string | null };
        let jack = null as string | null;
        for (const [pid, cards] of Object.entries(captured)) {
          for (const c of cards) {
            if (c.suit !== gs.trump) continue;
            const rv = rankValue(c.rank);
            if (rv > high.rank) high = { rank: rv, holder: pid };
            if (rv < low.rank) low = { rank: rv, holder: pid };
            if (c.rank === 'J') jack = pid;
          }
        }
        const gameTotals = Object.fromEntries(
          players.map((p) => [p.id, (captured[p.id] ?? []).reduce((s, c) => s + gameValue(c), 0)]),
        );
        const maxGame = Math.max(...Object.values(gameTotals));
        const gameWinners = players.filter((p) => gameTotals[p.id] === maxGame && maxGame > 0);
        const gameHolder = gameWinners.length === 1 ? gameWinners[0].id : null;

        const earned = Object.fromEntries(players.map((p) => [p.id, 0])) as Record<string, number>;
        if (high.holder) earned[high.holder] += 1;
        if (low.holder) earned[low.holder] += 1;
        if (jack) earned[jack] += 1;
        if (gameHolder) earned[gameHolder] += 1;

        const scores = { ...gs.scores };
        for (const p of players) scores[p.id] += earned[p.id] ?? 0;
        if (gs.highBidder && (earned[gs.highBidder] ?? 0) < gs.highBid) {
          scores[gs.highBidder] -= gs.highBid;
        }

        const best = players.reduce((b, p) => ((scores[p.id] ?? 0) > (scores[b.id] ?? 0) ? p : b));
        if ((scores[best.id] ?? 0) >= TARGET) {
          return {
            game: {
              ...game,
              status: 'finished',
              currentSeat: winnerSeat,
              gameState: {
                ...gs, currentTrick: [], leadSuit: null, captured, tricksPlayed,
                scores, phase: 'finished', winner: best.id,
              },
            },
            players: newPlayers,
          };
        }

        const deck = shuffleDeck(createDeck());
        const redealt = newPlayers.map((p, i) => ({ ...p, hand: deck.slice(i * 6, (i + 1) * 6) }));
        return {
          game: {
            ...game,
            currentSeat: 0,
            gameState: {
              ...gs, currentTrick: [], leadSuit: null, captured: Object.fromEntries(players.map((p) => [p.id, [] as Card[]])),
              tricksPlayed: 0, scores, phase: 'bidding', bids: {}, highBid: 0, highBidder: null, trump: null,
            },
          },
          players: redealt,
        };
      }

      return {
        game: {
          ...game,
          currentSeat: winnerSeat,
          gameState: { ...gs, currentTrick: [], leadSuit: null, captured, tricksPlayed },
        },
        players: newPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as PitchState).phase === 'finished';
  },
  score(state) {
    return (state.game.gameState as PitchState).scores;
  },
};
