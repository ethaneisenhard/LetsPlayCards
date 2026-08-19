import { describe, expect, it } from 'vitest';
import { parseAppearanceId } from './appearance-pure';
import { APPEARANCE_IDS } from './appearance-registry-pure';

describe('parseAppearanceId', () => {
  it('keeps known ids and falls back to dark', () => {
    expect(parseAppearanceId('light', APPEARANCE_IDS)).toBe('light');
    expect(parseAppearanceId('dark', APPEARANCE_IDS)).toBe('dark');
    expect(parseAppearanceId('neon', APPEARANCE_IDS)).toBe('dark');
    expect(parseAppearanceId(null, APPEARANCE_IDS)).toBe('dark');
  });
});
