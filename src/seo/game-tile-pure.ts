/** Home-style game tiles for static SEO pages (history + glossary). */

import { GAME_CATALOG } from '../game/registry/catalog';
import type { CatalogEntry } from '../game/registry/types';
import type { GameType } from '../game/gameTypes';
import { esc } from './ssg-html-pure';

/** Tailwind default palette hex for catalog `config.color` stops. */
const TW_HEX: Record<string, string> = {
  'neutral-800': '#262626',
  'neutral-900': '#171717',
  'stone-700': '#44403c',
  'stone-800': '#292524',
  'stone-900': '#1c1917',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'red-800': '#991b1b',
  'red-900': '#7f1d1d',
  'orange-900': '#7c2d12',
  'amber-900': '#78350f',
  'yellow-800': '#854d0e',
  'yellow-900': '#713f12',
  'lime-900': '#365314',
  'green-800': '#166534',
  'green-900': '#14532d',
  'emerald-800': '#065f46',
  'emerald-900': '#064e3b',
  'teal-800': '#115e59',
  'teal-900': '#134e4a',
  'cyan-900': '#164e63',
  'sky-900': '#0c4a6e',
  'blue-900': '#1e3a8a',
  'indigo-900': '#312e81',
  'violet-900': '#4c1d95',
  'purple-900': '#581c87',
  'fuchsia-900': '#701a75',
  'pink-900': '#831843',
  'rose-900': '#881337',
};

const COLOR_STOP = /(?:from|to)-([a-z]+-\d{2,3})(?:\/(\d+))?/g;

export function soloHref(type: string): string {
  return `/solo/${type}`;
}

export function rulesHref(slug: string): string {
  return `/games/${slug}/`;
}

export function playerCountLabel(minPlayers: number, maxPlayers: number): string {
  return minPlayers === maxPlayers
    ? `${minPlayers} players`
    : `${minPlayers}–${maxPlayers} players`;
}

export function catalogGradientCss(color: string): string {
  const stops: string[] = [];
  for (const match of color.matchAll(COLOR_STOP)) {
    const hex = TW_HEX[match[1]!];
    if (!hex) continue;
    const alpha = match[2] != null ? Number(match[2]) / 100 : 1;
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    stops.push(`rgba(${r},${g},${b},${alpha})`);
  }
  if (stops.length < 2) {
    throw new Error(`Unknown catalog color stops: ${color}`);
  }
  return `linear-gradient(to bottom right, ${stops[0]}, ${stops[1]})`;
}

export function catalogByType(type: string): CatalogEntry | undefined {
  return GAME_CATALOG.find((e) => e.type === type);
}

export function catalogTilesForSlugs(slugs: readonly string[]): CatalogEntry[] {
  const tiles: CatalogEntry[] = [];
  for (const slug of slugs) {
    const entry = catalogByType(slug);
    if (entry) tiles.push(entry);
  }
  return tiles;
}

export function renderGameTile(entry: CatalogEntry): string {
  const { config, type, status } = entry;
  const playable = status === 'live';
  const play = playable
    ? `<a class="tile-play" href="${esc(soloHref(type))}">Play</a>`
    : '';
  return `<article class="game-tile" style="background-image:${esc(catalogGradientCss(config.color))}">
<span class="tile-emoji" aria-hidden="true">${esc(config.emoji)}</span>
<span class="n">${esc(config.name)}</span>
<span class="d">${esc(config.tagline)}</span>
<div class="tile-foot">
<span class="tile-players">${esc(playerCountLabel(config.minPlayers, config.maxPlayers))}</span>
<span class="tile-links">
<a class="tile-rules" href="${esc(rulesHref(type))}">Rules</a>
${play}
</span>
</div>
</article>`;
}

export function renderGameTileGrid(entries: readonly CatalogEntry[]): string {
  return `<div class="game-tiles">${entries.map(renderGameTile).join('\n')}</div>`;
}

export function renderLivePlayCta(name: string, type: GameType | string): string {
  return `<div class="play"><a href="${esc(soloHref(type))}">▶ Play ${esc(name)} online — free</a></div>`;
}

export function renderComingSoonCta(name: string): string {
  return `<div class="play" style="background:linear-gradient(135deg,#334155,#1e293b)"><a href="/">${esc(name)} is coming soon — see what's live</a></div>`;
}
