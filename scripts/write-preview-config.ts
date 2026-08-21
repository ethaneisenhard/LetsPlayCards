#!/usr/bin/env node
/**
 * Write a wrangler config for a PR/branch preview Worker.
 * Usage: pnpm exec tsx scripts/write-preview-config.ts --name <worker> --d1 <uuid> --out <path>
 *
 * Paths are absolute so the config can live under `.scratch/` while Wrangler
 * still finds `main`, assets, and migrations relative to the repo root.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { PREVIEW_D1_NAME, assertPreviewWorkerName } from '../src/ci/preview-pure';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function abs(path: string): string {
  return isAbsolute(path) ? path : resolve(path);
}

const nameRaw = arg('--name');
const d1 = arg('--d1');
const out = arg('--out') ?? '.scratch/wrangler.preview.json';
if (!nameRaw || !d1) {
  console.error('Usage: write-preview-config.ts --name <worker> --d1 <uuid> [--out path]');
  process.exit(1);
}
const name = assertPreviewWorkerName(nameRaw);

const raw = readFileSync(resolve('wrangler.jsonc'), 'utf8');
const stripped = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const config = JSON.parse(stripped) as Record<string, unknown>;

config.name = name;
config.workers_dev = true;
if (typeof config.main === 'string') config.main = abs(config.main);
if (config.assets && typeof config.assets === 'object') {
  const assets = config.assets as { directory?: string };
  if (typeof assets.directory === 'string') assets.directory = abs(assets.directory);
}
config.d1_databases = [
  {
    binding: 'DB',
    database_name: PREVIEW_D1_NAME,
    database_id: d1,
    migrations_dir: abs('./migrations'),
  },
];

const outPath = resolve(out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`);
process.stdout.write(`${outPath}\n`);
