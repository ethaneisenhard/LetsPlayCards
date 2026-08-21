import { PlayingCard } from './PlayingCard';
import { StockPile } from './StockPile';
import { originAnchor } from '../lib/card-flight-pure';
import type { PlayerView } from '../lib/types';

interface PlayerSeatProps {
  player: PlayerView;
  position: 'top' | 'left' | 'right';
  stock?: boolean;
  onSelect?: () => void;
  selectLabel?: string;
  selectDisabled?: boolean;
  scoreLabel?: string;
}

const DUMMY_CARD = { id: 'back', suit: 'spades' as const, rank: 'A' as const };

export function PlayerSeat({ player, position, stock, onSelect, selectLabel, selectDisabled, scoreLabel }: PlayerSeatProps) {
  if (stock) {
    return (
      <StockPile
        playerId={player.id}
        count={player.handCount}
        name={player.name}
        onFlip={onSelect}
        disabled={selectDisabled}
        actionLabel={selectLabel}
      />
    );
  }

  const cardCount = player.handCount;
  const positionClasses = { top: 'flex-col items-center', left: 'flex-row-reverse items-center', right: 'flex-row items-center' }[position];
  const selectable = Boolean(onSelect) && !selectDisabled;

  return (
    <div
      className={`flex ${positionClasses} gap-3 ${selectable ? 'cursor-pointer group' : ''}`}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={(e) => {
        if (!selectable || !onSelect) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-label={selectLabel}
      aria-disabled={onSelect ? selectDisabled : undefined}
    >
      <div className="flex flex-col items-center gap-1">
        <div className={`w-10 h-10 rounded-full bg-linear-to-br from-emerald-600/60 to-emerald-900/60 border flex items-center justify-center text-white font-bold text-sm ${selectable ? 'border-gold ring-2 ring-gold/40' : 'border-emerald-500/30'}`}>
          {player.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-white/70 text-xs font-medium max-w-[80px] truncate">{player.name}</span>
        {scoreLabel && <span className="text-gold/60 text-[10px] tabular-nums">{scoreLabel}</span>}
        {selectLabel && (
          <span className={`text-[10px] max-w-[7rem] text-center leading-tight ${selectable ? 'text-gold/70' : 'text-white/35'}`}>
            {selectLabel}
          </span>
        )}
      </div>

      <div
        data-card-anchor={originAnchor(player.id)}
        className={`relative w-20 h-[60px] shrink-0 ${selectable ? 'hover:scale-105' : ''}`}
      >
        {cardCount > 0 ? (
          Array.from({ length: Math.min(cardCount, 5) }).map((_, i) => (
            <div key={i} className="absolute" style={{ left: i * 4, top: i * -1, zIndex: i }}>
              <PlayingCard card={DUMMY_CARD} faceDown small />
            </div>
          ))
        ) : (
          <div className="w-10 h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center">
            <span className="text-white/20 text-xs">–</span>
          </div>
        )}
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 min-w-[1.85rem] px-1.5 py-0.5 rounded-full bg-[#0a0f1a] border-2 border-gold text-white text-sm font-bold tabular-nums leading-none text-center">
          {cardCount}
        </span>
      </div>
    </div>
  );
}
