export const AVATAR_EMOJI_OPTIONS = [
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐸',
  '🦉',
  '🐧',
  '🦄',
  '🐙',
  '🦋',
  '🐢',
  '🐬',
  '🐺',
  '🐱',
  '🐶',
  '🐰',
  '🐹',
  '🐭',
  '🐮',
  '🐷',
  '🐔',
  '🐝',
] as const;

export function normalizeDisplayName(raw: string): string {
  return raw.trim().slice(0, 20);
}

export function displayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function firstGrapheme(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...seg.segment(trimmed)][0]?.segment ?? '';
  }
  return Array.from(trimmed)[0] ?? '';
}

/** Empty string means use the default Heroicon avatar. */
export function normalizeAvatarEmoji(raw: string): string {
  const g = firstGrapheme(raw);
  if (!g) return '';
  if (/^[a-zA-Z0-9?!.,'"_-]$/.test(g)) return '';
  return g;
}
