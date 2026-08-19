import { describe, expect, it } from 'vitest';
import { parsePlaygroundPath, playgroundPath, playgroundTypeFromPath } from './playground-route-pure';

describe('playground route', () => {
  it('round-trips a catalog game', () => {
    expect(playgroundPath('egyptian_ratscrew')).toBe('/playground/egyptian_ratscrew');
    expect(parsePlaygroundPath('/playground/egyptian_ratscrew')).toBe('egyptian_ratscrew');
    expect(parsePlaygroundPath('/playground/egyptian_ratscrew/')).toBe('egyptian_ratscrew');
  });

  it('rejects bare and unknown paths', () => {
    expect(parsePlaygroundPath('/playground')).toBeNull();
    expect(parsePlaygroundPath('/playground/not_a_game')).toBeNull();
    expect(playgroundTypeFromPath('/playground')).toBe('war');
  });
});
