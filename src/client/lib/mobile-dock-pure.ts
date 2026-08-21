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
