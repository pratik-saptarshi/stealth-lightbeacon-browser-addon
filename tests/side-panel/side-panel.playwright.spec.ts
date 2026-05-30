import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(
    ({
      latest,
      older
    }: {
      latest: typeof latestSnapshot;
      older: typeof olderSnapshot;
    }) => {
      const messages: Array<Record<string, unknown>> = [];
      (window as Window & { __messages?: Array<Record<string, unknown>> }).__messages = messages;

      const sendMessage = async (message: Record<string, unknown>) => {
        messages.push(message);
        switch (message.type) {
          case 'history:compare':
            return {
              ok: true,
              payload: {
                latest,
                previous: older,
                diff: {
                  newIssues: [latest.issues[1]],
                  resolvedIssues: [],
                  regressions: [],
                  improvements: []
                }
              }
            };
          case 'history:list':
            return {
              ok: true,
              payload: {
                snapshots: [latest, older]
              }
            };
          case 'report:build':
            return {
              ok: true,
              payload: {
                report:
                  message.format === 'html'
                    ? '<!doctype html><html><body><h1>Scan Report</h1><p>history</p></body></html>'
                    : message.format === 'markdown'
                      ? '# Scan Export\n## Summary'
                      : '{"scanId":"scan-latest"}',
                format: message.format
              }
            };
          case 'scan:start':
            return {
              ok: true,
              payload: {
                snapshot: latest,
                diff: {
                  newIssues: [latest.issues[1]],
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
          default:
            return { ok: false, error: `unexpected message: ${String(message.type)}` };
        }
      };

      (window as Window & {
        chrome?: {
          runtime?: {
            sendMessage?: typeof sendMessage;
            getURL?: (path: string) => string;
            getManifest?: () => { version?: string };
          };
          storage?: {
            local?: {
              get?: (keys: string[]) => Promise<Record<string, unknown>>;
              set?: (items: Record<string, unknown>) => Promise<void>;
            };
          };
          tabs?: {
            query?: (query: Record<string, unknown>) => Promise<Array<{ id?: number; url?: string }>>;
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
            get: async () => ({
              addon_backend_settings: {
                enabled: false,
                mode: 'stdin',
                endpoint: 'http://127.0.0.1',
                port: '5000',
                requestSigningSecret: '',
                authUsername: '',
                authPassword: '',
                required: false
              },
              addon_panel_settings: {
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
            }),
            set: async () => undefined
          }
        },
        tabs: {
          query: async () => [{ id: 7, url: 'https://example.com/page' }]
        }
      };
    },
    {
      latest: latestSnapshot,
      older: olderSnapshot
    }
  );

  const existingWorker = context.serviceWorkers().find((worker) => worker.url().startsWith('chrome-extension://'));
  let sidePanelUrl = pathToFileURL(resolve(process.cwd(), 'dist', 'side-panel.html')).href;

  if (existingWorker) {
    sidePanelUrl = `${new URL(existingWorker.url()).origin}/side-panel.html`;
  } else {
    try {
      const extensionWorker = await context.waitForEvent('serviceworker', {
        timeout: 3000
      });
      sidePanelUrl = `${new URL(extensionWorker.url()).origin}/side-panel.html`;
    } catch {
      // Playwright runs without extension bootstrap should still validate popup behavior.
      sidePanelUrl = pathToFileURL(resolve(process.cwd(), 'dist', 'side-panel.html')).href;
    }
  }

  await page.goto(sidePanelUrl, { waitUntil: 'domcontentloaded' });
  const statusPill = page.locator('#status-pill');
  const sidePanelModulePathCandidates = [
    resolve(process.cwd(), 'dist', 'side-panel.js'),
    resolve(process.cwd(), 'side-panel.js')
  ];
  const sidePanelModulePath = sidePanelModulePathCandidates.find((candidate) => existsSync(candidate));

  try {
    await expect(statusPill).not.toHaveText('Idle', { timeout: 2000 });
  } catch {
    if (!sidePanelModulePath) {
      throw new Error('Unable to bootstrap side-panel.js; run pnpm run build before Playwright tests.');
    }
    await page.addScriptTag({ path: sidePanelModulePath, type: 'module' });
    await page.evaluate(() => {
      document.dispatchEvent(new Event('DOMContentLoaded'));
    });
    await expect(statusPill).not.toHaveText('Idle');
  }
});

test('switches tabs and renders responsive settings', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#results-panel')).toBeVisible();
  await expect(page.locator('#overview-panel')).toBeHidden();

  await page.getByRole('tab', { name: 'Overview' }).click();
  await expect(page.locator('#overview-panel')).toBeVisible();
  await expect(page.locator('#overview-panel')).toContainText('Standalone audit');
  await expect(page.locator('#overview-panel')).toContainText('Results');
  await expect(page.locator('#overview-panel')).toContainText('Settings');

  await page.locator('#settings-toggle-button').click();
  await expect(page.locator('#settings-panel')).toBeVisible();
  await expect(page.locator('.settings-grid--theme')).toBeVisible();
  await expect(page.locator('.settings-grid--theme')).toHaveCSS('display', 'grid');
  await expect(page.locator('#settings-toggle-button')).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('#settings-panel')).toBeHidden();
  await expect(page.locator('#overview-panel')).toBeVisible();
});

test('renders history, toggles result groups, and downloads report formats', async ({ page }) => {
  await page.getByRole('tab', { name: 'Results' }).click();
  await expect(page.getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid="history-entry"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="issue-domain"]')).toHaveCount(2);

  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(page.locator('details[data-testid="issue-domain"]')).toHaveCount(2);
  await expect(page.locator('details[data-testid="issue-domain"]').first()).not.toHaveAttribute('open');

  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(page.locator('details[data-testid="issue-domain"]').first()).toHaveAttribute('open', '');

  const htmlDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download HTML report' }).click();
  await expect((await htmlDownload).suggestedFilename()).toContain('.html');

  const markdownDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown report' }).click();
  await expect((await markdownDownload).suggestedFilename()).toContain('.md');

  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF report' }).click();
  await expect((await pdfDownload).suggestedFilename()).toContain('.pdf');

  await page.locator('details[data-testid="history-entry"]').first().getByRole('button', { name: 'HTML' }).click();
  const messages = await page.evaluate(() => (window as Window & { __messages?: Array<Record<string, unknown>> }).__messages ?? []);
  expect(messages.some((message) => message.type === 'history:list')).toBe(true);
  expect(messages.some((message) => message.type === 'report:build')).toBe(true);
});

test('renders unsupported-page guidance from scan results', async ({ page }) => {
  await page.evaluate(() => {
    const runtime = (window as Window & { chrome?: { runtime?: { sendMessage?: (message: Record<string, unknown>) => Promise<unknown> } } }).chrome?.runtime;
    if (!runtime?.sendMessage) {
      return;
    }

    const originalSendMessage = runtime.sendMessage;
    runtime.sendMessage = async (message: Record<string, unknown>) => {
      if (message.type === 'scan:start') {
        return {
          ok: true,
          payload: {
            snapshot: {
              id: 'scan-unsupported',
              origin: 'chrome://settings',
              url: 'chrome://settings/',
              timestamp: Date.now(),
              engine: 'dom-lite',
              issues: [
                {
                  id: 'unsupported-1',
                  ruleId: 'unsupported-page-browser-internal',
                  title: 'Unsupported target',
                  severity: 'low',
                  domain: 'ux',
                  summary: 'Browser-internal pages cannot be scanned',
                  evidence: 'Open a standard https:// page and run scan again.',
                  source: 'dom-only'
                }
              ],
              summary: {
                total: 1,
                bySeverity: { critical: 0, high: 0, medium: 0, low: 1 },
                byDomain: { accessibility: 0, seo: 0, performance: 0, aeo: 0, ux: 1, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
              }
            },
            diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] }
          }
        };
      }

      return originalSendMessage(message);
    };
  });

  await page.getByRole('button', { name: 'Re-scan this page' }).click();
  await expect(page.locator('.issue-evidence')).toContainText('Open a standard https:// page and run scan again.');
});
