import { parseAppearanceId } from './appearance-pure';
import { APPEARANCE_IDS } from './appearance-registry-pure';
import { notifyPrefsChanged } from './prefs-events';

const STORAGE_KEY = 'lpc:appearance';

export function loadAppearanceId(): string {
  return parseAppearanceId(localStorage.getItem(STORAGE_KEY), APPEARANCE_IDS);
}

export function applyAppearance(id: string): void {
  const resolved = parseAppearanceId(id, APPEARANCE_IDS);
  document.documentElement.dataset.appearance = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#f4efe6' : '#0a0f1a');
}

export function saveAppearance(id: string): string {
  const resolved = parseAppearanceId(id, APPEARANCE_IDS);
  localStorage.setItem(STORAGE_KEY, resolved);
  applyAppearance(resolved);
  notifyPrefsChanged();
  return resolved;
}

export function bootAppearance(): void {
  applyAppearance(loadAppearanceId());
}
