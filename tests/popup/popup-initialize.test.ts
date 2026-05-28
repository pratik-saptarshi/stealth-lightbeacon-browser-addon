// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const snapshot = {
  id: 'scan-123',
  origin: 'https://example.com',
  url: 'https://example.com/page',
  timestamp: 1_700_000_000_000,
  engine: 'dom-lite',
  issues: [],
  summary: {
    total: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    byDomain: { accessibility: 0, seo: 0, performance: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
  }
} as const;

function buildShell(): void {
  document.body.innerHTML = `
    <main id="popup-shell">
      <p id="status-line"></p>
      <div id="status-pill"></div>
      <button id="settings-toggle-button"></button>
      <button id="settings-close-button"></button>
      <section id="settings-panel"></section>
      <section id="backend-settings-section"></section>
      <a id="bug-report-link"></a>
      <section class="controls"></section>
      <section id="summary-grid"></section>
      <section id="delta-panel"></section>
      <section id="error-panel"></section>
      <section id="offline-panel"></section>
      <footer id="footer"></footer>
      <section id="issues-panel"></section>
      <button id="rescan-button"></button>
      <button id="export-json-button"></button>
      <button id="export-markdown-button"></button>
      <button id="export-pdf-button"></button>
      <button id="copy-selectors-button"></button>
      <input id="backend-enabled" type="checkbox" />
      <select id="backend-mode"></select>
      <input id="backend-endpoint" />
      <input id="backend-port" />
      <input id="backend-secret" />
      <input id="backend-auth-username" />
      <input id="backend-auth-password" />
      <input id="backend-required" type="checkbox" />
      <a id="openapi-spec-link"></a>
    </main>
  `;
}

describe('popup startup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome;
  });

  it('loads cached history on open instead of auto-scanning the tab', async () => {
    buildShell();

    const sendMessage = vi.fn(async (message: { type: string; origin?: string }) => {
      if (message.type === 'history:compare') {
        expect(message.origin).toBe('https://example.com');
        return {
          ok: true,
          payload: {
            latest: snapshot,
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
        expect(message.origin).toBe('https://example.com');
        return {
          ok: true,
          payload: {
            snapshots: [snapshot]
          }
        };
      }

      if (message.type === 'scan:start') {
        throw new Error('popup startup should not auto-scan');
      }

      throw new Error(`unexpected message: ${message.type}`);
    });

    const storageGet = vi.fn(async () => ({}));
    const query = vi.fn(async () => [{ id: 7, url: 'https://example.com/page' }]);

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
          get: storageGet
        }
      },
      tabs: {
        query
      }
    };

    await import('../../src/popup/popup');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });

    expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'history:compare',
      origin: 'https://example.com'
    });
    expect(sendMessage.mock.calls.some(([message]) => (message as { type?: string }).type === 'scan:start')).toBe(false);
  });
});
