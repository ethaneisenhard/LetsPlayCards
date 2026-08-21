#!/usr/bin/env node
/**
 * Ensure the shared preview D1 exists and print its UUID on stdout.
 * Usage: pnpm exec tsx scripts/ensure-preview-d1.ts
 */
import { execFileSync } from 'node:child_process';
import { PREVIEW_D1_NAME } from '../src/ci/preview-pure';

function run(args: string[]): string {
  return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

type D1Row = { name?: string; uuid?: string; id?: string };

function listDatabases(): D1Row[] {
  const out = run(['d1', 'list', '--json']);
  const start = out.indexOf('[');
  const json = start === -1 ? out : out.slice(start);
  const parsed = JSON.parse(json) as unknown;
  return Array.isArray(parsed) ? (parsed as D1Row[]) : [];
}

function createDatabase(): string {
  const out = run(['d1', 'create', PREVIEW_D1_NAME]);
  const match =
    out.match(/database_id\s*=\s*"([^"]+)"/i) ??
    out.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (!match) {
    throw new Error(`Could not parse D1 id from create output:\n${out}`);
  }
  return match[1];
}

const existing = listDatabases().find((db) => db.name === PREVIEW_D1_NAME);
const id = existing ? (existing.uuid ?? existing.id) : createDatabase();
if (!id) throw new Error(`No id for ${PREVIEW_D1_NAME}`);
process.stdout.write(`${id}\n`);
