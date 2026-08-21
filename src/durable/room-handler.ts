import {
  addPlayer,
  applyAction,
  createLobbyState,
  publicView,
  type EngineState,
  type GameAction,
} from '../game/engine';
import { GAME_REGISTRY } from '../game/registry/registry';
import { GAME_CONFIGS, catalogEntry } from '../game/registry/catalog';
import { DEFAULT_FREEPLAY_RULES, type GameSettings } from '../game/types';
import type { GameType } from '../game/gameTypes';

/**
 * Shared room protocol used by the Durable Object and the playtest harness.
 * Keep this thin: lobby envelope + applyAction + publicView. No game rules.
 */

export function createRoomState(code: string, gameType: GameType, roomId = crypto.randomUUID()): EngineState {
  const config = catalogEntry(gameType)?.config ?? GAME_CONFIGS.freeplay;
  const settings: GameSettings = {
    dealCount: config.dealCount === 'all' ? 0 : config.dealCount,
    maxPlayers: config.maxPlayers,
  };
  if (gameType === 'freeplay') {
    settings.freeplay = { ...DEFAULT_FREEPLAY_RULES };
  }
  return createLobbyState(roomId, code.toUpperCase(), gameType, settings);
}

export function joinRoom(state: EngineState, playerId: string, name: string): EngineState {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) throw new Error('Please enter your name.');
  return addPlayer(state, playerId, trimmed);
}

export function applyRoomAction(state: EngineState, action: GameAction): EngineState {
  return applyAction(state, action);
}

/** Same projection the DO broadcasts to each socket. */
export function viewFor(state: EngineState, viewerId?: string): unknown {
  const game = GAME_REGISTRY[state.game.gameType];
  return game?.view ? game.view(state, viewerId) : publicView(state, viewerId);
}
