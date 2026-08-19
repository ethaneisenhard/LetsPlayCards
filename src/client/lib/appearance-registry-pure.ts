export const APPEARANCE_IDS = ['dark', 'light'] as const;
export type AppearanceId = (typeof APPEARANCE_IDS)[number];

export type AppearanceOption = {
  id: AppearanceId;
  name: string;
  tagline: string;
};

/** Add future looks here (system, high-contrast, …). Chrome only reads the registry. */
export const APPEARANCES: Record<AppearanceId, AppearanceOption> = {
  dark: { id: 'dark', name: 'Dark', tagline: 'Night table' },
  light: { id: 'light', name: 'Light', tagline: 'Day table' },
};

export function listAppearances(): AppearanceOption[] {
  return APPEARANCE_IDS.map((id) => APPEARANCES[id]);
}
