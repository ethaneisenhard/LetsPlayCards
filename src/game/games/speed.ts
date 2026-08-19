import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { rankValue } from '../gameTypes';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

export interface SpeedState {
  /** Per-player face-down draw stacks (20 each at deal). */
  stacks: Record<string, Card[]>;
  /** The two center play piles. */
  center: [Card[], Card[]];
  /** Shared stock used to re-seed the center when nobody can play. */
  stock: Card[];
  winner: string | null;
}

const HAND_SIZE = 5;
const STACK_SIZE = 20;

/** True when `rank` is exactly one step above or below `top` (wrapping A↔2 and A↔K). */
export function isSpeedPlayable(rank: string, top: string): boolean {
  const a = rankValue(rank);
  const b = rankValue(top);
  const diff = (a - b + 13) % 13;
  return diff === 1 || diff === 12;
}

export const speedGame: CardGame = {
  type: 'speed',
  config: GAME_CONFIGS.speed,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    if (players.length !== 2) throw new EngineError('Speed requires exactly 2 players');
    const deck = shuffleDeck(createDeck());
    const p0 = players[0];
    const p1 = players[1];
    const stack0 = deck.slice(0, STACK_SIZE);
    const stack1 = deck.slice(STACK_SIZE, STACK_SIZE * 2);
    const hand0 = deck.slice(40, 45);
    const hand1 = deck.slice(45, 50);
    const stock = deck.slice(50);
    const center: [Card[], Card[]] = [[stock[0]], [stock[1]]];
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          stacks: { [p0.id]: stack0, [p1.id]: stack1 },
          center,
          stock: stock.slice(2),
          winner: null,
        } satisfies SpeedState,
      },
      players: [
        { ...p0, hand: hand0 },
        { ...p1, hand: hand1 },
      ],
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as SpeedState;

    if (action.intent === 'draw-center') {
      if (gs.stock.length < 2) throw new EngineError('Not enough stock to draw');
      const [a, b, ...rest] = gs.stock;
      return {
        game: {
          ...game,
          gameState: {
            ...gs,
            stock: rest,
            center: [[...gs.center[0], a], [...gs.center[1], b]],
          } satisfies SpeedState,
        },
        players,
      };
    }

    if (action.intent === 'play') {
      const player = findPlayer(players, String(action.playerId));
      if (!player) throw new EngineError('Player not found');
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');

      const top0 = gs.center[0][gs.center[0].length - 1];
      const top1 = gs.center[1][gs.center[1].length - 1];
      const match0 = isSpeedPlayable(card.rank, top0.rank);
      const match1 = isSpeedPlayable(card.rank, top1.rank);
      if (!match0 && !match1) throw new EngineError('Card must be one rank higher or lower than a center pile');

      const pileIndex = match0 ? 0 : 1;
      const center: [Card[], Card[]] =
        pileIndex === 0
          ? [[...gs.center[0], card], gs.center[1]]
          : [gs.center[0], [...gs.center[1], card]];

      let hand = removeCard(player.hand, card.id);
      let stack = [...(gs.stacks[player.id] ?? [])];
      while (hand.length < HAND_SIZE && stack.length > 0) {
        hand = [...hand, stack[0]];
        stack = stack.slice(1);
      }

      const won = hand.length === 0 && stack.length === 0;
      return {
        game: {
          ...game,
          status: won ? 'finished' : 'playing',
          gameState: {
            stacks: { ...gs.stacks, [player.id]: stack },
            center,
            stock: gs.stock,
            winner: won ? player.id : null,
          } satisfies SpeedState,
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as SpeedState).winner;
  },
  score(state) {
    const gs = state.game.gameState as SpeedState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
