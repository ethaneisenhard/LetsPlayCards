import {
  forgetRememberedGame,
  mergePlayerCodes,
  parseRememberedGames,
  playerCodesFromStorageKeys,
  upsertRememberedGame,
  type RememberedGame,
} from './current-games-pure';

export type { RememberedGame };

const STORAGE_KEY = 'lpc:current-games';

function readStore(): RememberedGame[] {
  try {
    return parseRememberedGames(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function writeStore(list: RememberedGame[]): RememberedGame[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function loadCurrentGames(now = Date.now()): RememberedGame[] {
  const stored = readStore();
  const merged = mergePlayerCodes(stored, playerCodesFromStorageKeys(Object.keys(localStorage)), now);
  if (merged.length !== stored.length) writeStore(merged);
  return merged;
}

export function rememberCurrentGame(game: RememberedGame): RememberedGame[] {
  return writeStore(upsertRememberedGame(loadCurrentGames(game.rememberedAt), game));
}

export function forgetCurrentGame(code: string): RememberedGame[] {
  return writeStore(forgetRememberedGame(loadCurrentGames(), code));
}
