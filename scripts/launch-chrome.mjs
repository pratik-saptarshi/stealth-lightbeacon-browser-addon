import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = resolve(process.cwd());
const extensionDir = resolve(projectRoot, 'dist');
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  process.env.CHROME_BIN,
  '/usr/local/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
].filter(Boolean);

const chromeExecutable = chromeCandidates.find((candidate) => candidate && existsSync(candidate));

if (!chromeExecutable) {
  console.error('[launch] No Chrome executable found. Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH or CHROME_BIN.');
  process.exitCode = 1;
  process.exit();
}

const profileDir = mkdtempSync(join(tmpdir(), 'slt-chrome-launch-'));
const args = [
  `--user-data-dir=${profileDir}`,
  `--disable-extensions-except=${extensionDir}`,
  `--load-extension=${extensionDir}`,
  '--remote-debugging-port=9222',
  '--new-window',
  'about:blank'
];

console.log(`[launch] Starting Chrome with unpacked extension from ${extensionDir}`);
console.log(`[launch] User data dir: ${profileDir}`);
console.log(`[launch] Executable: ${chromeExecutable}`);

const child = spawn(chromeExecutable, args, {
  detached: true,
  stdio: 'ignore'
});

child.unref();

child.on('error', (error) => {
  console.error(`[launch] Failed to start Chrome: ${error.message}`);
  process.exitCode = 1;
});
