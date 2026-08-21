import { useEffect, useState } from 'react';
import { PlayingCard } from './PlayingCard';
import type { Card } from '../../game/types';
import { moveCardInHand, sortHandByRank, sortHandBySuit, syncHandOrder } from '../lib/hand-order-pure';

interface CardHandProps {
  cards: Card[];
  onPlay?: (card: Card) => void;
  onDiscard?: (card: Card) => void;
  onPick?: (card: Card) => void;
  pickedCardId?: string | null;
  pickedCardIds?: string[];
  pickHint?: string;
  playerName: string;
  isMyTurn?: boolean;
  mobile?: boolean;
  /** Hide arrange / pick hints when actions sit under the fan. */
  quiet?: boolean;
  hideOrder?: boolean;
}

function OrderBar({
  compact,
  canNudge,
  onRank,
  onSuit,
  onNudge,
}: {
  compact?: boolean;
  canNudge: boolean;
  onRank: () => void;
  onSuit: () => void;
  onNudge: (delta: number) => void;
}) {
  const btn = compact
    ? 'px-2 py-1 rounded-md bg-white/10 text-white/70 text-[10px] uppercase tracking-wide disabled:opacity-30'
    : 'px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-xs disabled:opacity-30';
  return (
    <div className={`flex items-center justify-center gap-2 ${compact ? 'px-3 pb-2' : ''}`}>
      <button type="button" className={btn} onClick={onRank}>
        Number
      </button>
      <button type="button" className={btn} onClick={onSuit}>
        Shape
      </button>
      <button type="button" className={btn} disabled={!canNudge} onClick={() => onNudge(-1)}>
        ←
      </button>
      <button type="button" className={btn} disabled={!canNudge} onClick={() => onNudge(1)}>
        →
      </button>
    </div>
  );
}

export function CardHand({
  cards,
  onPlay,
  onDiscard,
  onPick,
  pickedCardId,
  pickedCardIds,
  pickHint,
  playerName,
  isMyTurn = true,
  mobile = false,
  quiet = false,
  hideOrder = false,
}: CardHandProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<Card[]>(() => [...cards]);

  useEffect(() => {
    setOrdered((prev) => syncHandOrder(prev, cards));
  }, [cards]);

  const canAct = isMyTurn && Boolean(onPlay || onDiscard || onPick);
  const focusId = onPick ? (pickedCardId ?? pickedCardIds?.[pickedCardIds.length - 1] ?? selectedCard) : selectedCard;

  function handleCardClick(card: Card) {
    setSelectedCard((selected) => (selected === card.id ? null : card.id));
    if (onPick && canAct) onPick(card);
  }

  function handlePlay() {
    const card = ordered.find((c) => c.id === selectedCard);
    if (card && onPlay) {
      onPlay(card);
      setSelectedCard(null);
    }
  }

  function handleDiscard() {
    const card = ordered.find((c) => c.id === selectedCard);
    if (card && onDiscard) {
      onDiscard(card);
      setSelectedCard(null);
    }
  }

  const n = ordered.length;
  const cardW = mobile ? 64 : 88;
  const cardH = mobile ? 96 : 126;
  const maxFan = mobile ? 336 : 560;
  const gap = n <= 1 ? 0 : Math.max(12, Math.min(30, (maxFan - cardW) / (n - 1)));
  const fanW = n <= 1 ? cardW : cardW + gap * (n - 1);
  const maxRotate = mobile ? 6 : 9;
  const arcLift = 8;

  const fan = n === 0 ? (
    <div className="h-8 flex items-center justify-center text-white/20 text-sm">No cards in hand</div>
  ) : (
    <div className="relative mx-auto" style={{ width: fanW, height: cardH + 16 }}>
      {ordered.map((card, i) => {
        const selected = onPick
          ? pickedCardIds?.includes(card.id) || pickedCardId === card.id || selectedCard === card.id
          : selectedCard === card.id;
        const t = n === 1 ? 0.5 : i / (n - 1);
        const rotate = n === 1 ? 0 : (t - 0.5) * maxRotate * 2;
        const arc = n === 1 ? 0 : -Math.sin(t * Math.PI) * arcLift;
        return (
          <div
            key={card.id}
            className="absolute"
            style={{
              top: arcLift,
              left: i * gap,
              zIndex: selected ? 50 : i + 1,
              transform: `translateY(${arc}px) rotate(${rotate}deg)`,
              transformOrigin: 'bottom center',
              transition: 'transform 0.15s ease',
            }}
          >
            <PlayingCard
              card={card}
              large
              selected={selected}
              onClick={() => handleCardClick(card)}
            />
          </div>
        );
      })}
    </div>
  );

  const orderBar = (
    <OrderBar
      compact={mobile}
      canNudge={Boolean(focusId)}
      onRank={() => setOrdered((cur) => sortHandByRank(cur))}
      onSuit={() => setOrdered((cur) => sortHandBySuit(cur))}
      onNudge={(delta) => {
        if (!focusId) return;
        setOrdered((cur) => moveCardInHand(cur, focusId, delta));
      }}
    />
  );

  if (mobile) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-white/30 text-[10px] uppercase tracking-widest">
            Your cards · {ordered.length}
          </span>
          {selectedCard && (
            <button onClick={() => setSelectedCard(null)} className="text-white/30 text-[10px]">
              ✕ Cancel
            </button>
          )}
        </div>

        {fan}
        {ordered.length > 1 && !hideOrder && orderBar}

        {selectedCard && canAct && (onPlay || onDiscard) && (
          <div className="flex gap-2 px-3 pb-3 animate-fade-in">
            {onPlay && (
              <button
                onClick={handlePlay}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition-all active:scale-95"
              >
                ↑ Play
              </button>
            )}
            {onDiscard && (
              <button
                onClick={handleDiscard}
                className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white/80 font-bold text-base transition-all active:scale-95"
              >
                Put aside
              </button>
            )}
          </div>
        )}
        {!quiet && !selectedCard && !pickedCardId && ordered.length > 0 && (
          <p className="text-white/20 text-[10px] text-center pb-3">
            {pickHint ?? 'Tap a card · Number / Shape / ← → to arrange'}
          </p>
        )}
        {!quiet && onPick && pickedCardId && pickHint && (
          <p className="text-gold/50 text-[10px] text-center pb-3">{pickHint}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-gold/60 text-xs tracking-widest uppercase font-medium">
        Your cards · {ordered.length} card{ordered.length !== 1 ? 's' : ''}
      </div>

      {fan}
      {ordered.length > 1 && orderBar}

      {selectedCard && canAct && (onPlay || onDiscard) && (
        <div className="flex gap-3 animate-fade-in">
          {onPlay && (
            <button
              onClick={handlePlay}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              ↑ Play to Table
            </button>
          )}
          {onDiscard && (
            <button
              onClick={handleDiscard}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white/80 font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            >
              Put aside
            </button>
          )}
          <button
            onClick={() => setSelectedCard(null)}
            className="px-4 py-2 rounded-lg text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {!selectedCard && !pickedCardId && ordered.length > 0 && (
        <p className="text-white/30 text-xs">{pickHint ?? 'Click a card · Number / Shape / ← → to arrange'}</p>
      )}
      {onPick && pickedCardId && pickHint && (
        <p className="text-gold/60 text-xs">{pickHint}</p>
      )}
    </div>
  );
}
