import { describe, expect, it } from 'vitest';
import {
  ANYONE_TARGET_ID,
  askButtonLabel,
  askTurnHint,
  drawButtonLabel,
  drawFromAction,
  drawTurnHint,
  goFishAskAction,
  isAnyoneChoice,
  legalAskTargets,
  ranksHeld,
  resolveAskTargetId,
  seatActionLabel,
} from './ask-action-pure';

const alice = { id: 'fake-1', name: 'Alice', handCount: 6 };
const bob = { id: 'fake-2', name: 'Bob', handCount: 0 };
const carol = { id: 'fake-3', name: 'Carol', handCount: 3 };

describe('ranksHeld', () => {
  it('lists unique ranks in deck order', () => {
    expect(
      ranksHeld([
        { rank: 'K' },
        { rank: '7' },
        { rank: 'K' },
        { rank: 'A' },
      ]),
    ).toEqual(['A', '7', 'K']);
  });

  it('is empty when the hand is empty', () => {
    expect(ranksHeld([])).toEqual([]);
  });
});

describe('resolveAskTargetId', () => {
  it('skips empty hands and maps anyone to the next seat with cards', () => {
    expect(legalAskTargets([alice, bob, carol])).toEqual([alice, carol]);
    expect(resolveAskTargetId(ANYONE_TARGET_ID, [alice, bob, carol])).toBe('fake-1');
    expect(resolveAskTargetId(null, [bob, carol])).toBe('fake-3');
    expect(resolveAskTargetId('fake-3', [alice, bob, carol])).toBe('fake-3');
    expect(resolveAskTargetId('fake-2', [alice, bob, carol])).toBeNull();
    expect(resolveAskTargetId(ANYONE_TARGET_ID, [bob])).toBeNull();
  });

  it('treats a missing choice as anyone', () => {
    expect(isAnyoneChoice(null)).toBe(true);
    expect(isAnyoneChoice(ANYONE_TARGET_ID)).toBe(true);
    expect(isAnyoneChoice('fake-1')).toBe(false);
  });
});

describe('ask copy', () => {
  it('names the rank and who', () => {
    expect(askButtonLabel(null, 'Alice', true)).toBe('Ask');
    expect(askButtonLabel('7', 'Alice', true)).toBe('Ask anyone for 7s');
    expect(askButtonLabel('7', 'Alice', false)).toBe('Ask Alice for 7s');
    expect(askTurnHint(null)).toBe('● Your turn · ask for a number or face you already have');
    expect(askTurnHint('Q')).toBe('● Your turn · ask for Qs');
  });

  it('builds the engine intent without a new kind', () => {
    expect(goFishAskAction('7', 'fake-1')).toEqual({
      intent: 'gofish-ask',
      rank: '7',
      targetId: 'fake-1',
    });
  });
});

describe('draw-from copy', () => {
  it('makes the draw target obvious', () => {
    expect(drawButtonLabel(null)).toBe('Pick who to draw from');
    expect(drawButtonLabel('Alice')).toBe('Draw from Alice');
    expect(drawTurnHint()).toBe('● Your turn · draw a card from another player');
    expect(drawFromAction('fake-1')).toEqual({ intent: 'draw-from', targetId: 'fake-1' });
  });

  it('explains disabled seats instead of going silent', () => {
    expect(
      seatActionLabel({ askRank: true, drawFrom: false, rank: null, name: 'Alice', handCount: 4 }),
    ).toBe('Ask Alice — pick a number or face first');
    expect(
      seatActionLabel({ askRank: true, drawFrom: false, rank: '7', name: 'Alice', handCount: 4 }),
    ).toBe('Ask Alice for 7s');
    expect(
      seatActionLabel({ askRank: true, drawFrom: false, rank: '7', name: 'Bob', handCount: 0 }),
    ).toBe('Bob has no cards');
    expect(
      seatActionLabel({ askRank: false, drawFrom: true, rank: null, name: 'Alice', handCount: 4 }),
    ).toBe('Draw from Alice');
  });
});
