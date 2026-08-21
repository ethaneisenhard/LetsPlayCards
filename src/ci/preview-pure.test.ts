import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_WORKER_NAME,
  assertPreviewWorkerName,
  previewProbeFailMessage,
  previewProbeOk,
  previewUrl,
  previewWorkerName,
  slugBranch,
} from './preview-pure';

describe('previewWorkerName', () => {
  it('uses a stable PR worker name', () => {
    expect(previewWorkerName({ prNumber: 12 })).toBe('letsplaycards-pr-12');
  });

  it('slugs branch names for non-PR previews', () => {
    expect(previewWorkerName({ branch: 'cursor/war-collect-animation-025a' })).toBe(
      'letsplaycards-cursor-war-collect-animation-025a',
    );
  });

  it('keeps DNS-safe slugs', () => {
    expect(slugBranch('Feature/FOO_Bar')).toBe('feature-foo-bar');
  });

  it('builds workers.dev URLs', () => {
    expect(previewUrl('letsplaycards-pr-1')).toBe('https://letsplaycards-pr-1.devbyethan.workers.dev');
  });

  it('never names a PR worker after production', () => {
    expect(previewWorkerName({ prNumber: 7 })).not.toBe(PRODUCTION_WORKER_NAME);
    expect(previewWorkerName({ prNumber: 7 })).toBe('letsplaycards-pr-7');
  });
});

describe('assertPreviewWorkerName', () => {
  it('allows PR worker names', () => {
    expect(assertPreviewWorkerName('letsplaycards-pr-7')).toBe('letsplaycards-pr-7');
  });

  it('refuses the production worker name', () => {
    expect(() => assertPreviewWorkerName(PRODUCTION_WORKER_NAME)).toThrow(/production/);
  });

  it('refuses an empty name', () => {
    expect(() => assertPreviewWorkerName('')).toThrow(/production/);
  });
});

describe('previewProbeOk', () => {
  it('accepts only HTTP 200', () => {
    expect(previewProbeOk(200)).toBe(true);
    expect(previewProbeOk(404)).toBe(false);
    expect(previewProbeOk(302)).toBe(false);
    expect(previewProbeOk(500)).toBe(false);
  });

  it('explains a Cloudflare 1042 miss', () => {
    expect(previewProbeFailMessage('https://letsplaycards-pr-7.devbyethan.workers.dev/', 404, 'error code: 1042')).toContain(
      '1042',
    );
  });
});
