import { useMemo, useRef, useState } from 'react';
import { PlayingCard } from './PlayingCard';
import type { Card } from '../../game/types';
import {
  findTableauPile,
  projectTableauBoard,
  tableauMoveAction,
  type TableauPile,
  type TableauSelection,
} from '../lib/tableau-board-pure';
import {
  autoFoundationKey,
  cardInSelection,
  cardsInSelection,
  dragPastThreshold,
  legalTableauDropKeys,
  resolveDropPileKey,
  resolveTableauClick,
  selectionFromCard,
  sourcePileKey,
} from '../lib/tableau-interact-pure';

const BACK: Card = { id: 'back', suit: 'spades', rank: 'A' };
const STACK_Y = 20;
const CARD_H = 84;

type DragSession = {
  sel: TableauSelection;
  startX: number;
  startY: number;
  dragging: boolean;
};

export function TableauBoard({
  gameType,
  gameState,
  viewerId,
  busy,
  onAction,
}: {
  gameType: string;
  gameState: Record<string, unknown> | undefined;
  viewerId?: string;
  busy?: boolean;
  onAction: (action: { intent: string; [k: string]: unknown }) => void;
}) {
  const projected = projectTableauBoard(gameType, gameState, viewerId);
  const [sel, setSel] = useState<TableauSelection | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; cards: Card[] } | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const board = projected;
  const legalKeys = useMemo(
    () => (board && sel ? new Set(legalTableauDropKeys(gameType, board, sel)) : new Set<string>()),
    [board, gameType, sel],
  );

  if (!board) return null;

  function applyClick(pile: TableauPile, card: Card | null, at: number) {
    if (busy) return;
    const result = resolveTableauClick({ pile, card, at, sel, legalKeys });
    if (result.type === 'stock') {
      if (board!.stockIntent) onAction({ intent: board!.stockIntent });
      return;
    }
    if (result.type === 'deselect') {
      setSel(null);
      return;
    }
    if (result.type === 'select') {
      setSel(result.sel);
      return;
    }
    if (result.type === 'move') {
      onAction(tableauMoveAction(gameType, sel!, result.to));
      setSel(null);
    }
  }

  function autoToFoundation(pile: TableauPile, card: Card, at: number) {
    if (busy) return;
    const next = selectionFromCard(pile, card, at);
    if (!next) return;
    const key = autoFoundationKey(gameType, board!, next);
    const dest = key ? findTableauPile(board!, key) : null;
    if (!dest) return;
    onAction(tableauMoveAction(gameType, next, dest));
    setSel(null);
  }

  function pileUnderPoint(x: number, y: number, sourceKey: string, skip?: HTMLElement | null): TableauPile | null {
    const hidden: Array<[HTMLElement, string]> = [];
    for (const el of [skip, ghostRef.current]) {
      if (!el) continue;
      hidden.push([el, el.style.pointerEvents]);
      el.style.pointerEvents = 'none';
    }
    const display = ghostRef.current?.style.display;
    if (ghostRef.current) ghostRef.current.style.display = 'none';
    try {
      const keys = document.elementsFromPoint(x, y).map((node) =>
        node instanceof Element ? node.closest('[data-pile-key]')?.getAttribute('data-pile-key') : null,
      );
      const key = resolveDropPileKey(keys, sourceKey);
      return key ? findTableauPile(board!, key) : null;
    } finally {
      if (ghostRef.current) ghostRef.current.style.display = display ?? '';
      for (const [el, prev] of hidden) el.style.pointerEvents = prev;
    }
  }

  function onCardPointerDown(
    event: React.PointerEvent,
    pile: TableauPile,
    card: Card,
    at: number,
  ) {
    if (busy || pile.kind === 'stock' || at < pile.buried) return;
    const next = selectionFromCard(pile, card, at);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { sel: next, startX: event.clientX, startY: event.clientY, dragging: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onCardPointerMove(event: React.PointerEvent, pile: TableauPile) {
    const session = dragRef.current;
    if (!session) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.dragging && dragPastThreshold(dx, dy)) {
      session.dragging = true;
      setSel(session.sel);
    }
    if (!session.dragging) return;
    const from = board!.columns
      .concat(board!.foundations, board!.freecells, board!.waste ? [board!.waste] : [])
      .find((p) => p.kind === session.sel.kind && p.index === session.sel.index) ?? pile;
    setGhost({ x: event.clientX, y: event.clientY, cards: cardsInSelection(from, session.sel) });
    const skip = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const over = pileUnderPoint(event.clientX, event.clientY, sourcePileKey(session.sel), skip);
    setHoverKey(over && legalTableauDropKeys(gameType, board!, session.sel).includes(over.key) ? over.key : null);
  }

  function onCardPointerUp(event: React.PointerEvent, pile: TableauPile, card: Card, at: number) {
    const session = dragRef.current;
    dragRef.current = null;
    const skip = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const dest = session
      ? pileUnderPoint(event.clientX, event.clientY, sourcePileKey(session.sel), skip)
      : null;
    setGhost(null);
    setHoverKey(null);
    if (!session) return;
    if (session.dragging) {
      if (dest) {
        onAction(tableauMoveAction(gameType, session.sel, dest));
        setSel(null);
      }
      return;
    }
    applyClick(pile, card, at);
  }

  function pileClass(pile: TableauPile, empty: boolean) {
    const selected = sel && sel.kind === pile.kind && sel.index === pile.index;
    const legal = legalKeys.has(pile.key);
    const hover = hoverKey === pile.key;
    return [
      'relative rounded-xl border-2 touch-none',
      empty
        ? 'border-dashed min-w-[48px] min-h-[68px] sm:min-w-[60px] sm:min-h-[84px] cursor-pointer'
        : 'border-solid min-w-[48px] min-h-[68px] sm:min-w-[60px] sm:min-h-[84px]',
      hover ? 'border-amber-300 bg-amber-300/10' : legal ? 'border-amber-400/70' : selected ? 'border-gold' : 'border-white/15',
    ].join(' ');
  }

  function renderCard(pile: TableauPile, card: Card, at: number, stacked: boolean) {
    const buried = at < pile.buried;
    const inRun = cardInSelection(pile, sel, card.id);
    return (
      <div
        key={`${card.id}-${at}`}
        className={`${stacked ? 'absolute left-0' : 'relative'} touch-none cursor-grab active:cursor-grabbing`}
        style={stacked ? { top: at * STACK_Y, zIndex: at + 1 } : undefined}
        onPointerDown={(e) => onCardPointerDown(e, pile, card, at)}
        onPointerMove={(e) => onCardPointerMove(e, pile)}
        onPointerUp={(e) => onCardPointerUp(e, pile, card, at)}
        onPointerCancel={() => {
          dragRef.current = null;
          setGhost(null);
          setHoverKey(null);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!buried) autoToFoundation(pile, card, at);
        }}
      >
        <PlayingCard
          card={buried || pile.kind === 'stock' ? BACK : card}
          faceDown={buried || pile.kind === 'stock'}
          tableau
          quiet
          selected={inRun}
          disabled={busy}
        />
      </div>
    );
  }

  function renderPile(pile: TableauPile, stacked: boolean) {
    const empty = pile.cards.length === 0;
    const wasteFan = pile.kind === 'waste' && pile.cards.length > 1;
    const wasteShown = wasteFan ? pile.cards.slice(-3) : pile.cards;
    return (
      <div
        key={pile.key}
        data-pile-key={pile.key}
        role="group"
        aria-label={pile.key}
        onClick={() => {
          if (pile.kind === 'stock' || empty) applyClick(pile, null, 0);
        }}
        className={pileClass(pile, empty)}
      >
        {empty ? (
          <span className="absolute inset-0 flex items-center justify-center text-white/25 text-[10px] uppercase tracking-wide">
            {pile.kind === 'foundation' ? 'A' : pile.kind === 'stock' ? '♻' : pile.kind === 'freecell' ? 'free' : ''}
          </span>
        ) : stacked ? (
          pile.cards.map((card, i) => renderCard(pile, card, i, true))
        ) : wasteFan ? (
          <div className="relative" style={{ width: 48 + (wasteShown.length - 1) * 18, height: CARD_H }}>
            {wasteShown.map((card, i) => {
              const at = pile.cards.length - wasteShown.length + i;
              return (
                <div key={`${card.id}-fan`} className="absolute top-0" style={{ left: i * 18, zIndex: i }}>
                  {renderCard(pile, card, at, false)}
                </div>
              );
            })}
          </div>
        ) : (
          renderCard(pile, pile.cards[pile.cards.length - 1], pile.cards.length - 1, false)
        )}
        {pile.kind === 'stock' && pile.cards.length > 0 && (
          <span className="absolute -bottom-5 left-0 right-0 text-center text-white/40 text-[10px] tabular-nums">
            {pile.cards.length}
          </span>
        )}
      </div>
    );
  }

  const colH = Math.max(CARD_H + 8, ...board.columns.map((c) => CARD_H + Math.max(0, c.cards.length - 1) * STACK_Y));

  return (
    <div className="flex flex-col items-center gap-5 max-w-full px-1 sm:px-3 select-none">
      <div className="flex items-start justify-center gap-3 sm:gap-6 w-full">
        <div className="flex items-start gap-2 sm:gap-3">
          {board.stock && renderPile(board.stock, false)}
          {board.waste && renderPile(board.waste, false)}
        </div>
        <div className="flex-1" />
        <div className="flex items-start gap-2 sm:gap-3">
          {board.freecells.map((p) => renderPile(p, false))}
          {board.foundations.map((p) => renderPile(p, false))}
        </div>
      </div>
      <div className="flex items-start justify-center gap-1.5 sm:gap-2.5 overflow-x-auto pb-2 w-full" style={{ minHeight: colH }}>
        {board.columns.map((p) => (
          <div
            key={p.key}
            data-pile-key={p.key}
            className="relative shrink-0"
            style={{ width: 62, height: colH }}
          >
            {renderPile(p, true)}
          </div>
        ))}
      </div>
      <p className="text-white/40 text-[11px]">Click a card then a pile — or drag. Double-click to send home.</p>
      {ghost && ghost.cards.length > 0 && (
        <div
          ref={ghostRef}
          data-drag-ghost="1"
          className="fixed z-[80] pointer-events-none [&_*]:pointer-events-none"
          style={{ left: ghost.x - 30, top: ghost.y - 20 }}
        >
          {ghost.cards.map((card, i) => (
            <div key={card.id} className="absolute" style={{ top: i * 18, left: i * 2 }}>
              <PlayingCard card={card} tableau quiet selected />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
