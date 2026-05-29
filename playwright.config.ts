import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const chromeExecutablePath = [
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  process.env.CHROME_BIN,
  '/usr/local/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));

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
