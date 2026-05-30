import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { defineConfig } from '@playwright/test';

function resolveUsableChromeExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
    process.env.CHROME_BIN
  ];

  for (const candidate of candidates) {
    if (!candidate || !existsSync(candidate)) {
      continue;
    }

    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) {
      return candidate;
    }
  }

  return undefined;
}

const chromeExecutablePath = resolveUsableChromeExecutable();

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.playwright\.spec\.ts$/,
  fullyParallel: false,
  retries: 0,
  use: {
    browserName: 'chromium',
    ...(chromeExecutablePath
      ? {
          launchOptions: {
            executablePath: chromeExecutablePath
          }
        }
      : {}),
    viewport: {
      width: 468,
      height: 900
    },
    acceptDownloads: true,
    ignoreHTTPSErrors: true
  },
  reporter: [['line']]
});
