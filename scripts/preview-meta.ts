#!/usr/bin/env node
/**
 * Print preview worker name and URL as GitHub Actions outputs.
 * Usage: pnpm exec tsx scripts/preview-meta.ts [--pr N] [--branch name]
 */
import { assertPreviewWorkerName, previewUrl, previewWorkerName } from '../src/ci/preview-pure';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const prRaw = arg('--pr');
const prNumber = prRaw ? Number(prRaw) : undefined;
const branch = arg('--branch') ?? process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME;
const worker = assertPreviewWorkerName(
  previewWorkerName({
    prNumber: prNumber && prNumber > 0 ? prNumber : null,
    branch,
  }),
);
const url = previewUrl(worker);

const out = process.env.GITHUB_OUTPUT;
if (out) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(out, `worker=${worker}\nurl=${url}\n`);
}
console.log(`worker=${worker}`);
console.log(`url=${url}`);
