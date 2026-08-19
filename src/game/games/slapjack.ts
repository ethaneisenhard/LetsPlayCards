import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, type EnginePlayer, type EngineState } from '../state';
import { orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface SlapjackState {
  /** Face-down draw stacks per player (index 0 = bottom, last = top). */
  stacks: Record<string, Card[]>;
  /** Center pile; last element is the top (the slap target). */
  center: Card[];
  /** Players who have run out of cards (may still slap back in). */
  out: string[];
  winner: string | null;
}

function playersFromStacks(players: EnginePlayer[], stacks: Record<string, Card[]>): EnginePlayer[] {
  return players.map((p) => ({ ...p, hand: [...(stacks[p.id] ?? [])] }));
}

function nextActiveSeat(players: EnginePlayer[], stacks: Record<string, Card[]>, currentSeat: number): number {
  const seats = orderedSeats(players);
  const start = seats.indexOf(currentSeat);
  for (let i = 1; i <= seats.length; i++) {
    const seat = seats[(start + i) % seats.length];
    const p = players.find((x) => x.seat === seat);
    if (p && (stacks[p.id] ?? []).length > 0) return seat;
  }
  return currentSeat;
}

export const slapjackGame: CardGame = {
  type: 'slapjack',
  config: GAME_CONFIGS.slapjack,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const stacks: Record<string, Card[]> = Object.fromEntries(players.map((p) => [p.id, [] as Card[]]));
    deck.forEach((card, i) => stacks[players[i % players.length].id].push(card));
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: { stacks, center: [], out: [], winner: null } satisfies SlapjackState,
      },
      players: playersFromStacks(players, stacks),
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as SlapjackState;
    const stacks = { ...gs.stacks };
    let center = [...gs.center];
    let out = [...gs.out];
    let winner: string | null = null;

    if (action.intent === 'flip') {
      const player = findPlayer(players, action.playerId!);
      if (!player) throw new EngineError('Player not found');
      if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const stack = stacks[player.id] ?? [];
      if (stack.length === 0) throw new EngineError('No cards to flip');
      const top = stack[stack.length - 1];
      stacks[player.id] = stack.slice(0, -1);
      center = [...center, top];
      if (stacks[player.id].length === 0 && !out.includes(player.id)) out.push(player.id);

      const active = players.filter((p) => (stacks[p.id] ?? []).length > 0);
      if (active.length === 1) {
        winner = active[0].id;
        stacks[winner] = [...center, ...(stacks[winner] ?? [])];
        center = [];
      }
      return {
        game: {
          ...game,
          status: winner ? 'finished' : 'playing',
          currentSeat: winner ? game.currentSeat : nextActiveSeat(players, stacks, player.seat),
          gameState: { stacks, center, out, winner },
        },
        players: playersFromStacks(players, stacks),
      };
    }

    if (action.intent === 'slap') {
      const player = findPlayer(players, action.playerId!);
      if (!player) throw new EngineError('Player not found');
      if (center.length === 0) throw new EngineError('Nothing to slap');
      const top = center[center.length - 1];
      if (top.rank === 'J') {
        const won = center;
        center = [];
        stacks[player.id] = [...won, ...(stacks[player.id] ?? [])];
        out = out.filter((id) => id !== player.id);
      } else {
        const stack = stacks[player.id] ?? [];
        if (stack.length > 0) {
          const penalty = stack[stack.length - 1];
          stacks[player.id] = stack.slice(0, -1);
          center = [...center, penalty];
          if (stacks[player.id].length === 0 && !out.includes(player.id)) out.push(player.id);
        }
      }

      const active = players.filter((p) => (stacks[p.id] ?? []).length > 0);
      if (active.length === 1) {
        winner = active[0].id;
        stacks[winner] = [...center, ...(stacks[winner] ?? [])];
        center = [];
      }

      let currentSeat = game.currentSeat;
      const cur = players.find((p) => p.seat === currentSeat);
      if (!winner && cur && (stacks[cur.id] ?? []).length === 0) {
        currentSeat = nextActiveSeat(players, stacks, currentSeat);
      }

      return {
        game: {
          ...game,
          status: winner ? 'finished' : 'playing',
          currentSeat,
          gameState: { stacks, center, out, winner },
        },
        players: playersFromStacks(players, stacks),
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as SlapjackState).winner;
  },
  score(state) {
    const gs = state.game.gameState as SlapjackState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
