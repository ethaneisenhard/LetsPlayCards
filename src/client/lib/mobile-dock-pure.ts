/**
 * Phone GameTable: one felt surface (opponents + center + hand).
 * Action pills sit above the fan when a card is picked or a turn-only
 * move is legal — never a second dock with its own background or scroll.
 */

export type PillSlot = 'above-fan';

export type MobileDock = {
  ask: boolean;
  draw: boolean;
  turnButtons: boolean;
  /** Pills belong with the hand, above the fan. */
  nearHand: boolean;
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
  const nearHand = ask || draw || turnButtons;
  return {
    ask,
    draw,
    turnButtons,
    nearHand,
    quietHandHints: nearHand,
    hideSeatActionHint: ask || draw,
  };
}

export type PhoneTableLayout = {
  /** Whole play surface — one felt, no inner scroll panes. */
  surfaceClass: string;
  opponentRowClass: string;
  centerClass: string;
  handClass: string;
  pillSlot: PillSlot;
};

export function resolvePhoneTableLayout(): PhoneTableLayout {
  return {
    surfaceClass: 'flex-1 flex flex-col min-h-0 overflow-hidden',
    opponentRowClass: 'flex items-center justify-center gap-3 px-3 pt-2 pb-1 shrink-0',
    centerClass: 'relative flex-1 flex flex-col items-center justify-center min-h-0 px-3 py-1',
    handClass: 'shrink-0 px-1 pb-[env(safe-area-inset-bottom)]',
    pillSlot: 'above-fan',
  };
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
