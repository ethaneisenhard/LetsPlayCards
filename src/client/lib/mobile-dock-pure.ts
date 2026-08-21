/**
 * Phone GameTable rule: opponents + felt + hand.
 * Action pills mount under the hand only when a card is picked
 * or a turn-only move is legal — never an always-on dock.
 */
export type MobileDock = {
  ask: boolean;
  draw: boolean;
  turnButtons: boolean;
  /** Any move UI that belongs under the fan, not on the felt. */
  underHand: boolean;
  quietHandHints: boolean;
  hideSeatActionHint: boolean;
};

export function resolveMobileDock(input: {
  askRankIntent?: string | null;
  drawFromIntent?: string | null;
  turnButtonCount?: number;
}): MobileDock {
  const ask = Boolean(input.askRankIntent);
  const draw = Boolean(input.drawFromIntent);
  const turnButtons = (input.turnButtonCount ?? 0) > 0;
  const underHand = ask || draw || turnButtons;
  return {
    ask,
    draw,
    turnButtons,
    underHand,
    quietHandHints: underHand,
    hideSeatActionHint: ask || draw,
  };
}

/** Phone column: felt keeps most of the height; the hand is shrink-wrap, not a 42% dock. */
export const PHONE_FELT_MIN_PCT = 40;
export const PHONE_DOCK_MAX_PCT = 32;

export type PhoneTableLayout = {
  feltMinPct: number;
  dockMaxPct: number;
  feltClass: string;
  dockClass: string;
  opponentRowClass: string;
  askDockClass: string;
};

export function resolvePhoneTableLayout(): PhoneTableLayout {
  return {
    feltMinPct: PHONE_FELT_MIN_PCT,
    dockMaxPct: PHONE_DOCK_MAX_PCT,
    feltClass: 'flex-1 min-h-[40%]',
    dockClass: 'shrink-0 max-h-[32%] overflow-y-auto pb-[env(safe-area-inset-bottom)]',
    opponentRowClass:
      'flex items-center justify-center gap-3 px-3 py-1.5 border-b border-white/5 shrink-0',
    askDockClass: 'shrink-0 overflow-hidden',
  };
}

/** After the dock is capped, does the leftover felt still meet the floor? */
export function feltSurvivesDock(input: {
  columnPx: number;
  opponentPx: number;
  uncappedDockPx: number;
  feltMinPct?: number;
  dockMaxPct?: number;
}): boolean {
  const feltMinPct = input.feltMinPct ?? PHONE_FELT_MIN_PCT;
  const dockMaxPct = input.dockMaxPct ?? PHONE_DOCK_MAX_PCT;
  const dock = Math.min(input.uncappedDockPx, input.columnPx * (dockMaxPct / 100));
  const felt = input.columnPx - input.opponentPx - dock;
  return felt >= input.columnPx * (feltMinPct / 100);
}

export function mobileTurnLine(input: {
  busy: boolean;
  busyHint?: string;
  isMyTurn: boolean;
  waitingName?: string | null;
  askRank?: boolean;
  pickedRank?: string | null;
  drawFrom?: boolean;
}): string {
  if (input.busy) return input.busyHint ?? 'Opponent is playing…';
  if (!input.isMyTurn) {
    return input.waitingName ? `${input.waitingName} is taking a turn` : 'Waiting for the next player';
  }
  if (input.askRank) {
    return input.pickedRank
      ? `Your turn — ask someone for ${input.pickedRank}s`
      : 'Your turn — pick a number you already have, then ask';
  }
  if (input.drawFrom) return 'Your turn — take a card from another player';
  return 'Your turn';
}
