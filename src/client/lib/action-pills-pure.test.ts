import { describe, expect, it } from 'vitest';
import { actionPillLabels, resolveActionBar } from './action-pills-pure';

const bill = { id: 'bill', name: 'Bill' };

describe('resolveActionBar', () => {
  it('stays closed until a card is picked for Ask', () => {
    expect(
      resolveActionBar({
        isMyTurn: true,
        askRank: true,
        includeAnyone: true,
        targets: [bill],
        canDraw: true,
      }),
    ).toEqual({ open: false, reason: 'hidden', pills: [] });
  });

  it('opens Anyone / who / Ask after picking a 7', () => {
    const bar = resolveActionBar({
      isMyTurn: true,
      askRank: true,
      selectedRank: '7',
      selectedCardId: '7h',
      includeAnyone: true,
      anyoneId: 'anyone',
      selectedTargetId: 'anyone',
      targets: [bill],
    });
    expect(bar.open).toBe(true);
    expect(bar.reason).toBe('card');
    expect(actionPillLabels(bar)).toEqual(['Anyone', 'Bill', 'Ask for 7s']);
    expect(bar.pills[0].pressed).toBe(true);
    expect(bar.pills[2].kind).toBe('primary');
  });

  it('opens Play and Put aside after picking a playable card', () => {
    const bar = resolveActionBar({
      isMyTurn: true,
      selectedCardId: '8s',
      allowPlay: true,
      allowDiscard: true,
      canPlaySelected: true,
      canDiscardSelected: true,
    });
    expect(actionPillLabels(bar)).toEqual(['Play', 'Put aside']);
  });

  it('shows Hit / Stay on your turn with no card pick', () => {
    const bar = resolveActionBar({
      isMyTurn: true,
      turnButtons: [
        { id: 'hit', label: 'Take a card' },
        { id: 'stand', label: 'Stay' },
      ],
    });
    expect(bar.reason).toBe('turn');
    expect(actionPillLabels(bar)).toEqual(['Take a card', 'Stay']);
  });

  it('waits for a playable card instead of leaving Draw up', () => {
    expect(
      resolveActionBar({
        isMyTurn: true,
        allowPlay: true,
        canDraw: true,
      }).open,
    ).toBe(false);
    expect(
      actionPillLabels(resolveActionBar({ isMyTurn: true, canDraw: true })),
    ).toEqual(['Take a card']);
  });

  it('shows Stop here on a discard turn, then Put aside after a pick', () => {
    const waiting = resolveActionBar({
      isMyTurn: true,
      allowDiscard: true,
      turnButtons: [{ id: 'knock', label: 'Stop here' }],
    });
    expect(waiting.reason).toBe('turn');
    expect(actionPillLabels(waiting)).toEqual(['Stop here']);
    expect(
      actionPillLabels(
        resolveActionBar({
          isMyTurn: true,
          selectedCardId: '3c',
          allowDiscard: true,
          canDiscardSelected: true,
          turnButtons: [{ id: 'knock', label: 'Stop here' }],
        }),
      ),
    ).toEqual(['Put aside', 'Stop here']);
  });

  it('hides when it is not your turn or someone else is playing', () => {
    expect(
      resolveActionBar({
        isMyTurn: false,
        turnButtons: [{ id: 'hit', label: 'Take a card' }],
      }).open,
    ).toBe(false);
    expect(
      resolveActionBar({
        isMyTurn: true,
        busy: true,
        selectedRank: '7',
        askRank: true,
        includeAnyone: true,
        targets: [bill],
      }).open,
    ).toBe(false);
  });
});
