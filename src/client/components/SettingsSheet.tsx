import { useEffect, useState } from 'react';
import { loadAppearanceId, saveAppearance } from '../lib/appearance';
import { listAppearances } from '../lib/appearance-registry-pure';
import { PREFS_CHANGED_EVENT } from '../lib/prefs-events';
import {
  loadAvatarEmoji,
  loadDisplayName,
  saveAvatarEmoji,
  saveDisplayName,
} from '../lib/profile';
import { AVATAR_EMOJI_OPTIONS } from '../lib/profile-pure';
import { listTableThemes } from '../lib/table-theme-registry-pure';
import { loadTableThemePrefs, pickTableTheme, resolveSurface, type ThemeScope } from '../lib/table-theme';
import { ProfileAvatar } from './ProfileAvatar';

export function SettingsSheet({
  open,
  onClose,
  gameType,
}: {
  open: boolean;
  onClose: () => void;
  gameType?: string;
}) {
  const [appearance, setAppearance] = useState(() => loadAppearanceId());
  const [scope, setScope] = useState<ThemeScope>('global');
  const [tableId, setTableId] = useState(() => resolveSurface(gameType ?? 'freeplay').id);
  const [nameDraft, setNameDraft] = useState(() => loadDisplayName());
  const [avatar, setAvatar] = useState(() => loadAvatarEmoji());
  const [customEmoji, setCustomEmoji] = useState('');

  useEffect(() => {
    if (!open) return;
    setAppearance(loadAppearanceId());
    setTableId(resolveSurface(gameType ?? 'freeplay', undefined).id);
    const prefs = loadTableThemePrefs();
    setScope(gameType && prefs.perGame?.[gameType] ? 'game' : 'global');
    setNameDraft(loadDisplayName());
    setAvatar(loadAvatarEmoji());
    setCustomEmoji('');
  }, [open, gameType]);

  useEffect(() => {
    const sync = () => {
      setAppearance(loadAppearanceId());
      setTableId(resolveSurface(gameType ?? 'freeplay').id);
      setNameDraft(loadDisplayName());
      setAvatar(loadAvatarEmoji());
    };
    window.addEventListener(PREFS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PREFS_CHANGED_EVENT, sync);
  }, [gameType]);

  function persistName() {
    setNameDraft(saveDisplayName(nameDraft));
  }

  function pickEmoji(emoji: string) {
    setAvatar(saveAvatarEmoji(emoji));
    setCustomEmoji('');
  }

  function clearEmoji() {
    setAvatar(saveAvatarEmoji(''));
    setCustomEmoji('');
  }

  function applyCustomEmoji() {
    const next = saveAvatarEmoji(customEmoji);
    setAvatar(next);
    setCustomEmoji(next);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-[color:var(--border)] bg-[color:var(--sheet-bg)] shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-5 pt-2 pb-10">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-[color:var(--text)] font-bold text-xl leading-tight">Settings</h3>
              <p className="text-[color:var(--muted)] text-sm mt-0.5">Your device only — more options can land in the registries later.</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-[color:var(--chip-bg)] text-[color:var(--muted)] text-sm"
            >
              ✕
            </button>
          </div>

          <p className="text-[color:var(--muted)] text-[10px] uppercase tracking-widest mb-2">Profile</p>
          <div className="mb-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--chip-bg)] p-4">
            <div className="flex items-center gap-3 mb-4">
              <ProfileAvatar emoji={avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <label className="text-[color:var(--muted)] text-[10px] uppercase tracking-widest block mb-1.5">
                  Display name
                </label>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, 20))}
                  onBlur={persistName}
                  onKeyDown={(e) => e.key === 'Enter' && persistName()}
                  placeholder="Your name"
                  maxLength={20}
                  className="w-full bg-[color:var(--sheet-bg)] border border-[color:var(--border)] rounded-xl px-3 py-2 text-[color:var(--text)] text-sm outline-none focus:border-gold/40"
                />
              </div>
            </div>

            <p className="text-[color:var(--muted)] text-[10px] uppercase tracking-widest mb-2">Avatar</p>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 mb-3">
              <button
                type="button"
                onClick={clearEmoji}
                aria-label="Default profile icon"
                aria-pressed={!avatar}
                className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${
                  !avatar
                    ? 'border-gold/50 bg-gold/10'
                    : 'border-[color:var(--border)] bg-[color:var(--sheet-bg)] hover:border-gold/30'
                }`}
              >
                <ProfileAvatar emoji="" size="sm" />
              </button>
              {AVATAR_EMOJI_OPTIONS.map((emoji) => {
                const active = avatar === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => pickEmoji(emoji)}
                    aria-label={`Avatar ${emoji}`}
                    aria-pressed={active}
                    className={`aspect-square rounded-xl border text-xl leading-none flex items-center justify-center transition-all ${
                      active
                        ? 'border-gold/50 bg-gold/10'
                        : 'border-[color:var(--border)] bg-[color:var(--sheet-bg)] hover:border-gold/30'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value.slice(0, 8))}
                onKeyDown={(e) => e.key === 'Enter' && applyCustomEmoji()}
                placeholder="Or paste any emoji"
                className="flex-1 min-w-0 bg-[color:var(--sheet-bg)] border border-[color:var(--border)] rounded-xl px-3 py-2 text-[color:var(--text)] text-sm outline-none focus:border-gold/40"
              />
              <button
                type="button"
                onClick={applyCustomEmoji}
                className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--sheet-bg)] text-[color:var(--text)] text-sm font-semibold hover:border-gold/40 shrink-0"
              >
                Set
              </button>
            </div>
          </div>

          <p className="text-[color:var(--muted)] text-[10px] uppercase tracking-widest mb-2">Appearance</p>
          <div className="flex gap-2 mb-6">
            {listAppearances().map((opt) => {
              const active = opt.id === appearance;
              return (
                <button
                  key={opt.id}
                  onClick={() => setAppearance(saveAppearance(opt.id))}
                  className={`flex-1 py-3 rounded-2xl border text-left px-3 transition-all ${
                    active
                      ? 'border-gold/50 bg-gold/10'
                      : 'border-[color:var(--border)] bg-[color:var(--chip-bg)]'
                  }`}
                >
                  <div className="text-[color:var(--text)] font-semibold text-sm">{opt.name}</div>
                  <div className="text-[color:var(--muted)] text-[11px]">{opt.tagline}</div>
                </button>
              );
            })}
          </div>

          <p className="text-[color:var(--muted)] text-[10px] uppercase tracking-widest mb-2">Table look</p>
          {gameType && (
            <div className="flex gap-2 mb-3">
              {([
                ['global', 'All games'],
                ['game', 'This game'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setScope(id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${
                    scope === id
                      ? 'bg-gold/20 border-gold/40 text-gold'
                      : 'bg-[color:var(--chip-bg)] border-[color:var(--border)] text-[color:var(--muted)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-2">
            {listTableThemes().map((theme) => {
              const active = theme.id === tableId;
              return (
                <li key={theme.id}>
                  <button
                    onClick={() => {
                      pickTableTheme(gameType ?? 'freeplay', theme.id, gameType ? scope : 'global');
                      setTableId(theme.id);
                    }}
                    className={`w-full text-left rounded-2xl border p-3 ${
                      active ? 'border-gold/50 bg-gold/10' : 'border-[color:var(--border)] bg-[color:var(--chip-bg)]'
                    }`}
                  >
                    <div className="h-10 rounded-xl mb-2 border border-white/10" style={{ background: theme.swatch }} />
                    <div className="text-[color:var(--text)] font-semibold text-sm">{theme.name}</div>
                    <div className="text-[color:var(--muted)] text-[11px]">{theme.tagline}</div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </>
  );
}
