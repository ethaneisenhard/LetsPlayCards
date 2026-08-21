/** Cloudflare Worker names: lowercase, digits, dashes; DNS label ≤ 63. */
const WORKER_NAME_MAX = 63;

export const PREVIEW_D1_NAME = 'letsplaycards-preview';
export const WORKERS_DEV_SUBDOMAIN = 'devbyethan';

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
