import { accessSync, existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function loadManifest(pathFromCwd: string) {
  const manifestPath = resolve(process.cwd(), pathFromCwd);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return manifest as { icons?: Record<string, string>; action?: { default_icon?: Record<string, string> } };
}

function expectAssetExists(cwd: string, relativePath: string) {
  expect(() => accessSync(resolve(cwd, relativePath))).not.toThrow();
}

function expectPngAsset(cwd: string, relativePath: string) {
  const buffer = readFileSync(resolve(cwd, relativePath));
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
}

describe('addon icon asset coverage', () => {
  const workspaceRoot = process.cwd();
  const distRoot = resolve(workspaceRoot, 'dist');

  it('source manifest icon paths resolve from repository root', () => {
    const manifest = loadManifest('manifest.json');

    for (const relativePath of Object.values(manifest.icons ?? {})) {
      if (typeof relativePath === 'string') {
        expectAssetExists(workspaceRoot, relativePath);
        expectPngAsset(workspaceRoot, relativePath);
      }
    }

    for (const relativePath of Object.values(manifest.action?.default_icon ?? {})) {
      if (typeof relativePath === 'string') {
        expectAssetExists(workspaceRoot, relativePath);
        expectPngAsset(workspaceRoot, relativePath);
      }
    }
  });

  it('dist manifest icon paths resolve from dist build output', () => {
    if (!existsSync(resolve(workspaceRoot, 'dist/manifest.json'))) {
      return;
    }

    const manifest = loadManifest('dist/manifest.json');

    for (const relativePath of Object.values(manifest.icons ?? {})) {
      if (typeof relativePath === 'string') {
        expectAssetExists(distRoot, relativePath);
        expectPngAsset(distRoot, relativePath);
      }
    }

    for (const relativePath of Object.values(manifest.action?.default_icon ?? {})) {
      if (typeof relativePath === 'string') {
        expectAssetExists(distRoot, relativePath);
        expectPngAsset(distRoot, relativePath);
      }
    }
  });
});
