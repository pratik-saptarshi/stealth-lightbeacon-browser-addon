import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const bundlePaths = [
  'service-worker.js',
  'content-script.js',
  'side-panel.js',
  'dist/service-worker.js',
  'dist/content-script.js',
  'dist/side-panel.js'
];

function readBundle(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function expectClassicScript(path: string): void {
  const source = readBundle(path);
  expect(() => new Function(source)).not.toThrow();
}

describe('bundle cleanliness', () => {
  it('keeps zod out of shipped javascript bundles', () => {
    for (const path of bundlePaths) {
      const bundle = readBundle(path);
      expect(bundle).not.toContain('zod');
    }
  });

  it('keeps the injected content script parseable as a classic script', () => {
    expectClassicScript('content-script.js');
    expectClassicScript('dist/content-script.js');
    expect(readBundle('content-script.js')).not.toContain('export {');
    expect(readBundle('dist/content-script.js')).not.toContain('export {');
  });
});
