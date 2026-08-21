#!/usr/bin/env node
/**
 * Write a wrangler config for a PR/branch preview Worker.
 * Usage: pnpm exec tsx scripts/write-preview-config.ts --name <worker> --d1 <uuid> --out <path>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PREVIEW_D1_NAME } from '../src/ci/preview-pure';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const name = arg('--name');
const d1 = arg('--d1');
const out = arg('--out') ?? '.scratch/wrangler.preview.json';
if (!name || !d1) {
  console.error('Usage: write-preview-config.ts --name <worker> --d1 <uuid> [--out path]');
  process.exit(1);
}

const raw = readFileSync(resolve('wrangler.jsonc'), 'utf8');
const stripped = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const config = JSON.parse(stripped) as Record<string, unknown>;

config.name = name;
config.d1_databases = [
  {
    binding: 'DB',
    database_name: PREVIEW_D1_NAME,
    // Absolute path: wrangler resolves migrations_dir relative to the config file.
    database_id: d1,
    migrations_dir: resolve('./migrations'),
  },
];

const outPath = resolve(out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`);
process.stdout.write(`${outPath}\n`);
