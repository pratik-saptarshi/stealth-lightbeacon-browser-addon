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
      16: 'extension_icon16.png',
      32: 'extension_icon32.png',
      48: 'extension_icon48.png',
      128: 'extension_icon128.png'
    });
    expect(manifest.action?.default_icon).toMatchObject({
      16: 'icons/icon-normal-16.png',
      32: 'icons/icon-normal-32.png',
      48: 'icons/icon-normal-48.png',
      64: 'icons/icon-normal-64.png',
      128: 'icons/icon-normal-128.png'
    });
    expect(manifest.action?.default_popup).toBeUndefined();
    expect(manifest.side_panel?.default_path).toBe('popup.html');
    expect(() => readFileSync(resolve(process.cwd(), manifest.side_panel?.default_path), 'utf8')).not.toThrow();
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.permissions).toContain('contextMenus');
    expect((manifest.host_permissions ?? [])).toEqual([]);
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.content_security_policy?.extension_pages).toContain("script-src 'self'");
    expect(manifest.content_security_policy?.extension_pages).toContain("object-src 'self'");
    expect(manifest.minimum_chrome_version).toBe('116');
  });
});
