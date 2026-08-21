import { addPlayer, createLobbyState, startGame, type EngineState } from '../engine';
import { GAME_CONFIGS } from '../registry/catalog';
import { DEFAULT_FREEPLAY_RULES, type GameSettings } from '../types';
import type { GameType } from '../gameTypes';
import { WAR_REVEAL_HOLD_MS } from '../games/war';

export const LOCAL_HUMAN_ID = 'fake-0';
export const LOCAL_BOT_NAMES = ['You', 'Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank', 'Grace', 'Henry', 'Ivy'];

export function createLocalMatch(
  gameType: GameType,
  playerCount: number,
  names: string[] = LOCAL_BOT_NAMES,
): EngineState {
  const config = GAME_CONFIGS[gameType];
  const settings: GameSettings = {
    dealCount: config.dealCount === 'all' ? 0 : config.dealCount,
    maxPlayers: config.maxPlayers,
  };
  if (gameType === 'freeplay') settings.freeplay = { ...DEFAULT_FREEPLAY_RULES };

  let state = createLobbyState('local', gameType.toUpperCase(), gameType, settings);
  const n = Math.max(1, Math.min(playerCount, config.maxPlayers));
  for (let i = 0; i < n; i++) {
    state = addPlayer(state, `fake-${i}`, names[i] ?? `Player ${i + 1}`);
  }
  return startGame(state);
}

export function stepDelayMs(action: { intent: string }): number {
  if (action.intent === 'war-collect') return WAR_REVEAL_HOLD_MS;
  return 850;
}
