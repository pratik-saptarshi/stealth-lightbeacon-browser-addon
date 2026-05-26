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

function validateStaticExtensionAssets(manifestPath, workerPath, baseDir, label) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const expected = manifest.background?.service_worker;

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

  accessSync(resolve(baseDir, 'icons/icon-fail-16.svg'));
  accessSync(resolve(baseDir, 'icons/icon-alert-16.svg'));
  accessSync(resolve(baseDir, 'icons/icon-fail-16-static.svg'));
  accessSync(resolve(baseDir, 'icons/icon-alert-16-static.svg'));

  const workerUrl = pathToFileURL(workerPath).href;
  return import(workerUrl).then(() => manifest);
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
