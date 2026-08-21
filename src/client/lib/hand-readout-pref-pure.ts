/** Visible written list of your cards. Missing or junk → hidden. */

export function parseShowHandReadout(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (typeof raw !== 'string') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true';
}

export function showHandReadoutStorageValue(on: boolean): string {
  return on ? '1' : '0';
}
