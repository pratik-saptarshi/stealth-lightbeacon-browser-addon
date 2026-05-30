// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PANEL_SETTINGS_STORAGE_KEY } from '../../src/shared/panel-settings';

const latestSnapshot = {
  id: 'scan-latest',
  origin: 'https://example.com',
  url: 'https://example.com/current',
  timestamp: 1_700_000_100_000,
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
    },
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

const olderSnapshot = {
  ...latestSnapshot,
  id: 'scan-older',
  url: 'https://example.com/previous',
  timestamp: 1_700_000_000_000,
  issues: [latestSnapshot.issues[0]],
  summary: {
    total: 1,
    bySeverity: { critical: 1, high: 0, medium: 0, low: 0 },
    byDomain: { accessibility: 1, seo: 0, performance: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
  }
} as const;

function buildShell(): void {
  document.body.innerHTML = `
    <div class="shell" id="side-panel-shell">
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
      <main class="content" id="content-panel" aria-label="Popup tabs">
        <section class="tab-strip" role="tablist" aria-label="Popup sections">
          <button id="overview-tab" type="button" role="tab" data-side-panel-tab="overview" aria-controls="overview-panel" aria-selected="false">Overview</button>          <button id="results-tab" type="button" role="tab" data-side-panel-tab="results" aria-controls="results-panel" aria-selected="false">Results</button>
          <button id="settings-tab" type="button" role="tab" data-side-panel-tab="settings" aria-controls="settings-panel" aria-selected="false">Settings</button>
        </section>

        <section id="overview-panel" data-side-panel-tab-panel="overview" aria-labelledby="overview-tab"></section>
        <section id="results-panel" data-side-panel-tab-panel="results" aria-labelledby="results-tab">
          <section class="results-toolbar" aria-label="Results actions">
            <div class="report-actions">
              <button class="primary" id="rescan-button" type="button">Re-scan this page</button>
              <button id="export-json-button" type="button">Download JSON report</button>
              <button id="export-markdown-button" type="button">Download Markdown report</button>
              <button id="export-html-button" type="button">Download HTML report</button>
              <button id="export-pdf-button" type="button">Download PDF report</button>
              <button id="copy-selectors-button" type="button">Copy selected selectors</button>
            </div>
            <div class="results-collapse-actions">
              <button id="collapse-results-button" type="button">Collapse all</button>
              <button id="expand-results-button" type="button">Expand all</button>
            </div>
          </section>
          <section class="history-panel" id="history-panel" aria-label="Run history"></section>
          <section class="status-line" id="status-line">Scan state will appear here.</section>
          <section class="summary-grid" id="summary-grid" aria-label="Issue summary"></section>
          <section class="delta hidden" id="delta-panel" data-testid="delta-panel" aria-live="polite"></section>
          <section class="error hidden" id="error-panel" data-testid="error-panel" aria-live="assertive"></section>
          <div class="offline hidden" id="offline-panel" data-testid="offline-banner">Offline</div>
          <section class="issues" id="issues-panel" data-testid="issues-panel" aria-label="Issue list"></section>
          <footer class="footer" id="footer">Footer</footer>
        </section>

        <section class="settings-panel hidden" id="settings-panel" aria-label="Panel settings" aria-labelledby="settings-tab">
          <div class="settings-panel-head">
            <div>
              <p class="eyebrow">Panel settings</p>
              <p class="settings-note">Tune colors, hide optional sections, and report bugs without leaving the side panel.</p>
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
        </section>
      </main>
    </div>
  `;
}

describe('side-panel tab shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    document.body.innerHTML = '';
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome;
    delete (globalThis as typeof globalThis & { browser?: unknown }).browser;
  });

  it('switches tabs and exposes the standalone overview copy', async () => {
    buildShell();

    const storageGet = vi.fn(async () => ({
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
    const sendMessage = vi.fn(async (message: { type: string; origin?: string }) => {
      if (message.type === 'history:compare') {
        return {
          ok: true,
          payload: {
            latest: latestSnapshot,
            previous: olderSnapshot,
            diff: {
              newIssues: [latestSnapshot.issues[1]],
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
            snapshots: [latestSnapshot, olderSnapshot]
          }
        };
      }

      if (message.type === 'report:build') {
        return {
          ok: true,
          payload: {
            report: `report:${message.type}:${message.origin ?? 'current'}`,
            format: 'markdown'
          }
        };
      }

      if (message.type === 'scan:start') {
        return {
          ok: true,
          payload: {
            snapshot: latestSnapshot,
            diff: {
              newIssues: [latestSnapshot.issues[1]],
              resolvedIssues: [],
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

      throw new Error(`unexpected message: ${message.type}`);
    });

    const createdBlobs: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        createdBlobs.push(blob);
        return `blob:${createdBlobs.length}`;
      })
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
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

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        type: 'history:compare',
        origin: 'https://example.com'
      });
    });

    expect(document.getElementById('status-pill')?.textContent).toBe('Complete');
    expect(document.querySelectorAll('[data-testid="issue-domain"]').length).toBeGreaterThan(0);

    expect(document.getElementById('overview-panel')?.classList.contains('hidden')).toBe(true);

    document.getElementById('settings-toggle-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('settings-toggle-button')?.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('.settings-grid--theme')).toBeTruthy();

    document.getElementById('settings-close-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('overview-panel')?.classList.contains('hidden')).toBe(false);
  });

  it('renders issue domains, collapse controls, and standard report downloads', async () => {
    buildShell();

    const clipboardWrite = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWrite
      }
    });

    const storageGet = vi.fn(async () => ({
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
            latest: latestSnapshot,
            previous: olderSnapshot,
            diff: {
              newIssues: [latestSnapshot.issues[1]],
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
            snapshots: [latestSnapshot, olderSnapshot]
          }
        };
      }

      if (message.type === 'report:build') {
        return {
          ok: true,
          payload: {
            report:
              message.format === 'html'
                ? '<!doctype html><html><body><h1>Scan Report</h1><p>history</p></body></html>'
                : message.format === 'markdown'
                  ? '# Scan Export\n## Summary'
                  : '{"scanId":"scan-latest"}',
            format: message.format ?? 'markdown'
          }
        };
      }

      throw new Error(`unexpected message: ${message.type}`);
    });

    const createdBlobs: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        createdBlobs.push(blob);
        return `blob:${createdBlobs.length}`;
      })
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
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

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await vi.waitFor(() => {
      expect(document.querySelectorAll('[data-testid="history-entry"]').length).toBe(2);
      expect(document.querySelectorAll('[data-testid="issue-domain"]').length).toBeGreaterThan(0);
    });

    const collapseButton = document.getElementById('collapse-results-button');
    const expandButton = document.getElementById('expand-results-button');
    expect(collapseButton).toBeTruthy();
    expect(expandButton).toBeTruthy();

    document.getElementById('export-markdown-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('export-json-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('export-pdf-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.waitFor(() => {
      expect(createdBlobs.length).toBeGreaterThanOrEqual(3);
    });

    const blobTexts = await Promise.all(createdBlobs.map(async (blob) => ({ type: blob.type, text: await blob.text() })));
    expect(blobTexts.some(({ text }) => text.includes('"scanId":"scan-latest"') || text.includes('"scanId": "scan-latest"'))).toBe(
      true
    );
    expect(blobTexts.some(({ text }) => text.includes('# Stealth Lightbeacon Issue Export') && text.includes('- Scan ID: scan-latest'))).toBe(
      true
    );
    expect(blobTexts.some(({ text }) => text.includes('Stealth Lightbeacon Issue Export') && text.includes('Scan ID: scan-latest'))).toBe(
      true
    );

    document.querySelector<HTMLInputElement>('input[data-issue-id="issue-1"]')?.click();
    document.getElementById('copy-selectors-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(clipboardWrite).toHaveBeenCalledWith('button.icon-only');
    });
  });

  it('keeps history side panel populated when compare payload is unavailable', async () => {
    buildShell();

    const storageGet = vi.fn(async () => ({
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
                    showSummary: true,
          showDelta: true,
          showStatusLine: true,
          showOfflineBanner: true,
          showFooter: true
        }
      }
    }));
    const query = vi.fn(async () => [{ id: 7, url: 'https://example.com/page' }]);
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === 'history:compare') {
        return { ok: false, error: 'compare unavailable' };
      }
      if (message.type === 'history:list') {
        return { ok: true, payload: { snapshots: [latestSnapshot, olderSnapshot] } };
      }
      throw new Error(`unexpected message: ${message.type}`);
    });

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      runtime: {
        sendMessage,
        getURL: (path: string) => `chrome-extension://test/${path}`,
        getManifest: () => ({ version: '1.0.0' })
      },
      storage: { local: { get: storageGet, set: vi.fn(async () => undefined) } },
      tabs: { query }
    };

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await vi.waitFor(() => {
      expect(document.querySelectorAll('[data-testid="history-entry"]').length).toBe(2);
      expect(document.getElementById('status-pill')?.textContent).toBe('Idle');
    });
  });
});
