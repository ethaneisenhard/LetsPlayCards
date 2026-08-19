import { describe, expect, it } from 'vitest';
import {
  applyTableThemePref,
  clearGameTableTheme,
  parseTableThemePrefs,
  resolveTableThemeId,
} from './table-theme-pure';
import { TABLE_THEME_IDS } from './table-theme-registry-pure';

const known = TABLE_THEME_IDS;

describe('table theme prefs', () => {
  it('parses prefs and drops junk', () => {
    expect(
      parseTableThemePrefs({
        global: 'beach',
        perGame: { war: 'night', bad: 1 },
        extra: true,
      }),
    ).toEqual({ global: 'beach', perGame: { war: 'night' } });
    expect(parseTableThemePrefs(null)).toEqual({});
  });

  it('resolves per-game over global over catalog default over felt', () => {
    const prefs = { global: 'beach', perGame: { war: 'night' } };
    expect(
      resolveTableThemeId({ prefs, gameType: 'war', gameDefault: 'mahogany', knownIds: known }),
    ).toBe('night');
    expect(
      resolveTableThemeId({ prefs, gameType: 'hearts', gameDefault: 'mahogany', knownIds: known }),
    ).toBe('beach');
    expect(
      resolveTableThemeId({ prefs: {}, gameType: 'hearts', gameDefault: 'mahogany', knownIds: known }),
    ).toBe('mahogany');
    expect(resolveTableThemeId({ prefs: {}, gameType: 'hearts', knownIds: known })).toBe('felt');
  });

  it('ignores unknown ids', () => {
    expect(
      resolveTableThemeId({
        prefs: { global: 'neon-void' },
        gameType: 'war',
        gameDefault: 'also-fake',
        knownIds: known,
      }),
    ).toBe('felt');
  });

  it('global apply clears per-game overrides; game scope writes one key', () => {
    const start = { global: 'felt', perGame: { war: 'night' } };
    expect(applyTableThemePref(start, { themeId: 'beach', scope: 'global', gameType: 'war' })).toEqual({
      global: 'beach',
      perGame: {},
    });
    expect(applyTableThemePref(start, { themeId: 'mahogany', scope: 'game', gameType: 'war' })).toEqual({
      global: 'felt',
      perGame: { war: 'mahogany' },
    });
    expect(clearGameTableTheme(start, 'war')).toEqual({ global: 'felt', perGame: {} });
  });
});
