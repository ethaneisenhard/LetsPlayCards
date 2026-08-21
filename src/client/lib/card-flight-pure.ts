import type { Card } from '../../game/types';

export type LaneSnapshot = Record<string, Card[]>;

export type FlightKind = 'play' | 'collect' | 'deal';

export type CardFlightPlan = {
  key: string;
  card: Card;
  fromAnchor: string;
  toAnchor: string;
  kind: FlightKind;
  faceDown?: boolean;
  delayMs?: number;
};

export function originAnchor(playerId: string): string {
  return `origin:${playerId}`;
}

export function laneAnchor(playerId: string): string {
  return `lane:${playerId}`;
}

export const POT_ANCHOR = 'pot';
export const STOCK_ANCHOR = 'stock';

export const DEAL_STAGGER_MS = 75;
export const DEAL_FLIGHT_MS = 380;
export const DEAL_MAX_CARDS = 20;
export const DEAL_SKIP_AFTER_MS = 4000;
export const COLLECT_STAGGER_MS = 60;
export const COLLECT_FLIGHT_MS = 460;

const DEAL_BACK: Card = { id: 'deal-back', suit: 'spades', rank: 'A' };

export type DealSeat = {
  playerId: string;
  count: number;
  /** Face-up cards (viewer hand). Missing = face-down dummies. */
  cards?: Card[];
};

export function shouldAnimateDeal(input: {
  showTableau?: boolean;
  showMemory?: boolean;
  seatCounts: number[];
  reducedMotion?: boolean;
}): boolean {
  if (input.reducedMotion || input.showTableau || input.showMemory) return false;
  return input.seatCounts.some((n) => n > 0);
}

/** Stock plus every seat — all must sit on the same felt before flights start. */
export function dealAnchorIds(playerIds: string[]): string[] {
  return [STOCK_ANCHOR, ...playerIds.map(originAnchor)];
}

export function dealSurfaceReady(present: Iterable<string>, playerIds: string[]): boolean {
  const have = new Set(present);
  return dealAnchorIds(playerIds).every((id) => have.has(id));
}

export const ANCHOR_MIN_PX = 8;

export type FlightBoxCandidate = {
  w: number;
  h: number;
  display?: string;
  visibility?: string;
  opacity?: number;
};

/** Prefer a painted, on-felt box. Skip display:none / tiny / off-canvas leftovers. */
export function pickFlightBox<T extends FlightBoxCandidate>(boxes: T[]): T | null {
  const measurable = boxes.filter(
    (b) => b.w >= ANCHOR_MIN_PX && b.h >= ANCHOR_MIN_PX && b.display !== 'none',
  );
  const solid = measurable.find((b) => b.visibility !== 'hidden' && (b.opacity ?? 1) > 0);
  return solid ?? measurable[0] ?? null;
}

/** Round-robin flights from the leftover / face-down pile to each seat. */
export function dealFlights(seats: DealSeat[]): CardFlightPlan[] {
  const remaining = seats.map((s) => Math.max(0, s.count));
  const total = remaining.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const cap = Math.min(total, DEAL_MAX_CARDS);
  const out: CardFlightPlan[] = [];
  const given = seats.map(() => 0);
  let dealt = 0;
  while (dealt < cap) {
    let progressed = false;
    for (let i = 0; i < seats.length && dealt < cap; i++) {
      if (given[i] >= remaining[i]) continue;
      const seat = seats[i];
      const n = given[i];
      const card = seat.cards?.[n];
      out.push({
        key: `deal:${seat.playerId}:${n}`,
        card: card ?? { ...DEAL_BACK, id: `deal-back-${seat.playerId}-${n}` },
        fromAnchor: STOCK_ANCHOR,
        toAnchor: originAnchor(seat.playerId),
        kind: 'deal',
        faceDown: !card,
        delayMs: dealt * DEAL_STAGGER_MS,
      });
      given[i] += 1;
      dealt += 1;
      progressed = true;
    }
    if (!progressed) break;
  }
  return out;
}

export function flightDurationMs(kind: FlightKind): number {
  if (kind === 'deal') return DEAL_FLIGHT_MS;
  if (kind === 'collect') return COLLECT_FLIGHT_MS;
  return FLIGHT_MS;
}

export function playerIdFromAnchor(anchor: string): string {
  const i = anchor.indexOf(':');
  return i === -1 ? anchor : anchor.slice(i + 1);
}

function ids(cards: Card[] | undefined): string[] {
  return (cards ?? []).map((c) => c.id);
}

export type CollectLeaving = {
  card: Card;
  fromAnchor: string;
};

export type CollectFallback = 'pot' | 'stock';

export function collectDestAnchor(
  winnerId: string | null | undefined,
  fallback: CollectFallback = 'pot',
): string {
  if (winnerId) return originAnchor(winnerId);
  return fallback === 'stock' ? STOCK_ANCHOR : POT_ANCHOR;
}

/** Stock / pot / every source — all must sit on the same felt before a collect starts. */
export function collectAnchorIds(leaving: CollectLeaving[], destAnchor: string): string[] {
  return [...new Set([...leaving.map((item) => item.fromAnchor), destAnchor])];
}

export function collectSurfaceReady(
  present: Iterable<string>,
  leaving: CollectLeaving[],
  destAnchor: string,
): boolean {
  if (leaving.length === 0) return true;
  const have = new Set(present);
  return collectAnchorIds(leaving, destAnchor).every((id) => have.has(id));
}

/** Cards leaving the board fly home with the same stagger feel as the deal. */
export function collectFlights(
  leaving: CollectLeaving[],
  destAnchor: string,
  opts?: { reducedMotion?: boolean },
): CardFlightPlan[] {
  if (opts?.reducedMotion || leaving.length === 0) return [];
  return leaving.map((item, i) => ({
    key: `collect:${item.card.id}`,
    card: item.card,
    fromAnchor: item.fromAnchor,
    toAnchor: destAnchor,
    kind: 'collect' as const,
    delayMs: i * COLLECT_STAGGER_MS,
  }));
}

function playLaneFlights(prev: LaneSnapshot, next: LaneSnapshot): CardFlightPlan[] {
  const playerIds = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const out: CardFlightPlan[] = [];
  for (const playerId of playerIds) {
    const before = prev[playerId] ?? [];
    const after = next[playerId] ?? [];
    const beforeIds = new Set(ids(before));
    for (const card of after) {
      if (beforeIds.has(card.id)) continue;
      out.push({
        key: `play:${card.id}`,
        card,
        fromAnchor: originAnchor(playerId),
        toAnchor: laneAnchor(playerId),
        kind: 'play',
      });
    }
  }
  return out;
}

/** Lane cards leave only when every lane is empty next and some lane had cards. */
export function leavingLaneCards(prev: LaneSnapshot, next: LaneSnapshot): CollectLeaving[] {
  const playerIds = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const nextEmpty = [...playerIds].every((id) => (next[id] ?? []).length === 0);
  const prevHad = [...playerIds].some((id) => (prev[id] ?? []).length > 0);
  if (!nextEmpty || !prevHad) return [];
  const out: CollectLeaving[] = [];
  for (const playerId of playerIds) {
    for (const card of prev[playerId] ?? []) {
      out.push({ card, fromAnchor: laneAnchor(playerId) });
    }
  }
  return out;
}

/** Shared pot / slap pile cards that the engine actually removed. */
export function leavingCenterCards(prevCenter: Card[], nextCenter: Card[]): CollectLeaving[] {
  const stay = new Set(ids(nextCenter));
  return prevCenter.filter((card) => !stay.has(card.id)).map((card) => ({
    card,
    fromAnchor: POT_ANCHOR,
  }));
}

export function leavingBoardCards(
  prevLanes: LaneSnapshot,
  nextLanes: LaneSnapshot,
  prevCenter: Card[] = [],
  nextCenter: Card[] = [],
): CollectLeaving[] {
  return [...leavingLaneCards(prevLanes, nextLanes), ...leavingCenterCards(prevCenter, nextCenter)];
}

/** Diff lane cards → play (new) or collect (cleared to a winner pile). */
export function laneFlights(
  prev: LaneSnapshot,
  next: LaneSnapshot,
  winnerId: string | null,
): CardFlightPlan[] {
  return [
    ...playLaneFlights(prev, next),
    ...collectFlights(leavingLaneCards(prev, next), collectDestAnchor(winnerId)),
  ];
}

export type BoardFlightsInput = {
  prevLanes: LaneSnapshot;
  nextLanes: LaneSnapshot;
  prevCenter?: Card[];
  nextCenter?: Card[];
  winnerId: string | null;
  fallback?: CollectFallback;
  reducedMotion?: boolean;
};

/** Play onto lanes, then collect every card that left a lane or the shared pot. */
export function boardFlights(input: BoardFlightsInput): CardFlightPlan[] {
  const prevCenter = input.prevCenter ?? [];
  const nextCenter = input.nextCenter ?? [];
  const dest = collectDestAnchor(input.winnerId, input.fallback ?? 'pot');
  return [
    ...playLaneFlights(input.prevLanes, input.nextLanes),
    ...collectFlights(
      leavingBoardCards(input.prevLanes, input.nextLanes, prevCenter, nextCenter),
      dest,
      { reducedMotion: input.reducedMotion },
    ),
  ];
}

export type CollectSignals = {
  roundWinnerId?: string | null;
  lastWinnerSeat?: number | null;
  collectorId?: string | null;
  currentSeat?: number | null;
  handCounts: Record<string, number>;
  tricksWon?: Record<string, number>;
  capturedCounts?: Record<string, number>;
  tricksPlayed?: number;
  deckCount?: number;
};

function seatPlayerId(
  players: { id: string; seat: number }[],
  seat: number | null | undefined,
): string | null {
  if (seat == null) return null;
  return players.find((p) => p.seat === seat)?.id ?? null;
}

function biggestGain(counts: Record<string, number> | undefined, prev: Record<string, number> | undefined): string | null {
  if (!counts) return null;
  let bestId: string | null = null;
  let best = 0;
  let tied = false;
  for (const id of new Set([...Object.keys(counts), ...Object.keys(prev ?? {})])) {
    const n = (counts[id] ?? 0) - (prev?.[id] ?? 0);
    if (n > best) {
      best = n;
      bestId = id;
      tied = false;
    } else if (n === best && n > 0) {
      tied = true;
    }
  }
  return best > 0 && !tied ? bestId : null;
}

/**
 * Who took the cards that just left the board. Uses only fields the table already has —
 * never invents a winner the engine did not record or pay.
 */
export function inferCollectWinner(
  players: { id: string; seat: number }[],
  prev: CollectSignals,
  next: CollectSignals,
): string | null {
  const named = next.roundWinnerId || prev.roundWinnerId || next.collectorId || prev.collectorId;
  if (named) return named;
  const fromSeat = seatPlayerId(players, next.lastWinnerSeat ?? prev.lastWinnerSeat);
  if (fromSeat) return fromSeat;
  const fromHands = biggestGain(next.handCounts, prev.handCounts);
  if (fromHands) return fromHands;
  const fromTricks = biggestGain(next.tricksWon, prev.tricksWon);
  if (fromTricks) return fromTricks;
  const fromCaptured = biggestGain(next.capturedCounts, prev.capturedCounts);
  if (fromCaptured) return fromCaptured;
  if ((next.tricksPlayed ?? -1) > (prev.tricksPlayed ?? -1)) {
    return seatPlayerId(players, next.currentSeat);
  }
  return null;
}

export function inferCollectFallback(prev: CollectSignals, next: CollectSignals): CollectFallback {
  const deckGain = (next.deckCount ?? 0) - (prev.deckCount ?? 0);
  return deckGain > 0 ? 'stock' : 'pot';
}

export function holdLaneCards(
  slots: { playerId: string; cards: Card[] }[],
  held: LaneSnapshot,
): { playerId: string; cards: Card[] }[] {
  return slots.map((slot) =>
    slot.cards.length > 0 ? slot : { ...slot, cards: held[slot.playerId] ?? [] },
  );
}

export type Box = { x: number; y: number; w: number; h: number };

export function flightDelta(from: Box, to: Box): { dx: number; dy: number; scaleX: number; scaleY: number } {
  return {
    dx: to.x - from.x,
    dy: to.y - from.y,
    scaleX: from.w === 0 ? 1 : to.w / from.w,
    scaleY: from.h === 0 ? 1 : to.h / from.h,
  };
}

export const FLIGHT_MS = 520;
