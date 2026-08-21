import { GAME_CATALOG } from '../registry/catalog';
import type { GameType } from '../gameTypes';
import { playtestGame } from './play-pure';
import { formatPlaytestReport, summarizePlaytests } from './report-pure';
import type { PlaytestResult, PlaytestSummary } from './types';

export function playtestCatalog(only?: GameType[]): PlaytestSummary {
  const entries = only?.length
    ? GAME_CATALOG.filter((e) => only.includes(e.type))
    : GAME_CATALOG;
  const results: PlaytestResult[] = entries.map((entry) => playtestGame(entry.type));
  return summarizePlaytests(results);
}

export function playtestCatalogReport(only?: GameType[]): { summary: PlaytestSummary; text: string } {
  const summary = playtestCatalog(only);
  return { summary, text: formatPlaytestReport(summary) };
}
