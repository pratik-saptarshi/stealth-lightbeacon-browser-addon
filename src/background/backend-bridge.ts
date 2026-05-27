import type { CrawlNode, ScanRequest, ScanSnapshot } from '../shared/types';
import type { RuleContext } from '../shared/rule-engine';
import type { BackendEngine } from '../shared/types';
import { assertBackendScanResponse } from '../shared/contracts';

export interface BackendScanResponse {
  snapshot: ScanSnapshot;
  crawlNodes?: CrawlNode[];
}

export interface BackendPayload {
  request: ScanRequest;
  pageContext: RuleContext;
  ruleSetVersion?: string;
  selectedCategories?: string[];
}

export interface BackendConfig {
  enabled?: boolean;
  mode?: 'http' | 'stdin';
  endpoint?: string;
  requestSigningSecret?: string;
  auth?: {
    username: string;
    password: string;
  };
  timeoutMs?: number;
  required?: boolean;
}

export interface BackendAdapter {
  runScan(payload: BackendPayload): Promise<BackendScanResponse>;
}

interface HttpBackendOptions {
  endpoint: string;
  engine?: BackendEngine;
  requestSigningSecret?: string;
  auth?: {
    username: string;
    password: string;
  };
  timeoutMs?: number;
}

const DEFAULT_BACKEND_PATH = '/v1/audit/scan';
const DEFAULT_BACKEND_TIMEOUT_MS = 3500;
const MAX_STDIN_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_STDIN_TIMEOUT_MS = 3000;

export class HttpBackendClient implements BackendAdapter {
  constructor(private readonly options: HttpBackendOptions) {}

  async runScan(payload: BackendPayload): Promise<BackendScanResponse> {
    const endpoint = trimEndpoint(this.options.endpoint);
    const requestBody = JSON.stringify(payload);
    const headers = {
      ...await buildSignedHeaders(this.options.requestSigningSecret, requestBody),
      ...buildBasicAuthHeader(this.options.auth)
    };
    const request: RequestInit = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...headers
      },
      body: requestBody
    };

    const controller = new AbortController();
    const timer = globalThis.setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? DEFAULT_BACKEND_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${endpoint}${backendPath(this.options.engine)}`, {
        ...request,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status ${response.status}`);
      }

      return assertBackendScanResponse(await response.json());
    } finally {
      globalThis.clearTimeout(timer);
    }
  }
}

export class StdinBackendClient implements BackendAdapter {
  constructor(
    private readonly executor: (payload: BackendPayload) => Promise<unknown>,
    private readonly timeoutMs = DEFAULT_STDIN_TIMEOUT_MS
  ) {}

  async runScan(payload: BackendPayload): Promise<BackendScanResponse> {
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_STDIN_PAYLOAD_BYTES) {
      throw new Error('Stdio backend payload exceeds 64KB limit');
    }

    const parsed = await withTimeout(Promise.resolve(this.executor(payload)), this.timeoutMs, 'Stdio backend timed out');
    return assertBackendScanResponse(parsed);
  }
}

export function createBackendClient(
  request: ScanRequest['backend'],
  selectedEngine?: BackendEngine
): BackendAdapter | undefined {
  if (!request || request.enabled === false) {
    return undefined;
  }

  if (!request.endpoint && request.mode !== 'stdin') {
    return undefined;
  }

  if (request.mode === 'stdin') {
    return undefined;
  }

  if (!request.endpoint) {
    return undefined;
  }

  return new HttpBackendClient({
    endpoint: request.endpoint,
    engine: selectedEngine || request.engine,
    requestSigningSecret: request.requestSigningSecret,
    auth: request.auth,
    timeoutMs: request.timeoutMs
  });
}

export function createStdioBackendClient(
  request: ScanRequest['backend'],
  executor: ((payload: BackendPayload) => Promise<unknown>) | undefined,
  selectedEngine?: BackendEngine
): BackendAdapter | undefined {
  if (!request || request.enabled === false) {
    return undefined;
  }

  if (request.mode !== 'stdin') {
    return undefined;
  }

  if (!executor) {
    return undefined;
  }

  return new StdinBackendClient((payload) => {
    const requestedEngine = selectedEngine ?? payload.request.backend?.engine;
    if (!requestedEngine) {
      return executor(payload);
    }

    return executor({
      ...payload,
      request: {
        ...payload.request,
        backend: {
          ...payload.request.backend,
          engine: requestedEngine
        }
      }
    });
  }, request.timeoutMs);
}

export function createBackendAdapter(
  request: ScanRequest['backend'],
  selectedEngine?: BackendEngine,
  stdioExecutor?: ((payload: BackendPayload) => Promise<unknown>)
): BackendAdapter | undefined {
  if (!request || request.enabled === false) {
    return undefined;
  }

  if (request.mode === 'stdin') {
    return createStdioBackendClient(request, stdioExecutor, selectedEngine || request.engine);
  }

  return createBackendClient(request, selectedEngine);
}

function buildBasicAuthHeader(auth?: BackendConfig['auth']): Record<string, string> {
  if (!auth?.username || !auth.password) {
    return {};
  }

  const encodedCredentials = globalThis.btoa?.(`${auth.username}:${auth.password}`);
  if (!encodedCredentials) {
    return {};
  }

  return {
    authorization: `Basic ${encodedCredentials}`
  };
}

async function buildSignedHeaders(secret: string | undefined, payload: string): Promise<Record<string, string>> {
  if (!secret) {
    return {};
  }

  const signature = await computeHmacSha256(secret, payload);
  return {
    'x-stlt-signature': signature
  };
}

async function computeHmacSha256(secret: string, message: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle === 'undefined' || typeof TextEncoder === 'undefined') {
    return fallbackSignature(secret, message);
  }

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64FromBytes(new Uint8Array(signature));
}

function fallbackSignature(secret: string, message: string): string {
  let acc = 0;
  const key = `${secret}:${message}`;
  for (let index = 0; index < key.length; index++) {
    acc = (acc + key.charCodeAt(index) * 31) % 0x7fffffff;
  }

  return `fallback:${acc.toString(16)}`;
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(binary, 'binary').toString('base64');
  }

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function trimEndpoint(endpoint: string): string {
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

function backendPath(engine?: BackendEngine): string {
  if (!engine || engine === 'http') {
    return DEFAULT_BACKEND_PATH;
  }

  return `${DEFAULT_BACKEND_PATH}/${engine}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return Promise.race<T>([
    promise,
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const timedOut = new Error(message);
        (timedOut as Error & { name: string }).name = 'TimeoutError';
        reject(timedOut);
      }, timeoutMs);
    })
  ]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
