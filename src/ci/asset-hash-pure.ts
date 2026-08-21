/** Content-hashed public asset names so Cloudflare cannot keep serving /client.js. */

const HASHED_CLIENT = /\/client\.[a-f0-9]{8,16}\.js/g;
const HASHED_STYLES = /\/styles\.[a-f0-9]{8,16}\.css/g;

export function hashedAssetFilename(filename: string, hash: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return `${filename}.${hash}`;
  return `${filename.slice(0, dot)}.${hash}${filename.slice(dot)}`;
}

/** Undo a previous stamp so a rebuild can re-hash from the logical names. */
export function resetLogicalAssetRefs(html: string): string {
  return html.replace(HASHED_CLIENT, '/client.js').replace(HASHED_STYLES, '/styles.css');
}

export function stampLogicalAssetRefs(html: string, map: Readonly<Record<string, string>>): string {
  let out = resetLogicalAssetRefs(html);
  for (const [from, to] of Object.entries(map)) {
    out = out.split(from).join(to);
  }
  return out;
}

export function scriptSrcFromHtml(html: string): string | null {
  const match = html.match(/<script[^>]*\ssrc=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

export function isHashedClientSrc(src: string): boolean {
  return /^\/client\.[a-f0-9]{8,16}\.js$/.test(src.split('?')[0] ?? '');
}
