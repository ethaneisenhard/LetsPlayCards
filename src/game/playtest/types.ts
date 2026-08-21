import type { GameType } from '../gameTypes';

export type PlaytestStatus = 'passed' | 'failed' | 'skipped';

export type PlaytestPath = 'in-process-do' | 'worker-http';

export type PlaytestResult = {
  type: GameType;
  name: string;
  status: PlaytestStatus;
  players: number;
  turns: number;
  path: PlaytestPath;
  /** Why this game passed, failed, or was skipped. */
  reason: string;
  /** Terminal / score snapshot when available. */
  scores?: Record<string, number>;
  /** Seat / phase dump when the table got stuck. */
  stuck?: string;
};

export type PlaytestSummary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: PlaytestResult[];
};
