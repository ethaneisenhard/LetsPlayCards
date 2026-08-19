import { useEffect, useState } from 'react';
import { getState } from '../lib/api';
import { forgetCurrentGame, loadCurrentGames, rememberCurrentGame, type RememberedGame } from '../lib/current-games';
import { GAME_CONFIGS } from '../../game/registry/catalog';
import type { GameType } from '../../game/gameTypes';

type HydratedGame = RememberedGame & {
  status?: string;
  missing?: boolean;
};

function configFor(gameType: string) {
  return GAME_CONFIGS[gameType as GameType];
}

export function CurrentGamesSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [games, setGames] = useState<HydratedGame[]>(() => loadCurrentGames());

  useEffect(() => {
    if (!open) return;
    const listed = loadCurrentGames();
    setGames(listed);
    let cancelled = false;
    (async () => {
      const hydrated = await Promise.all(
        listed.map(async (game) => {
          try {
            const state = await getState(game.code);
            const next: RememberedGame = {
              code: game.code,
              gameType: state.game.gameType,
              rememberedAt: game.rememberedAt,
            };
            rememberCurrentGame(next);
            return { ...next, status: state.game.status };
          } catch {
            return { ...game, missing: true };
          }
        }),
      );
      if (!cancelled) setGames(hydrated);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function remove(code: string) {
    setGames(forgetCurrentGame(code));
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[60] animate-slide-up max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-[color:var(--border)] bg-[color:var(--sheet-bg)] shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
        <div className="sticky top-0 flex justify-center pt-3 pb-1 bg-[color:var(--sheet-bg)]">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-5 pt-2 pb-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[color:var(--text)] font-bold text-xl leading-tight">Current Games</h3>
              <p className="text-[color:var(--muted)] text-sm mt-0.5">Games you created or joined on this device</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-[color:var(--chip-bg)] text-[color:var(--muted)] text-sm flex items-center justify-center shrink-0"
            >
              ✕
            </button>
          </div>

          {games.length === 0 ? (
            <p className="text-[color:var(--muted)] text-sm py-8 text-center">
              No games yet — create one or join with a code.
            </p>
          ) : (
            <ul className="space-y-2">
              {games.map((game) => {
                const config = configFor(game.gameType);
                const status = game.missing ? 'ended' : (game.status ?? 'saved');
                return (
                  <li key={game.code}>
                    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--chip-bg)] px-3 py-3">
                      <a
                        href={`/game/${game.code}`}
                        className="flex-1 min-w-0 flex items-center gap-3"
                      >
                        <span className="text-2xl leading-none">{config?.emoji ?? '🃏'}</span>
                        <div className="min-w-0">
                          <div className="text-[color:var(--text)] font-semibold text-sm truncate">
                            {config?.name ?? 'Game'}
                          </div>
                          <div className="text-gold font-mono font-bold tracking-[0.15em] text-xs">
                            {game.code}
                          </div>
                          <div className="text-[color:var(--muted)] text-[11px] capitalize">{status}</div>
                        </div>
                      </a>
                      <button
                        onClick={() => remove(game.code)}
                        className="px-2.5 py-1.5 rounded-lg text-[color:var(--muted)] hover:text-[color:var(--text)] text-xs shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </>
  );
}
