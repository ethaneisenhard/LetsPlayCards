import type { Card } from '../../game/types';
import {
  collectDestAnchor,
  collectFlights,
  dealFlights,
  laneFlights,
  leavingBoardCards,
  playerIdFromAnchor,
  type CardFlightPlan,
  type CollectFallback,
  type DealSeat,
  type LaneSnapshot,
} from './card-flight-pure';

export type AnimPhase = 'idle' | 'dealing' | 'playing' | 'holding' | 'collecting';

export type TableBoard = {
  lanes: LaneSnapshot;
  center: Card[];
  handCounts: Record<string, number>;
  viewerHand: Card[];
  viewerId: string | null;
};

export type TableAnimState = {
  phase: AnimPhase;
  presented: TableBoard;
  target: TableBoard;
  flights: CardFlightPlan[];
  started: string[];
  landed: string[];
  winnerId: string | null;
  dealKey: string | null;
};

export type TableAnimEvent =
  | { type: 'sync'; board: TableBoard; dealKey?: string | null }
  | { type: 'retarget'; board: TableBoard }
  | {
      type: 'engineDealt';
      board: TableBoard;
      seats: DealSeat[];
      dealKey: string;
      reducedMotion?: boolean;
    }
  | { type: 'enginePlayed'; board: TableBoard; flights: CardFlightPlan[]; winnerId?: string | null }
  | { type: 'engineRoundWon'; board: TableBoard; winnerId: string }
  | {
      type: 'engineCollected';
      board: TableBoard;
      flights: CardFlightPlan[];
      winnerId?: string | null;
      reducedMotion?: boolean;
    }
  | { type: 'flightStarted'; key: string }
  | { type: 'flightLanded'; key: string }
  | { type: 'allFlightsDone' }
  | { type: 'skip'; board?: TableBoard };

export type TableAnimView = {
  phase: AnimPhase;
  lanes: LaneSnapshot;
  center: Card[];
  handCounts: Record<string, number>;
  viewerHand: Card[];
  hiddenCardIds: Set<string>;
  activeFlights: CardFlightPlan[];
  winnerId: string | null;
};

export type EngineHints = {
  dealKey: string;
  shouldDeal: boolean;
  reducedMotion: boolean;
  winnerId: string | null;
  fallback?: CollectFallback;
};

export function cloneBoard(board: TableBoard): TableBoard {
  return {
    lanes: Object.fromEntries(Object.entries(board.lanes).map(([id, cards]) => [id, [...cards]])),
    center: [...board.center],
    handCounts: { ...board.handCounts },
    viewerHand: [...board.viewerHand],
    viewerId: board.viewerId,
  };
}

export function emptyPresented(board: TableBoard): TableBoard {
  return {
    lanes: {},
    center: [],
    handCounts: Object.fromEntries(Object.keys(board.handCounts).map((id) => [id, 0])),
    viewerHand: [],
    viewerId: board.viewerId,
  };
}

export function tableBoardStamp(board: TableBoard): string {
  const lanes = Object.keys(board.lanes)
    .sort()
    .map((id) => `${id}:${(board.lanes[id] ?? []).map((c) => c.id).join(',')}`)
    .join('|');
  const hands = Object.keys(board.handCounts)
    .sort()
    .map((id) => `${id}:${board.handCounts[id]}`)
    .join('|');
  return [
    lanes,
    board.center.map((c) => c.id).join(','),
    hands,
    board.viewerHand.map((c) => c.id).join(','),
    board.viewerId ?? '',
  ].join('#');
}

export function boardHasFaceCards(board: TableBoard): boolean {
  if (board.center.length > 0) return true;
  return Object.values(board.lanes).some((cards) => cards.length > 0);
}

export function createIdleAnimState(board: TableBoard, dealKey: string | null = null): TableAnimState {
  const copy = cloneBoard(board);
  return {
    phase: 'idle',
    presented: copy,
    target: cloneBoard(board),
    flights: [],
    started: [],
    landed: [],
    winnerId: null,
    dealKey,
  };
}

function liveFlights(state: TableAnimState): CardFlightPlan[] {
  const done = new Set(state.landed);
  return state.flights.filter((f) => !done.has(f.key));
}

function goIdle(state: TableAnimState, board = state.target, dealKey = state.dealKey): TableAnimState {
  return {
    phase: 'idle',
    presented: cloneBoard(board),
    target: cloneBoard(board),
    flights: [],
    started: [],
    landed: [],
    winnerId: null,
    dealKey,
  };
}

function removePresentedCard(board: TableBoard, cardId: string): TableBoard {
  return {
    ...board,
    lanes: Object.fromEntries(
      Object.entries(board.lanes).map(([id, cards]) => [id, cards.filter((c) => c.id !== cardId)]),
    ),
    center: board.center.filter((c) => c.id !== cardId),
    viewerHand: board.viewerHand.filter((c) => c.id !== cardId),
  };
}

function bumpCount(board: TableBoard, playerId: string, delta: number): TableBoard {
  if (!playerId || !(playerId in board.handCounts)) return board;
  return {
    ...board,
    handCounts: {
      ...board.handCounts,
      [playerId]: Math.max(0, (board.handCounts[playerId] ?? 0) + delta),
    },
  };
}

function addLaneCard(board: TableBoard, playerId: string, card: Card): TableBoard {
  const lane = board.lanes[playerId] ?? [];
  if (lane.some((c) => c.id === card.id)) return board;
  return { ...board, lanes: { ...board.lanes, [playerId]: [...lane, card] } };
}

function addViewerIfTarget(presented: TableBoard, target: TableBoard, card: Card): TableBoard {
  if (card.id.startsWith('deal-back-')) return presented;
  if (!target.viewerHand.some((c) => c.id === card.id)) return presented;
  if (presented.viewerHand.some((c) => c.id === card.id)) return presented;
  return { ...presented, viewerHand: [...presented.viewerHand, card] };
}

function applyStart(state: TableAnimState, key: string): TableAnimState {
  if (state.started.includes(key) || state.landed.includes(key)) return state;
  const flight = state.flights.find((f) => f.key === key);
  if (!flight) return state;
  let presented = removePresentedCard(state.presented, flight.card.id);
  if (flight.kind === 'play') {
    const sourceId = playerIdFromAnchor(flight.fromAnchor);
    presented = bumpCount(presented, sourceId, -1);
  }
  return { ...state, presented, started: [...state.started, key] };
}

function applyLand(state: TableAnimState, key: string): TableAnimState {
  if (state.landed.includes(key)) return state;
  const flight = state.flights.find((f) => f.key === key);
  if (!flight) return state;
  let presented = state.presented;
  if (flight.kind === 'deal' || flight.kind === 'collect') {
    const destId = playerIdFromAnchor(flight.toAnchor);
    presented = bumpCount(presented, destId, 1);
    presented = addViewerIfTarget(presented, state.target, flight.card);
  } else if (flight.kind === 'play') {
    presented = addLaneCard(presented, playerIdFromAnchor(flight.toAnchor), flight.card);
  }
  const landed = [...state.landed, key];
  const next: TableAnimState = { ...state, presented, landed };
  if (liveFlights(next).length > 0) return next;
  if (next.phase === 'collecting' || next.phase === 'dealing') {
    return goIdle(next, next.target);
  }
  if (next.phase === 'playing') {
    if (next.winnerId && boardHasFaceCards(next.target)) {
      return {
        ...next,
        phase: 'holding',
        presented: cloneBoard(next.target),
        flights: [],
        started: [],
        landed: [],
      };
    }
    return goIdle(next, next.target);
  }
  return next;
}

export function reduceAnim(state: TableAnimState, event: TableAnimEvent): TableAnimState {
  switch (event.type) {
    case 'sync':
      return goIdle(state, event.board, event.dealKey ?? state.dealKey);
    case 'retarget':
      if (tableBoardStamp(state.target) === tableBoardStamp(event.board)) return state;
      return { ...state, target: cloneBoard(event.board) };
    case 'skip':
      return goIdle(state, event.board ?? state.target, state.dealKey);
    case 'engineDealt': {
      if (event.reducedMotion) return goIdle(state, event.board, event.dealKey);
      const flights = dealFlights(event.seats);
      if (flights.length === 0) return goIdle(state, event.board, event.dealKey);
      return {
        phase: 'dealing',
        presented: emptyPresented(event.board),
        target: cloneBoard(event.board),
        flights,
        started: [],
        landed: [],
        winnerId: null,
        dealKey: event.dealKey,
      };
    }
    case 'enginePlayed': {
      if (state.phase === 'holding' && state.winnerId && boardHasFaceCards(state.presented)) {
        return state;
      }
      if (event.flights.length === 0) {
        return event.winnerId && boardHasFaceCards(event.board)
          ? {
              ...state,
              phase: 'holding',
              presented: cloneBoard(event.board),
              target: cloneBoard(event.board),
              winnerId: event.winnerId,
              flights: [],
              started: [],
              landed: [],
            }
          : goIdle(state, event.board);
      }
      return {
        ...state,
        phase: 'playing',
        target: cloneBoard(event.board),
        flights: event.flights,
        started: [],
        landed: [],
        winnerId: event.winnerId ?? null,
      };
    }
    case 'engineRoundWon':
      return {
        ...state,
        phase: 'holding',
        presented: cloneBoard(event.board),
        target: cloneBoard(event.board),
        winnerId: event.winnerId,
        flights: [],
        started: [],
        landed: [],
      };
    case 'engineCollected': {
      if (boardHasFaceCards(event.board)) {
        return {
          ...state,
          phase: 'holding',
          presented: cloneBoard(event.board),
          target: cloneBoard(event.board),
          winnerId: event.winnerId ?? state.winnerId,
          flights: [],
          started: [],
          landed: [],
        };
      }
      if (event.flights.length === 0) {
        return state.phase === 'holding' && boardHasFaceCards(state.presented) ? state : goIdle(state, event.board);
      }
      if (event.reducedMotion) return goIdle(state, event.board);
      return {
        ...state,
        phase: 'collecting',
        target: cloneBoard(event.board),
        flights: event.flights,
        started: [],
        landed: [],
        winnerId: event.winnerId ?? state.winnerId,
      };
    }
    case 'flightStarted':
      return applyStart(state, event.key);
    case 'flightLanded': {
      const started = state.started.includes(event.key) ? state : applyStart(state, event.key);
      return applyLand(started, event.key);
    }
    case 'allFlightsDone':
      if (liveFlights(state).length > 0) return state;
      if (state.phase === 'holding' && state.winnerId && boardHasFaceCards(state.presented)) {
        return state;
      }
      if (state.phase === 'collecting' && liveFlights(state).length > 0) return state;
      return goIdle(state, state.target);
    default:
      return state;
  }
}

export function animView(state: TableAnimState): TableAnimView {
  const started = new Set(state.started);
  const hiddenCardIds = new Set(
    state.flights.filter((f) => started.has(f.key) && !state.landed.includes(f.key)).map((f) => f.card.id),
  );
  const hide = (cards: Card[]) => cards.filter((c) => !hiddenCardIds.has(c.id));
  return {
    phase: state.phase,
    lanes: Object.fromEntries(Object.entries(state.presented.lanes).map(([id, cards]) => [id, hide(cards)])),
    center: hide(state.presented.center),
    handCounts: { ...state.presented.handCounts },
    viewerHand: hide(state.presented.viewerHand),
    hiddenCardIds,
    activeFlights: liveFlights(state),
    winnerId: state.phase === 'holding' ? state.winnerId : null,
  };
}

export function eventFromEngine(
  state: TableAnimState,
  next: TableBoard,
  hints: EngineHints,
): TableAnimEvent | null {
  if (state.dealKey !== hints.dealKey) {
    if (hints.reducedMotion || !hints.shouldDeal) {
      return { type: 'sync', board: next, dealKey: hints.dealKey };
    }
    const seats: DealSeat[] = Object.keys(next.handCounts).map((id) => ({
      playerId: id,
      count: next.handCounts[id] ?? 0,
      cards: id === next.viewerId ? next.viewerHand : undefined,
    }));
    return { type: 'engineDealt', board: next, seats, dealKey: hints.dealKey, reducedMotion: hints.reducedMotion };
  }

  if (hints.reducedMotion) {
    if (state.phase === 'idle' && tableBoardStamp(state.presented) === tableBoardStamp(next)) return null;
    return { type: 'skip', board: next };
  }

  if (state.phase === 'dealing' || state.phase === 'playing' || state.phase === 'collecting') {
    return tableBoardStamp(state.target) === tableBoardStamp(next) ? null : { type: 'retarget', board: next };
  }

  const plays = laneFlights(state.presented.lanes, next.lanes, null).filter((f) => f.kind === 'play');
  const leaving = leavingBoardCards(state.presented.lanes, next.lanes, state.presented.center, next.center);

  if (leaving.length > 0) {
    return {
      type: 'engineCollected',
      board: next,
      flights: collectFlights(leaving, collectDestAnchor(hints.winnerId, hints.fallback ?? 'pot')),
      winnerId: hints.winnerId,
    };
  }

  if (plays.length > 0) {
    return { type: 'enginePlayed', board: next, flights: plays, winnerId: hints.winnerId };
  }

  if (hints.winnerId && boardHasFaceCards(next)) {
    if (state.phase === 'holding' && state.winnerId === hints.winnerId) return null;
    return { type: 'engineRoundWon', board: next, winnerId: hints.winnerId };
  }

  if (tableBoardStamp(state.presented) !== tableBoardStamp(next)) {
    return { type: 'sync', board: next, dealKey: hints.dealKey };
  }
  return null;
}

export function makeTableBoard(input: {
  lanes?: LaneSnapshot;
  center?: Card[];
  handCounts: Record<string, number>;
  viewerHand?: Card[];
  viewerId?: string | null;
}): TableBoard {
  return {
    lanes: input.lanes ?? {},
    center: input.center ?? [],
    handCounts: input.handCounts,
    viewerHand: input.viewerHand ?? [],
    viewerId: input.viewerId ?? null,
  };
}
