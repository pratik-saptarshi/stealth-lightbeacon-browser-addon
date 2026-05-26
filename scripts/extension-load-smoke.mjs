import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = resolve(process.cwd());
const distDir = resolve(projectRoot, 'dist');
const manifestPath = resolve(distDir, 'manifest.json');
const distWorker = resolve(distDir, 'service-worker.js');

function ensureBoolean(value) {
  return Boolean(value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateStaticExtensionAssets() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const expected = manifest.background?.service_worker;

  if (!expected) {
    throw new Error('manifest.json missing background.service_worker');
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

  if (!readFileSync(resolve(distDir, expected), 'utf8')) {
    throw new Error(`Missing dist service worker entry: ${expected}`);
  }

  const workerUrl = pathToFileURL(distWorker).href;
  return import(workerUrl).then(() => manifest);
}

async function validatePlaywrightSmoke() {
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
      `--disable-extensions-except=${distDir}`,
      `--load-extension=${distDir}`,
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
    const manifest = await validateStaticExtensionAssets();
    console.log(`[extension-load-smoke] Loaded manifest ${manifest.name}@${manifest.version}`);

    const runtime = await validatePlaywrightSmoke();
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
