import type { GameType } from '../../game/gameTypes';
import { isGameType } from '../../game/registry/catalog';

export function parsePlaygroundPath(pathname: string): GameType | null {
  const match = pathname.match(/^\/playground\/([a-z0-9_]+)\/?$/);
  if (!match) return null;
  return isGameType(match[1]) ? match[1] : null;
}

export function playgroundPath(type: GameType): string {
  return `/playground/${type}`;
}

export function playgroundTypeFromPath(pathname: string, fallback: GameType = 'war'): GameType {
  return parsePlaygroundPath(pathname) ?? fallback;
}
