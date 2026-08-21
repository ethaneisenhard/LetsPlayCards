import { PlayingCard } from './PlayingCard';
import { originAnchor } from '../lib/card-flight-pure';

const DUMMY = { id: 'back', suit: 'spades' as const, rank: 'A' as const };

export function StockPile({
  count,
  playerId,
  onFlip,
  disabled,
  small,
  name,
  actionLabel,
}: {
  count: number;
  playerId: string;
  onFlip?: () => void;
  disabled?: boolean;
  small?: boolean;
  name?: string;
  actionLabel?: string;
}) {
  const box = small ? 'w-10 h-14' : 'w-[70px] h-[100px]';
  const pile = (
    <div data-card-anchor={originAnchor(playerId)} className={`relative ${box}`}>
      {count === 0 ? (
        <div className={`${box} rounded-xl border border-dashed border-white/20`} />
      ) : (
        <>
          {count > 2 && (
            <div className="absolute" style={{ top: -4, left: 4 }}>
              <PlayingCard card={DUMMY} faceDown small={small} />
            </div>
          )}
          {count > 1 && (
            <div className="absolute" style={{ top: -2, left: 2 }}>
              <PlayingCard card={DUMMY} faceDown small={small} />
            </div>
          )}
          <div className="relative z-10">
            {onFlip ? (
              <PlayingCard
                card={DUMMY}
                faceDown
                small={small}
                onClick={onFlip}
                disabled={disabled}
                label={actionLabel ?? `Flip top card, ${count} in pile`}
              />
            ) : (
              <PlayingCard card={DUMMY} faceDown small={small} />
            )}
          </div>
        </>
      )}
      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 min-w-[1.85rem] px-1.5 py-0.5 rounded-full bg-[#0a0f1a] border-2 border-gold text-white text-sm font-bold tabular-nums leading-none text-center">
        {count}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2.5">
      {name && <span className="text-white/70 text-xs font-medium truncate max-w-[5rem]">{name}</span>}
      {pile}
      {actionLabel && (
        <span className={`text-[9px] max-w-[5.5rem] text-center leading-tight ${disabled ? 'text-white/30' : 'text-gold/70'}`}>
          {actionLabel}
        </span>
      )}
    </div>
  );
}
