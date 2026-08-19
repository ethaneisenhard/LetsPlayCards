import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EnginePlayer, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import { findMelds, deadwood } from '../primitives/meld';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface GinRummyState {
  /** 'draw' = current player must draw; 'discard' = must discard or knock. */
  phase: 'draw' | 'discard';
  scores: Record<string, number>;
  winner: string | null;
  /** Card id drawn from the discard pile this turn (may not be discarded again). */
  drewFromDiscard: string | null;
}

const WIN_SCORE = 100;
const GIN_BONUS = 25;
const UNDERCUT_BONUS = 25;

/**
 * Deadwood = value of unmelded cards. Computed as total cardValue minus the value
 * of the best set of disjoint melds (greedy, largest-first by total value).
 */
export function bestDeadwood(hand: Card[]): number {
  const total = deadwood(hand);
  const melds = findMelds(hand).sort((a, b) => deadwood(b.cards) - deadwood(a.cards));
  const used = new Set<string>();
  let melded = 0;
  for (const meld of melds) {
    if (meld.cards.every((c) => !used.has(c.id))) {
      for (const c of meld.cards) used.add(c.id);
      melded += deadwood(meld.cards);
    }
  }
  return total - melded;
}

function dealHands(players: EnginePlayer[]): { dealt: EnginePlayer[]; deck: Card[]; discardPile: Card[] } {
  const deck = shuffleDeck(createDeck());
  const dealCount = 10;
  let idx = 0;
  const dealt = players.map((p) => {
    const hand = deck.slice(idx, idx + dealCount);
    idx += dealCount;
    return { ...p, hand };
  });
  const stock = deck.slice(idx);
  const discardPile = stock.length > 0 ? [stock[0]] : [];
  return { dealt, deck: stock.slice(1), discardPile };
}

export const ginRummyGame: CardGame = {
  type: 'gin_rummy',
  config: GAME_CONFIGS.gin_rummy,
  family: 'meld',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const { dealt, deck, discardPile } = dealHands(players);
    return {
      game: {
        ...game,
        status: 'playing',
        deck,
        tableCards: [],
        discardPile,
        currentSeat: 0,
        gameState: {
          phase: 'draw',
          scores: Object.fromEntries(players.map((p) => [p.id, 0])),
          winner: null,
          drewFromDiscard: null,
        } satisfies GinRummyState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as GinRummyState;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    if (action.intent === 'draw') {
      if (gs.phase !== 'draw') throw new EngineError('Already drew this turn');
      const fromDiscard = action.source === 'discard';
      let deck = [...game.deck];
      let discardPile = [...game.discardPile];
      let card: Card;
      if (fromDiscard) {
        if (discardPile.length === 0) throw new EngineError('Discard pile is empty');
        card = discardPile[discardPile.length - 1];
        discardPile = discardPile.slice(0, -1);
      } else {
        if (deck.length === 0) {
          if (discardPile.length <= 1) throw new EngineError('No cards to draw');
          deck = shuffleDeck(discardPile.slice(0, -1));
          discardPile = discardPile.slice(-1); // keep the upcard
        }
        card = deck[0];
        deck = deck.slice(1);
      }
      return {
        game: {
          ...game,
          deck,
          discardPile,
          gameState: { ...gs, phase: 'discard', drewFromDiscard: fromDiscard ? card.id : null },
        },
        players: updatePlayerHand(players, player.id, [...player.hand, card]),
      };
    }

    if (action.intent === 'discard') {
      if (gs.phase !== 'discard') throw new EngineError('Must draw first');
      const cardId = String(action.cardId);
      if (gs.drewFromDiscard && cardId === gs.drewFromDiscard) {
        throw new EngineError('Cannot discard the card you just drew');
      }
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) throw new EngineError('Card not in hand');
      const hand = removeCard(player.hand, cardId);
      const nextSeatVal = nextSeat(orderedSeats(players), player.seat);
      return {
        game: {
          ...game,
          discardPile: [...game.discardPile, card],
          currentSeat: nextSeatVal,
          gameState: { ...gs, phase: 'draw', drewFromDiscard: null },
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    if (action.intent === 'knock') {
      if (gs.phase !== 'discard') throw new EngineError('Must draw first');
      const opponent = players.find((p) => p.id !== player.id);
      if (!opponent) throw new EngineError('Opponent not found');
      const kd = bestDeadwood(player.hand);
      if (kd > 10) throw new EngineError('Deadwood too high to knock');
      const od = bestDeadwood(opponent.hand);
      const scores = { ...gs.scores };
      if (kd === 0) {
        // Gin: knocker scores 25 bonus + opponent deadwood, cannot be undercut.
        scores[player.id] = (scores[player.id] ?? 0) + GIN_BONUS + od;
      } else if (kd < od) {
        scores[player.id] = (scores[player.id] ?? 0) + (od - kd);
      } else {
        // Undercut: opponent's deadwood is equal or lower.
        scores[opponent.id] = (scores[opponent.id] ?? 0) + UNDERCUT_BONUS + (kd - od);
      }

      const winningEntry = Object.entries(scores).find(([, v]) => v >= WIN_SCORE);
      const winner = winningEntry ? winningEntry[0] : null;
      if (winner) {
        return {
          game: { ...game, status: 'finished', gameState: { ...gs, scores, winner } },
          players,
        };
      }

      const redealt = dealHands(players);
      return {
        game: {
          ...game,
          status: 'playing',
          deck: redealt.deck,
          discardPile: redealt.discardPile,
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, phase: 'draw', scores, winner: null, drewFromDiscard: null },
        },
        players: redealt.dealt,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as GinRummyState).winner;
  },
  score(state) {
    return (state.game.gameState as GinRummyState).scores;
  },
};
