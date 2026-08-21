#!/usr/bin/env node
/**
 * Fail unless the preview shell points at a hashed client bundle that returns 200.
 * Usage: pnpm exec tsx scripts/assert-preview-bundle.ts --origin <https://...>
 */
import { isHashedClientSrc, scriptSrcFromHtml } from '../src/ci/asset-hash-pure';
import { previewProbeFailMessage, previewProbeOk } from '../src/ci/preview-pure';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const origin = (arg('--origin') ?? '').replace(/\/$/, '');
if (!origin) {
  console.error('Usage: assert-preview-bundle.ts --origin <https://...>');
  process.exit(1);
}

const htmlRes = await fetch(`${origin}/`, { redirect: 'manual' });
const html = await htmlRes.text();
if (!previewProbeOk(htmlRes.status)) {
  console.error(previewProbeFailMessage(`${origin}/`, htmlRes.status, html));
  process.exit(1);
}

const src = scriptSrcFromHtml(html);
if (!src || !isHashedClientSrc(src)) {
  console.error(`Preview shell still references unhashed client: ${src ?? '(none)'}`);
  process.exit(1);
}

const jsUrl = new URL(src, `${origin}/`).toString();
const jsRes = await fetch(jsUrl, { redirect: 'manual' });
const js = await jsRes.text();
if (!previewProbeOk(jsRes.status) || js.length < 100) {
  console.error(previewProbeFailMessage(jsUrl, jsRes.status, js));
  process.exit(1);
}

const must = (arg('--must') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const missing = must.filter((token) => !js.includes(token));
if (missing.length > 0) {
  console.error(`Hashed bundle ${jsUrl} is missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`preview bundle live: ${jsRes.status} ${jsUrl} bytes=${js.length}`);
