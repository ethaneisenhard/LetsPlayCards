#!/usr/bin/env node
/**
 * Fail unless a preview URL returns HTTP 200.
 * Usage: pnpm exec tsx scripts/assert-preview-live.ts --url <https://...>
 */
import { previewProbeFailMessage, previewProbeOk } from '../src/ci/preview-pure';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const url = arg('--url');
if (!url) {
  console.error('Usage: assert-preview-live.ts --url <https://...>');
  process.exit(1);
}

const attempts = Number(arg('--attempts') ?? '8');
const delayMs = Number(arg('--delay-ms') ?? '3000');

for (let i = 1; i <= attempts; i++) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const body = await res.text();
    if (previewProbeOk(res.status)) {
      console.log(`preview live: ${res.status} ${url}`);
      process.exit(0);
    }
    console.error(`attempt ${i}/${attempts}: ${previewProbeFailMessage(url, res.status, body)}`);
  } catch (err) {
    console.error(`attempt ${i}/${attempts}: ${String(err)}`);
  }
  if (i < attempts) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

process.exit(1);
