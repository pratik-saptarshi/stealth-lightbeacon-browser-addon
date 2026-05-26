import type { BackendEngine, ScanRequest } from './types';

export interface BackendSettingsForm {
  enabled: boolean;
  mode: 'http' | 'stdin';
  endpoint: string;
  port: string;
  requestSigningSecret: string;
  authUsername: string;
  authPassword: string;
  required: boolean;
}

export const BACKEND_SETTINGS_STORAGE_KEY = 'addon_backend_settings';

export const DEFAULT_BACKEND_SETTINGS: BackendSettingsForm = {
  enabled: false,
  mode: 'http',
  endpoint: 'http://127.0.0.1',
  port: '5000',
  requestSigningSecret: '',
  authUsername: '',
  authPassword: '',
  required: false
};

export function normalizeBackendSettings(input: unknown): BackendSettingsForm {
  if (!isRecord(input)) {
    return { ...DEFAULT_BACKEND_SETTINGS };
  }

  return {
    enabled: coerceBoolean(input.enabled, DEFAULT_BACKEND_SETTINGS.enabled),
    mode: input.mode === 'stdin' ? 'stdin' : 'http',
    endpoint: coerceString(input.endpoint, DEFAULT_BACKEND_SETTINGS.endpoint),
    port: coerceString(input.port, DEFAULT_BACKEND_SETTINGS.port),
    requestSigningSecret: coerceString(input.requestSigningSecret, DEFAULT_BACKEND_SETTINGS.requestSigningSecret),
    authUsername: coerceString(input.authUsername ?? input.username, DEFAULT_BACKEND_SETTINGS.authUsername),
    authPassword: coerceString(input.authPassword ?? input.password, DEFAULT_BACKEND_SETTINGS.authPassword),
    required: coerceBoolean(input.required, DEFAULT_BACKEND_SETTINGS.required)
  };
}

export function buildBackendRequestFromSettings(settings: BackendSettingsForm): ScanRequest['backend'] | undefined {
  if (!settings.enabled) {
    return undefined;
  }

  const request: NonNullable<ScanRequest['backend']> = {
    enabled: true,
    mode: settings.mode,
    required: settings.required
  };

  if (settings.requestSigningSecret.trim()) {
    request.requestSigningSecret = settings.requestSigningSecret.trim();
  }

  if (settings.authUsername.trim() && settings.authPassword.trim()) {
    request.auth = {
      username: settings.authUsername.trim(),
      password: settings.authPassword.trim()
    };
  }

  if (settings.mode === 'stdin') {
    return request;
  }

  const endpoint = composeEndpoint(settings.endpoint, settings.port);
  if (!endpoint) {
    return undefined;
  }

  request.endpoint = endpoint;
  return request;
}

export function composeEndpoint(endpoint: string, port: string): string | undefined {
  const trimmedEndpoint = endpoint.trim();
  if (!trimmedEndpoint) {
    return undefined;
  }

  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedEndpoint)
    ? trimmedEndpoint
    : `http://${trimmedEndpoint.replace(/^\/+/, '')}`;

  try {
    const url = new URL(withScheme);
    const trimmedPort = port.trim();
    if (trimmedPort) {
      url.port = trimmedPort;
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function extractBackendEngine(settings: BackendSettingsForm): BackendEngine | undefined {
  return settings.mode === 'stdin' ? 'mcp' : undefined;
}
