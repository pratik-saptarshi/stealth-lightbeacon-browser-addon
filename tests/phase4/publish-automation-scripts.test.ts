import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAccessToken, publishChrome } from '../../scripts/publish-chrome.mjs';
import { getEdgeAccessToken, pollOperation, publishEdge } from '../../scripts/publish-edge.mjs';
import { packageStoreArtifacts } from '../../scripts/package-store-artifacts.mjs';

const repoRoot = resolve(__dirname, '..', '..');

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; location?: string } = {}
): Response {
  const headers = new Headers();
  if (init.location) {
    headers.set('location', init.location);
  }
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}

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

  it('packageStoreArtifacts signs a CRX3 file with the provided key', async () => {
    const root = resolve(tmpdir(), `slt-package-crx-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'manifest.json'), JSON.stringify({ manifest_version: 3, version: '2.0.0' }));

    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    const spawnSyncImpl = vi.fn((_command: string, args: string[]) => {
      writeFileSync(args[1], 'zip-bytes');
      return { status: 0 };
    }) as unknown as typeof import('node:child_process').spawnSync;

    await packageStoreArtifacts(
      { PUBLISH_REPO_ROOT: root, CRX_PRIVATE_KEY_PEM: privateKeyPem } as NodeJS.ProcessEnv,
      { spawnSyncImpl }
    );

    const crx = readFileSync(join(root, 'artifacts', 'addon-signed.crx'));
    expect(crx.subarray(0, 4).toString('latin1')).toBe('Cr24');
    const payload = JSON.parse(readFileSync(join(root, 'artifacts', 'publish-manifest.json'), 'utf8'));
    expect(payload.artifacts.crx.path).toBe('artifacts/addon-signed.crx');
  });

  it('package-store-artifacts CLI writes a Cr24 CRX with a generated key', () => {
    const root = resolve(tmpdir(), `slt-package-crx-cli-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(
      join(root, 'dist', 'manifest.json'),
      JSON.stringify({ manifest_version: 3, version: '3.0.0' })
    );
    writeFileSync(join(root, 'dist', 'service-worker.js'), 'console.log("ok");');

    const keyDir = mkdtempSync(join(tmpdir(), 'slt-crx-key-'));
    tempPaths.push(keyDir);
    const keyPath = join(keyDir, 'test-key.pem');
    const generated = spawnSync('openssl', ['genrsa', '-out', keyPath, '2048'], { encoding: 'utf8' });
    expect(generated.status).toBe(0);

    const result = spawnSync(
      process.execPath,
      [join(repoRoot, 'scripts', 'package-store-artifacts.mjs')],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          PUBLISH_REPO_ROOT: root,
          CRX_PRIVATE_KEY_PEM: readFileSync(keyPath, 'utf8')
        }
      }
    );

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);

    const crx = readFileSync(join(root, 'artifacts', 'addon-signed.crx'));
    expect(crx.subarray(0, 4).toString('latin1')).toBe('Cr24');

    const payload = JSON.parse(readFileSync(join(root, 'artifacts', 'publish-manifest.json'), 'utf8'));
    expect(payload.version).toBe('3.0.0');
    expect(payload.artifacts.crx.path).toBe('artifacts/addon-signed.crx');
    expect(readdirSync(root).filter((entry) => entry.endsWith('.pem'))).toEqual([]);
  });

  it('packageStoreArtifacts requires a built dist directory', async () => {
    const root = resolve(tmpdir(), `slt-package-missing-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(root, { recursive: true });

    await expect(
      packageStoreArtifacts({ PUBLISH_REPO_ROOT: root } as NodeJS.ProcessEnv, {})
    ).rejects.toThrow('dist directory is missing');
  });

  it('packageStoreArtifacts fails when zip exits non-zero', async () => {
    const root = resolve(tmpdir(), `slt-package-zipfail-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'manifest.json'), JSON.stringify({ version: '1.0.0' }));
    const spawnSyncImpl = vi.fn(() => ({ status: 2 })) as unknown as typeof import('node:child_process').spawnSync;

    await expect(
      packageStoreArtifacts({ PUBLISH_REPO_ROOT: root } as NodeJS.ProcessEnv, { spawnSyncImpl })
    ).rejects.toThrow('zip command failed with status 2');
  });

  it('fetchAccessToken surfaces oauth failures', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: 'invalid_grant' }, { ok: false, status: 400 })
    ) as unknown as typeof fetch;

    await expect(
      fetchAccessToken(
        {
          CWS_CLIENT_ID: 'id',
          CWS_CLIENT_SECRET: 'secret',
          CWS_REFRESH_TOKEN: 'refresh'
        } as NodeJS.ProcessEnv,
        fetchImpl
      )
    ).rejects.toThrow('Failed to get Google access token: 400');
  });

  it('fetchAccessToken rejects a response without an access token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({})) as unknown as typeof fetch;

    await expect(
      fetchAccessToken(
        {
          CWS_CLIENT_ID: 'id',
          CWS_CLIENT_SECRET: 'secret',
          CWS_REFRESH_TOKEN: 'refresh'
        } as NodeJS.ProcessEnv,
        fetchImpl
      )
    ).rejects.toThrow('OAuth response missing access_token.');
  });

  it('publishChrome surfaces upload failures', async () => {
    const root = resolve(tmpdir(), `slt-publish-upload-fail-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'artifacts'), { recursive: true });
    writeFileSync(join(root, 'artifacts', 'addon-store.zip'), 'zip');

    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      if (String(url).includes('/token')) {
        return jsonResponse({ access_token: 'token' });
      }
      return jsonResponse({ error: 'denied' }, { ok: false, status: 500 });
    }) as unknown as typeof fetch;

    await expect(
      publishChrome(
        {
          CWS_CLIENT_ID: 'id',
          CWS_CLIENT_SECRET: 'secret',
          CWS_REFRESH_TOKEN: 'refresh',
          CWS_PUBLISHER_ID: 'pub',
          CWS_EXTENSION_ID: 'ext',
          CWS_ZIP_PATH: join(root, 'artifacts', 'addon-store.zip')
        } as NodeJS.ProcessEnv,
        fetchImpl
      )
    ).rejects.toThrow('Chrome upload failed: 500');
  });

  it('getEdgeAccessToken surfaces token endpoint failures', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: 'invalid_client' }, { ok: false, status: 401 })
    ) as unknown as typeof fetch;

    await expect(
      getEdgeAccessToken(
        { EDGE_CLIENT_ID: 'id', EDGE_CLIENT_SECRET: 'secret' } as NodeJS.ProcessEnv,
        fetchImpl
      )
    ).rejects.toThrow('Edge token fetch failed: 401');
  });

  it('getEdgeAccessToken rejects a response without an access token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({})) as unknown as typeof fetch;

    await expect(
      getEdgeAccessToken(
        { EDGE_CLIENT_ID: 'id', EDGE_CLIENT_SECRET: 'secret' } as NodeJS.ProcessEnv,
        fetchImpl
      )
    ).rejects.toThrow('Edge token response missing access_token.');
  });

  it('pollOperation throws when the operation fails', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'failed' })
    ) as unknown as typeof fetch;

    await expect(
      pollOperation('https://edge.test/operations/1', {}, fetchImpl, 100)
    ).rejects.toThrow('Edge operation failed');
  });

  it('pollOperation throws when the operation times out', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'inprogress' })
    ) as unknown as typeof fetch;

    await expect(
      pollOperation('https://edge.test/operations/1', {}, fetchImpl, 0)
    ).rejects.toThrow('Edge operation timed out after 0ms');
  });

  it('publishEdge uploads, triggers publish, and polls both operations', async () => {
    const root = resolve(tmpdir(), `slt-publish-edge-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'artifacts'), { recursive: true });
    writeFileSync(join(root, 'artifacts', 'addon-store.zip'), 'zip');

    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      const target = String(url);
      calls.push(`${init?.method ?? 'GET'} ${target}`);
      if (target.includes('/oauth2/v2.0/token')) {
        return jsonResponse({ access_token: 'edge-token' });
      }
      if (target.endsWith('/submissions/draft/package')) {
        return jsonResponse({}, { location: 'https://edge.test/operations/upload' });
      }
      if (target.endsWith('/submissions')) {
        return jsonResponse({}, { location: 'https://edge.test/operations/publish' });
      }
      return jsonResponse({ status: 'succeeded' });
    }) as unknown as typeof fetch;

    await publishEdge(
      {
        EDGE_CLIENT_ID: 'id',
        EDGE_CLIENT_SECRET: 'secret',
        EDGE_PRODUCT_ID: 'product',
        EDGE_ZIP_PATH: join(root, 'artifacts', 'addon-store.zip')
      } as NodeJS.ProcessEnv,
      fetchImpl
    );

    expect(calls).toContain('POST https://api.addons.microsoftedge.microsoft.com/v1/products/product/submissions/draft/package');
    expect(calls).toContain('POST https://api.addons.microsoftedge.microsoft.com/v1/products/product/submissions');
    expect(calls).toContain('GET https://edge.test/operations/upload');
    expect(calls).toContain('GET https://edge.test/operations/publish');
  });

  it('publishEdge rejects an upload without an operation location', async () => {
    const root = resolve(tmpdir(), `slt-publish-edge-nolocation-${Date.now()}`);
    tempPaths.push(root);
    mkdirSync(join(root, 'artifacts'), { recursive: true });
    writeFileSync(join(root, 'artifacts', 'addon-store.zip'), 'zip');

    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      if (String(url).includes('/oauth2/v2.0/token')) {
        return jsonResponse({ access_token: 'edge-token' });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    await expect(
      publishEdge(
        {
          EDGE_CLIENT_ID: 'id',
          EDGE_CLIENT_SECRET: 'secret',
          EDGE_PRODUCT_ID: 'product',
          EDGE_ZIP_PATH: join(root, 'artifacts', 'addon-store.zip')
        } as NodeJS.ProcessEnv,
        fetchImpl
      )
    ).rejects.toThrow('Edge upload did not return operation location header.');
  });
});
