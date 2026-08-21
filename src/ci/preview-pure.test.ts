import { describe, expect, it } from 'vitest';
import { previewUrl, previewWorkerName, slugBranch } from './preview-pure';

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
});
