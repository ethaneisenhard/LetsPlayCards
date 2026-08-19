import type { Card } from '../../game/types';

function isCard(value: unknown): value is Card {
  return !!value && typeof value === 'object' && 'rank' in value && 'suit' in value;
}

export type CornerPiles = { index: number; cards: Card[] }[];

export function cornerPilesFromState(corners: unknown): CornerPiles {
  if (!Array.isArray(corners)) return [0, 1, 2, 3].map((index) => ({ index, cards: [] }));
  return [0, 1, 2, 3].map((index) => ({
    index,
    cards: Array.isArray(corners[index]) ? (corners[index] as unknown[]).filter(isCard) : [],
  }));
}

export type FishingTable = {
  table: Card[];
  builds: { id: string; value: number; cards: Card[] }[];
  center: Card[][];
};

export function fishingTableFromState(gs: Record<string, unknown> | undefined): FishingTable {
  const table = Array.isArray(gs?.table) ? (gs.table as unknown[]).filter(isCard) : [];
  const rawBuilds = Array.isArray(gs?.builds) ? gs.builds : [];
  const builds = rawBuilds
    .filter((b): b is { id: string; value: number; cards: unknown[] } => !!b && typeof b === 'object' && 'id' in b)
    .map((b) => ({
      id: String(b.id),
      value: Number(b.value),
      cards: Array.isArray(b.cards) ? b.cards.filter(isCard) : [],
    }));
  const center = Array.isArray(gs?.center)
    ? (gs.center as unknown[])
        .filter(Array.isArray)
        .map((pile) => (pile as unknown[]).filter(isCard))
    : [];
  return { table, builds, center };
}

export function pegLine(gs: {
  phase?: string;
  pegTotal?: number;
  scores?: Record<string, number>;
} | undefined): string | null {
  if (!gs?.phase) return null;
  const score = gs.scores ? Object.values(gs.scores).join('–') : '';
  const peg = typeof gs.pegTotal === 'number' ? ` · peg ${gs.pegTotal}` : '';
  return `${gs.phase}${peg}${score ? ` · ${score}` : ''}`;
}
