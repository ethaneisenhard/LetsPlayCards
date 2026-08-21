/** Cloudflare Worker names: lowercase, digits, dashes; DNS label ≤ 63. */
const WORKER_NAME_MAX = 63;

export const PREVIEW_D1_NAME = 'letsplaycards-preview';
export const WORKERS_DEV_SUBDOMAIN = 'devbyethan';
/** Production Worker from wrangler.jsonc — never a preview target. */
export const PRODUCTION_WORKER_NAME = 'letsplaycards';

export function slugBranch(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/^refs\/heads\//, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/** Stable Worker name for a PR (preferred) or branch. */
export function previewWorkerName(input: { prNumber?: number | null; branch?: string }): string {
  if (input.prNumber != null && input.prNumber > 0) {
    return `letsplaycards-pr-${input.prNumber}`;
  }
  const slug = slugBranch(input.branch ?? 'preview');
  const base = `letsplaycards-${slug || 'preview'}`;
  return base.length <= WORKER_NAME_MAX ? base : `letsplaycards-${slug.slice(0, 40)}`;
}

export function previewUrl(workerName: string, subdomain = WORKERS_DEV_SUBDOMAIN): string {
  return `https://${workerName}.${subdomain}.workers.dev`;
}

export function isProductionWorkerName(name: string): boolean {
  return name === PRODUCTION_WORKER_NAME;
}

/** Preview deploys must never overwrite the production Worker name. */
export function assertPreviewWorkerName(name: string): string {
  if (!name || isProductionWorkerName(name)) {
    throw new Error(
      `Refusing preview worker name "${name}": that would deploy onto production (${PRODUCTION_WORKER_NAME}).`,
    );
  }
  return name;
}

/** Live probe: only HTTP 200 counts. Cloudflare 1042 is a 404 with no Worker on that hostname. */
export function previewProbeOk(status: number): boolean {
  return status === 200;
}

export function previewProbeFailMessage(url: string, status: number, body: string): string {
  const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 200);
  const extra = snippet ? ` (${snippet})` : '';
  return `Preview ${url} returned HTTP ${status}${extra}; expected 200. Cloudflare 1042 means no Worker on that workers.dev hostname.`;
}
