import { describe, expect, it } from 'vitest';
import { collectDestAnchor, collectFlights, originAnchor, POT_ANCHOR } from './card-flight-pure';
import {
  animView,
  createIdleAnimState,
  eventFromEngine,
  makeTableBoard,
  reduceAnim,
  type TableAnimState,
  type TableBoard,
} from './table-anim-machine-pure';

const ace = { id: 'AS', suit: 'spades' as const, rank: 'A' as const };
const king = { id: 'KH', suit: 'hearts' as const, rank: 'K' as const };

function board(partial: Partial<TableBoard> & { handCounts: Record<string, number> }): TableBoard {
  return makeTableBoard({ viewerId: 'you', ...partial });
}

function landAll(state: TableAnimState): TableAnimState {
  let next = state;
  for (const flight of state.flights) {
    next = reduceAnim(next, { type: 'flightStarted', key: flight.key });
    next = reduceAnim(next, { type: 'flightLanded', key: flight.key });
  }
  return next;
}

describe('table anim machine — deal', () => {
  const empty = board({ handCounts: { you: 0, bill: 0 } });
  const dealt = board({
    handCounts: { you: 2, bill: 2 },
    viewerHand: [ace, king],
    viewerId: 'you',
  });

  it('keeps every seat at 0 until each deal flight lands', () => {
    let s = createIdleAnimState(empty);
    s = reduceAnim(s, {
      type: 'engineDealt',
      board: dealt,
      dealKey: 'room-1',
      seats: [
        { playerId: 'you', count: 2, cards: [ace, king] },
        { playerId: 'bill', count: 2 },
      ],
    });
    expect(s.phase).toBe('dealing');
    expect(animView(s).handCounts).toEqual({ you: 0, bill: 0 });
    expect(animView(s).viewerHand).toEqual([]);
    expect(s.flights.length).toBe(4);

    const first = s.flights[0]!;
    s = reduceAnim(s, { type: 'flightStarted', key: first.key });
    expect(animView(s).handCounts).toEqual({ you: 0, bill: 0 });

    s = reduceAnim(s, { type: 'flightLanded', key: first.key });
    const dest = first.toAnchor === originAnchor('you') ? 'you' : 'bill';
    expect(animView(s).handCounts[dest]).toBe(1);
    expect(animView(s).handCounts[dest === 'you' ? 'bill' : 'you']).toBe(0);
    if (dest === 'you') expect(animView(s).viewerHand.map((c) => c.id)).toEqual([first.card.id]);
    expect(s.phase).toBe('dealing');
  });

  it('matches the engine after every deal flight has landed', () => {
    let s = createIdleAnimState(empty);
    s = reduceAnim(s, {
      type: 'engineDealt',
      board: dealt,
      dealKey: 'room-1',
      seats: [
        { playerId: 'you', count: 2, cards: [ace, king] },
        { playerId: 'bill', count: 2 },
      ],
    });
    s = landAll(s);
    expect(s.phase).toBe('idle');
    expect(animView(s).handCounts).toEqual(dealt.handCounts);
    expect(animView(s).viewerHand).toEqual(dealt.viewerHand);
    expect(animView(s).activeFlights).toEqual([]);
  });
});

describe('table anim machine — collect', () => {
  const piled = board({
    handCounts: { you: 10, bill: 10 },
    center: [ace, king],
  });
  const taken = board({
    handCounts: { you: 12, bill: 10 },
    center: [],
  });
  const potFlights = collectFlights(
    [
      { card: ace, fromAnchor: POT_ANCHOR },
      { card: king, fromAnchor: POT_ANCHOR },
    ],
    collectDestAnchor('you'),
  );

  it('keeps pot cards painted and dest count still until each collect starts / lands', () => {
    let s = createIdleAnimState(piled);
    s = reduceAnim(s, { type: 'engineCollected', board: taken, flights: potFlights, winnerId: 'you' });
    expect(s.phase).toBe('collecting');
    expect(animView(s).center).toEqual([ace, king]);
    expect(animView(s).handCounts.you).toBe(10);

    s = reduceAnim(s, { type: 'flightStarted', key: 'collect:AS' });
    expect(animView(s).center.map((c) => c.id)).toEqual(['KH']);
    expect(animView(s).handCounts.you).toBe(10);
    expect(animView(s).hiddenCardIds.has('AS')).toBe(true);

    s = reduceAnim(s, { type: 'flightLanded', key: 'collect:AS' });
    expect(animView(s).handCounts.you).toBe(11);
    expect(s.phase).toBe('collecting');

    s = reduceAnim(s, { type: 'flightStarted', key: 'collect:KH' });
    s = reduceAnim(s, { type: 'flightLanded', key: 'collect:KH' });
    expect(s.phase).toBe('idle');
    expect(animView(s).center).toEqual([]);
    expect(animView(s).handCounts).toEqual(taken.handCounts);
  });

  it('refuses idle while a collect flight is still live', () => {
    let s = createIdleAnimState(piled);
    s = reduceAnim(s, { type: 'engineCollected', board: taken, flights: potFlights, winnerId: 'you' });
    s = reduceAnim(s, { type: 'flightStarted', key: 'collect:AS' });
    s = reduceAnim(s, { type: 'allFlightsDone' });
    expect(s.phase).toBe('collecting');
    expect(animView(s).handCounts.you).toBe(10);
  });
});

describe('table anim machine — holding', () => {
  const reveal = board({
    handCounts: { you: 9, bill: 9 },
    lanes: { you: [ace], bill: [king] },
  });

  it('cannot skip holding while the winner is known and cards are still on the lane', () => {
    let s = createIdleAnimState(reveal);
    s = reduceAnim(s, { type: 'engineRoundWon', board: reveal, winnerId: 'you' });
    expect(s.phase).toBe('holding');
    expect(animView(s).lanes.you).toEqual([ace]);
    expect(animView(s).winnerId).toBe('you');

    s = reduceAnim(s, { type: 'allFlightsDone' });
    expect(s.phase).toBe('holding');

    s = reduceAnim(s, {
      type: 'engineCollected',
      board: reveal,
      flights: collectFlights(
        [
          { card: ace, fromAnchor: 'lane:you' },
          { card: king, fromAnchor: 'lane:bill' },
        ],
        originAnchor('you'),
      ),
      winnerId: 'you',
    });
    expect(s.phase).toBe('holding');
    expect(s.flights).toEqual([]);
    expect(animView(s).lanes.you).toEqual([ace]);
  });
});

describe('table anim machine — skip and empty', () => {
  it('snaps to idle in one step when motion is reduced', () => {
    const piled = board({ handCounts: { you: 6, bill: 6 }, center: [ace] });
    const taken = board({ handCounts: { you: 7, bill: 6 }, center: [] });
    let s = createIdleAnimState(piled);
    s = reduceAnim(s, {
      type: 'engineCollected',
      board: taken,
      flights: collectFlights([{ card: ace, fromAnchor: POT_ANCHOR }], originAnchor('you')),
      winnerId: 'you',
      reducedMotion: true,
    });
    expect(s.phase).toBe('idle');
    expect(s.flights).toEqual([]);
    expect(animView(s).center).toEqual([]);
    expect(animView(s).handCounts).toEqual(taken.handCounts);

    s = createIdleAnimState(board({ handCounts: { you: 0, bill: 0 } }));
    s = reduceAnim(s, {
      type: 'engineDealt',
      board: taken,
      dealKey: 'g',
      seats: [{ playerId: 'you', count: 7, cards: [ace] }],
      reducedMotion: true,
    });
    expect(s.phase).toBe('idle');
    expect(s.flights).toEqual([]);
    expect(animView(s).handCounts).toEqual(taken.handCounts);
  });

  it('treats an empty collect as a no-op stay in idle', () => {
    const empty = board({ handCounts: { you: 0, bill: 0 } });
    const s = createIdleAnimState(empty);
    const next = reduceAnim(s, { type: 'engineCollected', board: empty, flights: [], winnerId: null });
    expect(next.phase).toBe('idle');
    expect(next.flights).toEqual([]);
    expect(animView(next).center).toEqual([]);
  });
});

describe('eventFromEngine', () => {
  it('classifies a pot take as collect and a winner-on-lane as hold', () => {
    const piled = board({ handCounts: { you: 4, bill: 4 }, center: [ace] });
    const idle = createIdleAnimState(piled, 'deal-1');
    const collected = eventFromEngine(idle, board({ handCounts: { you: 5, bill: 4 }, center: [] }), {
      dealKey: 'deal-1',
      shouldDeal: false,
      reducedMotion: false,
      winnerId: 'you',
    });
    expect(collected?.type).toBe('engineCollected');

    const reveal = board({ handCounts: { you: 4, bill: 4 }, lanes: { you: [ace], bill: [king] } });
    const hold = eventFromEngine(createIdleAnimState(reveal, 'deal-1'), reveal, {
      dealKey: 'deal-1',
      shouldDeal: false,
      reducedMotion: false,
      winnerId: 'you',
    });
    expect(hold).toEqual({ type: 'engineRoundWon', board: reveal, winnerId: 'you' });
  });

  it('does not emit a collect when the pot stays empty', () => {
    const empty = board({ handCounts: { you: 0, bill: 0 } });
    expect(
      eventFromEngine(createIdleAnimState(empty, 'd'), empty, {
        dealKey: 'd',
        shouldDeal: false,
        reducedMotion: false,
        winnerId: null,
      }),
    ).toBeNull();
  });
});
