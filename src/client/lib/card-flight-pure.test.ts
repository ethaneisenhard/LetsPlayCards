import { describe, expect, it } from 'vitest';
import {
  COLLECT_STAGGER_MS,
  DEAL_STAGGER_MS,
  POT_ANCHOR,
  STOCK_ANCHOR,
  boardFlights,
  collectDestAnchor,
  collectFlights,
  collectSurfaceReady,
  dealAnchorIds,
  dealFlights,
  dealSurfaceReady,
  flightDelta,
  holdLaneCards,
  inferCollectFallback,
  inferCollectWinner,
  laneFlights,
  leavingBoardCards,
  originAnchor,
  laneAnchor,
  pickFlightBox,
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
    expect(flights.map((f) => f.delayMs)).toEqual([0, COLLECT_STAGGER_MS]);
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
        delayMs: 0,
      },
    ]);
  });
});

describe('collectFlights', () => {
  const seats = [
    { id: 'you', seat: 0 },
    { id: 'bill', seat: 1 },
  ];

  it('is a no-op when the board stays empty', () => {
    expect(leavingBoardCards({}, {}, [], [])).toEqual([]);
    expect(collectFlights([], originAnchor('you'))).toEqual([]);
    expect(
      boardFlights({
        prevLanes: {},
        nextLanes: {},
        prevCenter: [],
        nextCenter: [],
        winnerId: 'you',
      }),
    ).toEqual([]);
  });

  it('flies pot cards to the winner pile', () => {
    const flights = boardFlights({
      prevLanes: {},
      nextLanes: {},
      prevCenter: [ace, king],
      nextCenter: [],
      winnerId: 'you',
    });
    expect(flights).toEqual([
      {
        key: 'collect:AS',
        card: ace,
        fromAnchor: POT_ANCHOR,
        toAnchor: originAnchor('you'),
        kind: 'collect',
        delayMs: 0,
      },
      {
        key: 'collect:KH',
        card: king,
        fromAnchor: POT_ANCHOR,
        toAnchor: originAnchor('you'),
        kind: 'collect',
        delayMs: COLLECT_STAGGER_MS,
      },
    ]);
  });

  it('skips collect when nothing left the pot', () => {
    expect(
      boardFlights({
        prevLanes: {},
        nextLanes: {},
        prevCenter: [ace],
        nextCenter: [ace],
        winnerId: 'you',
      }),
    ).toEqual([]);
  });

  it('falls back to the pot when nobody won', () => {
    expect(collectDestAnchor(null)).toBe(POT_ANCHOR);
    expect(collectDestAnchor(null, 'stock')).toBe(STOCK_ANCHOR);
    const flights = boardFlights({
      prevLanes: { you: [ace] },
      nextLanes: { you: [] },
      winnerId: null,
    });
    expect(flights[0]?.toAnchor).toBe(POT_ANCHOR);
  });

  it('falls back to the leftover pile when the deck grew', () => {
    const prev = { handCounts: { you: 6, bill: 6 }, deckCount: 0 };
    const next = { handCounts: { you: 6, bill: 6 }, deckCount: 4 };
    expect(inferCollectFallback(prev, next)).toBe('stock');
    expect(inferCollectWinner(seats, prev, next)).toBeNull();
    const flights = boardFlights({
      prevLanes: {},
      nextLanes: {},
      prevCenter: [ace],
      nextCenter: [],
      winnerId: inferCollectWinner(seats, prev, next),
      fallback: inferCollectFallback(prev, next),
    });
    expect(flights[0]?.toAnchor).toBe(STOCK_ANCHOR);
  });

  it('skips flights when the player asked for less motion', () => {
    expect(
      collectFlights([{ card: ace, fromAnchor: POT_ANCHOR }], originAnchor('you'), {
        reducedMotion: true,
      }),
    ).toEqual([]);
  });

  it('is collect-ready only when every from and to box is on the felt', () => {
    const leaving = [{ card: ace, fromAnchor: POT_ANCHOR }];
    expect(collectSurfaceReady([POT_ANCHOR], leaving, originAnchor('you'))).toBe(false);
    expect(collectSurfaceReady([POT_ANCHOR, originAnchor('you')], leaving, originAnchor('you'))).toBe(
      true,
    );
  });
});

describe('inferCollectWinner', () => {
  const seats = [
    { id: 'you', seat: 0 },
    { id: 'bill', seat: 1 },
  ];

  it('reads the seat that just won the pile', () => {
    expect(
      inferCollectWinner(
        seats,
        { handCounts: { you: 10, bill: 12 } },
        { handCounts: { you: 10, bill: 12 }, lastWinnerSeat: 0 },
      ),
    ).toBe('you');
  });

  it('picks the seat whose pile grew', () => {
    expect(
      inferCollectWinner(
        seats,
        { handCounts: { you: 8, bill: 9 } },
        { handCounts: { you: 8, bill: 14 } },
      ),
    ).toBe('bill');
  });

  it('keeps painted lane cards while they fly home', () => {
    expect(
      holdLaneCards(
        [
          { playerId: 'you', cards: [] },
          { playerId: 'bill', cards: [] },
        ],
        { you: [ace], bill: [king] },
      ),
    ).toEqual([
      { playerId: 'you', cards: [ace] },
      { playerId: 'bill', cards: [king] },
    ]);
  });

  it('picks the seat that took the trick', () => {
    expect(
      inferCollectWinner(
        seats,
        { handCounts: { you: 10, bill: 10 }, tricksWon: { you: 1, bill: 2 } },
        { handCounts: { you: 10, bill: 10 }, tricksWon: { you: 2, bill: 2 } },
      ),
    ).toBe('you');
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

  it('skips tableau, empty seats, and reduced motion', () => {
    expect(shouldAnimateDeal({ showTableau: true, seatCounts: [7, 7] })).toBe(false);
    expect(shouldAnimateDeal({ seatCounts: [0, 0] })).toBe(false);
    expect(shouldAnimateDeal({ reducedMotion: true, seatCounts: [7, 7] })).toBe(false);
    expect(shouldAnimateDeal({ seatCounts: [7, 7] })).toBe(true);
    expect(dealFlights([{ playerId: 'me', count: 0 }])).toEqual([]);
  });

  it('is deal-ready only when stock and every seat share one surface', () => {
    expect(dealAnchorIds(['me', 'bill'])).toEqual([
      STOCK_ANCHOR,
      originAnchor('me'),
      originAnchor('bill'),
    ]);
    expect(dealSurfaceReady([STOCK_ANCHOR, originAnchor('me')], ['me', 'bill'])).toBe(false);
    expect(
      dealSurfaceReady([STOCK_ANCHOR, originAnchor('me'), originAnchor('bill')], ['me', 'bill']),
    ).toBe(true);
  });
});

describe('pickFlightBox', () => {
  it('prefers a painted box over an opacity-0 leftover', () => {
    expect(
      pickFlightBox([
        { w: 48, h: 68, opacity: 0 },
        { w: 48, h: 68, opacity: 1 },
      ]),
    ).toEqual({ w: 48, h: 68, opacity: 1 });
    expect(pickFlightBox([{ w: 48, h: 68, display: 'none' }, { w: 4, h: 4 }])).toBeNull();
  });
});

describe('flightDelta', () => {
  it('moves down from self pile to lane', () => {
    const d = flightDelta({ x: 0, y: 400, w: 70, h: 100 }, { x: 0, y: 200, w: 70, h: 100 });
    expect(d.dy).toBe(-200);
    expect(d.scaleX).toBe(1);
  });
});
