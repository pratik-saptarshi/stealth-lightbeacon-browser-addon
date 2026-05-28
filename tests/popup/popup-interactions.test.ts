// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BACKEND_SETTINGS_STORAGE_KEY } from '../../src/shared/backend-settings';
import { POPUP_UI_STATE_STORAGE_KEY } from '../../src/popup/popup-state';
import { PANEL_SETTINGS_STORAGE_KEY } from '../../src/shared/panel-settings';

const cachedSnapshot = {
  id: 'scan-cached',
  origin: 'https://example.com',
  url: 'https://example.com/cached',
  timestamp: 1_700_000_000_000,
  engine: 'dom-lite',
  issues: [
    {
      id: 'issue-1',
      ruleId: 'a11y-001',
      title: 'Button missing label',
      severity: 'critical',
      domain: 'accessibility',
      summary: 'Icon button has no accessible name',
      evidence: 'button',
      selector: 'button.icon-only',
      source: 'dom-only'
    }
  ],
  summary: {
    total: 1,
    bySeverity: { critical: 1, high: 0, medium: 0, low: 0 },
    byDomain: { accessibility: 1, seo: 0, performance: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
  }
} as const;

const scannedSnapshot = {
  ...cachedSnapshot,
  id: 'scan-live',
  url: 'https://example.com/live',
  issues: [
    ...cachedSnapshot.issues,
    {
      id: 'issue-2',
      ruleId: 'seo-001',
      title: 'Meta description missing',
      severity: 'high',
      domain: 'seo',
      summary: 'Missing meta description',
      evidence: 'head',
      selector: 'head > meta[name="description"]',
      source: 'dom-only'
    }
  ],
  summary: {
    total: 2,
    bySeverity: { critical: 1, high: 1, medium: 0, low: 0 },
    byDomain: { accessibility: 1, seo: 1, performance: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
  }
} as const;

function buildShell(): void {
  document.body.innerHTML = `
    <div class="shell" id="popup-shell">
      <header class="hero">
        <div>
          <p class="eyebrow">In-page audit lite</p>
          <h1 class="title">Stealth Lightbeacon</h1>
          <p class="subtitle">Grouped issues, delta summary, and one-click rescan for the active tab.</p>
        </div>
        <div class="hero-actions">
          <button id="settings-toggle-button" type="button" aria-controls="settings-panel" aria-expanded="false">Settings</button>
          <span class="status-pill" id="status-pill">Idle</span>
        </div>
      </header>
      <main class="content" id="content-panel">
        <section class="settings-panel hidden" id="settings-panel" aria-label="Panel settings">
          <div class="settings-panel-head">
            <div>
              <p class="eyebrow">Panel settings</p>
              <p class="settings-note">Tune colors, hide optional sections, and report bugs without leaving the popup.</p>
            </div>
            <button id="settings-close-button" type="button">Close</button>
          </div>
          <section class="settings-group" aria-label="Appearance settings">
            <h2>Appearance</h2>
            <div class="settings-grid settings-grid--theme">
              <label><span>Background start</span><input id="theme-background-start" data-theme-setting="backgroundStart" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Background end</span><input id="theme-background-end" data-theme-setting="backgroundEnd" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Panel surface</span><input id="theme-panel" data-theme-setting="panel" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Strong surface</span><input id="theme-panel-strong" data-theme-setting="panelStrong" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Border</span><input id="theme-border" data-theme-setting="border" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Text</span><input id="theme-text" data-theme-setting="text" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Muted</span><input id="theme-muted" data-theme-setting="muted" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Muted strong</span><input id="theme-muted-strong" data-theme-setting="mutedStrong" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Accent</span><input id="theme-accent" data-theme-setting="accent" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Accent weak</span><input id="theme-accent-weak" data-theme-setting="accentWeak" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Alert</span><input id="theme-alert" data-theme-setting="alert" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Alert weak</span><input id="theme-alert-weak" data-theme-setting="alertWeak" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Danger</span><input id="theme-danger" data-theme-setting="danger" type="text" maxlength="7" spellcheck="false" /></label>
              <label><span>Danger weak</span><input id="theme-danger-weak" data-theme-setting="dangerWeak" type="text" maxlength="7" spellcheck="false" /></label>
            </div>
          </section>
          <section class="settings-group" aria-label="Visible sections">
            <h2>Visible sections</h2>
            <div class="settings-checklist">
              <label class="checkbox-row"><input id="show-controls" data-visibility-setting="showControls" type="checkbox" /><span>Scan actions</span></label>
              <label class="checkbox-row"><input id="show-backend-settings" data-visibility-setting="showBackendSettings" type="checkbox" /><span>Backend settings</span></label>
              <label class="checkbox-row"><input id="show-summary" data-visibility-setting="showSummary" type="checkbox" /><span>Summary cards</span></label>
              <label class="checkbox-row"><input id="show-delta" data-visibility-setting="showDelta" type="checkbox" /><span>Delta summary</span></label>
              <label class="checkbox-row"><input id="show-status-line" data-visibility-setting="showStatusLine" type="checkbox" /><span>Status line</span></label>
              <label class="checkbox-row"><input id="show-offline-banner" data-visibility-setting="showOfflineBanner" type="checkbox" /><span>Offline banner</span></label>
              <label class="checkbox-row"><input id="show-footer" data-visibility-setting="showFooter" type="checkbox" /><span>Footer</span></label>
            </div>
          </section>
          <section class="settings-group" aria-label="Bug report">
            <h2>Report a bug</h2>
            <a id="bug-report-link" class="bug-report-link" href="mailto:pratik.saptarshi@outlook.com">Report a bug by email</a>
          </section>
          <section class="settings-group backend-settings" id="backend-settings-section" aria-label="Backend settings">
            <label><span>Backend enabled</span><input id="backend-enabled" type="checkbox" /></label>
            <label><span>Mode</span><select id="backend-mode"><option value="http">HTTP</option><option value="stdin">Stdin</option></select></label>
            <label><span>Endpoint</span><input id="backend-endpoint" type="text" /></label>
            <label><span>Port</span><input id="backend-port" type="text" /></label>
            <label><span>Secret / API key</span><input id="backend-secret" type="password" /></label>
            <label><span>Basic auth username</span><input id="backend-auth-username" type="text" /></label>
            <label><span>Basic auth password</span><input id="backend-auth-password" type="password" /></label>
            <label class="checkbox-row"><input id="backend-required" type="checkbox" /><span>Hard fail when backend is unavailable</span></label>
            <div class="settings-actions"><a id="openapi-spec-link" class="settings-link" target="_blank" rel="noreferrer">Open OpenAPI spec</a></div>
          </section>
        </section>
        <section class="controls" aria-label="Scan actions">
          <button class="primary" id="rescan-button" type="button">Re-scan this page</button>
          <button id="export-json-button" type="button">Export JSON</button>
          <button id="export-markdown-button" type="button">Export Markdown</button>
          <button id="export-pdf-button" type="button">Download PDF</button>
          <button id="copy-selectors-button" type="button">Copy selected selectors</button>
        </section>
        <section class="status-line" id="status-line">Scan state will appear here.</section>
        <section class="summary-grid" id="summary-grid" aria-label="Issue summary"></section>
        <section class="delta hidden" id="delta-panel" data-testid="delta-panel"></section>
        <section class="error hidden" id="error-panel" data-testid="error-panel"></section>
        <div class="offline hidden" id="offline-panel" data-testid="offline-banner">Offline</div>
        <section class="issues" id="issues-panel" data-testid="issues-panel" aria-label="Issue list"></section>
        <footer class="footer" id="footer">Footer</footer>
      </main>
    </div>
  `;
}

describe('popup interactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome;
    delete (globalThis as typeof globalThis & { browser?: unknown }).browser;
  });

  it('supports settings, scan, export, copy, and responsive controls', async () => {
    buildShell();

    const clipboardWrite = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWrite
      }
    });

    const createObjectURL = vi.fn(() => 'blob:popup-export');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    const storageGet = vi.fn(async () => ({
      [BACKEND_SETTINGS_STORAGE_KEY]: {
        enabled: true,
        mode: 'http',
        endpoint: 'https://backend.example.com',
        port: '5000',
        requestSigningSecret: 'secret',
        authUsername: 'user',
        authPassword: 'pass',
        required: false
      },
      [PANEL_SETTINGS_STORAGE_KEY]: {
        theme: {
          backgroundStart: '#102030',
          backgroundEnd: '#304050',
          panel: '#ffffff',
          panelStrong: '#f8f8f8',
          border: '#aaaaaa',
          text: '#111111',
          muted: '#444444',
          mutedStrong: '#222222',
          accent: '#0055aa',
          accentWeak: '#dbeafe',
          alert: '#d49a17',
          alertWeak: '#fff3cd',
          danger: '#990000',
          dangerWeak: '#ffe1e1'
        },
        visibility: {
          showControls: true,
          showBackendSettings: true,
          showSummary: true,
          showDelta: true,
          showStatusLine: true,
          showOfflineBanner: true,
          showFooter: true
        }
      }
    }));
    const storageSet = vi.fn<(payload: Record<string, unknown>) => Promise<void>>(async () => undefined);
    const query = vi.fn(async () => [{ id: 7, url: 'https://example.com/page' }]);
    const sendMessage = vi.fn(async (message: { type: string; format?: string }) => {
      if (message.type === 'history:compare') {
        return {
          ok: true,
          payload: {
            latest: cachedSnapshot,
            previous: undefined,
            diff: {
              newIssues: [],
              resolvedIssues: [],
              regressions: [],
              improvements: []
            }
          }
        };
      }

      if (message.type === 'history:list') {
        return {
          ok: true,
          payload: {
            snapshots: [scannedSnapshot, cachedSnapshot]
          }
        };
      }

      if (message.type === 'scan:start') {
        return {
          ok: true,
          payload: {
            snapshot: scannedSnapshot,
            diff: {
              newIssues: [scannedSnapshot.issues[1]],
              resolvedIssues: [cachedSnapshot.issues[0]],
              regressions: [],
              improvements: []
            },
            recommendation: {
              engine: 'mcp',
              confidence: 0.4,
              reason: 'Fallback recommendation'
            }
          }
        };
      }

      if (message.type === 'report:build') {
        return {
          ok: true,
          payload: {
            report:
              message.format === 'html'
                ? '<!doctype html><html><body><h1>Scan Report</h1></body></html>'
                : message.format === 'json'
                  ? '{"scanId":"scan-live"}'
                  : '# Scan Export',
            format: message.format ?? 'markdown'
          }
        };
      }

      throw new Error(`unexpected message: ${message.type}`);
    });
    const manifest = vi.fn(() => ({ version: '1.0.0' }));

    (globalThis as typeof globalThis & {
      chrome?: {
        runtime?: {
          sendMessage?: typeof sendMessage;
          getURL?: (path: string) => string;
          getManifest?: typeof manifest;
        };
        storage?: {
          local?: {
            get?: typeof storageGet;
            set?: typeof storageSet;
          };
        };
        tabs?: {
          query?: typeof query;
        };
      };
    }).chrome = {
      runtime: {
        sendMessage,
        getURL: (path: string) => `chrome-extension://test/${path}`,
        getManifest: manifest
      },
      storage: {
        local: {
          get: storageGet,
          set: storageSet
        }
      },
      tabs: {
        query
      }
    };

    await import('../../src/popup/popup');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        type: 'history:compare',
        origin: 'https://example.com'
      });
    });

    expect(document.getElementById('status-pill')?.textContent).toBe('Complete');
    expect(document.getElementById('popup-shell')?.style.getPropertyValue('--bg-0')).toBe('#102030');
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(true);

    document.getElementById('settings-toggle-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(false);
    expect(document.activeElement).toBe(document.getElementById('settings-close-button'));
    await vi.waitFor(() => {
      expect(
        storageSet.mock.calls.some(([payload]) => POPUP_UI_STATE_STORAGE_KEY in (payload as Record<string, unknown>))
      ).toBe(true);
    });

    document.getElementById('settings-close-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('settings-toggle-button'));

    document.getElementById('settings-toggle-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('settings-panel')?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('settings-toggle-button'));

    const showSummary = document.getElementById('show-summary') as HTMLInputElement;
    showSummary.checked = false;
    showSummary.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('summary-grid')?.classList.contains('hidden')).toBe(true);
    expect(storageSet).toHaveBeenCalled();

    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scan:start'
        })
      );
    });

    expect(document.getElementById('status-pill')?.dataset.status).toBe('fallback');
    expect(document.getElementById('issues-panel')?.querySelectorAll('[data-testid="issue-card"]').length).toBeGreaterThan(0);

    const issueCheckbox = document.querySelector<HTMLInputElement>('input[data-issue-id="issue-1"]');
    expect(issueCheckbox).toBeTruthy();
    issueCheckbox?.click();
    expect(document.getElementById('status-line')?.textContent).toContain('1 selected');
    await vi.waitFor(() => {
      expect(
        storageSet.mock.calls.some(([payload]) =>
          JSON.stringify((payload as Record<string, unknown>)[POPUP_UI_STATE_STORAGE_KEY] ?? {}).includes('issue-1')
        )
      ).toBe(true);
    });

    document.getElementById('copy-selectors-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(clipboardWrite).toHaveBeenCalledWith('button.icon-only');
    });

    document.getElementById('export-json-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('export-markdown-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('export-pdf-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.waitFor(() => {
      expect(createObjectURL).toHaveBeenCalledTimes(3);
      expect(revokeObjectURL).toHaveBeenCalledTimes(3);
    });
  });

  it('renders offline state and clipboard fallback when runtime or clipboard is unavailable', async () => {
    buildShell();

    await import('../../src/popup/popup');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await vi.waitFor(() => {
      expect(document.getElementById('offline-panel')?.classList.contains('hidden')).toBe(false);
    });

    expect(document.getElementById('status-line')?.textContent).toContain('outside the extension runtime');
    expect(document.getElementById('rescan-button')).toHaveProperty('disabled', true);

    const panel = document.getElementById('settings-panel');
    document.getElementById('settings-toggle-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(panel?.classList.contains('hidden')).toBe(false);
  });

  it('falls back to execCommand when clipboard writes fail', async () => {
    buildShell();

    const execCommand = vi.fn(() => true);
    const clipboardWrite = vi.fn(async () => {
      throw new Error('clipboard unavailable');
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWrite
      }
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    });

    const storageGet = vi.fn(async () => ({
      [BACKEND_SETTINGS_STORAGE_KEY]: {
        enabled: false,
        mode: 'http',
        endpoint: 'https://backend.example.com',
        port: '5000',
        requestSigningSecret: '',
        authUsername: '',
        authPassword: '',
        required: false
      },
      [PANEL_SETTINGS_STORAGE_KEY]: {
        theme: {
          backgroundStart: '#102030',
          backgroundEnd: '#304050',
          panel: '#ffffff',
          panelStrong: '#f8f8f8',
          border: '#aaaaaa',
          text: '#111111',
          muted: '#444444',
          mutedStrong: '#222222',
          accent: '#0055aa',
          accentWeak: '#dbeafe',
          alert: '#d49a17',
          alertWeak: '#fff3cd',
          danger: '#990000',
          dangerWeak: '#ffe1e1'
        },
        visibility: {
          showControls: true,
          showBackendSettings: true,
          showSummary: true,
          showDelta: true,
          showStatusLine: true,
          showOfflineBanner: true,
          showFooter: true
        }
      }
    }));
    const storageSet = vi.fn<(payload: Record<string, unknown>) => Promise<void>>(async () => undefined);
    const query = vi.fn(async () => [{ id: 7, url: 'https://example.com/page' }]);
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === 'history:compare') {
        return {
          ok: true,
          payload: {
            latest: cachedSnapshot,
            previous: undefined,
            diff: {
              newIssues: [],
              resolvedIssues: [],
              regressions: [],
              improvements: []
            }
          }
        };
      }

      if (message.type === 'history:list') {
        return {
          ok: true,
          payload: {
            snapshots: [cachedSnapshot]
          }
        };
      }

      throw new Error(`unexpected message: ${message.type}`);
    });

    (globalThis as typeof globalThis & {
      chrome?: {
        runtime?: {
          sendMessage?: typeof sendMessage;
          getURL?: (path: string) => string;
          getManifest?: () => { version?: string };
        };
        storage?: {
          local?: {
            get?: typeof storageGet;
            set?: typeof storageSet;
          };
        };
        tabs?: {
          query?: typeof query;
        };
      };
    }).chrome = {
      runtime: {
        sendMessage,
        getURL: (path: string) => `chrome-extension://test/${path}`,
        getManifest: () => ({ version: '1.0.0' })
      },
      storage: {
        local: {
          get: storageGet,
          set: storageSet
        }
      },
      tabs: {
        query
      }
    };

    await import('../../src/popup/popup');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await vi.waitFor(() => {
      expect(document.getElementById('status-pill')?.textContent).toBe('Complete');
    });

    const issueCheckbox = document.querySelector<HTMLInputElement>('input[data-issue-id="issue-1"]');
    issueCheckbox?.click();
    document.getElementById('copy-selectors-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith('copy');
    });
    expect(clipboardWrite).toHaveBeenCalled();
  });
});
