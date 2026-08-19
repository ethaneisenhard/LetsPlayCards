import { getSuitSymbol, isRed } from '../../game/deck';
import type { Card } from '../../game/types';

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  small?: boolean;
  large?: boolean;
  tableau?: boolean;
  quiet?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

export function PlayingCard({
  card,
  faceDown = false,
  selected = false,
  small = false,
  large = false,
  tableau = false,
  quiet = false,
  onClick,
  disabled = false,
  label,
}: PlayingCardProps) {
  const red = isRed(card.suit);
  const suit = getSuitSymbol(card.suit);

  const sizeCls = tableau
    ? 'w-[48px] h-[68px] sm:w-[60px] sm:h-[84px]'
    : small
      ? 'w-10 h-14'
      : large
        ? 'w-16 h-[96px] sm:w-[88px] sm:h-[126px]'
        : 'w-[70px] h-[100px]';
  const hoverCls =
    onClick && !disabled && !quiet
      ? faceDown
        ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform'
        : 'cursor-pointer hover:scale-110 hover:-translate-y-1 active:scale-95 transition-transform duration-150'
      : onClick && !disabled
        ? 'cursor-pointer'
        : 'cursor-default';
  const cornerRank = small || tableau ? 'text-[9px] sm:text-[11px]' : large ? 'text-sm sm:text-lg' : 'text-[13px]';
  const cornerSuit = small || tableau ? 'text-[8px] sm:text-[10px]' : large ? 'text-[10px] sm:text-sm' : 'text-[11px]';
  const centerSuit = small || tableau ? 'text-xl sm:text-2xl' : large ? 'text-3xl sm:text-4xl' : 'text-3xl';

  if (faceDown) {
    return (
      <button
        type="button"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        aria-label={label ?? 'Face-down card'}
        className={[
          'relative rounded-xl border-2 border-white/10 select-none',
          quiet ? 'pointer-events-none' : '',
          'bg-linear-to-br from-[#1e3a5f] to-[#0d1f3a]',
          'shadow-[0_4px_16px_rgba(0,0,0,0.5)]',
          sizeCls,
          hoverCls,
          selected ? 'ring-2 ring-gold -translate-y-2' : '',
        ].join(' ')}
      >
        <div className="absolute inset-1 rounded-lg overflow-hidden">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg,rgba(201,168,76,0.15) 0px,rgba(201,168,76,0.15) 1px,transparent 1px,transparent 8px),repeating-linear-gradient(-45deg,rgba(201,168,76,0.15) 0px,rgba(201,168,76,0.15) 1px,transparent 1px,transparent 8px)`,
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gold/40 text-2xl">♠</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label ?? `${card.rank} of ${card.suit}`}
      style={{ backgroundColor: '#ffffff', opacity: 1 }}
      className={[
        'playing-card-face relative overflow-hidden rounded-xl border border-gray-300 select-none',
        'shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
        quiet ? 'pointer-events-none' : '',
        sizeCls,
        hoverCls,
        selected ? 'ring-2 ring-amber-400 -translate-y-2 scale-105 shadow-[0_8px_24px_rgba(251,191,36,0.4)]' : '',
      ].join(' ')}
    >
      <span className="absolute inset-0 rounded-xl" style={{ backgroundColor: '#ffffff' }} aria-hidden />
      <div className={['absolute z-10 top-1 left-1.5 flex flex-col items-center leading-none font-bold', red ? 'text-red-600' : 'text-gray-900', cornerRank].join(' ')}>
        <span>{card.rank}</span>
        <span className={cornerSuit}>{suit}</span>
      </div>
      <div className={['absolute z-10 inset-0 flex items-center justify-center', red ? 'text-red-600' : 'text-gray-900', centerSuit].join(' ')}>
        {suit}
      </div>
      <div className={['absolute z-10 bottom-1 right-1.5 flex flex-col items-center leading-none font-bold rotate-180', red ? 'text-red-600' : 'text-gray-900', cornerRank].join(' ')}>
        <span>{card.rank}</span>
        <span className={cornerSuit}>{suit}</span>
      </div>
    </button>
  );
}
