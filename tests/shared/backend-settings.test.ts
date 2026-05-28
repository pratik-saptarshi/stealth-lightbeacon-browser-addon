import { describe, expect, it } from 'vitest';
import {
  buildBackendRequestFromSettings,
  composeEndpoint,
  DEFAULT_BACKEND_SETTINGS,
  extractBackendEngine,
  normalizeBackendSettings
} from '../../src/shared/backend-settings';

describe('backend settings helpers', () => {
  it('normalizes persisted settings with defaults', () => {
    expect(normalizeBackendSettings(undefined)).toEqual(DEFAULT_BACKEND_SETTINGS);
    expect(
      normalizeBackendSettings({
        enabled: true,
        mode: 'stdin',
        endpoint: '127.0.0.1',
        port: '8080',
        requestSigningSecret: 'secret',
        authUsername: 'neo',
        authPassword: 'matrix',
        required: true
      })
    ).toEqual({
      enabled: true,
      mode: 'stdin',
      endpoint: '127.0.0.1',
      port: '8080',
      requestSigningSecret: 'secret',
      authUsername: 'neo',
      authPassword: 'matrix',
      required: true
    });
  });

  it('composes endpoint URLs with optional port overrides', () => {
    expect(composeEndpoint('127.0.0.1', '5000')).toBe('http://127.0.0.1:5000');
    expect(composeEndpoint('https://localhost', '8443')).toBe('https://localhost:8443');
    expect(composeEndpoint('', '8443')).toBeUndefined();
  });

  it('builds backend request payloads from local settings', () => {
    expect(
      buildBackendRequestFromSettings({
        ...DEFAULT_BACKEND_SETTINGS,
        enabled: true,
        endpoint: '127.0.0.1',
        port: '5000',
        requestSigningSecret: 'secret',
        authUsername: 'user',
        authPassword: 'pass'
      })
    ).toEqual({
      enabled: true,
      mode: 'http',
      required: false,
      endpoint: 'http://127.0.0.1:5000',
      requestSigningSecret: 'secret',
      auth: {
        username: 'user',
        password: 'pass'
      }
    });

    expect(
      buildBackendRequestFromSettings({
        ...DEFAULT_BACKEND_SETTINGS,
        enabled: true,
        mode: 'stdin',
        requestSigningSecret: 'secret'
      })
    ).toEqual({
      enabled: true,
      mode: 'stdin',
      required: false,
      requestSigningSecret: 'secret'
    });
  });

  it('handles alias fields and invalid local endpoints', () => {
    expect(
      normalizeBackendSettings({
        username: 'neo',
        password: 'matrix'
      })
    ).toMatchObject({
      authUsername: 'neo',
      authPassword: 'matrix'
    });

    expect(
      buildBackendRequestFromSettings({
        ...DEFAULT_BACKEND_SETTINGS,
        enabled: true,
        endpoint: '   ',
        port: '8080'
      })
    ).toBeUndefined();

    expect(
      buildBackendRequestFromSettings({
        ...DEFAULT_BACKEND_SETTINGS,
        enabled: true,
        endpoint: 'http://%',
        port: '8080'
      })
    ).toBeUndefined();

    expect(extractBackendEngine({ ...DEFAULT_BACKEND_SETTINGS, mode: 'stdin' })).toBe('mcp');
  });
});
