import { defineConfig } from '@playwright/test';
import { pickChromeLaunchStrategy } from './scripts/chrome-runtime.mjs';

const chromeLaunchStrategy = pickChromeLaunchStrategy();

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.playwright\.spec\.ts$/,
  fullyParallel: false,
  retries: 0,
  use: {
    browserName: 'chromium',
    launchOptions: chromeLaunchStrategy.primary,
    viewport: {
      width: 468,
      height: 900
    },
    acceptDownloads: true,
    ignoreHTTPSErrors: true
  },
  reporter: [['line']]
});
