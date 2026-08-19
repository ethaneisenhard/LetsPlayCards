export type ActWhen = 'seat' | 'betting' | 'undrawn' | 'always';

export function resolveActorId(gs: {
  current?: unknown;
  currentPlayerId?: unknown;
  phase?: unknown;
  countQueue?: unknown;
}): string | null {
  if (gs.phase === 'counting' && Array.isArray(gs.countQueue)) {
    const first = gs.countQueue[0] as { playerId?: unknown } | undefined;
    if (typeof first?.playerId === 'string') return first.playerId;
  }
  if (typeof gs.current === 'string') return gs.current;
  if (typeof gs.currentPlayerId === 'string') return gs.currentPlayerId;
  return null;
}

export function resolveIsMyTurn(input: {
  actWhen: ActWhen;
  actorId: string | null;
  playerId: string;
  currentSeat: number;
  playerSeat: number;
  phase?: string;
  hasBet?: boolean;
  hasDrawn?: boolean;
}): boolean {
  if (input.actWhen === 'always') return true;
  if (input.actWhen === 'betting') return input.phase === 'betting' && !input.hasBet;
  if (input.actWhen === 'undrawn') return input.phase === 'draw' && !input.hasDrawn;
  if (input.actorId) return input.actorId === input.playerId;
  return input.currentSeat === input.playerSeat;
}
