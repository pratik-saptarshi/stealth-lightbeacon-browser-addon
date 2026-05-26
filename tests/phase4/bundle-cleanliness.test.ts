import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bundlePaths = ['service-worker.js', 'content-script.js', 'side-panel.js', 'dist/service-worker.js', 'dist/content-script.js', 'dist/side-panel.js'];

function readBundle(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('bundle cleanliness', () => {
  it('keeps zod out of shipped javascript bundles', () => {
    for (const path of bundlePaths) {
      const bundle = readBundle(path);
      expect(bundle).not.toContain('zod');
    }
  });
});
