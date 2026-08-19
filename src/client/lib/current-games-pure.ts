export type RememberedGame = {
  code: string;
  gameType: string;
  rememberedAt: number;
};

export function isRememberedGame(value: unknown): value is RememberedGame {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.code === 'string' &&
    v.code.length > 0 &&
    typeof v.gameType === 'string' &&
    typeof v.rememberedAt === 'number'
  );
}

export function parseRememberedGames(raw: unknown): RememberedGame[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRememberedGame);
}

export function normalizeGameCode(code: string): string {
  return code.trim().toUpperCase();
}

export function upsertRememberedGame(list: RememberedGame[], game: RememberedGame): RememberedGame[] {
  const code = normalizeGameCode(game.code);
  if (!code) return list;
  const next: RememberedGame = { ...game, code };
  return [next, ...list.filter((g) => g.code !== code)];
}

export function forgetRememberedGame(list: RememberedGame[], code: string): RememberedGame[] {
  const target = normalizeGameCode(code);
  return list.filter((g) => g.code !== target);
}

export function playerCodesFromStorageKeys(keys: string[], prefix = 'lpc:player:'): string[] {
  return keys
    .filter((k) => k.startsWith(prefix))
    .map((k) => normalizeGameCode(k.slice(prefix.length)))
    .filter((code) => code.length > 0);
}

/** Fold `lpc:player:*` codes into the remembered list without losing known types. */
export function mergePlayerCodes(
  list: RememberedGame[],
  codes: string[],
  now: number,
): RememberedGame[] {
  let next = list;
  for (const code of codes) {
    const normalized = normalizeGameCode(code);
    if (!normalized || next.some((g) => g.code === normalized)) continue;
    next = upsertRememberedGame(next, { code: normalized, gameType: 'unknown', rememberedAt: now });
  }
  return next;
}
