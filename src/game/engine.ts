import { EngineError, updateSettings, type EngineState } from './state';
import type { FreePlayRules } from './types';
import { GAME_REGISTRY } from './registry/registry';
import type { GameAction } from './registry/types';

export * from './state';
export type { GameAction };
export type { CardGame, GameFamily, CatalogEntry } from './registry/types';

export function startGame(state: EngineState): EngineState {
  const game = GAME_REGISTRY[state.game.gameType];
  if (!game) throw new EngineError(`Game "${state.game.gameType}" is not implemented yet`);
  return game.setup(state);
}

export function applyAction(state: EngineState, action: GameAction): EngineState {
  if (action.intent === 'start') return startGame(state);
  if (action.intent === 'update-settings') {
    const patch: Partial<{ dealCount: number; freeplay: FreePlayRules }> = {};
    if (typeof action.dealCount === 'number') patch.dealCount = action.dealCount;
    if (action.freeplay && typeof action.freeplay === 'object') {
      patch.freeplay = action.freeplay as FreePlayRules;
    }
    return updateSettings(state, patch);
  }
  const game = GAME_REGISTRY[state.game.gameType];
  if (!game) throw new EngineError(`Game "${state.game.gameType}" is not implemented yet`);
  return game.reduce(state, action);
}
