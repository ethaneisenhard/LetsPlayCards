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
  return kind === 'deal' ? DEAL_FLIGHT_MS : FLIGHT_MS;
}

export function playerIdFromAnchor(anchor: string): string {
  const i = anchor.indexOf(':');
  return i === -1 ? anchor : anchor.slice(i + 1);
}

function ids(cards: Card[] | undefined): string[] {
  return (cards ?? []).map((c) => c.id);
}

/** Diff lane cards → play (new) or collect (cleared to a winner pile). */
export function laneFlights(
  prev: LaneSnapshot,
  next: LaneSnapshot,
  winnerId: string | null,
): CardFlightPlan[] {
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

  const nextEmpty = [...playerIds].every((id) => (next[id] ?? []).length === 0);
  const prevHad = [...playerIds].some((id) => (prev[id] ?? []).length > 0);
  if (nextEmpty && prevHad) {
    const dest = winnerId ? originAnchor(winnerId) : POT_ANCHOR;
    for (const playerId of playerIds) {
      for (const card of prev[playerId] ?? []) {
        out.push({
          key: `collect:${card.id}`,
          card,
          fromAnchor: laneAnchor(playerId),
          toAnchor: dest,
          kind: 'collect',
        });
      }
    }
  }

  return out;
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
