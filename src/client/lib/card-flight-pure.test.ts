import { describe, expect, it } from 'vitest';
import { flightDelta, laneFlights, originAnchor, laneAnchor } from './card-flight-pure';

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

describe('flightDelta', () => {
  it('moves down from self pile to lane', () => {
    const d = flightDelta({ x: 0, y: 400, w: 70, h: 100 }, { x: 0, y: 200, w: 70, h: 100 });
    expect(d.dy).toBe(-200);
    expect(d.scaleX).toBe(1);
  });
});
