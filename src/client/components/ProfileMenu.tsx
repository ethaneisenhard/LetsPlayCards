import { useEffect, useRef } from 'react';
import { useChrome } from '../lib/chrome';

export function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { openGames, openSettings } = useChrome();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (panel.current && !panel.current.contains(ev.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <div
      ref={panel}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-[color:var(--border)] bg-[color:var(--sheet-bg)] shadow-2xl p-2"
    >
      <button
        onClick={() => {
          onClose();
          openSettings();
        }}
        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[color:var(--chip-bg)] text-[color:var(--text)] text-sm font-semibold"
      >
        Edit profile
      </button>
      <button
        onClick={() => {
          onClose();
          openGames();
        }}
        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[color:var(--chip-bg)] text-[color:var(--text)] text-sm font-semibold"
      >
        Current Games
      </button>
      <button
        onClick={() => {
          onClose();
          openSettings();
        }}
        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[color:var(--chip-bg)] text-[color:var(--text)] text-sm font-semibold"
      >
        Settings
      </button>
    </div>
  );
}
