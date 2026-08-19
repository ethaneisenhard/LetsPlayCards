import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyAction,
  publicView,
  type EngineState,
  type PublicState,
} from '../../game/engine';
import { GAME_REGISTRY } from '../../game/registry/registry';
import { nextMatchStep } from '../../game/bots/bot-pure';
import { botPolicyFor, settlePolicyFor } from '../../game/bots/bot-registry-pure';
import { createLocalMatch, LOCAL_HUMAN_ID, stepDelayMs } from '../../game/bots/local-match-pure';
import type { GameType } from '../../game/gameTypes';
import { isUnknownIntentError } from './felt-actions-pure';

export function projectLocalMatch(state: EngineState, humanId = LOCAL_HUMAN_ID): PublicState {
  const game = GAME_REGISTRY[state.game.gameType];
  const view = game?.view ? game.view(state, humanId) : publicView(state, humanId);
  return view as PublicState;
}

export function useLocalBotMatch(gameType: GameType, playerCount: number, seed: number) {
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const engineRef = useRef<EngineState | null>(null);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    clearTimer();
    try {
      const next = createLocalMatch(gameType, playerCount);
      engineRef.current = next;
      busyRef.current = false;
      setEngine(next);
      setBusy(false);
      setBuildError(null);
      setError(null);
    } catch (e) {
      engineRef.current = null;
      setEngine(null);
      setBuildError(e instanceof Error ? e.message : String(e));
    }
    return clearTimer;
  }, [gameType, playerCount, seed]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3200);
    return () => clearTimeout(t);
  }, [error]);

  const runBotSteps = useCallback(() => {
    const tick = () => {
      const current = engineRef.current;
      if (!current) {
        busyRef.current = false;
        setBusy(false);
        return;
      }
      const step = nextMatchStep(
        current,
        LOCAL_HUMAN_ID,
        botPolicyFor(current.game.gameType),
        settlePolicyFor(current.game.gameType),
      );
      if (!step) {
        busyRef.current = false;
        setBusy(false);
        return;
      }
      timerRef.current = setTimeout(() => {
        try {
          const latest = engineRef.current;
          if (!latest) {
            busyRef.current = false;
            setBusy(false);
            return;
          }
          const next = applyAction(latest, step);
          engineRef.current = next;
          setEngine(next);
          tick();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          busyRef.current = false;
          setBusy(false);
        }
      }, stepDelayMs(step));
    };
    busyRef.current = true;
    setBusy(true);
    tick();
  }, []);

  const canAct = useCallback((action: { intent: string; [k: string]: unknown }) => {
    const current = engineRef.current;
    if (!current) return false;
    try {
      applyAction(current, { ...action, playerId: LOCAL_HUMAN_ID });
      return true;
    } catch {
      return false;
    }
  }, []);

  const send = useCallback((action: { intent: string; [k: string]: unknown }) => {
    const current = engineRef.current;
    if (!current || busyRef.current) return;
    try {
      const afterHuman = applyAction(current, { ...action, playerId: LOCAL_HUMAN_ID });
      engineRef.current = afterHuman;
      setEngine(afterHuman);
      setError(null);
      runBotSteps();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!isUnknownIntentError(message)) setError(message);
    }
  }, [runBotSteps]);

  const view = engine ? projectLocalMatch(engine) : null;
  const human = view?.players.find((p) => p.id === LOCAL_HUMAN_ID) ?? view?.players[0] ?? null;
  const botName = view?.players.find((p) => p.id !== LOCAL_HUMAN_ID)?.name ?? 'Opponent';

  return { view, human, send, canAct, busy, error, buildError, botName };
}
