import { useEffect, useState } from 'react';
import { loadDisplayName } from '../lib/profile';
import { displayInitials } from '../lib/profile-pure';
import { PREFS_CHANGED_EVENT } from '../lib/prefs-events';
import { useChrome } from '../lib/chrome';
import { ProfileMenu } from './ProfileMenu';

export function AppHeader() {
  const { navTools } = useChrome();
  const [name, setName] = useState(() => loadDisplayName());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => setName(loadDisplayName());
    window.addEventListener(PREFS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PREFS_CHANGED_EVENT, sync);
  }, []);

  const initial = displayInitials(name);

  return (
    <header className="sticky top-0 z-40 overflow-visible border-b border-[color:var(--border)] bg-[color:var(--header-bg)] backdrop-blur-lg">
      <div className="flex items-center gap-2 sm:gap-3 max-w-6xl mx-auto px-3 sm:px-5 min-h-14 py-1.5">
        <a href="/" className="flex items-center gap-2 min-w-0 shrink-0 group">
          <span className="flex gap-0.5 text-[13px] leading-none shrink-0" aria-hidden>
            <span className="text-red-500">♥</span>
            <span className="text-[color:var(--text)]">♠</span>
            <span className="text-red-500">♦</span>
            <span className="text-[color:var(--text)]">♣</span>
          </span>
          <span className="font-display font-bold text-[color:var(--text)] text-sm sm:text-base truncate tracking-tight hidden sm:inline">
            Let&apos;s Play <span className="text-gold">Cards</span>
          </span>
        </a>

        {navTools && <div className="flex-1 min-w-0 flex items-center">{navTools}</div>}

        <div className="relative shrink-0 ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Profile"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--chip-bg)] pl-1 pr-2.5 py-1 hover:border-gold/40 transition-all"
          >
            <span className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
              {initial}
            </span>
            <span className="hidden sm:inline text-[color:var(--text)] text-sm font-semibold max-w-[8rem] truncate">
              {name || 'Guest'}
            </span>
          </button>
          {menuOpen && <ProfileMenu name={name} onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
