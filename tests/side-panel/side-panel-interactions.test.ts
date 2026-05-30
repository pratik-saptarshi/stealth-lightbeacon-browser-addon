// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIDE_PANEL_UI_STATE_STORAGE_KEY } from '../../src/side-panel/side-panel-state';
import { DEFAULT_PANEL_SETTINGS, PANEL_SETTINGS_STORAGE_KEY } from '../../src/shared/panel-settings';
import { LATENCY_SAMPLES_STORAGE_KEY } from '../../src/side-panel/latency-metrics';

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
      <main class="content" id="content-panel">
        <section class="settings-panel hidden" id="settings-panel" aria-label="Panel settings">
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
          <section class="settings-group" aria-label="Accessibility profile">
            <label><span>WCAG level</span><select id="accessibility-wcag-level"><option value="A">A</option><option value="AA">AA</option><option value="AAA">AAA</option></select></label>
            <label class="checkbox-row"><input id="accessibility-best-practices" type="checkbox" /><span>Include best practices</span></label>
            <label class="checkbox-row"><input id="accessibility-axe-checks" type="checkbox" /><span>Include axe checks</span></label>
            <p id="accessibility-profile-summary"></p>
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

describe('side-panel interactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome;
    delete (globalThis as typeof globalThis & { browser?: unknown }).browser;
  });

  it('supports settings interactions and persistence', async () => {
    buildShell();

    const clipboardWrite = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWrite
      }
    });

    const createObjectURL = vi.fn(() => 'blob:side-panel-export');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

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
        },
        accessibility: {
          wcagLevel: 'AA',
          includeBestPractices: true
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

      if (message.type === 'issue:highlight' || message.type === 'issue:clear-highlight') {
        return { ok: true, payload: { tabId: 7 } };
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

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        type: 'history:compare',
        origin: 'https://example.com'
      });
    });

    expect(document.getElementById('status-pill')?.textContent).toBe('Complete');
    expect(document.getElementById('side-panel-shell')?.style.getPropertyValue('--bg-0')).toBe('#102030');
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(true);

    document.getElementById('settings-toggle-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('settings-panel')?.classList.contains('hidden')).toBe(false);
    expect(document.activeElement).toBe(document.getElementById('settings-close-button'));
    await vi.waitFor(() => {
      expect(
        storageSet.mock.calls.some(([payload]) => SIDE_PANEL_UI_STATE_STORAGE_KEY in (payload as Record<string, unknown>))
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
    const wcagLevel = document.getElementById('accessibility-wcag-level') as HTMLSelectElement;
    const bestPractices = document.getElementById('accessibility-best-practices') as HTMLInputElement;
    expect(document.getElementById('accessibility-profile-summary')?.textContent).toContain('WCAG AA');
    wcagLevel.value = 'AAA';
    wcagLevel.dispatchEvent(new Event('change', { bubbles: true }));
    bestPractices.checked = false;
    bestPractices.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('accessibility-profile-summary')?.textContent).toContain('WCAG AAA');
    expect(document.getElementById('summary-grid')?.classList.contains('hidden')).toBe(true);
    expect(storageSet).toHaveBeenCalled();

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it('sends scan profile including axe toggle and supports issue interactions', async () => {
    buildShell();

    const storageGet = vi.fn(async () => ({
      [PANEL_SETTINGS_STORAGE_KEY]: DEFAULT_PANEL_SETTINGS
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
            diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] }
          }
        };
      }
      if (message.type === 'history:list') {
        return { ok: true, payload: { snapshots: [scannedSnapshot, cachedSnapshot] } };
      }
      if (message.type === 'scan:start') {
        return {
          ok: true,
          payload: {
            snapshot: scannedSnapshot,
            diff: { newIssues: [scannedSnapshot.issues[1]], resolvedIssues: [cachedSnapshot.issues[0]], regressions: [], improvements: [] },
            recommendation: { engine: 'mcp', confidence: 0.4, reason: 'Fallback recommendation' }
          }
        };
      }
      if (message.type === 'issue:highlight' || message.type === 'issue:clear-highlight') {
        return { ok: true, payload: { tabId: 7 } };
      }
      if (message.type === 'report:build') {
        return { ok: true, payload: { report: '# Scan Export', format: message.format ?? 'markdown' } };
      }
      throw new Error(`unexpected message: ${message.type}`);
    });

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      runtime: { sendMessage, getURL: (path: string) => `chrome-extension://test/${path}`, getManifest: () => ({ version: '1.0.0' }) },
      storage: { local: { get: storageGet, set: storageSet } },
      tabs: { query }
    };

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const wcagLevel = document.getElementById('accessibility-wcag-level') as HTMLSelectElement;
    const bestPractices = document.getElementById('accessibility-best-practices') as HTMLInputElement;
    const axeChecks = document.getElementById('accessibility-axe-checks') as HTMLInputElement;
    wcagLevel.value = 'AAA';
    wcagLevel.dispatchEvent(new Event('change', { bubbles: true }));
    bestPractices.checked = false;
    bestPractices.dispatchEvent(new Event('change', { bubbles: true }));
    axeChecks.checked = true;
    axeChecks.dispatchEvent(new Event('change', { bubbles: true }));

    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(sendMessage.mock.calls.some(([message]) => {
        const candidate = message as {
          type?: string;
          request?: { accessibilityProfile?: { includeAxeChecks?: boolean } };
        };
        return candidate.type === 'scan:start' && candidate.request?.accessibilityProfile?.includeAxeChecks === true;
      })).toBe(true);
    });

    expect(document.getElementById('status-pill')?.dataset.status).toBe('fallback');

    const highlightButton = document.querySelector<HTMLButtonElement>('button[data-highlight-selector="button.icon-only"]');
    highlightButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({ type: 'issue:highlight', tabId: 7, selector: 'button.icon-only' });
    });

    const issueCheckbox = document.querySelector<HTMLInputElement>('input[data-issue-id="issue-1"]');
    issueCheckbox?.click();
    expect(document.getElementById('status-line')?.textContent).toContain('1 selected');
    await vi.waitFor(() => {
      expect(
        storageSet.mock.calls.some(([payload]) =>
          JSON.stringify((payload as Record<string, unknown>)[SIDE_PANEL_UI_STATE_STORAGE_KEY] ?? {}).includes('issue-1')
        )
      ).toBe(true);
    });
  });

  it('surfaces scan failure and allows retry without crashing panel state', async () => {
    buildShell();

    const storageGet = vi.fn(async () => ({
      [PANEL_SETTINGS_STORAGE_KEY]: DEFAULT_PANEL_SETTINGS
    }));
    const storageSet = vi.fn<(payload: Record<string, unknown>) => Promise<void>>(async () => undefined);
    const query = vi.fn(async () => [{ id: 7, url: 'https://example.com/page' }]);
    let scanAttempts = 0;
    let allowSuccess = false;
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === 'history:compare') {
        return {
          ok: true,
          payload: {
            latest: cachedSnapshot,
            previous: undefined,
            diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] }
          }
        };
      }
      if (message.type === 'history:list') {
        return { ok: true, payload: { snapshots: [cachedSnapshot] } };
      }
      if (message.type === 'scan:start') {
        scanAttempts += 1;
        if (!allowSuccess) {
          return { ok: false, error: 'Backend required but unavailable' };
        }
        return {
          ok: true,
          payload: {
            snapshot: scannedSnapshot,
            diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] }
          }
        };
      }
      if (message.type === 'report:build') {
        return { ok: true, payload: { report: '# Scan Export', format: 'markdown' } };
      }
      return { ok: true };
    });

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      runtime: { sendMessage, getURL: (path: string) => `chrome-extension://test/${path}`, getManifest: () => ({ version: '1.0.0' }) },
      storage: { local: { get: storageGet, set: storageSet } },
      tabs: { query }
    };

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.getElementById('status-pill')?.dataset.status).toBe('failed');
    });
    expect(document.getElementById('status-line')?.textContent).toContain('Backend required but unavailable');

    allowSuccess = true;
    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.getElementById('status-pill')?.dataset.status).toBe('complete');
    });
    expect(sendMessage.mock.calls.filter(([m]) => (m as { type: string }).type === 'scan:start').length).toBeGreaterThanOrEqual(2);
  });

  it('classifies scan failure as fallback when error message indicates fallback path', async () => {
    buildShell();

    const storageGet = vi.fn(async () => ({
      [PANEL_SETTINGS_STORAGE_KEY]: DEFAULT_PANEL_SETTINGS
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
            diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] }
          }
        };
      }
      if (message.type === 'history:list') {
        return { ok: true, payload: { snapshots: [cachedSnapshot] } };
      }
      if (message.type === 'scan:start') {
        return { ok: false, error: 'backend fallback is required for this page' };
      }
      return { ok: true };
    });

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      runtime: { sendMessage, getURL: (path: string) => `chrome-extension://test/${path}`, getManifest: () => ({ version: '1.0.0' }) },
      storage: { local: { get: storageGet, set: storageSet } },
      tabs: { query }
    };

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.getElementById('status-pill')?.dataset.status).toBe('fallback');
    });
    expect(document.getElementById('status-line')?.textContent).toContain('backend fallback is required');
  });

  it('exports selected reports and copies selectors', async () => {
    buildShell();

    const clipboardWrite = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWrite
      }
    });

    const createObjectURL = vi.fn(() => 'blob:side-panel-export');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    const storageGet = vi.fn(async () => ({ [PANEL_SETTINGS_STORAGE_KEY]: DEFAULT_PANEL_SETTINGS }));
    const storageSet = vi.fn<(payload: Record<string, unknown>) => Promise<void>>(async () => undefined);
    const query = vi.fn(async () => [{ id: 7, url: 'https://example.com/page' }]);
    const sendMessage = vi.fn(async (message: { type: string; format?: string }) => {
      if (message.type === 'history:compare') {
        return { ok: true, payload: { latest: cachedSnapshot, previous: undefined, diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] } } };
      }
      if (message.type === 'history:list') {
        return { ok: true, payload: { snapshots: [scannedSnapshot, cachedSnapshot] } };
      }
      if (message.type === 'scan:start') {
        return { ok: true, payload: { snapshot: scannedSnapshot, diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] } } };
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
      return { ok: true };
    });

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      runtime: { sendMessage, getURL: (path: string) => `chrome-extension://test/${path}`, getManifest: () => ({ version: '1.0.0' }) },
      storage: { local: { get: storageGet, set: storageSet } },
      tabs: { query }
    };

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.getElementById('issues-panel')?.querySelectorAll('[data-testid="issue-card"]').length).toBeGreaterThan(0);
    });

    const issueCheckbox = document.querySelector<HTMLInputElement>('input[data-issue-id="issue-1"]');
    issueCheckbox?.click();
    document.getElementById('copy-selectors-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(clipboardWrite).toHaveBeenCalledWith('button.icon-only');
    });

    document.getElementById('export-json-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('export-markdown-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('export-pdf-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.waitFor(() => {
      expect(createObjectURL.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(revokeObjectURL.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('renders offline state and clipboard fallback when runtime or clipboard is unavailable', async () => {
    buildShell();

    await import('../../src/side-panel/side-panel');
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

    await import('../../src/side-panel/side-panel');
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

  it('can rescan when active tab URL is unavailable', async () => {
    buildShell();

    const storageGet = vi.fn(async () => ({
      [PANEL_SETTINGS_STORAGE_KEY]: {
        ...DEFAULT_PANEL_SETTINGS
      }
    }));
    const storageSet = vi.fn(async () => undefined);
    const query = vi.fn(async () => [{ id: 7 }]);
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === 'history:compare') {
        return {
          ok: true,
          payload: {
            latest: undefined,
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
        return { ok: true, payload: { snapshots: [] } };
      }

      if (message.type === 'scan:start') {
        return {
          ok: true,
          payload: {
            snapshot: scannedSnapshot,
            diff: {
              newIssues: [],
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

      return { ok: false, error: 'unexpected message' };
    });

    (globalThis as typeof globalThis & { chrome?: any }).chrome = {
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

    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scan:start',
          request: expect.objectContaining({
            tabId: 7,
            url: ''
          })
        })
      );
    });

    expect(document.getElementById('status-pill')?.dataset.status).toBe('fallback');
  });

  it('keeps scan successful when latency persistence fails and renders p95 status hint', async () => {
    buildShell();

    const storageGet = vi.fn(async () => ({
      [PANEL_SETTINGS_STORAGE_KEY]: DEFAULT_PANEL_SETTINGS,
      [LATENCY_SAMPLES_STORAGE_KEY]: [1200, 1400, 1600]
    }));
    const storageSet = vi.fn(async (payload: Record<string, unknown>) => {
      if (LATENCY_SAMPLES_STORAGE_KEY in payload) {
        throw new Error('latency write failure');
      }
    });
    const query = vi.fn(async () => [{ id: 7, url: 'https://example.com/page' }]);
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === 'history:compare') {
        return { ok: true, payload: { latest: cachedSnapshot, previous: undefined, diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] } } };
      }
      if (message.type === 'history:list') {
        return { ok: true, payload: { snapshots: [cachedSnapshot] } };
      }
      if (message.type === 'scan:start') {
        return { ok: true, payload: { snapshot: scannedSnapshot, diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] } } };
      }
      if (message.type === 'report:build') {
        return { ok: true, payload: { report: '# Scan Export', format: 'markdown' } };
      }
      return { ok: true };
    });

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      runtime: { sendMessage, getURL: (path: string) => `chrome-extension://test/${path}`, getManifest: () => ({ version: '1.0.0' }) },
      storage: { local: { get: storageGet, set: storageSet } },
      tabs: { query }
    };

    await import('../../src/side-panel/side-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.waitFor(() => {
      expect(document.getElementById('status-line')?.textContent).toContain('p95');
    });

    document.getElementById('rescan-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.getElementById('status-pill')?.textContent).toBe('Complete');
    });
  });
});
