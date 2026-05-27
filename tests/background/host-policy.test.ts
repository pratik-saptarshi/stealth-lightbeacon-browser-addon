import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertBackendEndpointAllowed,
  extractBackendHost,
  isPrivateOrRestrictedHost,
  sanitizeBackendHostPolicy
} from '../../src/background/host-policy';
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

  it('rejects malformed endpoints and page URLs', () => {
    expect(
      assertBackendEndpointAllowed({
        endpoint: 'not-a-url',
        pageUrl: 'https://example.com/page'
      }).ok
    ).toBe(false);

    const pageUrlCheck = assertBackendEndpointAllowed({
      endpoint: 'https://api.example.com/v1/audit',
      pageUrl: 'not-a-url'
    });

    expect(pageUrlCheck.ok).toBe(false);
    expect(pageUrlCheck.reason).toContain('Page URL must be a valid absolute URL.');
    expect(extractBackendHost('not-a-url')).toBeUndefined();
  });

  it('treats IPv6 link-local hosts as private and allows loopback when opted in', () => {
    expect(isPrivateOrRestrictedHost('fe80::1')).toBe(true);
    expect(isPrivateOrRestrictedHost('fc00::1')).toBe(true);
    expect(isPrivateOrRestrictedHost('fea.example.com')).toBe(false);

    expect(
      assertBackendEndpointAllowed({
        endpoint: 'http://[fe80::1]:9999',
        pageUrl: 'https://example.com/page'
      }).ok
    ).toBe(false);

    expect(
      assertBackendEndpointAllowed({
        endpoint: 'http://127.0.0.1:9999',
        pageUrl: 'http://127.0.0.1/page',
        allowLoopback: true
      }).ok
    ).toBe(true);
  });

  it('recognizes ipv4 private ranges and localhost variants', () => {
    expect(isPrivateOrRestrictedHost('10.0.0.1')).toBe(true);
    expect(isPrivateOrRestrictedHost('172.16.0.1')).toBe(true);
    expect(isPrivateOrRestrictedHost('100.64.0.1')).toBe(true);
    expect(isPrivateOrRestrictedHost('example.localhost')).toBe(true);
    expect(isPrivateOrRestrictedHost('203.0.113.1')).toBe(false);
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

  it('rejects http endpoints outside loopback even when the page host matches', () => {
    const check = assertBackendEndpointAllowed({
      endpoint: 'http://api.example.com/v1',
      pageUrl: 'https://api.example.com/page'
    });

    expect(check.ok).toBe(false);
    expect(check.reason).toContain('Non-TLS backend endpoints');
  });

  it('rejects endpoints that do not match the page host when no allowlist is provided', () => {
    const check = assertBackendEndpointAllowed({
      endpoint: 'https://api.example.com/v1',
      pageUrl: 'https://example.com/page'
    });

    expect(check.ok).toBe(false);
    expect(check.reason).toContain('No backend allowlist provided');
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

  it('sanitizes blank entries and preserves wildcard allowlist hosts', () => {
    expect(
      sanitizeBackendHostPolicy({
        enabled: true,
        mode: 'http',
        allowedHosts: ['*.cdn.example.com', 'https://api.example.com/path', '   ']
      })
    ).toEqual(['*.cdn.example.com', 'api.example.com']);
  });

  it('allows allowed-host matches without a page URL', () => {
    const check = assertBackendEndpointAllowed({
      endpoint: 'https://api.example.com/v1/audit',
      allowedHosts: ['api.example.com']
    });

    expect(check.ok).toBe(true);
  });
});
