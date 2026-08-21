import { describe, expect, it } from 'vitest';
import {
  PHONE_DOCK_MAX_PCT,
  PHONE_FELT_MIN_PCT,
  feltSurvivesDock,
  mobileTurnLine,
  resolveMobileDock,
  resolvePhoneTableLayout,
} from './mobile-dock-pure';

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

describe('resolvePhoneTableLayout', () => {
  it('caps the dock so the felt keeps a usable share', () => {
    const layout = resolvePhoneTableLayout();
    expect(layout.feltMinPct).toBe(PHONE_FELT_MIN_PCT);
    expect(layout.dockMaxPct).toBe(PHONE_DOCK_MAX_PCT);
    expect(layout.feltMinPct).toBe(28);
    expect(layout.dockMaxPct).toBe(42);
    expect(layout.feltClass).toContain('flex-1');
    expect(layout.feltClass).toContain('min-h-[28%]');
    expect(layout.dockClass).toContain('max-h-[42%]');
    expect(layout.dockClass).toContain('safe-area-inset-bottom');
    expect(layout.askDockClass).toMatch(/gap-1/);
  });

  it('leaves felt on a 390-wide Go Fish column after the cap', () => {
    const columnPx = 700;
    const compactOpponent = 72;
    const typicalAskDock = 300;
    expect(
      feltSurvivesDock({
        columnPx,
        opponentPx: compactOpponent,
        uncappedDockPx: typicalAskDock,
      }),
    ).toBe(true);
    expect(
      feltSurvivesDock({
        columnPx,
        opponentPx: 110,
        uncappedDockPx: 410,
        dockMaxPct: 58,
      }),
    ).toBe(false);
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
