import { useState } from 'react';
import { GLOSSARY } from '../../content/glossary';
import { GAME_CATALOG, GAME_CONFIGS } from '../../game/registry/catalog';
import type { GameType } from '../../game/gameTypes';
import type { GameFamily } from '../../game/registry/types';
import { auditGame } from '../../game/audit/playability-pure';
import { rulesCardFor } from '../lib/game-rules-pure';
import { RulesOverlay } from './RulesOverlay';

const FAMILY_ORDER: { family: GameFamily; label: string }[] = [
  { family: 'compare', label: 'Compare' },
  { family: 'collecting', label: 'Collecting' },
  { family: 'shedding', label: 'Shedding' },
  { family: 'trick', label: 'Trick-taking' },
  { family: 'meld', label: 'Meld' },
  { family: 'betting', label: 'Betting' },
  { family: 'solo', label: 'Solo' },
  { family: 'unique', label: 'Unique' },
];

const GROUPED = FAMILY_ORDER.map(({ family, label }) => ({
  label,
  games: GAME_CATALOG.filter((e) => e.family === family),
})).filter((g) => g.games.length > 0);

export function DevPlaygroundBar({
  gameType,
  playerCount,
  showState,
  onGameType,
  onPlayerCount,
  onReshuffle,
  onToggleState,
}: {
  gameType: GameType;
  playerCount: number;
  showState: boolean;
  onGameType: (type: GameType) => void;
  onPlayerCount: (n: number) => void;
  onReshuffle: () => void;
  onToggleState: () => void;
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const min = GAME_CONFIGS[gameType].minPlayers;
  const max = GAME_CONFIGS[gameType].maxPlayers;
  const audit = auditGame(gameType);
  const rules = rulesCardFor(GAME_CONFIGS[gameType], GLOSSARY[gameType]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full">
      <span className="px-1.5 py-0.5 rounded bg-gold/15 text-gold text-[10px] font-bold tracking-widest shrink-0">
        DEV
      </span>
      <select
        value={gameType}
        onChange={(e) => onGameType(e.target.value as GameType)}
        aria-label="Game"
        className="grow min-w-0 max-w-[14rem] bg-[color:var(--chip-bg)] border border-[color:var(--border)] rounded-lg px-2 py-1 text-[color:var(--text)] text-sm outline-none focus:border-gold/40"
      >
        {GROUPED.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.games.map((e) => (
              <option key={e.type} value={e.type}>
                {e.config.emoji} {e.config.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onPlayerCount(Math.max(min, playerCount - 1))}
          disabled={playerCount <= min}
          className="w-6 h-6 rounded-md bg-[color:var(--chip-bg)] text-[color:var(--text)] text-sm font-bold disabled:opacity-30"
        >
          −
        </button>
        <span className="w-5 text-center text-[color:var(--text)] text-xs font-bold tabular-nums">{playerCount}</span>
        <button
          onClick={() => onPlayerCount(Math.min(max, playerCount + 1))}
          disabled={playerCount >= max}
          className="w-6 h-6 rounded-md bg-[color:var(--chip-bg)] text-[color:var(--text)] text-sm font-bold disabled:opacity-30"
        >
          +
        </button>
      </div>
      <button
        onClick={onReshuffle}
        className="px-2 py-1 rounded-md bg-[color:var(--chip-bg)] text-[color:var(--text)] text-xs font-semibold shrink-0"
      >
        Reshuffle
      </button>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setRulesOpen((v) => !v)}
          aria-expanded={rulesOpen}
          className={`px-2 py-1 rounded-md text-xs font-semibold ${
            rulesOpen ? 'bg-gold/20 text-gold' : 'bg-[color:var(--chip-bg)] text-[color:var(--text)]'
          }`}
        >
          Rules
        </button>
        {rulesOpen && <RulesOverlay card={rules} onClose={() => setRulesOpen(false)} />}
      </div>
      <button
        onClick={onToggleState}
        className={`px-2 py-1 rounded-md text-xs font-semibold shrink-0 ${
          showState ? 'bg-gold/20 text-gold' : 'bg-[color:var(--chip-bg)] text-[color:var(--text)]'
        }`}
      >
        State
      </button>
      <span
        className={`text-[11px] font-semibold shrink-0 ${
          audit.engineReady && audit.tableReady ? 'text-white/50' : 'text-white'
        }`}
      >
        {audit.engineReady && audit.tableReady ? 'Felt-ready' : 'Not built yet'}
      </span>
    </div>
  );
}
