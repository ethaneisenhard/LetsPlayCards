import { applyAction } from '../engine';
import { createLocalMatch, LOCAL_HUMAN_ID } from '../bots/local-match-pure';
import { defaultBotCandidates, firstLegalAction, nextMatchStep } from '../bots/bot-pure';
import { botPolicyFor, settlePolicyFor } from '../bots/bot-registry-pure';
import { GAME_CATALOG, GAME_CONFIGS } from '../registry/catalog';
import { GAME_REGISTRY } from '../registry/registry';
import type { GameType } from '../gameTypes';
import type { GameAction } from '../registry/types';
import type { EngineState } from '../state';
import { resolveTableKind, tableLooksReady, type TableKind } from './playability-registry-pure';

export type CheckId = 'registered' | 'setup' | 'dealt' | 'legal_action' | 'bot' | 'table';

export type CheckResult = { id: CheckId; ok: boolean; detail: string };

export type PlayabilityReport = {
  type: GameType;
  name: string;
  family: string;
  tableKind: TableKind;
  engineReady: boolean;
  tableReady: boolean;
  botReady: boolean;
  checks: CheckResult[];
};

function countCards(value: unknown, depth = 0): number {
  if (depth > 6 || value == null) return 0;
  if (typeof value === 'object' && value !== null && 'suit' in value && 'rank' in value) return 1;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countCards(v, depth + 1), 0);
  if (typeof value === 'object') {
    return Object.values(value).reduce<number>((n, v) => n + countCards(v, depth + 1), 0);
  }
  return 0;
}

function boardHasCards(state: EngineState): boolean {
  return (
    countCards(state.game.gameState) +
      state.players.reduce((n, p) => n + p.hand.length, 0) +
      state.game.deck.length +
      state.game.tableCards.length >
    0
  );
}

function extraCandidates(state: EngineState, playerId: string): GameAction[] {
  const player = state.players.find((p) => p.id === playerId);
  const others = state.players.filter((p) => p.id !== playerId);
  const ranks = [...new Set(player?.hand.map((c) => c.rank) ?? [])];
  const gs = (state.game.gameState ?? {}) as {
    grid?: unknown[];
    currentBet?: number;
  };
  const out: GameAction[] = [
    { intent: 'draw-stock' },
    { intent: 'deal-row' },
    { intent: 'hit' },
    { intent: 'stand' },
    { intent: 'knock' },
    { intent: 'swap' },
    { intent: 'check' },
    { intent: 'call' },
    { intent: 'raise', amount: typeof gs.currentBet === 'number' && gs.currentBet > 0 ? gs.currentBet : 2 },
    { intent: 'fold' },
    { intent: 'showdown' },
    { intent: 'gofish-ask' },
    { intent: 'bet', side: 'player', amount: 10 },
    { intent: 'bet', side: 'banker', amount: 10 },
    { intent: 'bet', side: 'tie', amount: 10 },
    { intent: 'go' },
    { intent: 'count' },
    { intent: 'play-center' },
  ];
  const tableCards = Array.isArray((state.game.gameState as { table?: { id?: string }[] }).table)
    ? ((state.game.gameState as { table: { id: string }[] }).table)
    : [];
  for (const card of player?.hand ?? []) {
    out.push({ intent: 'trail', cardId: card.id });
    out.push({ intent: 'play-center', cardId: card.id });
    for (let corner = 0; corner < 4; corner++) out.push({ intent: 'play', cardId: card.id, corner });
    for (const t of tableCards) out.push({ intent: 'capture', cardId: card.id, targetIds: [t.id] });
  }
  const handIds = player?.hand.map((c) => c.id) ?? [];
  if (handIds.length >= 2) out.push({ intent: 'discard-to-crib', cards: handIds.slice(0, 2) });
  const gridLen = Array.isArray(gs.grid) ? gs.grid.length : 0;
  for (let i = 0; i < Math.min(gridLen, 52); i++) out.push({ intent: 'flip', index: i });
  for (const other of others) {
    out.push({ intent: 'draw-from', targetId: other.id });
  }
  for (const rank of ranks) {
    for (const other of others) {
      out.push({ intent: 'gofish-ask', rank, targetId: other.id });
    }
  }
  return out;
}

function firstMove(state: EngineState, playerId: string): GameAction | null {
  return firstLegalAction(
    state,
    playerId,
    [...defaultBotCandidates(state, playerId), ...extraCandidates(state, playerId)],
    applyAction,
  );
}

export function auditGame(type: GameType): PlayabilityReport {
  const entry = GAME_CATALOG.find((e) => e.type === type);
  const name = GAME_CONFIGS[type]?.name ?? type;
  const family = entry?.family ?? 'unique';
  const tableKind = entry ? resolveTableKind(entry) : 'special';
  const checks: CheckResult[] = [];

  const registered = Boolean(GAME_REGISTRY[type] && entry);
  checks.push({
    id: 'registered',
    ok: registered,
    detail: registered ? 'catalog + registry' : 'missing catalog or module',
  });

  let engineReady = registered;
  let botReady = false;
  let setupState: EngineState | null = null;

  if (registered && entry) {
    try {
      const n = Math.max(entry.config.minPlayers, entry.config.minPlayers === 1 ? 1 : 2);
      setupState = createLocalMatch(type, n);
      const playing = setupState.game.status === 'playing';
      checks.push({ id: 'setup', ok: playing, detail: setupState.game.status });
      const dealt = boardHasCards(setupState);
      checks.push({ id: 'dealt', ok: dealt, detail: dealt ? 'cards on board or in hand' : 'empty deal' });
      const actor = setupState.players.find((p) => p.seat === setupState!.game.currentSeat) ?? setupState.players[0];
      const move = actor ? firstMove(setupState, actor.id) : null;
      checks.push({
        id: 'legal_action',
        ok: Boolean(move),
        detail: move ? `${move.intent}` : 'no probe move (needs dedicated UI intent)',
      });
      engineReady = playing && dealt;

      if (setupState.players.length > 1 && move && actor) {
        try {
          const after = applyAction(setupState, { ...move, playerId: actor.id });
          const step = nextMatchStep(after, actor.id, botPolicyFor(type), settlePolicyFor(type));
          botReady = Boolean(step) || after.game.currentSeat === actor.seat;
          checks.push({
            id: 'bot',
            ok: botReady,
            detail: step ? `${step.intent} by ${step.playerId}` : 'no bot reply (ok if still your turn)',
          });
        } catch (e) {
          checks.push({ id: 'bot', ok: false, detail: e instanceof Error ? e.message : String(e) });
        }
      } else {
        botReady = setupState.players.length === 1;
        checks.push({
          id: 'bot',
          ok: botReady,
          detail: botReady ? 'solo — no opponent' : 'no first move to test a reply',
        });
      }
    } catch (e) {
      engineReady = false;
      checks.push({ id: 'setup', ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  const tableReady = tableLooksReady(tableKind);
  checks.push({
    id: 'table',
    ok: tableReady,
    detail: tableKind,
  });

  return {
    type,
    name,
    family,
    tableKind,
    engineReady,
    tableReady,
    botReady,
    checks,
  };
}

export function auditAllGames(): PlayabilityReport[] {
  return GAME_CATALOG.map((e) => auditGame(e.type));
}

export function auditSummary(reports: PlayabilityReport[] = auditAllGames()) {
  return {
    total: reports.length,
    engineReady: reports.filter((r) => r.engineReady).length,
    tableReady: reports.filter((r) => r.tableReady).length,
    botReady: reports.filter((r) => r.botReady).length,
    playableNow: reports.filter((r) => r.engineReady && r.tableReady).length,
  };
}
