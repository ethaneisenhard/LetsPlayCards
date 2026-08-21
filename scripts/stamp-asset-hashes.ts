#!/usr/bin/env node
/**
 * Rename built client/CSS to content-hashed files and stamp public/index.html.
 * Query-string cache busts are ignored by the workers.dev asset CDN.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashedAssetFilename, stampLogicalAssetRefs } from '../src/ci/asset-hash-pure';

const PUBLIC = 'public';

function sha12(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
}

function removeStale(re: RegExp): void {
  for (const name of readdirSync(PUBLIC)) {
    if (re.test(name)) unlinkSync(join(PUBLIC, name));
  }
}

function hashAndMove(logicalName: string): string {
  const from = join(PUBLIC, logicalName);
  if (!existsSync(from)) {
    throw new Error(`Missing built asset ${from}`);
  }
  const hashed = hashedAssetFilename(logicalName, sha12(from));
  const to = join(PUBLIC, hashed);
  if (existsSync(to)) unlinkSync(to);
  renameSync(from, to);
  return `/${hashed}`;
}

removeStale(/^client\.[a-f0-9]{8,16}\.js$/);
removeStale(/^styles\.[a-f0-9]{8,16}\.css$/);

const clientSrc = hashAndMove('client.js');
const stylesHref = hashAndMove('styles.css');

const indexPath = join(PUBLIC, 'index.html');
const stamped = stampLogicalAssetRefs(readFileSync(indexPath, 'utf8'), {
  '/client.js': clientSrc,
  '/styles.css': stylesHref,
});
writeFileSync(indexPath, stamped);

console.log(`stamped ${clientSrc} ${stylesHref}`);
