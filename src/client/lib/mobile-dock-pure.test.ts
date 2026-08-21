import { describe, expect, it } from 'vitest';
import { mobileTurnLine, resolveMobileDock, resolvePhoneTableLayout } from './mobile-dock-pure';

describe('resolveMobileDock', () => {
  it('keeps Ask, Draw, and turn pills with the hand', () => {
    expect(resolveMobileDock({ askRankIntent: 'gofish-ask' })).toEqual({
      ask: true,
      draw: false,
      turnButtons: false,
      nearHand: true,
      quietHandHints: true,
      hideSeatActionHint: true,
    });
    expect(resolveMobileDock({ drawFromIntent: 'draw-from' })).toMatchObject({
      draw: true,
      nearHand: true,
      hideSeatActionHint: true,
    });
    expect(resolveMobileDock({ turnButtonCount: 2 })).toMatchObject({
      turnButtons: true,
      nearHand: true,
      quietHandHints: true,
      hideSeatActionHint: false,
    });
  });

  it('leaves a play-only table without extra chrome', () => {
    expect(resolveMobileDock({})).toEqual({
      ask: false,
      draw: false,
      turnButtons: false,
      nearHand: false,
      quietHandHints: false,
      hideSeatActionHint: false,
    });
  });
});

describe('resolvePhoneTableLayout', () => {
  it('is one felt column with pills above the fan and no inner scroll', () => {
    const layout = resolvePhoneTableLayout();
    expect(layout.pillSlot).toBe('above-fan');
    expect(layout.surfaceClass).toContain('overflow-hidden');
    expect(layout.surfaceClass).not.toContain('overflow-y-auto');
    expect(layout.centerClass).toContain('flex-1');
    expect(layout.centerClass).not.toContain('overflow-y-auto');
    expect(layout.handClass).toContain('shrink-0');
    expect(layout.handClass).not.toContain('overflow-y-auto');
    expect(layout.handClass).not.toContain('max-h-');
    expect(layout.opponentRowClass).not.toContain('border-b');
    expect(layout.surfaceClass).toContain('gap-2');
    expect(layout.centerClass).toContain('gap-3');
    expect(layout.centerClass).not.toMatch(/gap-1(?:\s|$)/);
    expect(layout.handClass).toContain('px-2');
  });
});

describe('mobileTurnLine', () => {
  it('puts the next legal move on the banner', () => {
    expect(mobileTurnLine({ busy: false, isMyTurn: true, askRank: true })).toBe(
      'Your turn — pick a number you already have, then ask',
    );
    expect(mobileTurnLine({ busy: true, busyHint: 'Alice is playing…', isMyTurn: false })).toBe(
      'Alice is playing…',
    );
    expect(mobileTurnLine({ busy: false, isMyTurn: false, waitingName: 'Alice' })).toBe(
      'Alice is taking a turn',
    );
  });
});
