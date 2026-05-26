import type { ScanRequest } from '../shared/types';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export type HostPolicyCheck = {
  ok: boolean;
  reason?: string;
};

export type BackendHostPolicyInput = {
  endpoint: string;
  pageUrl?: string;
  allowedHosts?: string[];
  allowLoopback?: boolean;
};

export function isPrivateOrRestrictedHost(hostname: string): boolean {
  const normalized = normalizeHost(hostname);

  if (LOOPBACK_HOSTS.has(normalized) || normalized.endsWith('.localhost')) {
    return true;
  }

  if (normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  const ipv4 = normalized.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4) {
    return false;
  }

  const first = Number(ipv4[1]);
  const second = Number(ipv4[2]);

  if (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 192 && second === 168)
  ) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return first === 100 && second >= 64 && second <= 127;
}

export function assertBackendEndpointAllowed(input: BackendHostPolicyInput): HostPolicyCheck {
  const { endpoint, pageUrl, allowedHosts, allowLoopback = false } = input;
  const parsed = parseHostAndOrigin(endpoint);
  if (!parsed) {
    return { ok: false, reason: 'Backend endpoint must be a valid absolute URL.' };
  }

  const { host, protocol } = parsed;

  if (!['http:', 'https:'].includes(protocol)) {
    return { ok: false, reason: 'Backend endpoint must use http or https.' };
  }

  if (!allowLoopback && isPrivateOrRestrictedHost(host)) {
    return {
      ok: false,
      reason: 'Backend endpoint targets local/private network and is blocked by host policy.'
    };
  }

  const allowedHostset = new Set((allowedHosts ?? []).filter(Boolean).map((entry) => normalizeHost(entry)));
  if (!allowedHostset.size && pageUrl) {
    const pageHost = normalizeHost(new URL(pageUrl).hostname);
    if (host !== pageHost && !(isLoopbackHost(host) && pageHost.startsWith('127.'))) {
      return {
        ok: false,
        reason: 'No backend allowlist provided and endpoint host does not match page host.'
      };
    }
  }

  if (allowedHostset.size) {
    const allowed = [...allowedHostset].some((entry) => matchHost(entry, host));
    if (!allowed) {
      return {
        ok: false,
        reason: 'Backend endpoint host is outside the configured backend allowed hosts.'
      };
    }
  }

  if (protocol === 'http:' && !isLoopbackHost(host)) {
    return {
      ok: false,
      reason: 'Non-TLS backend endpoints are allowed only for loopback hosts.'
    };
  }

  return { ok: true };
}

export function extractBackendHost(endpoint: string): string | undefined {
  return parseHostAndOrigin(endpoint)?.host;
}

function parseHostAndOrigin(input: string): { host: string; protocol: string } | undefined {
  try {
    const parsed = new URL(input);
    return {
      host: normalizeHost(parsed.hostname),
      protocol: parsed.protocol
    };
  } catch {
    return undefined;
  }
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
}

export function isLoopbackHost(hostname: string): boolean {
  const normalized = normalizeHost(hostname).replace(/^\*\./, '');
  return LOOPBACK_HOSTS.has(normalized) || normalized.endsWith('.localhost');
}

function matchHost(allowedEntry: string, host: string): boolean {
  if (!allowedEntry) {
    return false;
  }

  if (allowedEntry === host) {
    return true;
  }

  if (!allowedEntry.startsWith('*.')) {
    return false;
  }

  const suffix = allowedEntry.slice(2);
  return host === suffix || host.endsWith(`.${suffix}`);
}

export function sanitizeBackendHostPolicy(request: ScanRequest['backend']): string[] | undefined {
  return request?.allowedHosts
    ?.map((entry) => parseAllowedHost(entry.trim()))
    .filter((entry): entry is string => Boolean(entry));
}

function parseAllowedHost(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const hasWildcard = trimmed.startsWith('*.');
  const candidate = hasWildcard ? trimmed.slice(2).trim() : trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) {
      return undefined;
    }

    return hasWildcard ? `*.${normalizeHost(parsed.hostname)}` : normalizeHost(parsed.hostname);
  } catch {
    return hasWildcard ? `*.${normalizeHost(candidate)}` : normalizeHost(candidate);
  }
}
