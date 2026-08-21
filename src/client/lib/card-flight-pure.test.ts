import { describe, expect, it } from 'vitest';
import {
  DEAL_STAGGER_MS,
  STOCK_ANCHOR,
  dealFlights,
  flightDelta,
  laneFlights,
  originAnchor,
  laneAnchor,
  shouldAnimateDeal,
} from './card-flight-pure';

const ace = { id: 'AS', suit: 'spades' as const, rank: 'A' as const };
const king = { id: 'KH', suit: 'hearts' as const, rank: 'K' as const };

describe('laneFlights', () => {
  it('plays from pile to lane', () => {
    const flights = laneFlights({}, { 'fake-0': [ace] }, null);
    expect(flights).toEqual([
      {
        key: 'play:AS',
        card: ace,
        fromAnchor: originAnchor('fake-0'),
        toAnchor: laneAnchor('fake-0'),
        kind: 'play',
      },
    ]);
  });

  it('collects every lane card to the winner pile', () => {
    const flights = laneFlights(
      { 'fake-0': [ace], 'fake-1': [king] },
      { 'fake-0': [], 'fake-1': [] },
      'fake-0',
    );
    expect(flights.map((f) => f.kind)).toEqual(['collect', 'collect']);
    expect(flights.every((f) => f.toAnchor === originAnchor('fake-0'))).toBe(true);
  });

  it('sends a cleared lane to the pot when nobody won yet', () => {
    const flights = laneFlights({ 'fake-0': [ace] }, {}, null);
    expect(flights).toEqual([
      {
        key: 'collect:AS',
        card: ace,
        fromAnchor: laneAnchor('fake-0'),
        toAnchor: 'pot',
        kind: 'collect',
      },
    ]);
  });
});

describe('dealFlights', () => {
  it('deals round-robin from the pile to each seat', () => {
    const you = { id: 'AH', suit: 'hearts' as const, rank: 'A' as const };
    const flights = dealFlights([
      { playerId: 'me', count: 2, cards: [you, king] },
      { playerId: 'bill', count: 2 },
    ]);
    expect(flights).toHaveLength(4);
    expect(flights.map((f) => f.toAnchor)).toEqual([
      originAnchor('me'),
      originAnchor('bill'),
      originAnchor('me'),
      originAnchor('bill'),
    ]);
    expect(flights[0]).toMatchObject({
      kind: 'deal',
      fromAnchor: STOCK_ANCHOR,
      faceDown: false,
      card: you,
      delayMs: 0,
    });
    expect(flights[1].faceDown).toBe(true);
    expect(flights[3].delayMs).toBe(3 * DEAL_STAGGER_MS);
  });

  it('skips tableau and empty seats', () => {
    expect(shouldAnimateDeal({ showTableau: true, seatCounts: [7, 7] })).toBe(false);
    expect(shouldAnimateDeal({ seatCounts: [0, 0] })).toBe(false);
    expect(shouldAnimateDeal({ seatCounts: [7, 7] })).toBe(true);
    expect(dealFlights([{ playerId: 'me', count: 0 }])).toEqual([]);
  });
});

describe('flightDelta', () => {
  it('moves down from self pile to lane', () => {
    const d = flightDelta({ x: 0, y: 400, w: 70, h: 100 }, { x: 0, y: 200, w: 70, h: 100 });
    expect(d.dy).toBe(-200);
    expect(d.scaleX).toBe(1);
  });
});
