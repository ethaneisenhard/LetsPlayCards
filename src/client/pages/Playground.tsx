import { useEffect, useState } from 'react';
import { GAME_CONFIGS } from '../../game/registry/catalog';
import type { GameType } from '../../game/gameTypes';
import { DevPlaygroundBar } from '../components/DevPlaygroundBar';
import { LocalMatch } from '../components/LocalMatch';
import { useChrome } from '../lib/chrome';
import { playgroundPath, playgroundTypeFromPath } from '../lib/playground-route-pure';

export function Playground() {
  const { setNavTools } = useChrome();
  const [gameType, setGameType] = useState<GameType>(() => playgroundTypeFromPath(window.location.pathname));
  const [playerCount, setPlayerCount] = useState<number>(() => GAME_CONFIGS[playgroundTypeFromPath(window.location.pathname)].minPlayers);
  const [seed, setSeed] = useState(0);
  const [showState, setShowState] = useState(false);

  function changeGame(t: GameType) {
    setGameType(t);
    setPlayerCount(GAME_CONFIGS[t].minPlayers);
    const path = playgroundPath(t);
    if (window.location.pathname !== path) history.pushState(null, '', path);
  }

  useEffect(() => {
    const path = playgroundPath(gameType);
    if (window.location.pathname !== path) history.replaceState(null, '', path);
    const onPop = () => {
      const next = playgroundTypeFromPath(window.location.pathname);
      setGameType(next);
      setPlayerCount(GAME_CONFIGS[next].minPlayers);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    setNavTools(
      <DevPlaygroundBar
        gameType={gameType}
        playerCount={playerCount}
        showState={showState}
        onGameType={changeGame}
        onPlayerCount={setPlayerCount}
        onReshuffle={() => setSeed((s) => s + 1)}
        onToggleState={() => setShowState((v) => !v)}
      />,
    );
    return () => setNavTools(null);
  }, [gameType, playerCount, showState, setNavTools]);

  return (
    <div className="flex-1 h-full min-h-0 relative flex flex-col">
      <LocalMatch
        gameType={gameType}
        playerCount={playerCount}
        seed={seed}
        showEngineState={showState}
        onCloseEngineState={() => setShowState(false)}
      />
    </div>
  );
}
