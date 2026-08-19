import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, type EngineState } from '../state';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface BeggarState {
  /** Per-player face-down stack; top card is index 0. */
  stacks: Record<string, Card[]>;
  /** Central pile; top card is the last element. */
  center: Card[];
  /** Remaining cards the payer must flip. */
  owe: number;
  /** Who must currently flip cards to satisfy the debt. */
  payerId: string | null;
  /** Who collects the center if the debt is fully paid. */
  collectorId: string | null;
  winner: string | null;
}

const FACE_VALUES: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };

/** Number of cards a face card demands from the opponent (0 for non-face cards). */
export function faceValue(rank: string): number {
  return FACE_VALUES[rank] ?? 0;
}

function otherPlayerId(players: EngineState['players'], playerId: string): string {
  const other = players.find((p) => p.id !== playerId);
  if (!other) throw new EngineError('Needs exactly two players');
  return other.id;
}

function settleCenter(
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
        ...(game.gameState as BeggarState),
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

export function flip(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as BeggarState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');

  const stack = gs.stacks[playerId] ?? [];
  if (stack.length === 0) throw new EngineError('No cards in stack');

  if (gs.owe > 0) {
    if (playerId !== gs.payerId) throw new EngineError('Payment is owed by the other player');
  } else if (player.seat !== game.currentSeat) {
    throw new EngineError('Not your turn');
  }

  const card = stack[0];
  const stacks = { ...gs.stacks, [playerId]: stack.slice(1) };
  const center = [...gs.center, card];
  const fv = faceValue(card.rank);

  // Paying off a debt.
  if (gs.owe > 0) {
    if (fv > 0) {
      // The payer revealed a face card: the debt reverses.
      const otherId = otherPlayerId(players, playerId);
      const other = findPlayer(players, otherId)!;
      return {
        game: {
          ...game,
          currentSeat: other.seat,
          gameState: { ...gs, stacks, center, owe: fv, payerId: otherId, collectorId: playerId },
        },
        players,
      };
    }
    const owe = gs.owe - 1;
    if (owe === 0) return settleCenter(state, stacks, center, gs.collectorId!);
    return { game: { ...game, gameState: { ...gs, stacks, center, owe } }, players };
  }

  // Normal flip: no active debt.
  if (fv > 0) {
    const otherId = otherPlayerId(players, playerId);
    const other = findPlayer(players, otherId)!;
    return {
      game: {
        ...game,
        currentSeat: other.seat,
        gameState: { ...gs, stacks, center, owe: fv, payerId: otherId, collectorId: playerId },
      },
      players,
    };
  }

  // Plain card, no face value.
  if (stacks[playerId].length === 0) {
    // Flipper is out of cards — the opponent sweeps the rest.
    const otherId = otherPlayerId(players, playerId);
    return settleCenter(state, stacks, center, otherId);
  }
  const otherId = otherPlayerId(players, playerId);
  const other = findPlayer(players, otherId)!;
  return { game: { ...game, currentSeat: other.seat, gameState: { ...gs, stacks, center } }, players };
}

export const beggarMyNeighborGame: CardGame = {
  type: 'beggar_my_neighbor',
  config: GAME_CONFIGS.beggar_my_neighbor,
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
        } satisfies BeggarState,
      },
      players,
    };
  },
  reduce(state, action) {
    if (action.intent === 'flip') return flip(state, String(action.playerId));
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as BeggarState).winner;
  },
  score(state) {
    const gs = state.game.gameState as BeggarState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
