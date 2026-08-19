import { GAME_CONFIGS } from '../../game/registry/catalog';
import type { GameType } from '../../game/gameTypes';
import { LocalMatch } from '../components/LocalMatch';

export function SoloPage({ gameType }: { gameType: GameType }) {
  const config = GAME_CONFIGS[gameType] ?? GAME_CONFIGS.freeplay;
  return (
    <div className="flex-1 h-full min-h-0 flex flex-col">
      <LocalMatch
        gameType={gameType}
        playerCount={config.minPlayers === 1 ? 1 : Math.max(2, config.minPlayers)}
        seed={0}
      />
    </div>
  );
}
