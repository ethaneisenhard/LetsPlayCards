import { PlayingCard } from './PlayingCard';
import type { Card } from '../../game/types';
import { cornerPilesFromState, fishingTableFromState, pegLine } from '../lib/felt-targets-pure';

export function FeltBoardExtras({
  showCorners,
  showFishing,
  showPeg,
  gameState,
  pickedCardId,
  targetIds,
  selectedBuildId,
  disabled,
  onCorner,
  onToggleTable,
  onSelectBuild,
}: {
  showCorners: boolean;
  showFishing: boolean;
  showPeg: boolean;
  gameState: Record<string, unknown>;
  pickedCardId: string | null;
  targetIds: string[];
  selectedBuildId: string | null;
  disabled?: boolean;
  onCorner: (index: number) => void;
  onToggleTable: (cardId: string) => void;
  onSelectBuild: (id: string) => void;
}) {
  if (!showCorners && !showFishing && !showPeg) return null;
  const corners = showCorners ? cornerPilesFromState(gameState.corners) : [];
  const fishing = showFishing || showCorners ? fishingTableFromState(gameState) : { table: [], builds: [], center: [] };
  const peg = showPeg ? pegLine(gameState) : null;
  const starter = gameState.starter && typeof gameState.starter === 'object' && 'rank' in gameState.starter
    ? (gameState.starter as Card)
    : null;
  const pegCards = Array.isArray(gameState.peggingPlays)
    ? (gameState.peggingPlays as { card?: Card }[]).map((p) => p.card).filter((c): c is Card => !!c && 'rank' in c)
    : [];

  return (
    <div className="flex flex-col items-center gap-3">
      {peg && <p className="text-gold/70 text-xs">{peg}</p>}
      {starter && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-white/40 text-[10px] uppercase">Starter</span>
          <PlayingCard card={starter} small />
        </div>
      )}
      {pegCards.length > 0 && (
        <div className="flex gap-1">
          {pegCards.map((card) => (
            <PlayingCard key={card.id} card={card} small />
          ))}
        </div>
      )}
      {showCorners && (
        <div className="grid grid-cols-2 gap-2">
          {corners.map((pile) => {
            const top = pile.cards[pile.cards.length - 1];
            return (
              <button
                key={pile.index}
                type="button"
                disabled={disabled || !pickedCardId}
                onClick={() => onCorner(pile.index)}
                className="min-w-[56px] min-h-[76px] rounded-lg border border-dashed border-white/25 flex flex-col items-center justify-center"
                aria-label={`Corner ${pile.index + 1}`}
              >
                {top ? <PlayingCard card={top} small /> : <span className="text-white/25 text-[10px]">K{pile.index + 1}</span>}
                <span className="text-white/30 text-[9px]">{pile.cards.length}</span>
              </button>
            );
          })}
        </div>
      )}
      {showCorners && fishing.center.length > 0 && (
        <div className="flex gap-2">
          {fishing.center.map((pile, i) => {
            const top = pile[pile.length - 1];
            return top ? <PlayingCard key={`${top.id}-${i}`} card={top} small /> : null;
          })}
        </div>
      )}
      {showFishing && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-1">
            {fishing.table.map((card) => (
              <PlayingCard
                key={card.id}
                card={card}
                small
                selected={targetIds.includes(card.id)}
                onClick={() => onToggleTable(card.id)}
                disabled={disabled}
              />
            ))}
          </div>
          {fishing.builds.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectBuild(b.id)}
              className={`text-white/60 text-[10px] ${selectedBuildId === b.id ? 'text-gold' : ''}`}
            >
              Build {b.value}
              <span className="flex gap-1 mt-1">
                {b.cards.map((c) => (
                  <PlayingCard key={c.id} card={c} small />
                ))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
