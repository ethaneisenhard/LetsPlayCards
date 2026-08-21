import { describe, expect, it } from 'vitest';
import {
  dropIndexFromOffset,
  groupHandByPairs,
  moveCardInHand,
  moveCardToIndex,
  sortHandByRank,
  sortHandBySuit,
  syncHandOrder,
} from './hand-order-pure';
import type { Card } from '../../game/types';

const c = (id: string, rank: Card['rank'], suit: Card['suit']): Card => ({ id, rank, suit });

describe('hand order', () => {
  const hand = [c('1', 'K', 'hearts'), c('2', '2', 'spades'), c('3', 'A', 'clubs')];

  it('sorts by rank then suit', () => {
    expect(sortHandByRank(hand).map((x) => x.id)).toEqual(['2', '1', '3']);
  });

  it('sorts by suit then rank', () => {
    expect(sortHandBySuit(hand).map((x) => x.id)).toEqual(['3', '1', '2']);
  });

  it('groups the same number or face together without sorting low-to-high', () => {
    const mixed = [
      c('k1', 'K', 'hearts'),
      c('2a', '2', 'spades'),
      c('7', '7', 'diamonds'),
      c('2b', '2', 'hearts'),
      c('k2', 'K', 'clubs'),
    ];
    expect(groupHandByPairs(mixed).map((x) => x.id)).toEqual(['k1', 'k2', '2a', '2b', '7']);
    expect(sortHandByRank(mixed).map((x) => x.id)).toEqual(['2b', '2a', '7', 'k2', 'k1']);
  });

  it('nudges a card left or right', () => {
    expect(moveCardInHand(hand, '1', 1).map((x) => x.id)).toEqual(['2', '1', '3']);
    expect(moveCardInHand(hand, '1', -1).map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('moves a card to an index (drag drop)', () => {
    expect(moveCardToIndex(hand, '3', 0).map((x) => x.id)).toEqual(['3', '1', '2']);
    expect(moveCardToIndex(hand, '1', 2).map((x) => x.id)).toEqual(['2', '3', '1']);
    expect(moveCardToIndex(hand, 'missing', 0).map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('maps a pointer offset to a fan slot', () => {
    expect(dropIndexFromOffset(0, 4, 20, 64)).toBe(0);
    expect(dropIndexFromOffset(40, 4, 20, 64)).toBe(2);
    expect(dropIndexFromOffset(200, 4, 20, 64)).toBe(3);
    expect(dropIndexFromOffset(10, 1, 20, 64)).toBe(0);
  });

  it('keeps order when cards leave or arrive', () => {
    const ordered = [c('2', '2', 'spades'), c('1', 'K', 'hearts')];
    const incoming = [c('1', 'K', 'hearts'), c('4', '5', 'diamonds')];
    expect(syncHandOrder(ordered, incoming).map((x) => x.id)).toEqual(['1', '4']);
  });
});
