import type { GameRulesCard } from '../lib/game-rules-pure';

export function RulesOverlay({ card, onClose }: { card: GameRulesCard; onClose?: () => void }) {
  return (
    <aside
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 max-h-[min(22rem,70vh)] overflow-y-auto rounded-xl border border-white/15 bg-[#0d1424] shadow-2xl p-2.5 text-left"
      aria-label={`${card.name} rules`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm leading-none" aria-hidden>
          {card.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-white font-semibold text-[11px] leading-tight truncate">{card.name}</div>
          <div className="text-white/40 text-[10px] truncate">
            {card.tagline} · {card.players}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="w-5 h-5 rounded-md text-white/50 hover:text-white hover:bg-white/10 text-xs leading-none shrink-0"
          >
            ✕
          </button>
        )}
      </div>
      {card.win && (
        <p className="text-gold text-[10px] leading-snug mb-1.5">
          <span className="font-bold uppercase tracking-wide">Win: </span>
          {card.win}
        </p>
      )}
      <ol className="space-y-1">
        {card.steps.map((step, i) => (
          <li key={i} className="flex gap-1.5 text-white/75 text-[10px] leading-snug">
            <span className="text-gold/60 tabular-nums shrink-0 w-3">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
