import { describe, expect, it } from 'vitest';
import { displayInitials, normalizeDisplayName } from './profile-pure';

describe('profile', () => {
  it('normalizes display names', () => {
    expect(normalizeDisplayName('  Alex  ')).toBe('Alex');
    expect(normalizeDisplayName('x'.repeat(30))).toHaveLength(20);
  });

  it('builds initials', () => {
    expect(displayInitials('')).toBe('?');
    expect(displayInitials('Alex')).toBe('AL');
    expect(displayInitials('Alex Rivera')).toBe('AR');
  });
});
