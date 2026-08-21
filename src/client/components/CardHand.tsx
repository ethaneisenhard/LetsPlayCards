import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { PlayingCard } from './PlayingCard';
import type { Card } from '../../game/types';
import {
  dropIndexFromOffset,
  groupHandByPairs,
  moveCardToIndex,
  sortHandBySuit,
  syncHandOrder,
} from '../lib/hand-order-pure';
import { handCountLine, handReadout } from '../lib/hand-readout-pure';
import { youSeatLine } from '../lib/table-turn-pure';

interface CardHandProps {
  cards: Card[];
  onPick?: (card: Card) => void;
  pickedCardId?: string | null;
  pickedCardIds?: string[];
  pickHint?: string;
  playerName: string;
  isMyTurn?: boolean;
  mobile?: boolean;
  /** Hide arrange / pick hints when pills sit above the fan. */
  quiet?: boolean;
  hideOrder?: boolean;
  /** Ask / Play / Hit pills — immediately above the cards. */
  aboveFan?: ReactNode;
}

function OrderBar({
  compact,
  onPairs,
  onSuit,
}: {
  compact?: boolean;
  onPairs: () => void;
  onSuit: () => void;
}) {
  const btn = compact
    ? 'min-h-11 min-w-11 px-3 rounded-lg bg-white/10 text-white/85 text-sm font-semibold disabled:opacity-30'
    : 'px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold disabled:opacity-30';
  return (
    <div className="flex items-center justify-center gap-1 shrink-0">
      <button type="button" className={btn} onClick={onSuit}>
        Suit
      </button>
      <button type="button" className={btn} onClick={onPairs}>
        Pairs
      </button>
    </div>
  );
}

export function CardHand({
  cards,
  onPick,
  pickedCardId,
  pickedCardIds,
  pickHint: _pickHint,
  playerName,
  isMyTurn = true,
  mobile = false,
  quiet = false,
  aboveFan,
}: CardHandProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<Card[]>(() => [...cards]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; active: boolean } | null>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    setOrdered((prev) => syncHandOrder(prev, cards));
  }, [cards]);

  const canAct = isMyTurn && Boolean(onPick);

  function handleCardClick(card: Card) {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    setSelectedCard((selected) => (selected === card.id ? null : card.id));
    if (onPick && canAct) onPick(card);
  }

  const n = ordered.length;
  const cardW = mobile ? 64 : 88;
  const cardH = mobile ? 96 : 126;
  const maxFan = mobile ? 336 : 560;
  const gap = n <= 1 ? 0 : Math.max(12, Math.min(30, (maxFan - cardW) / (n - 1)));
  const fanW = n <= 1 ? cardW : cardW + gap * (n - 1);
  const maxRotate = draggingId ? 0 : mobile ? 6 : 9;
  const arcLift = draggingId ? 0 : 8;

  function slotAtClientX(clientX: number): number {
    const rect = fanRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return dropIndexFromOffset(clientX - rect.left, ordered.length, gap, cardW);
  }

  function onCardPointerDown(card: Card, e: ReactPointerEvent) {
    if (e.button !== 0) return;
    drag.current = { id: card.id, x: e.clientX, y: e.clientY, active: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onCardPointerMove(e: ReactPointerEvent) {
    const state = drag.current;
    if (!state) return;
    const dist = Math.abs(e.clientX - state.x) + Math.abs(e.clientY - state.y);
    if (!state.active && dist < 8) return;
    if (!state.active) {
      state.active = true;
      setDraggingId(state.id);
    }
    const next = slotAtClientX(e.clientX);
    setOrdered((cur) => moveCardToIndex(cur, state.id, next));
  }

  function onCardPointerUp() {
    if (drag.current?.active) skipClick.current = true;
    drag.current = null;
    setDraggingId(null);
  }

  const fan = n === 0 ? (
    <div className="h-8 flex items-center justify-center text-white/20 text-sm">No cards in hand</div>
  ) : (
    <div
      ref={fanRef}
      className="relative mx-auto touch-none"
      style={{ width: fanW, height: cardH + 16 }}
    >
      {ordered.map((card, i) => {
        const selected = onPick
          ? pickedCardIds?.includes(card.id) || pickedCardId === card.id || selectedCard === card.id
          : selectedCard === card.id;
        const t = n === 1 ? 0.5 : i / (n - 1);
        const rotate = n === 1 ? 0 : (t - 0.5) * maxRotate * 2;
        const arc = n === 1 ? 0 : -Math.sin(t * Math.PI) * arcLift;
        const dragging = draggingId === card.id;
        return (
          <div
            key={card.id}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              top: arcLift,
              left: i * gap,
              zIndex: dragging ? 80 : selected ? 50 : i + 1,
              transform: `translateY(${arc}px) rotate(${rotate}deg)`,
              transformOrigin: 'bottom center',
              transition: dragging ? 'none' : 'transform 0.15s ease, left 0.15s ease',
              opacity: dragging ? 0.75 : 1,
            }}
            onPointerDown={(e) => onCardPointerDown(card, e)}
            onPointerMove={onCardPointerMove}
            onPointerUp={onCardPointerUp}
            onPointerCancel={onCardPointerUp}
          >
            <PlayingCard
              card={card}
              large
              selected={selected || dragging}
              onClick={() => handleCardClick(card)}
            />
          </div>
        );
      })}
    </div>
  );

  const orderBar = n > 1 && (
    <OrderBar
      compact={mobile}
      onPairs={() => setOrdered((cur) => groupHandByPairs(cur))}
      onSuit={() => setOrdered((cur) => sortHandBySuit(cur))}
    />
  );

  const arrangeHint = 'Drag a card to move it · Suit groups shapes · Pairs groups the same number';

  if (mobile) {
    const readout = ordered.length > 0 ? `${handCountLine(ordered.length)}: ${handReadout(ordered)}` : handCountLine(0);
    return (
      <div className="flex flex-col gap-2" role="region" aria-label={youSeatLine(playerName, isMyTurn)}>
        <div className="flex items-start gap-2 px-2">
          <span className="min-w-0 flex-1 text-white text-xs font-semibold break-words">
            {youSeatLine(playerName, isMyTurn)}
          </span>
          {orderBar}
        </div>
        <p className="text-white/80 text-[11px] leading-snug px-2 break-words" aria-live="polite">
          {readout}
        </p>

        {aboveFan}
        {fan}
        {!quiet && !selectedCard && !pickedCardId && ordered.length > 1 && (
          <p className="text-white/60 text-xs text-center pb-3">{arrangeHint}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3" role="region" aria-label={youSeatLine(playerName, isMyTurn)}>
      <div className="text-white text-sm font-semibold">{youSeatLine(playerName, isMyTurn)}</div>
      <p className="text-white/85 text-sm text-center leading-snug px-4 break-words" aria-live="polite">
        {handCountLine(ordered.length)}
        {ordered.length > 0 ? `: ${handReadout(ordered)}` : ''}
      </p>

      {aboveFan}
      {fan}
      {orderBar}
      {!selectedCard && !pickedCardId && ordered.length > 1 && (
        <p className="text-white/60 text-xs">{arrangeHint}</p>
      )}
    </div>
  );
}
