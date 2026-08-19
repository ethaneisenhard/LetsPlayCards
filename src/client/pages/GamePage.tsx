import { useCallback, useEffect, useState } from 'react';
import { connect, getState, join, sendAction, type Action } from '../lib/api';
import { rememberCurrentGame } from '../lib/current-games';
import { useChrome } from '../lib/chrome';
import { saveDisplayName } from '../lib/profile';
import { tableFor } from '../lib/registry';
import type { PublicState } from '../../game/engine';
import { GAME_CONFIGS } from '../../game/registry/catalog';
import { Lobby } from '../components/Lobby';

const playerKey = (code: string) => `lpc:player:${code}`;

export function GamePage({ code }: { code: string }) {
  const [state, setState] = useState<PublicState | null>(null);
  const [playerId, setPlayerId] = useState<string | undefined>(
    () => localStorage.getItem(playerKey(code)) ?? undefined,
  );
  const [name, setName] = useState(() => localStorage.getItem('lpc:name') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [connected, setConnected] = useState(false);
  const { setActiveGameType } = useChrome();

  useEffect(() => {
    const type = state?.game.gameType;
    if (type) setActiveGameType(type);
    return () => setActiveGameType(undefined);
  }, [state?.game.gameType, setActiveGameType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getState(code, playerId);
        if (!cancelled) {
          setState(s);
          setNotFound(false);
          if (playerId) {
            rememberCurrentGame({ code, gameType: s.game.gameType, rememberedAt: Date.now() });
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, playerId]);

  useEffect(() => {
    return connect(code, playerId, setState, () => setConnected(true), () => setConnected(false));
  }, [code, playerId]);

  useEffect(() => {
    if (connected) return;
    const t = setInterval(async () => {
      try {
        setState(await getState(code, playerId));
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [connected, code, playerId]);

  const currentPlayer = state?.players.find((p) => p.id === playerId) ?? null;

  const send = useCallback(
    async (action: Action) => {
      if (!playerId) return;
      setBusy(true);
      setError(null);
      try {
        setState(await sendAction(code, { ...action, playerId }));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [code, playerId],
  );

  async function handleJoin() {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { playerId: pid, state: s } = await join(code, trimmed);
      localStorage.setItem(playerKey(code), pid);
      saveDisplayName(trimmed);
      rememberCurrentGame({ code, gameType: s.game.gameType, rememberedAt: Date.now() });
      setPlayerId(pid);
      setState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-full bg-page flex flex-col items-center justify-center px-4 text-[color:var(--text)]">
        <div className="text-6xl mb-6">🃏</div>
        <h1 className="font-display text-3xl font-bold mb-2">Game not found</h1>
        <p className="text-[color:var(--muted)] mb-8">No game with code {code}.</p>
        <a href="/" className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all">
          Go Home
        </a>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-full bg-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const config = GAME_CONFIGS[state.game.gameType] ?? GAME_CONFIGS.freeplay;

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center px-4">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <span className="text-5xl mb-3">{config.emoji}</span>
            <h1 className="font-display text-white text-2xl font-bold mb-1">Join {config.name}</h1>
            <div className="text-gold font-mono font-bold text-xl tracking-[0.2em]">{code}</div>
            <p className="text-white/30 text-sm mt-1">
              {state.players.length} player{state.players.length !== 1 ? 's' : ''} in lobby
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="text-white/40 text-xs uppercase tracking-widest block mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={20}
                autoFocus
                required
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-4 text-white text-lg outline-none placeholder:text-white/20 focus:border-gold/40 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 rounded-2xl bg-linear-to-r from-emerald-600 to-emerald-500 text-white font-bold text-lg tracking-wide transition-all shadow-[0_4px_24px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? 'Joining…' : 'Take a Seat →'}
            </button>
          </form>
          <p className="text-white/20 text-xs text-center mt-6">No account needed. Jump right in.</p>
        </div>
      </div>
    );
  }

  if (state.game.status === 'lobby') {
    return (
      <Lobby
        game={state.game}
        players={state.players}
        currentPlayer={currentPlayer}
        busy={busy}
        onStart={() => send({ intent: 'start' })}
        onSettings={(patch) => send({ intent: 'update-settings', ...patch })}
      />
    );
  }

  if (state.game.status === 'finished') {
    const winnerId = (state.game.gameState as { winner?: string } | undefined)?.winner;
    const winner = winnerId ? state.players.find((p) => p.id === winnerId) : null;
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-6">{winner ? '🏆' : '🃏'}</div>
        <h1 className="font-display text-3xl font-bold mb-2">
          {winner ? `${winner.name} wins!` : 'Game Over'}
        </h1>
        <p className="text-white/40 mb-8">{winner ? 'Race finished — well played.' : 'Thanks for playing!'}</p>
        <a href="/" className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-all">
          Play Again
        </a>
      </div>
    );
  }

  const Table = tableFor(state.game.gameType);
  return <Table game={state.game} player={currentPlayer} players={state.players} send={send} busy={busy} />;
}
