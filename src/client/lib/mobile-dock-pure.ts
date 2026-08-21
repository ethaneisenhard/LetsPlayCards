/**
 * Phone GameTable rule: opponents + felt/status above the hand,
 * move controls directly under the cards (above the home indicator).
 * Desktop may keep actions near the table center.
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

export function mobileTurnLine(input: {
  busy: boolean;
  busyHint?: string;
  isMyTurn: boolean;
  waitingName?: string | null;
}): string {
  if (input.busy) return input.busyHint ?? 'Opponent is playing…';
  if (input.isMyTurn) return '● Your turn';
  return `Waiting for ${input.waitingName ?? '…'}…`;
}
