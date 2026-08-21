import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayingCard } from './PlayingCard';
import {
  flightDelta,
  flightDurationMs,
  type Box,
  type CardFlightPlan,
} from '../lib/card-flight-pure';

function readBox(anchor: string): Box | null {
  const nodes = Array.from(document.querySelectorAll(`[data-card-anchor="${anchor}"]`));
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width >= 8 && r.height >= 8) {
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
  }
  return null;
}

function FlyingCard({
  plan,
  onDone,
}: {
  plan: CardFlightPlan;
  onDone: (key: string) => void;
}) {
  const [boxes, setBoxes] = useState<{ from: Box; to: Box } | null>(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    const duration = flightDurationMs(plan.kind);
    const tryRead = () => {
      if (cancelled) return;
      const from = readBox(plan.fromAnchor);
      const to = readBox(plan.toAnchor);
      if (from && to) {
        setBoxes({ from, to });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setGo(true);
          });
        });
        doneTimer = setTimeout(() => onDone(plan.key), duration + 40);
        return;
      }
      attempts += 1;
      if (attempts > 16) {
        onDone(plan.key);
        return;
      }
      requestAnimationFrame(tryRead);
    };
    startTimer = setTimeout(tryRead, plan.delayMs ?? 0);
    return () => {
      cancelled = true;
      if (doneTimer) clearTimeout(doneTimer);
      if (startTimer) clearTimeout(startTimer);
    };
  }, [plan.key, plan.fromAnchor, plan.toAnchor, plan.delayMs, plan.kind, onDone]);

  if (!boxes) return null;
  const { from, to } = boxes;
  const delta = flightDelta(from, to);
  const takeoff = plan.kind === 'play' ? (to.y < from.y ? -14 : 12) : plan.kind === 'deal' ? -18 : 6;
  const duration = flightDurationMs(plan.kind);

  return (
    <div
      style={{
        position: 'fixed',
        left: from.x,
        top: from.y,
        width: from.w,
        height: from.h,
        zIndex: 80,
        pointerEvents: 'none',
        transform: go
          ? `translate(${delta.dx}px, ${delta.dy}px) scale(${delta.scaleX}, ${delta.scaleY}) rotate(0deg)`
          : `translate(0, 0) scale(1) rotate(${takeoff}deg)`,
        transition: `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        transformOrigin: 'top left',
      }}
    >
      <div className="w-full h-full [&>button]:w-full [&>button]:h-full">
        <PlayingCard card={plan.card} faceDown={plan.faceDown} small={from.w < 50} quiet />
      </div>
    </div>
  );
}

export function CardFlightLayer({
  flights,
  onFlightDone,
}: {
  flights: CardFlightPlan[];
  onFlightDone: (key: string) => void;
}) {
  if (typeof document === 'undefined' || flights.length === 0) return null;
  return createPortal(
    <>
      {flights.map((plan) => (
        <FlyingCard key={plan.key} plan={plan} onDone={onFlightDone} />
      ))}
    </>,
    document.body,
  );
}
