import { describe, expect, it } from 'vitest';
import { parseShowHandReadout, showHandReadoutStorageValue } from './hand-readout-pref-pure';

describe('parseShowHandReadout', () => {
  it('hides when missing or invalid', () => {
    expect(parseShowHandReadout(null)).toBe(false);
    expect(parseShowHandReadout(undefined)).toBe(false);
    expect(parseShowHandReadout('')).toBe(false);
    expect(parseShowHandReadout('0')).toBe(false);
    expect(parseShowHandReadout('no')).toBe(false);
    expect(parseShowHandReadout(false)).toBe(false);
  });

  it('shows for 1 or true', () => {
    expect(parseShowHandReadout('1')).toBe(true);
    expect(parseShowHandReadout('true')).toBe(true);
    expect(parseShowHandReadout('TRUE')).toBe(true);
    expect(parseShowHandReadout(true)).toBe(true);
    expect(parseShowHandReadout(1)).toBe(true);
  });

  it('stores on as 1 and off as 0', () => {
    expect(showHandReadoutStorageValue(true)).toBe('1');
    expect(showHandReadoutStorageValue(false)).toBe('0');
  });
});
