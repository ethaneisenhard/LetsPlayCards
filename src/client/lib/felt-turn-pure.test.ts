import { describe, expect, it } from 'vitest';
import { resolveActorId, resolveIsMyTurn } from './felt-turn-pure';

describe('resolveActorId', () => {
  it('prefers current, then currentPlayerId', () => {
    expect(resolveActorId({ current: 'a', currentPlayerId: 'b' })).toBe('a');
    expect(resolveActorId({ currentPlayerId: 'b' })).toBe('b');
    expect(resolveActorId({})).toBeNull();
  });
});

describe('resolveIsMyTurn', () => {
  const seat = { actorId: null as string | null, playerId: 'me', currentSeat: 0, playerSeat: 0 };

  it('uses seat, betting, undrawn, always', () => {
    expect(resolveIsMyTurn({ ...seat, actWhen: 'seat' })).toBe(true);
    expect(resolveIsMyTurn({ ...seat, playerSeat: 1, actWhen: 'seat' })).toBe(false);
    expect(resolveIsMyTurn({ ...seat, actWhen: 'betting', phase: 'betting', hasBet: false })).toBe(true);
    expect(resolveIsMyTurn({ ...seat, actWhen: 'betting', phase: 'betting', hasBet: true })).toBe(false);
    expect(resolveIsMyTurn({ ...seat, actWhen: 'undrawn', phase: 'draw', hasDrawn: false })).toBe(true);
    expect(resolveIsMyTurn({ ...seat, actWhen: 'always', playerSeat: 1 })).toBe(true);
  });
});
