import type { TurnStripTone } from '../lib/table-turn-pure';

/**
 * Compact turn line in the middle of the board — not a second header.
 * Words name whose turn; color is only extra contrast on the felt.
 */
export function FeltTurnHint({
  line,
  tone,
  skipDeal,
}: {
  line: string;
  tone: TurnStripTone;
  skipDeal?: () => void;
}) {
  const you = tone === 'you' || tone === 'deal';
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center px-2 shrink-0 z-20">
      <div
        className={`flex items-center justify-center gap-2 max-w-full px-3 py-2 rounded-full ${
          you ? 'bg-black/50 text-white' : 'bg-black/40 text-white/95'
        }`}
      >
        <p className="text-sm font-semibold text-center leading-snug break-words">{line}</p>
        {skipDeal && (
          <button
            type="button"
            onClick={skipDeal}
            className="shrink-0 h-9 min-h-9 px-3 rounded-full bg-white text-slate-900 text-sm font-bold"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
