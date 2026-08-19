export type ThemeScope = 'global' | 'game';

export type TableThemePrefs = {
  global?: string;
  perGame?: Record<string, string>;
};

export const DEFAULT_TABLE_THEME_ID = 'felt';

export function parseTableThemePrefs(raw: unknown): TableThemePrefs {
  if (!raw || typeof raw !== 'object') return {};
  const v = raw as Record<string, unknown>;
  const prefs: TableThemePrefs = {};
  if (typeof v.global === 'string' && v.global.length > 0) prefs.global = v.global;
  if (v.perGame && typeof v.perGame === 'object' && !Array.isArray(v.perGame)) {
    const perGame: Record<string, string> = {};
    for (const [gameType, id] of Object.entries(v.perGame as Record<string, unknown>)) {
      if (typeof id === 'string' && id.length > 0) perGame[gameType] = id;
    }
    if (Object.keys(perGame).length > 0) prefs.perGame = perGame;
  }
  return prefs;
}

/**
 * Resolve the table surface for a viewer.
 * per-game user pick → user global → game catalog default → felt.
 */
export function resolveTableThemeId(input: {
  prefs: TableThemePrefs;
  gameType: string;
  gameDefault?: string | null;
  knownIds: readonly string[];
}): string {
  const known = new Set(input.knownIds);
  const candidates = [
    input.prefs.perGame?.[input.gameType],
    input.prefs.global,
    input.gameDefault,
    DEFAULT_TABLE_THEME_ID,
  ];
  for (const id of candidates) {
    if (id && known.has(id)) return id;
  }
  return DEFAULT_TABLE_THEME_ID;
}

export function applyTableThemePref(
  prefs: TableThemePrefs,
  input: { themeId: string; scope: ThemeScope; gameType: string },
): TableThemePrefs {
  if (input.scope === 'global') {
    return { global: input.themeId, perGame: {} };
  }
  return {
    ...prefs,
    perGame: { ...prefs.perGame, [input.gameType]: input.themeId },
  };
}

export function clearGameTableTheme(prefs: TableThemePrefs, gameType: string): TableThemePrefs {
  if (!prefs.perGame?.[gameType]) return prefs;
  const perGame = { ...prefs.perGame };
  delete perGame[gameType];
  return { ...prefs, perGame };
}
