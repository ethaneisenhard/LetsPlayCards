import { describe, expect, it } from 'vitest';
import {
  hashedAssetFilename,
  isHashedClientSrc,
  resetLogicalAssetRefs,
  scriptSrcFromHtml,
  stampLogicalAssetRefs,
} from './asset-hash-pure';

describe('hashedAssetFilename', () => {
  it('inserts the hash before the extension', () => {
    expect(hashedAssetFilename('client.js', 'abc123def456')).toBe('client.abc123def456.js');
    expect(hashedAssetFilename('styles.css', 'deadbeef0123')).toBe('styles.deadbeef0123.css');
  });
});

describe('stampLogicalAssetRefs', () => {
  const shell = [
    '<link rel="stylesheet" href="/styles.css" />',
    '<script type="module" src="/client.js"></script>',
  ].join('\n');

  it('rewrites logical asset URLs', () => {
    const stamped = stampLogicalAssetRefs(shell, {
      '/client.js': '/client.abc123def456.js',
      '/styles.css': '/styles.deadbeef0123.css',
    });
    expect(stamped).toContain('src="/client.abc123def456.js"');
    expect(stamped).toContain('href="/styles.deadbeef0123.css"');
    expect(stamped).not.toContain('src="/client.js"');
  });

  it('can restamp an already-hashed shell', () => {
    const once = stampLogicalAssetRefs(shell, { '/client.js': '/client.aaa111bbb222.js' });
    const twice = stampLogicalAssetRefs(once, { '/client.js': '/client.ccc333ddd444.js' });
    expect(twice).toContain('src="/client.ccc333ddd444.js"');
    expect(twice).not.toContain('aaa111bbb222');
  });

  it('resets hashed refs back to logical names', () => {
    expect(resetLogicalAssetRefs('src="/client.abc123def456.js"')).toBe('src="/client.js"');
  });
});

describe('scriptSrcFromHtml', () => {
  it('reads the module script src', () => {
    expect(scriptSrcFromHtml('<script type="module" src="/client.abc123def456.js"></script>')).toBe(
      '/client.abc123def456.js',
    );
  });

  it('accepts only hashed client bundles', () => {
    expect(isHashedClientSrc('/client.js')).toBe(false);
    expect(isHashedClientSrc('/client.abc123def456.js')).toBe(true);
    expect(isHashedClientSrc('/client.abc123def456.js?v=1')).toBe(true);
  });
});
