import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('addon manifest', () => {
  it('contains expected mv3 scaffold for browser extension', () => {
    const raw = readFileSync(resolve(process.cwd(), 'manifest.json'), 'utf8');
    const manifest = JSON.parse(raw);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background?.type).toBe('module');
    expect(manifest.background?.service_worker).toContain('service-worker.ts');
    expect(manifest.permissions).toContain('storage');
    expect(Array.isArray(manifest.host_permissions)).toBe(true);
    expect(manifest.content_scripts?.length).toBeGreaterThan(0);
    expect(manifest.content_scripts?.[0].js?.[0]).toContain('content-script.ts');
  });
});
