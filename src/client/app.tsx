import { AppHeader } from './components/AppHeader';
import { ChromeProvider } from './lib/chrome';
import { isGameType } from '../game/registry/catalog';
import { Home } from './pages/Home';
import { GamePage } from './pages/GamePage';
import { Playground } from './pages/Playground';
import { SoloPage } from './pages/SoloPage';

function Route() {
  if (window.location.pathname.startsWith('/playground')) return <Playground />;
  const solo = window.location.pathname.match(/^\/solo\/([a-z0-9_]+)\/?$/);
  if (solo && isGameType(solo[1])) return <SoloPage gameType={solo[1]} />;
  const match = window.location.pathname.match(/^\/game\/([A-Za-z0-9]+)\/?$/);
  if (match) return <GamePage code={match[1].toUpperCase()} />;
  return <Home />;
}

export function App() {
  return (
    <ChromeProvider>
      <div className="h-dvh max-h-dvh flex flex-col bg-page overflow-hidden">
        <AppHeader />
        <div className="flex-1 min-h-0 flex flex-col w-full overflow-y-auto">
          <Route />
        </div>
      </div>
    </ChromeProvider>
  );
}
