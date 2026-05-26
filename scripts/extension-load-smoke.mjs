import { accessSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

async function validatePlaywrightSmoke(extensionDir) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    console.log('[extension-load-smoke] Playwright not available; skipping runtime browser smoke test.');
    return { skipped: true };
  }

  if (!playwright.chromium) {
    console.log('[extension-load-smoke] Playwright did not expose chromium; skipping runtime browser smoke test.');
    return { skipped: true };
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

    const popupUrl = pathToFileURL(resolve(projectRoot, 'popup.html')).href;
    const popupPage = await context.newPage();
    await popupPage.goto(popupUrl);
    await popupPage.waitForSelector('[data-testid="popup-shell"]');
    await popupPage.waitForSelector('[data-testid="offline-banner"]');
    await popupPage.click('#settings-toggle-button');
    await popupPage.waitForSelector('#settings-panel:not(.hidden)');
    await popupPage.waitForSelector('#theme-background-start');

    return { skipped: false, serviceWorkerCount: workers.length };
  } finally {
    await context.close();
    mkdirSync(tmpProfile, { recursive: true });
    rmSync(tmpProfile, { recursive: true, force: true });
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

    const runtime = await validatePlaywrightSmoke(projectRoot);
    if (runtime.skipped) {
      console.log('[extension-load-smoke] PASS (static validation only).');
      return;
    }

    console.log(
      `[extension-load-smoke] PASS runtime extension workers: ${runtime.serviceWorkerCount}`
    );
  } catch (error) {
    console.error('[extension-load-smoke] FAIL', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await main();
