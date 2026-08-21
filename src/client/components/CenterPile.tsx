import type { Card } from '../../game/types';
import { POT_ANCHOR } from '../lib/card-flight-pure';
import { PlayingCard } from './PlayingCard';

export function CenterPile({
  cards,
  onSlap,
  canSlap,
  small,
  hiddenCardIds,
}: {
  cards: Card[];
  onSlap?: () => void;
  canSlap?: boolean;
  small?: boolean;
  hiddenCardIds?: ReadonlySet<string>;
}) {
  const shown = hiddenCardIds ? cards.filter((c) => !hiddenCardIds.has(c.id)) : cards;
  const top = shown[shown.length - 1];
  const box = small ? 'w-10 h-14' : 'w-[70px] h-[100px]';

  return (
    <div data-card-anchor={POT_ANCHOR} className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onSlap}
        disabled={!canSlap}
        className={`relative ${box} ${canSlap ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
        aria-label={canSlap ? 'Slap the pile' : 'Center pile'}
      >
        {top ? (
          <PlayingCard card={top} small={small} />
        ) : (
          <div className={`${box} rounded-xl border-2 border-dashed border-white/20`} />
        )}
      </button>
      <span className="h-4 text-white/40 text-[9px] sm:text-xs tabular-nums">
        {shown.length === 0 ? 'Center' : `${shown.length} in pile`}
      </span>
      <span className="h-4 text-[10px] tracking-wide text-gold/70">
        {canSlap ? 'Slap!' : '\u00a0'}
      </span>
    </div>
  );
}
