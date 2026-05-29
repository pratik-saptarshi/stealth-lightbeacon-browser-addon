import { spawn } from 'node:child_process';

const debuggerUrl = process.env.CHROME_DEBUGGER_URL ?? 'http://127.0.0.1:9222/json/version';

const response = await fetch(debuggerUrl);
if (!response.ok) {
  console.error(`[popup-playwright] Failed to read ${debuggerUrl}: ${response.status}`);
  process.exit(1);
}

const payload = await response.json();
const wsEndpoint = payload.webSocketDebuggerUrl;
if (!wsEndpoint) {
  console.error('[popup-playwright] Chrome debugger endpoint is missing webSocketDebuggerUrl');
  process.exit(1);
}

console.log(`[popup-playwright] Connecting Playwright to ${wsEndpoint}`);

const child = spawn('pnpm', ['exec', 'playwright', 'test', 'tests/popup/popup.playwright.spec.ts'], {
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
  console.error(`[popup-playwright] Failed to start Playwright: ${error.message}`);
  process.exit(1);
});
