import { RANKS } from '../../game/deck';

/** Sentinel for “ask anyone” — resolved to one legal seat before send. */
export const ANYONE_TARGET_ID = 'anyone';

export type AskOpponent = { id: string; name: string; handCount: number };

/** Unique ranks in the hand, in deck order (A, 2, …, K). */
export function ranksHeld(hand: { rank: string }[]): string[] {
  const have = new Set(hand.map((c) => c.rank));
  return RANKS.filter((r) => have.has(r));
}

export function legalAskTargets(opponents: AskOpponent[]): AskOpponent[] {
  return opponents.filter((o) => o.handCount > 0);
}

/**
 * Map a UI choice to a real `targetId` for `gofish-ask`.
 * “Anyone” asks the next opponent who still has cards (seat order).
 */
export function resolveAskTargetId(
  chosenId: string | null | undefined,
  opponents: AskOpponent[],
): string | null {
  const legal = legalAskTargets(opponents);
  if (legal.length === 0) return null;
  if (!chosenId || chosenId === ANYONE_TARGET_ID) return legal[0].id;
  return legal.some((o) => o.id === chosenId) ? chosenId : null;
}

export function isAnyoneChoice(chosenId: string | null | undefined): boolean {
  return !chosenId || chosenId === ANYONE_TARGET_ID;
}

export function askButtonLabel(
  rank: string | null,
  targetName: string | null,
  anyone: boolean,
): string {
  if (!rank) return 'Ask';
  if (!targetName) return `Ask someone for ${rank}s`;
  if (anyone) return `Ask anyone for ${rank}s`;
  return `Ask ${targetName} for ${rank}s`;
}

export function askTurnHint(rank: string | null): string {
  return rank
    ? `● Your turn · ask for ${rank}s`
    : '● Your turn · ask for a rank you hold';
}

export function goFishAskAction(
  rank: string,
  targetId: string,
): { intent: 'gofish-ask'; rank: string; targetId: string } {
  return { intent: 'gofish-ask', rank, targetId };
}

export function drawFromAction(targetId: string): { intent: 'draw-from'; targetId: string } {
  return { intent: 'draw-from', targetId };
}

export function drawButtonLabel(targetName: string | null): string {
  return targetName ? `Draw from ${targetName}` : 'Pick who to draw from';
}

export function drawTurnHint(): string {
  return '● Your turn · draw a card from another player';
}

export function seatActionLabel(input: {
  askRank: boolean;
  drawFrom: boolean;
  rank: string | null;
  name: string;
  handCount: number;
}): string {
  if (input.handCount === 0) return `${input.name} has no cards`;
  if (input.askRank) {
    return input.rank
      ? `Ask ${input.name} for ${input.rank}s`
      : `Ask ${input.name} — pick a rank first`;
  }
  if (input.drawFrom) return `Draw from ${input.name}`;
  return input.name;
}
