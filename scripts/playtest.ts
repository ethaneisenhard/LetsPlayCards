#!/usr/bin/env tsx
import { isGameType } from '../src/game/registry/catalog';
import { playtestCatalogReport } from '../src/game/playtest/run-catalog-pure';
import type { GameType } from '../src/game/gameTypes';

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const only = requested.map((value) => {
  if (!isGameType(value)) {
    console.error(`Unknown game type: ${value}`);
    process.exit(2);
  }
  return value;
}) as GameType[];

const { text, summary } = playtestCatalogReport(only.length ? only : undefined);
console.log(text);

if (process.argv.includes('--strict') && summary.failed > 0) {
  process.exit(1);
}
