import type { GameType } from '../gameTypes';
import type { CatalogEntry } from '../registry/types';
import { resolveTableKind, type TableKind } from './playability-registry-pure';

export type QaVerdict = 'untested' | 'in_progress' | 'pass' | 'fail';

export type QaRecord = {
  type: GameType;
  verdict: QaVerdict;
  notes?: string;
};

export type QaTracker = {
  current: GameType | null;
  records: Partial<Record<GameType, QaRecord>>;
};

/** Closest-to-playable first. Do not skip ahead inside a kind. */
export const TABLE_KIND_QA_ORDER: readonly TableKind[] = [
  'stock-battle',
  'trick',
  'open-felt',
  'draw-from',
  'ask-rank',
  'hit-stand',
  'suit-ladders',
  'poker',
  'betting-table',
  'memory',
  'single-card',
  'widow-swap',
  'corner-piles',
  'fishing-table',
  'peg-board',
  'tableau',
  'special',
];

export const VISUAL_CHECKS: Record<TableKind, readonly string[]> = {
  'stock-battle': [
    'Both piles show stack counts',
    'Flip: card leaves pile, sits in lane, no flicker / layout jump',
    'Reveal: winner card shakes, then both fly to the winner pile',
    'Collect: cards fly to winner pile (or pot if no winner yet)',
    'Bot replies after the human, then collect',
    'Same table on /playground/:type and /solo/:type',
  ],
  trick: [
    'Hand fans; current trick shows in the lane',
    'Follow-suit / play a card updates the trick',
    'Trick resolve: cards leave the lane to the winner',
    'Bot plays on its seat',
    'Same table on /playground/:type and /solo/:type',
  ],
  'draw-from': [
    'Your hand is display-only (pairs already discarded)',
    'Click an opponent pile to draw one of their cards',
    'A pair leaves your hand automatically',
    'Bot draws from you on their turn',
    'Same table on /playground/:type and /solo/:type',
  ],
  'ask-rank': [
    'Pick a rank you hold, then click a player to ask',
    'Hit: they give you those cards and you ask again',
    'Miss: deck draws one (Go Fish) and turn passes',
    'Book counts update on each seat',
    'Same table on /playground/:type and /solo/:type',
  ],
  'hit-stand': [
    'Dealer row shows (hole card hidden while playing)',
    'Hit adds a card; bust ends your turn',
    'Stand passes to the next seat / dealer',
    'Bot hits or stands on their seat',
    'Same table on /playground/:type and /solo/:type',
  ],
  'suit-ladders': [
    'Four suit tracks show open ranges (or closed)',
    'Legal 7 / adjacent play updates a track',
    'Pass only when no legal play',
    'Bot plays or passes',
    'Same table on /playground/:type and /solo/:type',
  ],
  poker: [
    'Community / pot / chips render',
    'Check call raise fold (or draw / showdown) work',
    'Bot acts on their seat',
    'Hole cards stay hidden from opponents',
    'Same table on /playground/:type and /solo/:type',
  ],
  'betting-table': [
    'Player and banker hands show',
    'Bet Player / Banker / Tie',
    'Hand resolves after everyone bets',
    'Chips update',
    'Same table on /playground/:type and /solo/:type',
  ],
  memory: [
    'Grid of face-down cards',
    'Flip two: match stays, miss flips back',
    'Pair scores update',
    'Bot flips on their turn',
    'Same table on /playground/:type and /solo/:type',
  ],
  'single-card': [
    'Your card is visible; others are hidden',
    'Swap or Draw (last seat) works',
    'Tokens update after the reveal',
    'Bot swaps or draws',
    'Same table on /playground/:type and /solo/:type',
  ],
  'widow-swap': [
    'Widow of 3 face-up cards',
    'Pick a hand card then a widow card to swap',
    'Knock ends the round after others act',
    'Lives update',
    'Same table on /playground/:type and /solo/:type',
  ],
  'corner-piles': [
    'Four king-corners and center piles show',
    'Pick a card, then a corner (King starts empty)',
    'Play to center or Draw / Discard',
    'Bot plays or draws',
    'Same table on /playground/:type and /solo/:type',
  ],
  'fishing-table': [
    'Table cards and builds show',
    'Pick a hand card, tap table cards, then Capture / Build / Trail',
    'Capture a matching build',
    'Bot trails or captures',
    'Same table on /playground/:type and /solo/:type',
  ],
  'peg-board': [
    'Discard two to the crib, then peg plays',
    'Go when you cannot play; Count after pegging',
    'Starter and running total show',
    'Scores update on the seats',
    'Same table on /playground/:type and /solo/:type',
  ],
  'open-felt': [
    'Hand visible; discard / table cards render',
    'Legal play or draw updates the felt',
    'Opponent hand count (not cards) updates',
    'Bot takes a turn',
    'Same table on /playground/:type and /solo/:type',
  ],
  tableau: [
    'Tableau / foundations / stock all visible (not an empty felt)',
    'Legal drag or click moves a card',
    'Illegal move rejected without flicker',
    'Win / empty-stock state is visible',
    'Same table on /playground/:type and /solo/:type',
  ],
  special: [
    'Dedicated board shows the game (not a blank generic felt)',
    'Primary intent works (ask, bet, slap, memory flip, …)',
    'Illegal intent is rejected in the API',
    'Bot or solo path can finish a turn',
    'Same table on /playground/:type and /solo/:type',
  ],
};

export function emptyTracker(): QaTracker {
  return { current: null, records: {} };
}

export function qaOrder(catalog: readonly CatalogEntry[]): GameType[] {
  return [...catalog]
    .sort((a, b) => {
      const ka = TABLE_KIND_QA_ORDER.indexOf(resolveTableKind(a));
      const kb = TABLE_KIND_QA_ORDER.indexOf(resolveTableKind(b));
      if (ka !== kb) return ka - kb;
      return catalog.indexOf(a) - catalog.indexOf(b);
    })
    .map((e) => e.type);
}

export function verdictOf(tracker: QaTracker, type: GameType): QaVerdict {
  return tracker.records[type]?.verdict ?? 'untested';
}

/** First game that is not a human pass. Fail / in_progress stay current. */
export function nextQaTarget(order: readonly GameType[], tracker: QaTracker): GameType | null {
  const current = tracker.current;
  if (current && verdictOf(tracker, current) !== 'pass') return current;
  return order.find((type) => verdictOf(tracker, type) !== 'pass') ?? null;
}

export function startCurrent(order: readonly GameType[], tracker: QaTracker): QaTracker {
  const current = nextQaTarget(order, { ...tracker, current: null });
  if (!current) return { current: null, records: tracker.records };
  const prev = tracker.records[current];
  return {
    current,
    records: {
      ...tracker.records,
      [current]: { type: current, verdict: 'in_progress', notes: prev?.notes },
    },
  };
}

export function applyVerdict(
  order: readonly GameType[],
  tracker: QaTracker,
  type: GameType,
  verdict: 'pass' | 'fail',
  notes?: string,
): QaTracker {
  const next: QaTracker = {
    current: type,
    records: {
      ...tracker.records,
      [type]: { type, verdict, notes },
    },
  };
  if (verdict === 'fail') return next;
  return startCurrent(order, next);
}

export function visualChecksFor(kind: TableKind): readonly string[] {
  return VISUAL_CHECKS[kind];
}
