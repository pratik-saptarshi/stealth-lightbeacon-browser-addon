import { accessSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  SMOKE_FIXTURE_RELATIVE_PATH,
  SMOKE_VIEWPORTS,
  assertNoExternalSmokeRequests
} from './extension-load-smoke-helpers.mjs';
import { pickChromeLaunchStrategy } from './chrome-runtime.mjs';

const projectRoot = resolve(process.cwd());
const distDir = resolve(projectRoot, 'dist');
const chromeLaunchStrategy = pickChromeLaunchStrategy();
const requirePlaywrightRuntime = process.env.SMOKE_REQUIRE_PLAYWRIGHT === '1';
const distWorker = resolve(distDir, 'service-worker.js');
const sourceManifestPath = resolve(projectRoot, 'manifest.json');
const sourceWorker = resolve(projectRoot, 'service-worker.js');
const distManifestPath = resolve(distDir, 'manifest.json');

function ensureBoolean(value) {
  return Boolean(value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const JSDOM_AXE_FALSE_POSITIVE_IDS = new Set(['aria-allowed-role']);

function ensureClassicScript(filePath) {
  const source = readFileSync(filePath, 'utf8');
  try {
    // eslint-disable-next-line no-new-func
    new Function(source);
  } catch (error) {
    throw new Error(`Script parse failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateStaticExtensionAssets(manifestPath, workerPath, baseDir, label) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const expected = manifest.background?.service_worker;
  const panelPath = manifest.side_panel?.default_path;

  if (!expected) {
    throw new Error(`${label} manifest.json missing background.service_worker`);
  }

  if (!manifest.content_security_policy?.extension_pages?.includes("script-src 'self'")) {
    throw new Error('CSP extension_pages script-src must allow self only');
  }

  if (manifest.permissions?.some((permission) => ['scripting', 'activeTab', 'storage'].includes(permission)) !== true) {
    throw new Error('Extension permissions baseline not present');
  }

  if (!ensureBoolean(manifest.background?.type === 'module')) {
    throw new Error('Service worker must be module type');
  }

  if (!readFileSync(resolve(baseDir, expected), 'utf8')) {
    throw new Error(`${label} manifest points to missing service worker: ${expected}`);
  }

  if (!panelPath) {
    throw new Error(`${label} manifest missing side_panel.default_path`);
  }

  if (!readFileSync(resolve(baseDir, panelPath), 'utf8')) {
    throw new Error(`${label} manifest points to missing side-panel shell: ${panelPath}`);
  }

  assertPopupSurface(resolve(baseDir, panelPath));
  ensureClassicScript(resolve(baseDir, 'content-script.js'));
  accessSync(resolve(baseDir, 'side-panel.js'));
  accessSync(resolve(baseDir, 'side-panel.css'));
  accessSync(resolve(baseDir, 'api/openapi.yaml'));
  if (label === 'dist') {
    accessSync(resolve(baseDir, 'axe.min.js'));
  }

  const manifestIcons = manifest.icons ?? {};
  for (const [_size, relativePath] of Object.entries(manifestIcons)) {
    if (typeof relativePath === 'string') {
      accessSync(resolve(baseDir, relativePath));
    }
  }

  const actionIcons = manifest.action?.default_icon ?? {};
  for (const relativePath of Object.values(actionIcons)) {
    if (typeof relativePath === 'string') {
      accessSync(resolve(baseDir, relativePath));
    }
  }

  accessSync(resolve(baseDir, 'icons/icon-fail-16.png'));
  accessSync(resolve(baseDir, 'icons/icon-alert-16.png'));
  accessSync(resolve(baseDir, 'icons/icon-fail-16-static.png'));
  accessSync(resolve(baseDir, 'icons/icon-alert-16-static.png'));

  const workerUrl = pathToFileURL(workerPath).href;
  return import(workerUrl).then(() => manifest);
}

function assertPopupSurface(popupPath) {
  const popupHtml = readFileSync(popupPath, 'utf8');
  const requiredIds = [
    'popup-shell',
    'settings-toggle-button',
    'settings-panel',
    'settings-close-button',
    'status-pill',
    'rescan-button',
    'export-json-button',
    'export-markdown-button',
    'export-pdf-button',
    'copy-selectors-button',
    'theme-background-start',
    'theme-panel',
    'show-controls',
    'show-summary',
    'show-delta',
    'show-status-line',
    'show-offline-banner',
    'show-footer',
    'bug-report-link',
    'backend-settings-section',
    'backend-enabled',
    'backend-mode',
    'backend-endpoint',
    'backend-port',
    'backend-secret',
    'backend-auth-username',
    'backend-auth-password',
    'backend-required',
    'openapi-spec-link',
    'issues-panel'
  ];

  for (const id of requiredIds) {
    if (!popupHtml.includes(`id="${id}"`)) {
      throw new Error(`Popup surface missing required control id: ${id}`);
    }
  }

  if (!popupHtml.includes('mailto:pratik.saptarshi@outlook.com')) {
    throw new Error('Popup surface missing bug-report mailto link');
  }
}

async function validateAxeSmoke(extensionDir) {
  let playwrightChromium;
  try {
    ({ chromium: playwrightChromium } = await import('@playwright/test'));
  } catch (error) {
    if (requirePlaywrightRuntime) {
      throw new Error('Playwright runtime is required but @playwright/test is unavailable');
    }
    return validateJsdomAxeSmoke(extensionDir);
  }

  if (!playwrightChromium) {
    if (requirePlaywrightRuntime) {
      throw new Error('Playwright runtime is required but chromium launcher is unavailable');
    }
    return validateJsdomAxeSmoke(extensionDir);
  }

  const tmpProfile = mkdtempSync(join(tmpdir(), 'slt-extension-load-'));
  let context;
  try {
    context = await playwrightChromium.launchPersistentContext(tmpProfile, {
      ...chromeLaunchStrategy.primary,
      headless: true,
      args: [
        `--disable-extensions-except=${extensionDir}`,
        `--load-extension=${extensionDir}`,
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run'
      ]
    });
  } catch (error) {
    try {
      context = await playwrightChromium.launchPersistentContext(tmpProfile, {
        ...chromeLaunchStrategy.fallback,
        headless: true,
        args: [
          `--disable-extensions-except=${extensionDir}`,
          `--load-extension=${extensionDir}`,
          '--disable-sync',
          '--metrics-recording-only',
          '--no-first-run'
        ]
      });
    } catch (fallbackError) {
      if (requirePlaywrightRuntime) {
        throw new Error(
          `Playwright runtime is required but browser launch failed: primary=${
            error instanceof Error ? error.message : String(error)
          }; fallback=${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
        );
      }
      console.warn(
        `[extension-load-smoke] Playwright browser launch unavailable (primary=${
          error instanceof Error ? error.message : String(error)
        }; fallback=${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}); falling back to jsdom axe validation.`
      );
      rmSync(tmpProfile, { recursive: true, force: true });
      return validateJsdomAxeSmoke(extensionDir);
    }
  }

  try {
    const requestUrls = [];
    context.on('request', (request) => {
      requestUrls.push(request.url());
    });

    const fixturePage = await context.newPage();
    const fixtureUrl = pathToFileURL(resolve(projectRoot, SMOKE_FIXTURE_RELATIVE_PATH)).href;
    await fixturePage.goto(fixtureUrl);
    await fixturePage.waitForLoadState('domcontentloaded');
    await fixturePage.waitForSelector('[data-testid="local-fixture-marker"]');

    const deadline = Date.now() + 5000;
    let workers = context.serviceWorkers();
    while (!workers.length && Date.now() < deadline) {
      await sleep(200);
      workers = context.serviceWorkers();
    }

    const runtimeManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
    const sidePanelPath = runtimeManifest.side_panel?.default_path ?? 'popup.html';
    const popupUrl = workers.length
      ? new URL(sidePanelPath, workers[0].url()).href
      : pathToFileURL(resolve(extensionDir, 'dist', sidePanelPath)).href;

    if (!workers.length) {
      console.warn(
        '[extension-load-smoke] No extension service workers detected within 5s; validating side panel shell via local dist fallback.'
      );
    }
    for (const viewport of SMOKE_VIEWPORTS) {
      const popupPage = await context.newPage();
      await popupPage.setViewportSize(viewport);
      await popupPage.goto(popupUrl);
      if (!workers.length) {
        await popupPage.addScriptTag({ path: resolve(extensionDir, 'dist', 'side-panel.js'), type: 'module' });
        await popupPage.evaluate(() => {
          document.dispatchEvent(new Event('DOMContentLoaded'));
        });
      }
      await popupPage.waitForSelector('[data-testid="popup-shell"]');
      await popupPage.waitForSelector('[data-testid="offline-banner"]', { state: 'attached' });
      await popupPage.click('#settings-toggle-button');
      await popupPage.waitForSelector('#settings-panel:not(.hidden)');
      await popupPage.waitForSelector('#theme-background-start');

      const viewportMetrics = await popupPage.evaluate(() => {
        const shell = document.querySelector('[data-testid="popup-shell"]');
        const shellRect = shell?.getBoundingClientRect();
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          shellWidth: shellRect?.width ?? 0,
          shellHeight: shellRect?.height ?? 0
        };
      });

      if (viewportMetrics.scrollWidth > viewportMetrics.clientWidth) {
        throw new Error(
          `Popup overflows horizontally at ${viewport.width}x${viewport.height}: ` +
            `scrollWidth=${viewportMetrics.scrollWidth}, clientWidth=${viewportMetrics.clientWidth}`
        );
      }

      if (viewportMetrics.shellWidth <= 0 || viewportMetrics.shellWidth > viewportMetrics.innerWidth) {
        throw new Error(
          `Popup shell width is invalid at ${viewport.width}x${viewport.height}: ` +
            `shellWidth=${viewportMetrics.shellWidth}, innerWidth=${viewportMetrics.innerWidth}`
        );
      }

      await popupPage.addScriptTag({ path: resolve(extensionDir, 'dist', 'axe.min.js') });
      const axeResults = await popupPage.evaluate(async () => {
        const axe = globalThis.axe;
        if (!axe || typeof axe.run !== 'function') {
          throw new Error('axe-core not loaded into popup page');
        }

        return await axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
          }
        });
      });

      const actionableViolations = axeResults.violations.filter(
        (violation) => !JSDOM_AXE_FALSE_POSITIVE_IDS.has(violation.id)
      );

      if (actionableViolations.length) {
        const summary = actionableViolations
          .map((violation) => `${violation.id}:${violation.impact ?? 'unknown'}`)
          .join(', ');
        throw new Error(`axe accessibility violations detected: ${summary}`);
      }
    }

    assertNoExternalSmokeRequests(
      requestUrls,
      workers.length ? 'playwright extension smoke' : 'playwright side panel smoke fallback'
    );

    return { mode: 'playwright', serviceWorkerCount: workers.length, axeChecked: true };
  } finally {
    await context.close();
    mkdirSync(tmpProfile, { recursive: true });
    rmSync(tmpProfile, { recursive: true, force: true });
  }
}

async function validateJsdomAxeSmoke(extensionDir) {
  const popupHtmlPath = resolve(extensionDir, 'dist', 'popup.html');
  const popupHtml = readFileSync(popupHtmlPath, 'utf8');
  const axeSource = readFileSync(resolve(extensionDir, 'dist', 'axe.min.js'), 'utf8');
  const dom = new JSDOM(popupHtml, {
    url: pathToFileURL(popupHtmlPath).href,
    pretendToBeVisual: true
  });

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    Element: globalThis.Element,
    CustomEvent: globalThis.CustomEvent,
    MutationObserver: globalThis.MutationObserver,
    Blob: globalThis.Blob,
    URL: globalThis.URL
  };

  try {
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.Node = dom.window.Node;
    globalThis.Element = dom.window.Element;
    globalThis.CustomEvent = dom.window.CustomEvent;
    globalThis.MutationObserver = dom.window.MutationObserver;
    globalThis.Blob = dom.window.Blob;
    globalThis.URL = dom.window.URL;

    dom.window.eval(axeSource);

    const sidePanelModule = await import(pathToFileURL(resolve(extensionDir, 'dist', 'side-panel.js')).href);
    void sidePanelModule;
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
    await sleep(50);

    const axe = dom.window.axe;
    if (!axe || typeof axe.run !== 'function') {
      throw new Error('axe-core not loaded into jsdom popup page');
    }

    const axeResults = await axe.run(dom.window.document, {
      rules: {
        'color-contrast': { enabled: false }
      },
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
      }
    });

    const actionableViolations = axeResults.violations.filter((violation) => !JSDOM_AXE_FALSE_POSITIVE_IDS.has(violation.id));
    if (actionableViolations.length) {
      const summary = actionableViolations
        .map((violation) => `${violation.id}:${violation.impact ?? 'unknown'}`)
        .join(', ');
      throw new Error(`axe accessibility violations detected: ${summary}`);
    }

    return { mode: 'jsdom', serviceWorkerCount: 0, axeChecked: true };
  } finally {
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.Node = previous.Node;
    globalThis.Element = previous.Element;
    globalThis.CustomEvent = previous.CustomEvent;
    globalThis.MutationObserver = previous.MutationObserver;
    globalThis.Blob = previous.Blob;
    globalThis.URL = previous.URL;
  }
}

async function main() {
  try {
    const sourceManifest = await validateStaticExtensionAssets(
      sourceManifestPath,
      sourceWorker,
      projectRoot,
      'source'
    );
    if (existsSync(distManifestPath)) {
      await validateStaticExtensionAssets(distManifestPath, distWorker, distDir, 'dist');
    }

    console.log(`[extension-load-smoke] Loaded manifest ${sourceManifest.name}@${sourceManifest.version}`);

    const runtime = await validateAxeSmoke(projectRoot);
    if (runtime.mode === 'playwright') {
      console.log(
        `[extension-load-smoke] PASS runtime extension workers: ${runtime.serviceWorkerCount}`
      );
    } else {
      console.log('[extension-load-smoke] PASS jsdom accessibility scan.');
    }

    if (runtime.axeChecked) {
      console.log('[extension-load-smoke] PASS axe accessibility scan.');
    }
  } catch (error) {
    console.error('[extension-load-smoke] FAIL', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await main();
