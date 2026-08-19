import type { EngineState } from '../state';
import type { GameAction } from '../registry/types';
import type { GameType } from '../gameTypes';
import { applyAction } from '../engine';
import { handValue } from '../games/blackjack';
import {
  defaultBotCandidates,
  firstLegalAction,
  type BotPolicy,
  type SettlePolicy,
} from './bot-pure';

function gs(state: EngineState): Record<string, unknown> {
  return (state.game.gameState ?? {}) as Record<string, unknown>;
}

/** Reply only — never open a new War round on their own. */
const warPolicy: BotPolicy = (state, playerId) => {
  const phase = gs(state).phase;
  const roundCards = (gs(state).roundCards ?? {}) as Record<string, unknown>;
  const winner = gs(state).roundWinnerId;
  const player = state.players.find((p) => p.id === playerId);
  if (phase === 'reveal' && winner === playerId) return { intent: 'war-collect', playerId };
  const someoneElseFlipped = Object.keys(roundCards).some((id) => id !== playerId);
  if (
    (phase === 'battle' || phase === 'war') &&
    someoneElseFlipped &&
    !roundCards[playerId] &&
    (player?.hand.length ?? 0) > 0
  ) {
    return { intent: 'war-play', playerId };
  }
  return null;
};

const warSettle: SettlePolicy = (state) => {
  const phase = gs(state).phase;
  const winner = gs(state).roundWinnerId;
  if (phase === 'reveal' && typeof winner === 'string') {
    return { intent: 'war-collect', playerId: winner };
  }
  return null;
};

const blackjackPolicy: BotPolicy = (state, playerId) => {
  if (gs(state).current !== playerId) return null;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  return handValue(player.hand) < 17 ? { intent: 'hit', playerId } : { intent: 'stand', playerId };
};

function probePolicy(state: EngineState, playerId: string): GameAction | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.game.currentSeat !== player.seat) return null;
  return firstLegalAction(state, playerId, defaultBotCandidates(state, playerId), applyAction);
}

const POLICIES: Partial<Record<GameType, BotPolicy>> = {
  war: warPolicy,
  blackjack: blackjackPolicy,
};

const SETTLE: Partial<Record<GameType, SettlePolicy>> = {
  war: warSettle,
};

export function botPolicyFor(gameType: GameType): BotPolicy {
  return POLICIES[gameType] ?? probePolicy;
}

export function settlePolicyFor(gameType: GameType): SettlePolicy | undefined {
  return SETTLE[gameType];
}
