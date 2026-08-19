import { PlayingCard } from './PlayingCard';
import type { Card } from '../../game/types';
import { projectMemoryGrid } from '../lib/memory-grid-pure';

const BACK: Card = { id: 'back', suit: 'spades', rank: 'A' };

export function MemoryGrid({
  grid,
  busy,
  onFlip,
}: {
  grid: unknown;
  busy?: boolean;
  onFlip: (index: number) => void;
}) {
  const cells = projectMemoryGrid(grid);
  if (cells.length === 0) return null;
  return (
    <div className="grid grid-cols-8 gap-1 max-w-[520px]">
      {cells.map((cell) => (
        <button
          key={cell.index}
          type="button"
          disabled={busy || cell.matched || cell.faceUp}
          onClick={() => onFlip(cell.index)}
          className={`rounded ${cell.matched ? 'opacity-40' : ''}`}
          aria-label={cell.card ? `${cell.card.rank} of ${cell.card.suit}` : `Hidden card ${cell.index + 1}`}
        >
          <PlayingCard card={cell.card ?? BACK} faceDown={!cell.card} small disabled={busy || cell.matched} />
        </button>
      ))}
    </div>
  );
}
