import { useState } from 'react';
import type { GameView, PlayerView } from '../lib/types';
import { GAME_CONFIGS } from '../../game/registry/catalog';
import type { FreePlayRules } from '../../game/types';
import { DEFAULT_FREEPLAY_RULES } from '../../game/types';

interface LobbyProps {
  game: GameView;
  players: PlayerView[];
  currentPlayer: PlayerView;
  busy: boolean;
  onStart: () => void;
  onSettings: (patch: { dealCount?: number; freeplay?: FreePlayRules }) => void;
}

export function Lobby({ game, players, currentPlayer, busy, onStart, onSettings }: LobbyProps) {
  const gameUrl = `${window.location.origin}/game/${game.code}`;
  const config = GAME_CONFIGS[game.gameType] ?? GAME_CONFIGS.freeplay;
  const isCreator = currentPlayer.isCreator;
  const canStart = players.length >= config.minPlayers;
  const isFreePlay = game.gameType === 'freeplay';
  const fp = game.settings.freeplay ?? DEFAULT_FREEPLAY_RULES;
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center px-4 py-8 sm:py-12 overflow-y-auto">
      <div className="mb-6 flex flex-col items-center">
        <span className="text-5xl mb-2">{config.emoji}</span>
        <h1 className="text-white/90 font-display text-2xl font-bold tracking-tight">{config.name}</h1>
        <p className="text-white/30 text-sm text-center mt-1 max-w-xs">{config.tagline}</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-white/30 text-[10px] tracking-widest uppercase mb-1 text-center">Share code</p>
          <div className="text-gold font-mono text-5xl font-bold tracking-[0.2em] text-center mb-3">
            {game.code}
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
            <input
              readOnly
              value={gameUrl}
              className="flex-1 bg-transparent text-white/40 text-xs outline-none truncate font-mono"
            />
            <button
              onClick={copyLink}
              className="text-gold/70 hover:text-gold text-xs font-semibold tracking-wide transition-colors shrink-0 px-1"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">How to play</p>
          <ul className="space-y-1.5">
            {config.rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-white/50 text-sm">
                <span className="text-gold/50 mt-0.5 shrink-0">›</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {isCreator && isFreePlay && (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Game Rules</p>

            <div className="flex items-center justify-between mb-3">
              <label className="text-white/50 text-sm">Cards per player</label>
              <select
                value={game.settings.dealCount}
                onChange={(e) => onSettings({ dealCount: Number(e.currentTarget.value) })}
                className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm border border-white/20 outline-none focus:border-gold/50"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10, 13].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between mb-3">
              <label className="text-white/50 text-sm">How to win</label>
              <select
                value={fp.winCondition}
                onChange={(e) =>
                  onSettings({ freeplay: { ...fp, winCondition: e.currentTarget.value as FreePlayRules['winCondition'] } })
                }
                className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm border border-white/20 outline-none focus:border-gold/50"
              >
                <option value="empty-hand">First to empty hand</option>
                <option value="most-table">Most cards on table</option>
                <option value="highest-total">Highest card total</option>
                <option value="never">No winner — free play</option>
              </select>
            </div>

            <div className="flex items-center justify-between mb-3">
              <label className="text-white/50 text-sm">Draw per turn</label>
              <select
                value={fp.drawCount}
                onChange={(e) => onSettings({ freeplay: { ...fp, drawCount: Number(e.currentTarget.value) } })}
                className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm border border-white/20 outline-none focus:border-gold/50"
              >
                <option value={1}>1 card</option>
                <option value={2}>2 cards</option>
                <option value={3}>3 cards</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-white/50 text-sm">Play rule</label>
              <select
                value={fp.playRule}
                onChange={(e) =>
                  onSettings({ freeplay: { ...fp, playRule: e.currentTarget.value as FreePlayRules['playRule'] } })
                }
                className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm border border-white/20 outline-none focus:border-gold/50"
              >
                <option value="any">Anything goes</option>
                <option value="match-rank">Match rank</option>
                <option value="match-suit">Match suit</option>
                <option value="match-rank-or-suit">Match rank or suit</option>
              </select>
            </div>

            {fp.playRule !== 'any' && (
              <p className="text-white/25 text-xs mt-3">Cards you play must match the top of the discard pile.</p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/30 text-[10px] tracking-widest uppercase">Players</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white/30 text-xs">
                {players.length} joined · {config.minPlayers}–{config.maxPlayers} players
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {players.map((player, i) => (
              <div
                key={player.id}
                className={[
                  'flex items-center gap-3 rounded-xl p-3 border transition-all',
                  player.id === currentPlayer.id
                    ? 'border-gold/30 bg-gold/5'
                    : 'border-white/5 bg-white/2',
                ].join(' ')}
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500/40 to-emerald-900/60 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/90 text-sm font-medium truncate">{player.name}</span>
                    {player.id === currentPlayer.id && (
                      <span className="text-[10px] text-gold/60 font-medium shrink-0">You</span>
                    )}
                    {player.isCreator && (
                      <span className="text-[10px] text-amber-400/60 font-medium shrink-0">Host</span>
                    )}
                  </div>
                  <span className="text-white/25 text-xs">Seat {i + 1}</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500/70 shrink-0" />
              </div>
            ))}
          </div>

          {players.length < config.minPlayers && (
            <p className="text-white/25 text-xs text-center mt-4">
              Need at least {config.minPlayers} players to start
            </p>
          )}
        </div>

        {isCreator ? (
          <button
            onClick={onStart}
            disabled={!canStart || busy}
            className={[
              'w-full py-4 rounded-2xl font-bold text-lg tracking-wide transition-all',
              canStart
                ? 'bg-linear-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_4px_24px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed',
            ].join(' ')}
          >
            {busy ? 'Dealing cards…' : '▶ Start Game'}
          </button>
        ) : (
          <div className="text-center text-white/30 text-sm py-4">
            Waiting for the host to start the game…
          </div>
        )}
      </div>
    </div>
  );
}
