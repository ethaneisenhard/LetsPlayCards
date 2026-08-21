import { useEffect, useState } from 'react';
import type { ActionBarModel, ActionPill } from '../lib/action-pills-pure';

const PILL =
  'shrink-0 h-9 min-h-9 px-3 rounded-full text-sm font-semibold whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed';
const KIND: Record<ActionPill['kind'], string> = {
  target: 'bg-white/15 text-white',
  primary: 'bg-emerald-700 text-white',
  secondary: 'bg-white/10 text-white',
};
const PRESSED = 'bg-gold text-slate-900';

export function ActionPillBar({
  bar,
  onPill,
}: {
  bar: ActionBarModel;
  onPill: (pill: ActionPill) => void;
}) {
  const [mounted, setMounted] = useState(bar.open);
  const [shown, setShown] = useState(bar.open);

  useEffect(() => {
    if (bar.open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [bar.open]);

  if (!mounted || bar.pills.length === 0) return null;

  return (
    <div className="overflow-hidden">
      <div
        role="toolbar"
        aria-label="Your next move"
        aria-hidden={!shown}
        className={`overflow-x-auto scrollbar-none touch-pan-x motion-reduce:transition-none motion-reduce:translate-y-0 transition-[transform,opacity] duration-200 ease-out ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-center gap-1 px-2 py-1 w-max min-w-full justify-center">
          {bar.pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              disabled={pill.disabled}
              aria-pressed={pill.pressed}
              onClick={() => onPill(pill)}
              className={`${PILL} ${pill.pressed ? PRESSED : KIND[pill.kind]}`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
