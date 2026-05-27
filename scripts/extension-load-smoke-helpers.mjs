const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'ws:', 'wss:', 'ftp:']);

export const SMOKE_FIXTURE_RELATIVE_PATH = 'tests/phase4/fixtures/extension-load-smoke.html';

export const SMOKE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 1280, height: 900 })
]);

export function isExternalSmokeRequest(rawUrl) {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(rawUrl).protocol);
  } catch {
    return false;
  }
}

export function assertNoExternalSmokeRequests(requestUrls, label = 'extension smoke') {
  const externalRequests = requestUrls.filter(isExternalSmokeRequest);
  if (externalRequests.length > 0) {
    throw new Error(`${label} touched external requests: ${externalRequests.join(', ')}`);
  }
}
