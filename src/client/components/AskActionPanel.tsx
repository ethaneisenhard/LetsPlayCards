import { ANYONE_TARGET_ID } from '../lib/ask-action-pure';

const chip =
  'rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const chipDesk = `${chip} px-3 py-1.5 text-sm`;
const chipPhone = `${chip} min-h-11 min-w-11 px-4 text-base`;
const chipIdle = 'bg-white/10 hover:bg-white/20 text-white';
const chipOn = 'bg-gold text-slate-900';

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
  phone,
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
  phone?: boolean;
}) {
  const whoSelected = selectedTargetId ?? (includeAnyone ? ANYONE_TARGET_ID : null);
  const chipSize = phone ? chipPhone : chipDesk;
  return (
    <div className={`flex flex-col items-center w-full ${phone ? 'gap-2 max-w-none px-1' : 'gap-2.5 max-w-sm px-2'}`}>
      {!phone && <p className="text-gold/80 text-xs tracking-widest uppercase font-semibold">{title}</p>}
      {hint && !phone && <p className="text-white/55 text-xs text-center leading-snug">{hint}</p>}
      {ranks && ranks.length > 0 && onSelectRank && (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-white/40 text-[10px] uppercase tracking-widest">Number or face</span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {ranks.map((rank) => (
              <button
                key={rank}
                type="button"
                disabled={disabled}
                aria-pressed={selectedRank === rank}
                onClick={() => onSelectRank(rank)}
                className={`${chipSize} ${selectedRank === rank ? chipOn : chipIdle}`}
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
                className={`${chipSize} ${whoSelected === ANYONE_TARGET_ID ? chipOn : chipIdle}`}
              >
                Anyone{!phone && anyoneName ? ` · ${anyoneName}` : ''}
              </button>
            )}
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                aria-pressed={whoSelected === t.id}
                onClick={() => onSelectTarget(t.id)}
                className={`${chipSize} ${whoSelected === t.id ? chipOn : chipIdle}`}
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
        className={`w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/35 disabled:cursor-not-allowed text-white font-bold shadow-lg ${
          phone ? 'max-w-none min-h-12 px-4 py-3 text-base' : 'max-w-xs px-4 py-2.5 text-sm'
        }`}
      >
        {submitLabel}
      </button>
    </div>
  );
}
