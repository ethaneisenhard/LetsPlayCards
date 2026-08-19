import { describe, expect, it } from 'vitest';
import { moveCardInHand, sortHandByRank, sortHandBySuit, syncHandOrder } from './hand-order-pure';
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

  it('nudges a card left or right', () => {
    expect(moveCardInHand(hand, '1', 1).map((x) => x.id)).toEqual(['2', '1', '3']);
    expect(moveCardInHand(hand, '1', -1).map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('keeps order when cards leave or arrive', () => {
    const ordered = [c('2', '2', 'spades'), c('1', 'K', 'hearts')];
    const incoming = [c('1', 'K', 'hearts'), c('4', '5', 'diamonds')];
    expect(syncHandOrder(ordered, incoming).map((x) => x.id)).toEqual(['1', '4']);
  });
});
