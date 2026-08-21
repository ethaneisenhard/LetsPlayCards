import { describe, expect, it } from 'vitest';
import { shouldAutoWarCollect, WAR_REVEAL_HOLD_MS } from './war-reveal-pure';

describe('shouldAutoWarCollect', () => {
  it('fires for the multiplayer winner during reveal', () => {
    expect(
      shouldAutoWarCollect({
        phase: 'reveal',
        roundWinnerId: 'p1',
        playerId: 'p1',
        hasLocalSettle: false,
      }),
    ).toBe(true);
  });

  it('skips the loser, other phases, and local bot settle', () => {
    expect(
      shouldAutoWarCollect({
        phase: 'reveal',
        roundWinnerId: 'p1',
        playerId: 'p2',
        hasLocalSettle: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoWarCollect({
        phase: 'battle',
        roundWinnerId: 'p1',
        playerId: 'p1',
        hasLocalSettle: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoWarCollect({
        phase: 'reveal',
        roundWinnerId: 'p1',
        playerId: 'p1',
        hasLocalSettle: true,
      }),
    ).toBe(false);
  });

  it('holds long enough for a read + shake before collect', () => {
    expect(WAR_REVEAL_HOLD_MS).toBeGreaterThanOrEqual(1000);
  });
});
