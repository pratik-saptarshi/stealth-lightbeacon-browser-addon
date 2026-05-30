import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DEFAULT_CHROME_CHANNEL = 'chrome';
const FALLBACK_CHROMIUM_CHANNEL = 'chromium';

function resolveUsableChromeExecutable({
  env = process.env,
  fileExists = existsSync,
  canExecute = (command) => spawnSync(command, ['--version'], { encoding: 'utf8' }).status === 0
} = {}) {
  const candidates = [env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH, env.CHROME_BIN];

  for (const candidate of candidates) {
    if (!candidate || !fileExists(candidate)) {
      continue;
    }

    if (canExecute(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function pickChromeLaunchStrategy(options = {}) {
  const executablePath = resolveUsableChromeExecutable(options);
  if (executablePath) {
    return {
      primary: { executablePath },
      fallback: {}
    };
  }

  return {
    primary: {},
    fallback: { channel: FALLBACK_CHROMIUM_CHANNEL }
  };
}
