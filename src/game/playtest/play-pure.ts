import { GAME_CONFIGS } from '../registry/catalog';
import { GAME_REGISTRY } from '../registry/registry';
import type { GameType } from '../gameTypes';
import { nextLegalPlay } from './candidates-pure';
import { isUnbounded, playerCountFor, PLAYTEST_NAMES, turnLimitFor } from './catalog-pure';
import { describeStuckState } from './leaks-pure';
import { PlaytestSession } from './session-pure';
import type { PlaytestResult } from './types';

function fingerprint(session: PlaytestSession): string {
  const hands = session.state.players.map((p) => `${p.id}:${p.hand.length}`).join('|');
  return JSON.stringify({
    status: session.state.game.status,
    seat: session.state.game.currentSeat,
    hands,
    deck: session.state.game.deck.length,
    discard: session.state.game.discardPile.length,
    gs: session.state.game.gameState,
  });
}

function failed(
  type: GameType,
  players: number,
  turns: number,
  reason: string,
  session?: PlaytestSession,
): PlaytestResult {
  return {
    type,
    name: GAME_CONFIGS[type]?.name ?? type,
    status: 'failed',
    players,
    turns,
    path: session?.path ?? 'in-process-do',
    reason,
    stuck: session ? describeStuckState(session.state) : undefined,
  };
}

function passed(
  type: GameType,
  players: number,
  turns: number,
  reason: string,
  session: PlaytestSession,
): PlaytestResult {
  return {
    type,
    name: GAME_CONFIGS[type]?.name ?? type,
    status: 'passed',
    players,
    turns,
    path: session.path,
    reason,
    scores: session.score(),
  };
}

/** Sit friends at a table, deal, and play legal turns until the game ends or a bound. */
export function playtestGame(type: GameType, maxTurns = turnLimitFor(type)): PlaytestResult {
  if (!GAME_REGISTRY[type]) {
    return {
      type,
      name: GAME_CONFIGS[type]?.name ?? type,
      status: 'skipped',
      players: 0,
      turns: 0,
      path: 'in-process-do',
      reason: 'not registered in GAME_REGISTRY',
    };
  }

  const players = playerCountFor(type);
  let session: PlaytestSession | undefined;
  let turns = 0;
  try {
    session = new PlaytestSession(type);
    for (let i = 0; i < players; i++) {
      session.join(PLAYTEST_NAMES[i] ?? `P${i + 1}`);
    }
    if (session.state.players.length !== players) {
      return failed(type, players, 0, `join produced ${session.state.players.length} seats, expected ${players}`, session);
    }

    session.act({ intent: 'start', playerId: session.playerIds[0] });
    if (session.state.game.status !== 'playing' && !session.isTerminal()) {
      return failed(type, players, 0, `deal left status=${session.state.game.status}`, session);
    }

    let lastFp = fingerprint(session);
    let stuckRepeats = 0;

    while (turns < maxTurns) {
      if (session.isTerminal()) {
        return passed(type, players, turns, 'finished', session);
      }

      const action = nextLegalPlay(session.state);
      if (!action) {
        if (isUnbounded(type) && turns > 0) {
          return passed(type, players, turns, 'bounded session (no further legal move)', session);
        }
        return failed(type, players, turns, 'deadlock: no legal move', session);
      }

      session.act(action);
      turns += 1;

      const fp = fingerprint(session);
      if (fp === lastFp) {
        stuckRepeats += 1;
        if (stuckRepeats >= 6) {
          if (isUnbounded(type) && turns > 0) {
            return passed(type, players, turns, 'bounded session (cycling legal moves)', session);
          }
          return failed(type, players, turns, 'stuck: state did not change after legal actions', session);
        }
      } else {
        stuckRepeats = 0;
        lastFp = fp;
      }
    }

    if (session.isTerminal()) {
      return passed(type, players, turns, 'finished', session);
    }
    if (isUnbounded(type)) {
      return passed(type, players, turns, `bounded session (${maxTurns} turns of legal play)`, session);
    }
    return failed(type, players, turns, `never reached a terminal or score state after ${maxTurns} turns`, session);
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return failed(type, players, turns, message, session);
  }
}
