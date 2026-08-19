import type { GameType } from '../gameTypes';
import type { CatalogEntry } from '../registry/types';

export type TableKind =
  | 'stock-battle'
  | 'open-felt'
  | 'trick'
  | 'draw-from'
  | 'ask-rank'
  | 'hit-stand'
  | 'suit-ladders'
  | 'poker'
  | 'betting-table'
  | 'memory'
  | 'single-card'
  | 'widow-swap'
  | 'corner-piles'
  | 'fishing-table'
  | 'peg-board'
  | 'tableau'
  | 'special';

/** Games whose rules need a board the generic felt cannot show. */
export const SPECIAL_TABLE: Partial<Record<GameType, TableKind>> = {
  go_fish: 'ask-rank',
  old_maid: 'draw-from',
  concentration: 'memory',
  blackjack: 'hit-stand',
  texas_holdem: 'poker',
  five_card_draw: 'poker',
  baccarat: 'betting-table',
  kings_in_the_corner: 'corner-piles',
  cassino: 'fishing-table',
  sevens: 'suit-ladders',
  cribbage: 'peg-board',
  solitaire_race: 'tableau',
  thirty_one: 'widow-swap',
  chase_the_ace: 'single-card',
  screw_your_neighbor: 'single-card',
};

export function resolveTableKind(entry: CatalogEntry): TableKind {
  if (SPECIAL_TABLE[entry.type]) return SPECIAL_TABLE[entry.type]!;
  if (entry.config.handReveal === 'stock') return 'stock-battle';
  if (entry.family === 'solo') return 'tableau';
  if (entry.family === 'trick') return 'trick';
  if (entry.family === 'betting') return 'special';
  return 'open-felt';
}

/** Generic GameTable can show this kind without a custom board. */
export function tableLooksReady(kind: TableKind): boolean {
  return (
    kind === 'stock-battle' ||
    kind === 'open-felt' ||
    kind === 'trick' ||
    kind === 'draw-from' ||
    kind === 'ask-rank' ||
    kind === 'hit-stand' ||
    kind === 'suit-ladders' ||
    kind === 'poker' ||
    kind === 'betting-table' ||
    kind === 'memory' ||
    kind === 'single-card' ||
    kind === 'widow-swap' ||
    kind === 'corner-piles' ||
    kind === 'fishing-table' ||
    kind === 'peg-board' ||
    kind === 'tableau'
  );
}
