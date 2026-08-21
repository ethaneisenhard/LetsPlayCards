import { WAR_REVEAL_HOLD_MS } from '../../game/games/war';

export { WAR_REVEAL_HOLD_MS };

/** Multiplayer: winner's client settles reveal. Solo bots already settle via the match loop. */
export function shouldAutoWarCollect(input: {
  phase: string | undefined;
  roundWinnerId: string | null | undefined;
  playerId: string;
  hasLocalSettle: boolean;
}): boolean {
  if (input.hasLocalSettle) return false;
  return input.phase === 'reveal' && input.roundWinnerId === input.playerId;
}
