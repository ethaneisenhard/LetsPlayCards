import type { Card } from '../../game/types';

export type MemoryCellView = {
  index: number;
  faceUp: boolean;
  matched: boolean;
  card: Card | null;
};

export function projectMemoryGrid(grid: unknown): MemoryCellView[] {
  if (!Array.isArray(grid)) return [];
  return grid.map((cell, index) => {
    const faceUp = Boolean(cell && typeof cell === 'object' && (cell as { faceUp?: boolean }).faceUp);
    const matched = Boolean(cell && typeof cell === 'object' && (cell as { matched?: boolean }).matched);
    const raw = cell && typeof cell === 'object' ? (cell as { card?: Card }).card : undefined;
    const show = faceUp || matched;
    return {
      index,
      faceUp,
      matched,
      card: show && raw && 'rank' in raw ? raw : null,
    };
  });
}
