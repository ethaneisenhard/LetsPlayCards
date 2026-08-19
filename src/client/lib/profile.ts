import { notifyPrefsChanged } from './prefs-events';
import { normalizeDisplayName } from './profile-pure';

const NAME_KEY = 'lpc:name';

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
