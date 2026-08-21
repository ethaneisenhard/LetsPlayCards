import { describe, expect, it } from 'vitest';
import {
  displayInitials,
  firstGrapheme,
  normalizeAvatarEmoji,
  normalizeDisplayName,
} from './profile-pure';

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

  it('takes the first grapheme for avatar emoji', () => {
    expect(firstGrapheme('🦊 bear')).toBe('🦊');
    expect(firstGrapheme('  🐧  ')).toBe('🐧');
    expect(normalizeAvatarEmoji('🦊🐯')).toBe('🦊');
    expect(normalizeAvatarEmoji('Alex')).toBe('');
    expect(normalizeAvatarEmoji('')).toBe('');
  });
});
