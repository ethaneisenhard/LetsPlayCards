export const PREFS_CHANGED_EVENT = 'lpc:prefs-changed';

export function notifyPrefsChanged(): void {
  window.dispatchEvent(new Event(PREFS_CHANGED_EVENT));
}
