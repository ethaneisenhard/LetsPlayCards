import type { GameType, GameTypeConfig } from '../gameTypes';
import type { DeckSpec } from '../deck';
import type { EnginePlayer, EngineState } from '../engine';

export type GameFamily =
  | 'compare'
  | 'collecting'
  | 'shedding'
  | 'trick'
  | 'meld'
  | 'betting'
  | 'solo'
  | 'unique';

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface GameAction {
  intent: string;
  playerId?: string;
  name?: string;
  cardId?: string;
  rank?: string;
  targetId?: string;
  dealCount?: number;
  [key: string]: unknown;
}

/**
 * The contract every card game implements. The engine + Durable Object stay
 * game-agnostic: they hold the envelope (EngineState) and dispatch intents to
 * the registered game's pure `reduce`. All game-specific state lives in
 * `game.gameState` (opaque to the engine).
 */
export interface CardGame {
  type: GameType;
  config: GameTypeConfig;
  family: GameFamily;
  deck: DeckSpec;

  /** Build the 'playing' state from the lobby state: shuffle, deal, set gameState. */
  setup(state: EngineState): EngineState;

  /** Pure transition for one intent. Returns a new EngineState or throws. */
  reduce(state: EngineState, action: GameAction): EngineState;

  /** Per-player projection. Defaults to the generic hand-hiding publicView. */
  view?(state: EngineState, viewerId?: string): unknown;

  isTerminal(state: EngineState): boolean;
  score(state: EngineState): Record<string, number>;
}

export interface CatalogEntry {
  type: GameType;
  family: GameFamily;
  deck: DeckSpec;
  status: 'live' | 'planned';
  config: GameTypeConfig;
}
