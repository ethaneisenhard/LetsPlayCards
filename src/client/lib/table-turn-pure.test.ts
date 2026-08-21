import { describe, expect, it } from 'vitest';
import {
  askInstruction,
  disabledActionReason,
  resolveTurnStrip,
  seatAriaLabel,
  waitingLine,
  youSeatLine,
  yourMoveLine,
} from './table-turn-pure';

describe('resolveTurnStrip', () => {
  it('uses one line for whose turn and the next legal move', () => {
    expect(
      resolveTurnStrip({
        isMyTurn: true,
        askRank: true,
        pickedRank: null,
      }),
    ).toEqual({
      line: 'Your turn — pick a number you already have, then ask',
      tone: 'you',
    });
    expect(resolveTurnStrip({ isMyTurn: false, actorName: 'Alice' })).toEqual({
      line: 'Alice is taking a turn',
      tone: 'them',
    });
  });

  it('covers deal, busy, and win without extra hints', () => {
    expect(resolveTurnStrip({ dealing: true }).tone).toBe('deal');
    expect(resolveTurnStrip({ busy: true, busyHint: 'Bill is playing…' }).line).toBe(
      'Bill is playing…',
    );
    expect(resolveTurnStrip({ wonLine: 'You won — cards coming home…' }).tone).toBe('won');
  });
});

describe('yourMoveLine', () => {
  it('matches Ask, leftover-or-pile, and play', () => {
    expect(askInstruction(null)).toBe('Your turn — pick a number you already have, then ask');
    expect(askInstruction('7')).toBe('Your turn — ask someone for 7s');
    expect(
      yourMoveLine({ canDraw: true, canDrawDiscard: true }),
    ).toBe('Your turn — take a card from the leftover pile or the face-down pile');
    expect(yourMoveLine({ canPlay: true, canDraw: true })).toBe(
      'Your turn — take a card from the pile, or play a card',
    );
    expect(yourMoveLine({ canDiscard: true, legalButtonLabels: ['Stop here'] })).toBe(
      'Your turn — put one card aside, or stop here',
    );
  });
});

describe('disabledActionReason', () => {
  it('explains Stop here without club talk', () => {
    expect(
      disabledActionReason({ intent: 'knock', isMyTurn: true, busy: false, legal: false }),
    ).toMatch(/leftover cards you could not group/);
    expect(
      disabledActionReason({ intent: 'knock', isMyTurn: true, busy: false, legal: true }),
    ).toBeNull();
  });
});

describe('seat labels', () => {
  it('does not rely on color to name whose turn', () => {
    expect(seatAriaLabel({ name: 'Bill', you: false, isTurn: true, cardCount: 10 })).toBe(
      'Bill, taking a turn, 10 cards',
    );
    expect(seatAriaLabel({ name: 'Alex', you: true, isTurn: true, cardCount: 7 })).toBe(
      'You, Alex, your turn, 7 cards',
    );
    expect(youSeatLine('Alex', true)).toBe('You · Alex · your turn');
    expect(waitingLine()).toBe('Waiting for the next player');
  });
});
