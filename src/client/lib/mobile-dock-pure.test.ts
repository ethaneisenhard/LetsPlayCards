import { describe, expect, it } from 'vitest';
import { mobileTurnLine, resolveMobileDock } from './mobile-dock-pure';

describe('resolveMobileDock', () => {
  it('puts Ask, Draw, and turn buttons under the hand', () => {
    expect(resolveMobileDock({ askRankIntent: 'gofish-ask' })).toEqual({
      ask: true,
      draw: false,
      turnButtons: false,
      underHand: true,
      quietHandHints: true,
      hideSeatActionHint: true,
    });
    expect(resolveMobileDock({ drawFromIntent: 'draw-from' })).toMatchObject({
      draw: true,
      underHand: true,
      hideSeatActionHint: true,
    });
    expect(resolveMobileDock({ turnButtonCount: 2 })).toMatchObject({
      turnButtons: true,
      underHand: true,
      quietHandHints: true,
      hideSeatActionHint: false,
    });
  });

  it('leaves a play-only table without a dock', () => {
    expect(resolveMobileDock({})).toEqual({
      ask: false,
      draw: false,
      turnButtons: false,
      underHand: false,
      quietHandHints: false,
      hideSeatActionHint: false,
    });
  });
});

describe('mobileTurnLine', () => {
  it('does not repeat the Ask tutorial in the banner', () => {
    expect(mobileTurnLine({ busy: false, isMyTurn: true })).toBe('● Your turn');
    expect(mobileTurnLine({ busy: true, busyHint: 'Alice is playing…', isMyTurn: false })).toBe(
      'Alice is playing…',
    );
    expect(mobileTurnLine({ busy: false, isMyTurn: false, waitingName: 'Alice' })).toBe(
      'Waiting for Alice…',
    );
  });
});
