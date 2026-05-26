import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('addon manifest', () => {
  it('contains expected mv3 scaffold for browser extension', () => {
    const raw = readFileSync(resolve(process.cwd(), 'manifest.json'), 'utf8');
    const manifest = JSON.parse(raw);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background?.type).toBe('module');
    expect(manifest.background?.service_worker).toContain('service-worker.js');
    expect(() => readFileSync(resolve(process.cwd(), manifest.background?.service_worker), 'utf8')).not.toThrow();
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('scripting');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons).toMatchObject({
      16: 'icons/icon-16.svg',
      32: 'icons/icon-32.svg',
      48: 'icons/icon-48.svg',
      64: 'icons/icon-64.svg',
      128: 'icons/icon-128.svg'
    });
    expect(manifest.action?.default_icon).toMatchObject({
      16: 'icons/icon-normal-16.svg',
      32: 'icons/icon-normal-32.svg',
      48: 'icons/icon-normal-48.svg',
      64: 'icons/icon-normal-64.svg',
      128: 'icons/icon-normal-128.svg'
    });
    expect(manifest.action?.default_popup).toBe('popup.html');
    expect(() => readFileSync(resolve(process.cwd(), manifest.action?.default_popup), 'utf8')).not.toThrow();
    expect((manifest.host_permissions ?? [])).toEqual([]);
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.content_security_policy?.extension_pages).toContain("script-src 'self'");
    expect(manifest.content_security_policy?.extension_pages).toContain("object-src 'self'");
    expect(manifest.minimum_chrome_version).toBe('116');
  });
});
