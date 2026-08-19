import { buildDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { rankValue } from '../gameTypes';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { legalPlays, trickWinner, type TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface PinochleState {
  phase: 'trump' | 'meld' | 'playing' | 'finished';
  trump: Suit | null;
  trumpSetter: string | null;
  meldDone: string[];
  declared: Record<string, string[]>;
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  tricksPlayed: number;
  scores: Record<string, number>;
  winner: string | null;
}

const TARGET = 150;
const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A'];
const MELD_TYPES = ['marriage', 'pinochle', 'run', 'around'];

const seatOf = (players: { id: string; seat: number }[], id: string): number =>
  players.find((p) => p.id === id)!.seat;

function cardPoints(card: Card): number {
  if (card.rank === 'A' || card.rank === '10' || card.rank === 'K') return 10;
  if (card.rank === 'Q' || card.rank === 'J') return 5;
  return 0;
}

function meldScore(type: string, hand: Card[], trump: Suit): number {
  const has = (rank: string, suit: Suit) => hand.some((c) => c.rank === rank && c.suit === suit);
  if (type === 'marriage') return has('K', trump) && has('Q', trump) ? 40 : 0;
  if (type === 'pinochle') return has('Q', 'spades') && has('J', 'diamonds') ? 40 : 0;
  if (type === 'run') return ['A', '10', 'K', 'Q', 'J'].every((r) => has(r, trump)) ? 150 : 0;
  if (type === 'around') {
    for (const suit of SUITS) {
      if (RANKS.every((r) => hand.some((c) => c.rank === r && c.suit === suit))) return 100;
    }
    return 0;
  }
  return 0;
}

export const pinochleGame: CardGame = {
  type: 'pinochle',
  config: GAME_CONFIGS.pinochle,
  family: 'unique',
  deck: { ranks: ['9', '10', 'J', 'Q', 'K', 'A'], copies: 2 },
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(buildDeck({ ranks: ['9', '10', 'J', 'Q', 'K', 'A'], copies: 2 }));
    const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * 12, (i + 1) * 12) }));
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          phase: 'trump',
          trump: null,
          trumpSetter: null,
          meldDone: [],
          declared: {},
          currentTrick: [],
          leadSuit: null,
          tricksPlayed: 0,
          scores: Object.fromEntries(players.map((p) => [p.id, 0])),
          winner: null,
        } satisfies PinochleState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as PinochleState;
    const seats = orderedSeats(players);

    if (action.intent === 'set-trump') {
      if (gs.phase !== 'trump') throw new EngineError('Trump already set');
      const trump = String(action.suit) as Suit;
      if (!SUITS.includes(trump)) throw new EngineError('Invalid suit');
      const player = findPlayer(players, action.playerId!);
      if (!player) throw new EngineError('Player not found');
      return {
        game: {
          ...game,
          currentSeat: 0,
          gameState: { ...gs, trump, trumpSetter: player.id, phase: 'meld' },
        },
        players,
      };
    }

    if (action.intent === 'meld') {
      if (gs.phase !== 'meld') throw new EngineError('Not melding');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const type = String(action.type);
      if (!MELD_TYPES.includes(type)) throw new EngineError('Invalid meld type');
      if ((gs.declared[player.id] ?? []).includes(type)) throw new EngineError('Meld already declared');
      const pts = meldScore(type, player.hand, gs.trump!);
      if (pts === 0) throw new EngineError('Meld not held');
      const scores = { ...gs.scores, [player.id]: (gs.scores[player.id] ?? 0) + pts };
      const declared = { ...gs.declared, [player.id]: [...(gs.declared[player.id] ?? []), type] };
      return { game: { ...game, gameState: { ...gs, scores, declared } }, players };
    }

    if (action.intent === 'pass') {
      if (gs.phase !== 'meld') throw new EngineError('Not melding');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const meldDone = [...new Set([...gs.meldDone, player.id])];
      if (meldDone.length >= players.length) {
        return {
          game: {
            ...game,
            currentSeat: seatOf(players, gs.trumpSetter!),
            gameState: { ...gs, meldDone, phase: 'playing', currentTrick: [], leadSuit: null },
          },
          players,
        };
      }
      let seat = nextSeat(seats, player.seat);
      while (meldDone.includes(players.find((p) => p.seat === seat)!.id)) seat = nextSeat(seats, seat);
      return { game: { ...game, currentSeat: seat, gameState: { ...gs, meldDone } }, players };
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
      const pts = newTrick.reduce((s, t) => s + cardPoints(t.card), 0);
      const scores = { ...gs.scores, [winnerId]: (gs.scores[winnerId] ?? 0) + pts };
      const tricksPlayed = gs.tricksPlayed + 1;
      const winnerSeat = players.find((p) => p.id === winnerId)!.seat;

      if (tricksPlayed >= 12) {
        const best = players.reduce((b, p) => ((scores[p.id] ?? 0) > (scores[b.id] ?? 0) ? p : b));
        const finished = (scores[best.id] ?? 0) >= TARGET;
        if (finished) {
          return {
            game: {
              ...game,
              status: 'finished',
              currentSeat: winnerSeat,
              gameState: {
                ...gs, currentTrick: [], leadSuit: null, scores, tricksPlayed,
                phase: 'finished', winner: best.id,
              },
            },
            players: newPlayers,
          };
        }
        const deck = shuffleDeck(buildDeck({ ranks: ['9', '10', 'J', 'Q', 'K', 'A'], copies: 2 }));
        const redealt = newPlayers.map((p, i) => ({ ...p, hand: deck.slice(i * 12, (i + 1) * 12) }));
        return {
          game: {
            ...game,
            currentSeat: 0,
            gameState: {
              ...gs, currentTrick: [], leadSuit: null, scores, tricksPlayed: 0,
              phase: 'trump', trump: null, trumpSetter: null, meldDone: [], declared: {},
            },
          },
          players: redealt,
        };
      }

      return {
        game: {
          ...game,
          currentSeat: winnerSeat,
          gameState: { ...gs, currentTrick: [], leadSuit: null, scores, tricksPlayed },
        },
        players: newPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as PinochleState).phase === 'finished';
  },
  score(state) {
    return (state.game.gameState as PinochleState).scores;
  },
};
