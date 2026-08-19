import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface SAMState {
  /** Payoff pile per player; top (playable) card is index 0. */
  payoff: Record<string, Card[]>;
  /** Four side piles per player; top card is the last element. */
  sidePiles: Record<string, Card[][]>;
  /** Four shared center piles, built up Ace → Queen. */
  center: Card[][];
  /** Last player to act this turn (guards once-per-turn draw). */
  lastActor: string | null;
  winner: string | null;
}

const HAND_SIZE = 5;
const SIDE_PILES = 4;

/** Center piles build Ace → Queen (Kings have no place on the center). */
export const CENTER_SEQ = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'] as const;

export function centerIndex(rank: string): number {
  return CENTER_SEQ.indexOf(rank as (typeof CENTER_SEQ)[number]);
}

/** Draw cards until the player's hand has HAND_SIZE cards (once per turn). */
function topUp(
  playerId: string,
  hand: Card[],
  deck: Card[],
  lastActor: string | null,
): { hand: Card[]; deck: Card[]; lastActor: string | null } {
  if (lastActor === playerId) return { hand, deck, lastActor };
  const nextHand = [...hand];
  const nextDeck = [...deck];
  while (nextHand.length < HAND_SIZE && nextDeck.length > 0) {
    nextHand.push(nextDeck[0]);
    nextDeck.shift();
  }
  return { hand: nextHand, deck: nextDeck, lastActor: playerId };
}

export function playToCenter(
  state: EngineState,
  playerId: string,
  cardId: string,
  centerPile: number,
): EngineState {
  const { game, players } = state;
  const gs = game.gameState as SAMState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if (!Number.isInteger(centerPile) || centerPile < 0 || centerPile > 3) {
    throw new EngineError('centerPile must be 0–3');
  }

  const { hand, deck, lastActor } = topUp(playerId, player.hand, game.deck, gs.lastActor);

  const inHand = hand.find((c) => c.id === cardId);
  const payoff = gs.payoff[playerId] ?? [];
  const fromPayoff = payoff.length > 0 && payoff[0].id === cardId;
  if (!inHand && !fromPayoff) throw new EngineError('Card not in hand or payoff top');
  const card = inHand ?? payoff[0];

  const pile = gs.center[centerPile] ?? [];
  const idx = centerIndex(card.rank);
  if (pile.length === 0) {
    if (card.rank !== 'A') throw new EngineError('Only an Ace can start an empty center pile');
  } else {
    const topIdx = centerIndex(pile[pile.length - 1].rank);
    if (idx === -1 || idx !== topIdx + 1) {
      throw new EngineError('Card must be one higher than the center pile top');
    }
  }

  let nextHand = hand;
  let nextPayoff = gs.payoff;
  if (inHand) {
    nextHand = removeCard(hand, cardId);
  } else {
    nextPayoff = { ...gs.payoff, [playerId]: payoff.slice(1) };
  }

  const center = gs.center.map((p, i) => (i === centerPile ? [...p, card] : p));
  const winner = (nextPayoff[playerId] ?? []).length === 0 ? playerId : null;
  const nextPlayers = updatePlayerHand(players, playerId, nextHand);

  return {
    game: {
      ...game,
      deck,
      status: winner ? 'finished' : 'playing',
      currentSeat: player.seat,
      gameState: { ...gs, lastActor, payoff: nextPayoff, center, winner } satisfies SAMState,
    },
    players: nextPlayers,
  };
}

export function stashSide(state: EngineState, playerId: string, cardId: string, sidePile = 0): EngineState {
  const { game, players } = state;
  const gs = game.gameState as SAMState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if (!Number.isInteger(sidePile) || sidePile < 0 || sidePile >= SIDE_PILES) {
    throw new EngineError(`sidePile must be 0–${SIDE_PILES - 1}`);
  }

  const { hand, deck, lastActor } = topUp(playerId, player.hand, game.deck, gs.lastActor);
  const card = hand.find((c) => c.id === cardId);
  if (!card) throw new EngineError('Card not in hand');

  const nextHand = removeCard(hand, cardId);
  const piles = gs.sidePiles[playerId] ?? [[], [], [], []];
  const nextPiles = piles.map((p, i) => (i === sidePile ? [...p, card] : p));
  const nextPlayers = updatePlayerHand(players, playerId, nextHand);

  return {
    game: {
      ...game,
      deck,
      currentSeat: player.seat,
      gameState: { ...gs, lastActor, sidePiles: { ...gs.sidePiles, [playerId]: nextPiles } } satisfies SAMState,
    },
    players: nextPlayers,
  };
}

export const spiteAndMaliceGame: CardGame = {
  type: 'spite_and_malice',
  config: GAME_CONFIGS.spite_and_malice,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const payoff: Record<string, Card[]> = {};
    const dealt = players.map((p) => ({ ...p, hand: [] as Card[] }));
    let idx = 0;
    for (const p of dealt) {
      payoff[p.id] = deck.slice(idx, idx + 20);
      idx += 20;
    }
    for (const p of dealt) {
      p.hand = deck.slice(idx, idx + HAND_SIZE);
      idx += HAND_SIZE;
    }
    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          payoff,
          sidePiles: Object.fromEntries(players.map((p) => [p.id, [[], [], [], []]])),
          center: [[], [], [], []],
          lastActor: null,
          winner: null,
        } satisfies SAMState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    if (action.intent === 'play') {
      return playToCenter(state, String(action.playerId), String(action.cardId), Number(action.centerPile));
    }
    if (action.intent === 'side-pile') {
      return stashSide(state, String(action.playerId), String(action.cardId), Number(action.sidePile ?? 0));
    }
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as SAMState).winner;
  },
  score(state) {
    const gs = state.game.gameState as SAMState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
