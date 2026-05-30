import { describe, expect, it } from 'vitest';
// @ts-expect-error runtime helper is plain .mjs and intentionally imported in tests.
import { pickChromeLaunchStrategy } from '../../scripts/chrome-runtime.mjs';

describe('chrome runtime launch strategy', () => {
  it('prefers a valid executable path from env', () => {
    const strategy = pickChromeLaunchStrategy({
      env: {
        PLAYWRIGHT_CHROME_EXECUTABLE_PATH: '/opt/chrome'
      },
      fileExists: (filePath: string) => filePath === '/opt/chrome',
      canExecute: (command: string) => command === '/opt/chrome'
    });

    expect(strategy.primary).toEqual({ executablePath: '/opt/chrome' });
    expect(strategy.fallback).toEqual({});
  });

  it('prefers Playwright default launch when env path is missing', () => {
    const strategy = pickChromeLaunchStrategy({
      env: {},
      fileExists: () => false,
      canExecute: () => false
    });

    expect(strategy.primary).toEqual({});
    expect(strategy.fallback).toEqual({ channel: 'chromium' });
  });
});
