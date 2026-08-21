import { ANYONE_TARGET_ID } from '../lib/ask-action-pure';

const chip =
  'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const chipIdle = `${chip} bg-white/10 hover:bg-white/20 text-white`;
const chipOn = `${chip} bg-gold text-slate-900`;

export function AskActionPanel({
  title,
  hint,
  ranks,
  selectedRank,
  onSelectRank,
  targets,
  selectedTargetId,
  onSelectTarget,
  includeAnyone,
  anyoneName,
  disabled,
  submitLabel,
  submitDisabled,
  onSubmit,
}: {
  title: string;
  hint?: string;
  ranks?: string[];
  selectedRank?: string | null;
  onSelectRank?: (rank: string) => void;
  targets: { id: string; name: string }[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  includeAnyone?: boolean;
  anyoneName?: string | null;
  disabled?: boolean;
  submitLabel: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
}) {
  const whoSelected = selectedTargetId ?? (includeAnyone ? ANYONE_TARGET_ID : null);
  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-sm px-2">
      <p className="text-gold/80 text-xs tracking-widest uppercase font-semibold">{title}</p>
      {hint && <p className="text-white/55 text-xs text-center leading-snug">{hint}</p>}
      {ranks && ranks.length > 0 && onSelectRank && (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-white/40 text-[10px] uppercase tracking-widest">Rank you hold</span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {ranks.map((rank) => (
              <button
                key={rank}
                type="button"
                disabled={disabled}
                aria-pressed={selectedRank === rank}
                onClick={() => onSelectRank(rank)}
                className={selectedRank === rank ? chipOn : chipIdle}
              >
                {rank}
              </button>
            ))}
          </div>
        </div>
      )}
      {targets.length > 0 && (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-white/40 text-[10px] uppercase tracking-widest">Who</span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {includeAnyone && (
              <button
                type="button"
                disabled={disabled}
                aria-pressed={whoSelected === ANYONE_TARGET_ID}
                onClick={() => onSelectTarget(ANYONE_TARGET_ID)}
                className={whoSelected === ANYONE_TARGET_ID ? chipOn : chipIdle}
              >
                Anyone{anyoneName ? ` · ${anyoneName}` : ''}
              </button>
            )}
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                aria-pressed={whoSelected === t.id}
                onClick={() => onSelectTarget(t.id)}
                className={whoSelected === t.id ? chipOn : chipIdle}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={disabled || submitDisabled}
        onClick={onSubmit}
        className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/35 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg"
      >
        {submitLabel}
      </button>
    </div>
  );
}
