import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertBackendEndpointAllowed, sanitizeBackendHostPolicy } from '../../src/background/host-policy';
import type { ScanRequest } from '../../src/shared/types';

describe('host policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows endpoint matching page host when no allowlist is provided', () => {
    const check = assertBackendEndpointAllowed({
      endpoint: 'https://api.example.com/v1/audit',
      pageUrl: 'https://api.example.com/page'
    });

    expect(check.ok).toBe(true);
  });

  it('disables same-host backend when private host is requested', () => {
    const check = assertBackendEndpointAllowed({
      endpoint: 'http://127.0.0.1:9999',
      pageUrl: 'https://example.com/page'
    });

    expect(check.ok).toBe(false);
    expect(check.reason).toContain('local/private network');
  });

  it('supports exact and wildcard allowlists', () => {
    const allowed = {
      allowedHosts: ['api.example.com', '*.cdn.example.com']
    };

    expect(
      assertBackendEndpointAllowed({
        endpoint: 'https://api.example.com/v1',
        pageUrl: 'https://example.com/page',
        ...allowed
      }).ok
    ).toBe(true);

    expect(
      assertBackendEndpointAllowed({
        endpoint: 'https://assets.cdn.example.com/v1',
        pageUrl: 'https://example.com/page',
        ...allowed
      }).ok
    ).toBe(true);

    expect(
      assertBackendEndpointAllowed({
        endpoint: 'https://evil-cdn.example.com/v1',
        pageUrl: 'https://example.com/page',
        ...allowed
      }).ok
    ).toBe(false);
  });

  it('uses URL-based host extraction when sanitizing allowlist inputs', () => {
    const request: ScanRequest = {
      requestId: 'policy-2',
      url: 'https://example.com/page',
      engine: 'dom-lite',
      backend: {
        enabled: true,
        mode: 'http',
        endpoint: 'https://audit.example.com',
        allowedHosts: ['https://api.example.com', 'https://*.cdn.example.com']
      }
    };

    expect(sanitizeBackendHostPolicy(request.backend)).toEqual(['api.example.com', '*.cdn.example.com']);
  });
});
