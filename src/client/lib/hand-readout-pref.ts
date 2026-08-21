import { parseShowHandReadout, showHandReadoutStorageValue } from './hand-readout-pref-pure';
import { notifyPrefsChanged } from './prefs-events';

const KEY = 'lpc:show-hand-readout';

export function loadShowHandReadout(): boolean {
  try {
    return parseShowHandReadout(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}

export function saveShowHandReadout(on: boolean): boolean {
  localStorage.setItem(KEY, showHandReadoutStorageValue(on));
  notifyPrefsChanged();
  return on;
}
