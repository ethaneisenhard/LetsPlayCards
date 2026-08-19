export const TABLE_THEME_IDS = ['felt', 'beach', 'night', 'mahogany'] as const;
export type TableThemeId = (typeof TABLE_THEME_IDS)[number];

export type TableSurface = {
  id: TableThemeId;
  name: string;
  tagline: string;
  pageBg: string;
  mobileFelt: string;
  desktopFelt: string;
  rail: string;
  handBg: string;
  swatch: string;
};

/** Add new looks here — GameTable only reads tokens, never game/theme ifs. */
export const TABLE_THEMES: Record<TableThemeId, TableSurface> = {
  felt: {
    id: 'felt',
    name: 'Classic felt',
    tagline: 'Casino green',
    pageBg: '#0a0f1a',
    mobileFelt: 'radial-gradient(ellipse at center, #1a4d30 0%, #0d2e1e 60%, #0a0f1a 100%)',
    desktopFelt: 'radial-gradient(ellipse at center, #1e5c3a 0%, #0f3320 50%, #0a2318 100%)',
    rail: '#2d1a08',
    handBg: '#070c16',
    swatch: '#1e5c3a',
  },
  beach: {
    id: 'beach',
    name: 'Beach',
    tagline: 'Sand and tide',
    pageBg: '#0f1c24',
    mobileFelt: 'radial-gradient(ellipse at center, #c4a574 0%, #7a9e8a 45%, #1a4d5c 100%)',
    desktopFelt: 'radial-gradient(ellipse at center, #d4b896 0%, #8fb8a8 40%, #2a6b7a 100%)',
    rail: '#8b6914',
    handBg: '#0c181e',
    swatch: '#c4a574',
  },
  night: {
    id: 'night',
    name: 'Night',
    tagline: 'Late-game indigo',
    pageBg: '#07080f',
    mobileFelt: 'radial-gradient(ellipse at center, #1b2a4d 0%, #0e1628 60%, #07080f 100%)',
    desktopFelt: 'radial-gradient(ellipse at center, #243864 0%, #121a30 50%, #080a14 100%)',
    rail: '#1a1a28',
    handBg: '#05060b',
    swatch: '#243864',
  },
  mahogany: {
    id: 'mahogany',
    name: 'Mahogany',
    tagline: 'Home-game wood',
    pageBg: '#120c0a',
    mobileFelt: 'radial-gradient(ellipse at center, #6b2e1a 0%, #3d1c10 55%, #120c0a 100%)',
    desktopFelt: 'radial-gradient(ellipse at center, #7a3820 0%, #4a2214 50%, #1a0e0a 100%)',
    rail: '#3d2410',
    handBg: '#0e0908',
    swatch: '#6b2e1a',
  },
};

export function listTableThemes(): TableSurface[] {
  return TABLE_THEME_IDS.map((id) => TABLE_THEMES[id]);
}

export function tableThemeById(id: string): TableSurface {
  return TABLE_THEMES[id as TableThemeId] ?? TABLE_THEMES.felt;
}
