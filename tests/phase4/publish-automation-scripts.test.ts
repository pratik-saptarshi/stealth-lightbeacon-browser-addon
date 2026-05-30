import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAccessToken, publishChrome } from '../../scripts/publish-chrome.mjs';
import { getEdgeAccessToken, pollOperation } from '../../scripts/publish-edge.mjs';
import { packageStoreArtifacts } from '../../scripts/package-store-artifacts.mjs';

describe('publish automation scripts', () => {
  const tempPaths: string[] = [];

  afterEach(() => {
    for (const path of tempPaths) {
      rmSync(path, { recursive: true, force: true });
    }
    tempPaths.length = 0;
  });

  it('fetchAccessToken requires chrome oauth env vars', async () => {
    await expect(fetchAccessToken({} as NodeJS.ProcessEnv, fetch)).rejects.toThrow('CWS_CLIENT_ID');
  });

  it('publishChrome runs upload and publish endpoints', async () => {
    const root = resolve(tmpdir(), `slt-publish-chrome-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'artifacts'), { recursive: true });
    writeFileSync(join(root, 'artifacts', 'addon-store.zip'), 'zip');

    const calls: string[] = [];
    const fetchImpl: typeof fetch = vi.fn(async (url: URL | RequestInfo) => {
      calls.push(String(url));
      if (String(url).includes('/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'token' })
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ status: 'ok' })
      } as Response;
    }) as unknown as typeof fetch;

    await publishChrome(
      {
        CWS_CLIENT_ID: 'id',
        CWS_CLIENT_SECRET: 'secret',
        CWS_REFRESH_TOKEN: 'refresh',
        CWS_PUBLISHER_ID: 'pub',
        CWS_EXTENSION_ID: 'ext',
        CWS_ZIP_PATH: join(root, 'artifacts', 'addon-store.zip')
      } as NodeJS.ProcessEnv,
      fetchImpl
    );

    expect(calls.some((url) => url.includes(':upload'))).toBe(true);
    expect(calls.some((url) => url.includes(':publish'))).toBe(true);
    expect(calls.some((url) => url.includes(':fetchStatus'))).toBe(true);
  });

  it('getEdgeAccessToken requires edge client credentials', async () => {
    await expect(getEdgeAccessToken({} as NodeJS.ProcessEnv, fetch)).rejects.toThrow('EDGE_CLIENT_ID');
  });

  it('pollOperation resolves when status succeeds', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ status: 'succeeded' })
      } as Response;
    }) as unknown as typeof fetch;

    const result = await pollOperation('https://edge.test/operations/1', { authorization: 'Bearer x' }, fetchImpl, 100);
    expect(result.status).toBe('succeeded');
  });

  it('packageStoreArtifacts writes publish manifest', async () => {
    const root = resolve(tmpdir(), `slt-package-store-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'manifest.json'), JSON.stringify({ version: '1.2.3' }));
    writeFileSync(join(root, 'dist', 'service-worker.js'), 'console.log("ok");');

    const writes: string[] = [];
    const spawnSyncImpl = vi.fn((_command: string, args: string[]) => {
      const outputZipPath = args[1];
      writeFileSync(outputZipPath, 'zip-bytes');
      return { status: 0 };
    }) as unknown as typeof import('node:child_process').spawnSync;
    const writeFileSyncImpl = ((path: string, data: string | NodeJS.ArrayBufferView) => {
      writes.push(path);
      writeFileSync(path, data);
    }) as typeof writeFileSync;

    await packageStoreArtifacts(
      {
        PUBLISH_REPO_ROOT: root
      } as NodeJS.ProcessEnv,
      {
        spawnSyncImpl,
        writeFileSyncImpl
      }
    );

    expect(spawnSyncImpl).toHaveBeenCalled();
    const manifestPath = join(root, 'artifacts', 'publish-manifest.json');
    expect(writes.some((path) => path === manifestPath)).toBe(true);
    const payload = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(payload.version).toBe('1.2.3');
    expect(payload.artifacts.zip.path).toBe('artifacts/addon-store.zip');
  });
});
