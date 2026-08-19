import { describe, expect, it } from 'vitest';
import { isLocalHost } from './host-pure';

describe('isLocalHost', () => {
  it('accepts loopback hosts', () => {
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('127.0.0.1')).toBe(true);
    expect(isLocalHost('[::1]')).toBe(true);
    expect(isLocalHost('app.localhost')).toBe(true);
  });

  it('rejects production hosts', () => {
    expect(isLocalHost('letsplaycards.co')).toBe(false);
    expect(isLocalHost('letsplaycards.workers.dev')).toBe(false);
  });
});
