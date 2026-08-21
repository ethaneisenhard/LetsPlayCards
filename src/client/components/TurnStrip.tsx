import type { TurnStripTone } from '../lib/table-turn-pure';

const TONE: Record<TurnStripTone, string> = {
  you: 'bg-amber-300 text-slate-900',
  deal: 'bg-amber-300 text-slate-900',
  them: 'bg-slate-800 text-white',
  busy: 'bg-slate-800 text-white',
  won: 'bg-emerald-700 text-white',
};

export function TurnStrip({
  line,
  tone,
  skipDeal,
}: {
  line: string;
  tone: TurnStripTone;
  skipDeal?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative z-20 flex items-center justify-center gap-3 px-3 sm:px-4 py-2.5 min-h-12 shrink-0 border-b border-black/10 ${TONE[tone]}`}
    >
      <p className="text-sm sm:text-base font-semibold text-center leading-snug max-w-3xl">
        {line}
      </p>
      {skipDeal && (
        <button
          type="button"
          onClick={skipDeal}
          className="shrink-0 min-h-11 min-w-11 px-3 rounded-lg bg-slate-900 text-amber-100 text-sm font-bold"
        >
          Skip
        </button>
      )}
    </div>
  );
}
