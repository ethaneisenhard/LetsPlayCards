import type { Card } from '../../game/types';

export type LaneSnapshot = Record<string, Card[]>;

export type CardFlightPlan = {
  key: string;
  card: Card;
  fromAnchor: string;
  toAnchor: string;
  kind: 'play' | 'collect';
};

export function originAnchor(playerId: string): string {
  return `origin:${playerId}`;
}

export function laneAnchor(playerId: string): string {
  return `lane:${playerId}`;
}

export const POT_ANCHOR = 'pot';

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
