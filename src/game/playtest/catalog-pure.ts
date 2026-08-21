import { GAME_CONFIGS } from '../registry/catalog';
import type { GameType } from '../gameTypes';

export const PLAYTEST_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank', 'Grace'] as const;

const FOUR_HANDED = new Set<GameType>([
  'hearts',
  'spades',
  'bridge',
  'euchre',
  'whist',
  'pinochle',
  'canasta',
]);

/**
 * Games that can run for a long time (or forever) even when every move is legal.
 * A bounded session of legal play is a pass.
 */
export const UNBOUNDED_GAMES = new Set<GameType>([
  'war',
  'beggar_my_neighbor',
  'egyptian_ratscrew',
  'snap',
  'slapjack',
  'freeplay',
  'klondike',
  'freecell',
  'spider',
  'solitaire_race',
  'cribbage',
  'canasta',
  'gin_rummy',
  'rummy_500',
  'pinochle',
  'spades',
  'whist',
  'oh_hell',
  'euchre',
  'spite_and_malice',
]);

const LONG_LUCK = new Set<GameType>([
  'war',
  'beggar_my_neighbor',
  'egyptian_ratscrew',
  'snap',
  'slapjack',
]);

export function playerCountFor(type: GameType): number {
  const config = GAME_CONFIGS[type];
  if (FOUR_HANDED.has(type) && config.maxPlayers >= 4) return 4;
  if (config.minPlayers === 1) return Math.min(2, config.maxPlayers);
  return Math.min(config.maxPlayers, config.minPlayers);
}

export function turnLimitFor(type: GameType): number {
  if (LONG_LUCK.has(type)) return 2500;
  if (type === 'klondike' || type === 'freecell' || type === 'spider' || type === 'solitaire_race') {
    return 280;
  }
  if (UNBOUNDED_GAMES.has(type)) return 700;
  return 450;
}

export function isUnbounded(type: GameType): boolean {
  return UNBOUNDED_GAMES.has(type);
}
