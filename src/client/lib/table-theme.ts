import { notifyPrefsChanged } from './prefs-events';
import {
  applyTableThemePref,
  parseTableThemePrefs,
  resolveTableThemeId,
  type TableThemePrefs,
  type ThemeScope,
} from './table-theme-pure';
import { TABLE_THEME_IDS, tableThemeById, type TableSurface } from './table-theme-registry-pure';

export type { TableThemePrefs, ThemeScope };
export type { TableSurface };

const STORAGE_KEY = 'lpc:table-theme-prefs';

export function loadTableThemePrefs(): TableThemePrefs {
  try {
    return parseTableThemePrefs(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

export function saveTableThemePrefs(prefs: TableThemePrefs): TableThemePrefs {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  notifyPrefsChanged();
  return prefs;
}

export function resolveSurface(gameType: string, gameDefault?: string | null): TableSurface {
  const id = resolveTableThemeId({
    prefs: loadTableThemePrefs(),
    gameType,
    gameDefault,
    knownIds: TABLE_THEME_IDS,
  });
  return tableThemeById(id);
}

export function pickTableTheme(
  gameType: string,
  themeId: string,
  scope: ThemeScope,
): TableThemePrefs {
  return saveTableThemePrefs(applyTableThemePref(loadTableThemePrefs(), { themeId, scope, gameType }));
}
