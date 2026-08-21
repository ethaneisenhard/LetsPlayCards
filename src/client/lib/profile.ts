import { notifyPrefsChanged } from './prefs-events';
import { normalizeAvatarEmoji, normalizeDisplayName } from './profile-pure';

const NAME_KEY = 'lpc:name';
const AVATAR_KEY = 'lpc:avatar';

export function loadDisplayName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function saveDisplayName(raw: string): string {
  const name = normalizeDisplayName(raw);
  if (name) localStorage.setItem(NAME_KEY, name);
  else localStorage.removeItem(NAME_KEY);
  notifyPrefsChanged();
  return name;
}

export function loadAvatarEmoji(): string {
  return normalizeAvatarEmoji(localStorage.getItem(AVATAR_KEY) ?? '');
}

export function saveAvatarEmoji(raw: string): string {
  const emoji = normalizeAvatarEmoji(raw);
  if (emoji) localStorage.setItem(AVATAR_KEY, emoji);
  else localStorage.removeItem(AVATAR_KEY);
  notifyPrefsChanged();
  return emoji;
}
