import { spawn } from 'node:child_process';

const debuggerUrl = process.env.CHROME_DEBUGGER_URL ?? 'http://127.0.0.1:9222/json/version';
const maxAttempts = Number(process.env.CHROME_DEBUGGER_MAX_ATTEMPTS ?? 15);
const retryDelayMs = Number(process.env.CHROME_DEBUGGER_RETRY_DELAY_MS ?? 1000);

let payload;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const response = await fetch(debuggerUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    payload = await response.json();
    break;
  } catch (error) {
    if (attempt === maxAttempts) {
      console.error(`[side-panel-playwright] Failed to read ${debuggerUrl} after ${maxAttempts} attempts: ${String(error)}`);
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}
const wsEndpoint = payload.webSocketDebuggerUrl;
if (!wsEndpoint) {
  console.error('[side-panel-playwright] Chrome debugger endpoint is missing webSocketDebuggerUrl');
  process.exit(1);
}

console.log(`[side-panel-playwright] Connecting Playwright to ${wsEndpoint}`);

const child = spawn('pnpm', ['exec', 'playwright', 'test', 'tests/side-panel/side-panel.playwright.spec.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PW_TEST_CONNECT_WS_ENDPOINT: wsEndpoint
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`[side-panel-playwright] Failed to start Playwright: ${error.message}`);
  process.exit(1);
});
