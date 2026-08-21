import type { BattleSlot } from '../lib/battle-lane-pure';
import { laneAnchor, POT_ANCHOR } from '../lib/card-flight-pure';
import type { PlayerView } from '../lib/types';
import { PlayingCard } from './PlayingCard';

export function BattleLane({
  slots,
  players,
  hiddenCardIds,
  winnerId,
  small,
}: {
  slots: BattleSlot[];
  players: PlayerView[];
  hiddenCardIds?: ReadonlySet<string>;
  /** Winning lane shakes before cards fly home. */
  winnerId?: string | null;
  small?: boolean;
}) {
  return (
    <div
      data-card-anchor={POT_ANCHOR}
      className={`flex gap-4 sm:gap-6 justify-center items-end ${small ? 'min-h-[4.75rem]' : 'min-h-[7.5rem]'}`}
    >
      {slots.map((slot) => {
        const top = slot.cards[slot.cards.length - 1];
        const hide = !top || hiddenCardIds?.has(top.id);
        const won = Boolean(winnerId && slot.playerId === winnerId && top && !hide);
        return (
          <div key={slot.playerId} className={`flex flex-col items-center gap-1 ${small ? 'w-10' : 'w-[70px]'}`}>
            <div
              data-card-anchor={laneAnchor(slot.playerId)}
              className={`relative ${small ? 'w-10 h-14' : 'w-[70px] h-[100px]'} ${won ? 'animate-card-win-shake' : ''}`}
            >
              {!hide && <PlayingCard card={top} small={small} />}
            </div>
            <span className="w-full text-center text-white/40 text-[9px] sm:text-xs break-words">
              {players.find((p) => p.id === slot.playerId)?.name ?? '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
