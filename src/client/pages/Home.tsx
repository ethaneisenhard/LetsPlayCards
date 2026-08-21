import { useRef, useState } from 'react';
import { createGame, getState } from '../lib/api';
import { rememberCurrentGame } from '../lib/current-games';
import { isLocalHost } from '../lib/host-pure';
import { GAME_CATALOG, LIVE_GAMES } from '../../game/registry/catalog';
import type { GameType } from '../../game/gameTypes';

type Sheet =
  | { kind: 'rules'; gameType: GameType }
  | { kind: 'create'; gameType: GameType };

export function Home() {
  const [joinCode, setJoinCode] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const showDevLink = isLocalHost(window.location.hostname);

  async function handleCreate(gameType: GameType) {
    setBusy('create');
    setError(null);
    try {
      const code = await createGame(gameType);
      rememberCurrentGame({ code, gameType, rememberedAt: Date.now() });
      window.location.href = `/game/${code}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
      setSheet(null);
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Enter the 6-character code to join.');
      return;
    }
    setBusy('join');
    setError(null);
    try {
      const state = await getState(code);
      rememberCurrentGame({ code, gameType: state.game.gameType, rememberedAt: Date.now() });
      window.location.href = `/game/${code}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  function openRules(gameType: GameType) {
    setSelectedGame(gameType);
    setSheet({ kind: 'rules', gameType });
  }

  function navCreate() {
    if (selectedGame) {
      setError(null);
      setSheet({ kind: 'create', gameType: selectedGame });
      return;
    }
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setError('Choose a game above, then tap Create.');
  }

  const sheetEntry = sheet ? LIVE_GAMES.find((e) => e.type === sheet.gameType) : null;

  return (
    <div className="relative min-h-full bg-page flex flex-col items-center overflow-x-hidden px-4 pt-8 pb-40">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-900/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-3xl">
        <div className="flex gap-3 text-3xl sm:text-4xl mb-4">
          <span className="text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.6)]">♥</span>
          <span className="text-white/90">♠</span>
          <span className="text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.6)]">♦</span>
          <span className="text-white/90">♣</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-[color:var(--text)] tracking-tight text-center mb-2">
          Let&apos;s Play <span className="text-gold">Cards</span>
        </h1>
        <p className="text-[color:var(--muted)] text-sm sm:text-lg mb-8 text-center">
          {GAME_CATALOG.length} games · pick one, then Join or Create
        </p>

        <div ref={gridRef} className="w-full scroll-mt-24">
          <div className="flex items-center gap-3 w-full mb-4">
            <h2 className="text-[color:var(--muted)] text-xs uppercase tracking-widest shrink-0">Choose a game</h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full">
            {LIVE_GAMES.map((entry) => {
              const config = entry.config;
              const active = selectedGame === entry.type;
              return (
                <div
                  key={entry.type}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedGame(entry.type)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedGame(entry.type);
                    }
                  }}
                  className={[
                    'relative flex flex-col items-start p-3.5 sm:p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer',
                    'bg-linear-to-br',
                    config.color,
                    active
                      ? 'border-gold/60 shadow-[0_0_24px_rgba(201,168,76,0.25)]'
                      : 'border-white/10 hover:border-white/25',
                  ].join(' ')}
                >
                  {active && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                      <span className="text-black text-[10px] font-bold">✓</span>
                    </div>
                  )}
                  <span className="text-2xl sm:text-3xl mb-2 sm:mb-3">{config.emoji}</span>
                  <span className="text-white font-bold text-sm sm:text-lg leading-tight">{config.name}</span>
                  <span className="text-white/50 text-[11px] sm:text-xs mt-0.5 sm:mt-1 leading-relaxed line-clamp-2">
                    {config.tagline}
                  </span>
                  <div className="mt-auto pt-2 w-full flex items-end justify-between gap-2">
                    <span className="text-white/30 text-[10px]">
                      {config.minPlayers === config.maxPlayers
                        ? `${config.minPlayers} players`
                        : `${config.minPlayers}–${config.maxPlayers} players`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRules(entry.type);
                      }}
                      aria-label={`${config.name} rules`}
                      className="px-2 py-1 rounded-lg border border-white/15 bg-black/25 hover:border-gold/50 hover:bg-black/40 text-white/80 hover:text-gold text-[10px] font-semibold tracking-wide transition-all shrink-0"
                    >
                      Rules
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-white/20 text-xs text-center mt-12">
          No account needed · Works on any device
        </p>
        {showDevLink && (
          <a
            href="/playground"
            className="inline-block mt-3 text-white/25 hover:text-gold/80 text-xs transition-colors"
          >
            Dev playground
          </a>
        )}
      </div>

      {sheet && sheetEntry && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSheet(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[60] animate-slide-up max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0d1424] shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
            <div className="sticky top-0 flex justify-center pt-3 pb-1 bg-[#0d1424]">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-5 pt-2 pb-10">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-4xl leading-none">{sheetEntry.config.emoji}</span>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-xl leading-tight">{sheetEntry.config.name}</h3>
                  <p className="text-white/50 text-sm mt-0.5">{sheetEntry.config.tagline}</p>
                </div>
                <button
                  onClick={() => setSheet(null)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 text-sm flex items-center justify-center shrink-0"
                >
                  ✕
                </button>
              </div>

              {sheet.kind === 'rules' ? (
                <>
                  <p className="text-white/70 text-sm mb-4">{sheetEntry.config.description}</p>
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-2.5">How to play</p>
                  <ul className="space-y-2 mb-5">
                    {sheetEntry.config.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/70 text-sm">
                        <span className="text-gold/70 mt-0.5 shrink-0">›</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`/games/${sheetEntry.type}/`}
                    className="inline-block text-gold/80 hover:text-gold text-sm transition-colors"
                  >
                    Read the full rules →
                  </a>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-sm mb-5">How do you want to play?</p>
                  <button
                    onClick={() => handleCreate(sheet.gameType)}
                    disabled={busy !== null}
                    className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-base tracking-wide transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {busy === 'create' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Creating…
                      </span>
                    ) : (
                      `With friends — create ${sheetEntry.config.name}`
                    )}
                  </button>
                  <a
                    href={`/solo/${sheet.gameType}`}
                    className="mt-2 block w-full py-3 rounded-xl border border-white/15 bg-white/5 text-white font-semibold text-base text-center tracking-wide hover:border-gold/40 transition-all"
                  >
                    Vs bots — play {sheetEntry.config.name} solo
                  </a>
                </>
              )}
              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[color:var(--border)] bg-[color:var(--header-bg)] backdrop-blur-lg">
        {error && (
          <div className="bg-red-500/15 border-b border-red-500/10 text-red-400 text-xs text-center px-4 py-2">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2 max-w-3xl mx-auto px-3 py-2.5">
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="CODE"
              maxLength={6}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="flex-1 min-w-0 bg-[color:var(--chip-bg)] border border-[color:var(--border)] rounded-xl px-3 py-2.5 text-[color:var(--text)] font-mono font-bold text-base tracking-[0.15em] text-center outline-none placeholder:opacity-40 focus:border-gold/40 transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={busy !== null || joinCode.length !== 6}
              className="px-4 py-2.5 rounded-xl bg-[color:var(--chip-bg)] hover:border-gold/40 text-[color:var(--text)] font-bold text-sm tracking-wide border border-[color:var(--border)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {busy === 'join' ? '…' : 'Join'}
            </button>
          </div>

          <button
            onClick={navCreate}
            disabled={busy !== null}
            className="px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm tracking-wide shadow-[0_2px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {busy === 'create' ? '…' : 'Create'}
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
