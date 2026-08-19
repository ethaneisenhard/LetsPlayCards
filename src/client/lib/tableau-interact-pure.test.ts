import { describe, expect, it } from 'vitest';
import {
  autoFoundationKey,
  cardInSelection,
  dragPastThreshold,
  legalTableauDropKeys,
  resolveDropPileKey,
  resolveTableauClick,
  selectionFromCard,
} from './tableau-interact-pure';
import type { TableauBoardView, TableauPile } from './tableau-board-pure';
import type { Card } from '../../game/types';

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({
  id: `${rank}${suit[0]}`,
  rank,
  suit,
});

function col(index: number, cards: Card[], buried = 0): TableauPile {
  return { key: `column-${index}`, kind: 'column', index, cards, buried };
}

function foundation(index: number, cards: Card[]): TableauPile {
  return { key: `foundation-${index}`, kind: 'foundation', index, cards, buried: 0 };
}

function board(partial: Partial<TableauBoardView>): TableauBoardView {
  return {
    stock: null,
    waste: null,
    foundations: [],
    freecells: [],
    columns: [],
    stockIntent: null,
    reveal: 'top-only',
    ...partial,
  };
}

describe('selectionFromCard', () => {
  it('selects a face-up run from the clicked card', () => {
    const pile = col(0, [c('9', 'spades'), c('8', 'hearts'), c('7', 'clubs')], 0);
    expect(selectionFromCard(pile, pile.cards[1], 1)).toEqual({
      kind: 'column',
      index: 0,
      cardId: '8h',
      count: 2,
    });
  });

  it('rejects a buried card', () => {
    const pile = col(2, [c('K', 'spades'), c('Q', 'hearts')], 1);
    expect(selectionFromCard(pile, pile.cards[0], 0)).toBeNull();
  });
});

describe('resolveTableauClick', () => {
  const seven = col(0, [c('7', 'spades')], 0);
  const six = col(1, [c('6', 'hearts')], 0);
  const legal = new Set(['column-0']);

  it('selects when nothing is selected', () => {
    expect(
      resolveTableauClick({ pile: six, card: six.cards[0], at: 0, sel: null, legalKeys: legal }),
    ).toEqual({
      type: 'select',
      sel: { kind: 'column', index: 1, cardId: '6h', count: 1 },
    });
  });

  it('moves onto a legal destination pile', () => {
    const sel = { kind: 'column' as const, index: 1, cardId: '6h', count: 1 };
    expect(resolveTableauClick({ pile: seven, card: seven.cards[0], at: 0, sel, legalKeys: legal })).toEqual({
      type: 'move',
      to: seven,
    });
  });

  it('reselects an illegal destination that is itself a source', () => {
    const other = col(2, [c('A', 'hearts')], 0);
    const sel = { kind: 'column' as const, index: 1, cardId: '6h', count: 1 };
    expect(
      resolveTableauClick({ pile: other, card: other.cards[0], at: 0, sel, legalKeys: legal }),
    ).toMatchObject({ type: 'select', sel: { cardId: 'Ah' } });
  });

  it('deselects the same card', () => {
    const sel = { kind: 'column' as const, index: 1, cardId: '6h', count: 1 };
    expect(resolveTableauClick({ pile: six, card: six.cards[0], at: 0, sel, legalKeys: legal })).toEqual({
      type: 'deselect',
    });
  });
});

describe('legalTableauDropKeys', () => {
  it('allows a red 6 onto a black 7, not onto an empty foundation', () => {
    const six = c('6', 'hearts');
    const view = board({
      columns: [col(0, [c('7', 'spades')]), col(1, [six])],
      foundations: [foundation(0, [])],
    });
    const sel = { kind: 'column' as const, index: 1, cardId: six.id, count: 1 };
    expect(legalTableauDropKeys('klondike', view, sel)).toEqual(['column-0']);
  });

  it('highlights every card in a selected run', () => {
    const pile = col(0, [c('9', 'spades'), c('8', 'hearts')], 0);
    const sel = { kind: 'column' as const, index: 0, cardId: '9s', count: 2 };
    expect(cardInSelection(pile, sel, '8h')).toBe(true);
    expect(cardInSelection(pile, sel, '9s')).toBe(true);
  });
});

describe('autoFoundationKey', () => {
  it('picks the matching foundation', () => {
    const ace = c('A', 'hearts');
    const view = board({
      columns: [col(0, [ace])],
      foundations: [foundation(0, []), foundation(1, [c('A', 'spades')])],
    });
    expect(autoFoundationKey('klondike', view, { kind: 'column', index: 0, cardId: ace.id, count: 1 })).toBe(
      'foundation-0',
    );
  });
});

describe('dragPastThreshold', () => {
  it('stays a click inside 8px and becomes a drag outside', () => {
    expect(dragPastThreshold(3, 4)).toBe(false);
    expect(dragPastThreshold(8, 0)).toBe(true);
  });
});

describe('resolveDropPileKey', () => {
  it('skips the source pile and the ghost (null hits)', () => {
    expect(resolveDropPileKey([null, 'column-0', 'column-3'], 'column-0')).toBe('column-3');
  });
});
