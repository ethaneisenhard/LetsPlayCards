import { GAME_CONFIGS } from '../../game/registry/catalog';
import type { GameType } from '../../game/gameTypes';
import { tableFor } from '../lib/registry';
import { useLocalBotMatch } from '../lib/use-local-bot-match';

export function LocalMatch({
  gameType,
  playerCount,
  seed,
  showEngineState = false,
  onCloseEngineState,
}: {
  gameType: GameType;
  playerCount: number;
  seed: number;
  showEngineState?: boolean;
  onCloseEngineState?: () => void;
}) {
  const config = GAME_CONFIGS[gameType] ?? GAME_CONFIGS.freeplay;
  const { view, human, send, canAct, busy, error, buildError, botName } = useLocalBotMatch(
    gameType,
    playerCount,
    seed,
  );
  const Table = tableFor(gameType);

  if (buildError || !view || !human) {
    return (
      <div className="h-full min-h-0 flex flex-col items-center justify-center px-4 text-[color:var(--text)]">
        <p className="font-semibold mb-2">Couldn&apos;t start {config.name} vs bots.</p>
        <p className="text-red-400 text-sm mb-6">{buildError}</p>
        <a href="/" className="text-gold text-sm">← Home</a>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col">
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-red-950/90 border border-red-500/40 text-red-100 text-sm">
          {error}
        </div>
      )}
      <Table
        game={view.game}
        player={human}
        players={view.players}
        send={send}
        busy={busy}
        busyHint={`${botName} is playing…`}
        showInvite={false}
        canAct={canAct}
      />
      {showEngineState && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={onCloseEngineState} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0d1424] border-l border-white/10 overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0d1424]">
              <span className="text-white font-bold">{config.name}</span>
              <button onClick={onCloseEngineState} className="w-8 h-8 rounded-full bg-white/10 text-white/70 text-sm">
                ✕
              </button>
            </div>
            <pre className="p-4 text-[11px] text-emerald-200/80 whitespace-pre-wrap break-words">
              {JSON.stringify(view, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
