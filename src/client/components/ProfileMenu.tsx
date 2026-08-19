import { useEffect, useRef, useState } from 'react';
import { useChrome } from '../lib/chrome';
import { saveDisplayName } from '../lib/profile';

export function ProfileMenu({ name, onClose }: { name: string; onClose: () => void }) {
  const { openGames, openSettings } = useChrome();
  const [draft, setDraft] = useState(name);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (panel.current && !panel.current.contains(ev.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  function persistName() {
    saveDisplayName(draft);
  }

  return (
    <div
      ref={panel}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-2xl border border-[color:var(--border)] bg-[color:var(--sheet-bg)] shadow-2xl p-3"
    >
      <label className="text-[color:var(--muted)] text-[10px] uppercase tracking-widest block mb-1.5">
        Display name
      </label>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, 20))}
        onBlur={persistName}
        onKeyDown={(e) => e.key === 'Enter' && persistName()}
        placeholder="Your name"
        maxLength={20}
        className="w-full mb-3 bg-[color:var(--chip-bg)] border border-[color:var(--border)] rounded-xl px-3 py-2 text-[color:var(--text)] text-sm outline-none focus:border-gold/40"
      />

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
