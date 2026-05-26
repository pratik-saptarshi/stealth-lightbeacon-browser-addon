import { accessSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const projectRoot = resolve(process.cwd());
const distDir = resolve(projectRoot, 'dist');
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
  const popupPath = manifest.action?.default_popup;

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

  if (!popupPath) {
    throw new Error(`${label} manifest missing action.default_popup`);
  }

  if (!readFileSync(resolve(baseDir, popupPath), 'utf8')) {
    throw new Error(`${label} manifest points to missing popup shell: ${popupPath}`);
  }

  assertPopupSurface(resolve(baseDir, popupPath));
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
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    return validateJsdomAxeSmoke(extensionDir);
  }

  if (!playwright.chromium) {
    return validateJsdomAxeSmoke(extensionDir);
  }

  const tmpProfile = mkdtempSync(join(tmpdir(), 'slt-extension-load-'));
  const context = await playwright.chromium.launchPersistentContext(tmpProfile, {
    headless: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      '--disable-sync',
      '--metrics-recording-only',
      '--no-first-run'
    ]
  });

  try {
    const page = await context.newPage();
    await page.goto('about:blank');

    const deadline = Date.now() + 5000;
    let workers = context.serviceWorkers();
    while (!workers.length && Date.now() < deadline) {
      await sleep(200);
      workers = context.serviceWorkers();
    }

    if (!workers.length) {
      throw new Error('No extension service workers detected within 5s');
    }

    const popupUrl = new URL('popup.html', workers[0].url()).href;
    const popupPage = await context.newPage();
    await popupPage.goto(popupUrl);
    await popupPage.waitForSelector('[data-testid="popup-shell"]');
    await popupPage.waitForSelector('[data-testid="offline-banner"]');
    await popupPage.click('#settings-toggle-button');
    await popupPage.waitForSelector('#settings-panel:not(.hidden)');
    await popupPage.waitForSelector('#theme-background-start');

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

    if (axeResults.violations.length) {
      const summary = axeResults.violations
        .map((violation) => `${violation.id}:${violation.impact ?? 'unknown'}`)
        .join(', ');
      throw new Error(`axe accessibility violations detected: ${summary}`);
    }

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

    if (axeResults.violations.length) {
      const summary = axeResults.violations
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
