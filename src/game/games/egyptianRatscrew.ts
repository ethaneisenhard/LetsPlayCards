import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, type EnginePlayer, type EngineState } from '../state';
import { nextSeat } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';
import { faceValue } from './beggarMyNeighbor';

interface ERSState {
  /** Per-player face-down stack; top card is index 0. */
  stacks: Record<string, Card[]>;
  /** Central pile; top card is the last element. */
  center: Card[];
  owe: number;
  payerId: string | null;
  collectorId: string | null;
  winner: string | null;
}

function playersWithCards(players: EnginePlayer[], stacks: Record<string, Card[]>): EnginePlayer[] {
  return players.filter((p) => (stacks[p.id] ?? []).length > 0).sort((a, b) => a.seat - b.seat);
}

function nextWithCards(
  players: EnginePlayer[],
  stacks: Record<string, Card[]>,
  fromSeat: number,
): string | null {
  const active = playersWithCards(players, stacks);
  if (active.length === 0) return null;
  const seats = active.map((p) => p.seat);
  const seat = nextSeat(seats, fromSeat);
  return active.find((p) => p.seat === seat)?.id ?? null;
}

/** A double (two equal ranks in a row) or sandwich (equal ranks with one card between). */
export function validSlap(center: Card[]): boolean {
  const n = center.length;
  if (n >= 2 && center[n - 1].rank === center[n - 2].rank) return true;
  if (n >= 3 && center[n - 1].rank === center[n - 3].rank) return true;
  return false;
}

export function flip(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as ERSState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');

  const stack = gs.stacks[playerId] ?? [];
  if (stack.length === 0) throw new EngineError('No cards in stack');

  if (gs.owe > 0) {
    if (playerId !== gs.payerId) throw new EngineError('Payment is owed by another player');
  } else if (player.seat !== game.currentSeat) {
    throw new EngineError('Not your turn');
  }

  const card = stack[0];
  const stacks = { ...gs.stacks, [playerId]: stack.slice(1) };
  const center = [...gs.center, card];
  const fv = faceValue(card.rank);

  if (gs.owe > 0) {
    if (fv > 0) {
      // Payer revealed a face card: debt reverses to the next player with cards.
      const nextId = nextWithCards(players, stacks, player.seat);
      if (!nextId) return collect(state, stacks, center, playerId);
      const next = findPlayer(players, nextId)!;
      return {
        game: {
          ...game,
          currentSeat: next.seat,
          gameState: { ...gs, stacks, center, owe: fv, payerId: nextId, collectorId: playerId },
        },
        players,
      };
    }
    const owe = gs.owe - 1;
    if (owe === 0) return collect(state, stacks, center, gs.collectorId!);
    return { game: { ...game, gameState: { ...gs, stacks, center, owe } }, players };
  }

  // Normal flip.
  if (fv > 0) {
    const nextId = nextWithCards(players, stacks, player.seat);
    if (!nextId) return collect(state, stacks, center, playerId);
    const next = findPlayer(players, nextId)!;
    return {
      game: {
        ...game,
        currentSeat: next.seat,
        gameState: { ...gs, stacks, center, owe: fv, payerId: nextId, collectorId: playerId },
      },
      players,
    };
  }

  const nextId = nextWithCards(players, stacks, player.seat);
  if (!nextId) return collect(state, stacks, center, playerId);
  const next = findPlayer(players, nextId)!;
  return { game: { ...game, currentSeat: next.seat, gameState: { ...gs, stacks, center } }, players };
}

function collect(
  state: EngineState,
  stacks: Record<string, Card[]>,
  center: Card[],
  collectorId: string,
): EngineState {
  const { game, players } = state;
  const collected = [...(stacks[collectorId] ?? []), ...center];
  const finalStacks = { ...stacks, [collectorId]: collected };
  const winner = collected.length === 52 ? collectorId : null;
  const collectorSeat = players.find((p) => p.id === collectorId)!.seat;
  return {
    game: {
      ...game,
      status: winner ? 'finished' : 'playing',
      currentSeat: collectorSeat,
      gameState: {
        ...(game.gameState as ERSState),
        stacks: finalStacks,
        center: [],
        owe: 0,
        payerId: null,
        collectorId: null,
        winner,
      },
    },
    players,
  };
}

export function slap(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as ERSState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');

  if (validSlap(gs.center)) {
    return collect(state, gs.stacks, gs.center, playerId);
  }

  // Invalid slap: pay the top card of your stack to the center.
  const stack = gs.stacks[playerId] ?? [];
  if (stack.length === 0) throw new EngineError('No cards to pay for an invalid slap');
  const card = stack[0];
  const stacks = { ...gs.stacks, [playerId]: stack.slice(1) };
  const center = [...gs.center, card];
  return { game: { ...game, gameState: { ...gs, stacks, center } }, players };
}

export const egyptianRatscrewGame: CardGame = {
  type: 'egyptian_ratscrew',
  config: GAME_CONFIGS.egyptian_ratscrew,
  family: 'compare',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealCount = Math.floor(deck.length / players.length);
    const stacks: Record<string, Card[]> = {};
    let idx = 0;
    for (const p of players) {
      stacks[p.id] = deck.slice(idx, idx + dealCount);
      idx += dealCount;
    }
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          stacks,
          center: [],
          owe: 0,
          payerId: null,
          collectorId: null,
          winner: null,
        } satisfies ERSState,
      },
      players,
    };
  },
  reduce(state, action) {
    if (action.intent === 'flip') return flip(state, String(action.playerId));
    if (action.intent === 'slap') return slap(state, String(action.playerId));
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as ERSState).winner;
  },
  score(state) {
    const gs = state.game.gameState as ERSState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
