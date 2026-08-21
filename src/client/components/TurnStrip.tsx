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
  compact,
}: {
  line: string;
  tone: TurnStripTone;
  skipDeal?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative z-20 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 border-b border-black/10 ${
        compact ? 'py-1 min-h-9 sm:min-h-12 sm:py-2.5' : 'py-2.5 min-h-12'
      } ${TONE[tone]}`}
    >
      <p
        className={`font-semibold text-center max-w-3xl ${
          compact
            ? 'text-sm leading-tight line-clamp-1 sm:line-clamp-none sm:text-base sm:leading-snug'
            : 'text-sm sm:text-base leading-snug'
        }`}
        title={line}
      >
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
