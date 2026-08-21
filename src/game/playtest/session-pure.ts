import type { EngineState } from '../state';
import type { GameAction } from '../registry/types';
import type { GameType } from '../gameTypes';
import { GAME_REGISTRY } from '../registry/registry';
import {
  applyRoomAction,
  createRoomState,
  joinRoom,
  viewFor,
} from '../../durable/room-handler';
import { findViewLeaks } from './leaks-pure';
import type { PlaytestPath } from './types';

export class ViewLeakError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ViewLeakError';
  }
}

export class SeatDesyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeatDesyncError';
  }
}

/**
 * In-process table that follows the Durable Object protocol:
 * create room → join as distinct players → start → applyAction → viewFor.
 *
 * Catalog playthroughs use this path instead of wrangler/Miniflare because
 * spinning a Worker + D1 + DO per game is slow and needs local migrations.
 * The DO is a thin wrapper over the same room-handler functions.
 */
export class PlaytestSession {
  state: EngineState;
  readonly playerIds: string[] = [];
  readonly path: PlaytestPath = 'in-process-do';
  readonly code: string;

  constructor(gameType: GameType, code = `PT${Math.random().toString(36).slice(2, 8).toUpperCase()}`) {
    this.code = code;
    this.state = createRoomState(code, gameType);
  }

  private assertSeats(): void {
    const seats = this.state.players.map((p) => p.seat);
    if (new Set(seats).size !== seats.length) {
      throw new SeatDesyncError(`duplicate seats: ${seats.join(',')}`);
    }
    if (this.state.game.status === 'playing') {
      const current = this.state.players.some((p) => p.seat === this.state.game.currentSeat);
      const gs = this.state.game.gameState as { currentPlayerId?: string } | undefined;
      if (!current && !gs?.currentPlayerId) {
        throw new SeatDesyncError(`currentSeat ${this.state.game.currentSeat} is empty`);
      }
    }
  }

  private refreshViews(): void {
    this.assertSeats();
    for (const playerId of this.playerIds) {
      const view = viewFor(this.state, playerId);
      const leaks = findViewLeaks(view, this.state, playerId);
      if (leaks.length > 0) {
        throw new ViewLeakError(leaks.join('; '));
      }
    }
  }

  join(name: string): { playerId: string; view: unknown } {
    const playerId = crypto.randomUUID();
    this.state = joinRoom(this.state, playerId, name);
    this.playerIds.push(playerId);
    this.refreshViews();
    return { playerId, view: viewFor(this.state, playerId) };
  }

  act(action: GameAction): unknown {
    this.state = applyRoomAction(this.state, action);
    this.refreshViews();
    return viewFor(this.state, action.playerId ?? this.playerIds[0]);
  }

  isTerminal(): boolean {
    const game = GAME_REGISTRY[this.state.game.gameType];
    return this.state.game.status === 'finished' || Boolean(game?.isTerminal(this.state));
  }

  score(): Record<string, number> {
    const game = GAME_REGISTRY[this.state.game.gameType];
    return game ? game.score(this.state) : {};
  }
}
