export const DEFAULT_APPEARANCE_ID = 'dark';

export function parseAppearanceId(raw: unknown, knownIds: readonly string[]): string {
  if (typeof raw === 'string' && knownIds.includes(raw)) return raw;
  return DEFAULT_APPEARANCE_ID;
}
