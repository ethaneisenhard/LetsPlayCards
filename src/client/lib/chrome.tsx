import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { CurrentGamesSheet } from '../components/CurrentGamesSheet';
import { SettingsSheet } from '../components/SettingsSheet';

type ChromeApi = {
  openGames: () => void;
  openSettings: () => void;
  activeGameType?: string;
  setActiveGameType: (gameType?: string) => void;
  navTools: ReactNode;
  setNavTools: (node: ReactNode) => void;
  /** Trailing header slot — sits immediately left of the profile control. */
  navEnd: ReactNode;
  setNavEnd: (node: ReactNode) => void;
};

const ChromeContext = createContext<ChromeApi | null>(null);

export function useChrome(): ChromeApi {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error('useChrome requires ChromeProvider');
  return ctx;
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [gamesOpen, setGamesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeGameType, setActiveGameType] = useState<string | undefined>();
  const [navTools, setNavTools] = useState<ReactNode>(null);
  const [navEnd, setNavEnd] = useState<ReactNode>(null);

  const api = useMemo<ChromeApi>(
    () => ({
      openGames: () => setGamesOpen(true),
      openSettings: () => setSettingsOpen(true),
      activeGameType,
      setActiveGameType,
      navTools,
      setNavTools,
      navEnd,
      setNavEnd,
    }),
    [activeGameType, navTools, navEnd],
  );

  return (
    <ChromeContext.Provider value={api}>
      {children}
      <CurrentGamesSheet open={gamesOpen} onClose={() => setGamesOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} gameType={activeGameType} />
    </ChromeContext.Provider>
  );
}
