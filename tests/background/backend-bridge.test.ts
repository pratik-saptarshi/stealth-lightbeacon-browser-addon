import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createBackendAdapter,
  createBackendClient,
  createStdioBackendClient,
  StdinBackendClient
} from '../../src/background/backend-bridge';
import type { BackendPayload, BackendScanResponse } from '../../src/background/backend-bridge';
import type { ScanRequest } from '../../src/shared/types';
import type { RuleContext } from '../../src/shared/rule-engine';

type ScanBackendConfig = NonNullable<Parameters<typeof createBackendAdapter>[0]>;

const context: RuleContext = {
  requestUrl: 'https://example.com/page',
  title: 'Example',
  metaDescription: 'desc',
  lang: 'en',
  canonical: 'https://example.com/page',
  headings: { h1: 1, h2: 0, h3: 0 },
  images: [],
  links: [],
  buttons: [],
  formInputs: []
};

const baseRequest: ScanRequest = {
  requestId: 'p-1',
  url: 'https://example.com/page',
  engine: 'dom-lite',
  backend: {
    enabled: true,
    mode: 'http',
    endpoint: 'https://localhost:3000'
  }
};

const basePayload: BackendPayload = {
  request: baseRequest,
  pageContext: context
};

const emptySnapshot = {
  id: 'scan-1',
  origin: 'https://example.com',
  url: 'https://example.com/page',
  timestamp: 1,
  engine: 'dom-lite',
  issues: [],
  summary: {
    total: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    byDomain: {
      seo: 0,
      performance: 0,
      accessibility: 0,
      aeo: 0,
      ux: 0,
      drupal: 0,
      geo: 0,
      'security-headers': 0,
      'WCAG2.1AA': 0,
      'WCAG2.2AA': 0
    }
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('backend bridge', () => {
  type FetchCall = [RequestInfo | URL, RequestInit | undefined];

  it('creates engine-specific HTTP path for fast-obscura', async () => {
    const originalFetch = globalThis.fetch;
    const mock = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({
        snapshot: emptySnapshot
      })
    } as Response));

    globalThis.fetch = mock as unknown as typeof fetch;

    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        engine: 'fast-obscura'
      }
    };

    const client = createBackendClient(request.backend, request.backend?.engine);
    if (!client) {
      throw new Error('Expected backend client');
    }

    const result = (await client.runScan({ ...basePayload, request })) as BackendScanResponse;
    expect(mock).toHaveBeenCalledTimes(1);

    const calls = mock.mock.calls as unknown as Array<FetchCall>;
    const calledUrl = calls[0]![0];

    expect(result.snapshot.id).toBe('scan-1');
    expect(typeof calledUrl).toBe('string');
    expect(calledUrl).toBe('https://localhost:3000/v1/audit/scan/fast-obscura');

    globalThis.fetch = originalFetch;
  });

  it('injects selected engine into stdio payload', async () => {
    const calls: BackendPayload[] = [];
    const executor: (payload: BackendPayload) => Promise<{ snapshot: unknown }> = (payload) => {
      calls.push(payload);
      return Promise.resolve({
        snapshot: emptySnapshot
      });
    };

    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        mode: 'stdin',
        engine: 'stealth-playwright'
      }
    };

    const adapter = createStdioBackendClient(request.backend, executor, 'mcp');
    if (!adapter) {
      throw new Error('Expected stdio adapter');
    }

    await adapter.runScan({ ...basePayload, request });
    expect(calls).toHaveLength(1);
    const payload = calls[0]!;

    expect(payload.request.backend?.engine).toBe('mcp');
    expect(payload.request.backend?.endpoint).toBe('https://localhost:3000');
  });

  it('adds signed request header when requestSigningSecret is set', async () => {
    const originalFetch = globalThis.fetch;
    const captured: Record<string, string> = {};
    const mock = vi.fn(async (url: string, init: RequestInit) => {
      const headers = init.headers as HeadersInit;
      if (headers instanceof Headers) {
        captured['signature'] = headers.get('x-stlt-signature') ?? '';
      } else if (typeof headers === 'object' && headers !== null) {
        captured['signature'] = String((headers as Record<string, string>)['x-stlt-signature'] ?? '');
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          snapshot: emptySnapshot
        })
      } as Response;
    });

    globalThis.fetch = mock as unknown as typeof fetch;

    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        requestSigningSecret: 'unit-signing-secret'
      }
    };

    const client = createBackendClient(request.backend, request.backend?.engine);
    if (!client) {
      throw new Error('Expected backend client');
    }

    await client.runScan({ ...basePayload, request });

    expect(captured['signature']).toBeTruthy();
    expect(captured['signature'].length).toBeGreaterThan(10);
    globalThis.fetch = originalFetch;
  });

  it('adds basic auth when credentials are present', async () => {
    const originalFetch = globalThis.fetch;
    const mock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        snapshot: emptySnapshot
      })
    } as Response));

    globalThis.fetch = mock as unknown as typeof fetch;

    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        endpoint: 'https://localhost:3000/',
        auth: {
          username: 'user',
          password: 'pass'
        }
      }
    };

    const client = createBackendClient(request.backend, request.backend?.engine);
    if (!client) {
      throw new Error('Expected backend client');
    }

    await client.runScan({ ...basePayload, request });

    const calls = mock.mock.calls as unknown as Array<FetchCall>;
    const firstInit = calls[0]![1];
    const headers = firstInit?.headers as HeadersInit;
    const authorization = headers instanceof Headers
      ? headers.get('authorization')
      : typeof headers === 'object' && headers !== null
        ? String((headers as Record<string, string>)['authorization'] ?? '')
        : '';

    expect(authorization).toBe('Basic dXNlcjpwYXNz');
    expect(String((mock.mock.calls as unknown as Array<FetchCall>)[0]![0])).toBe('https://localhost:3000/v1/audit/scan');
    globalThis.fetch = originalFetch;
  });

  it('falls back to hexadecimal signatures when base64 helpers are unavailable', async () => {
    const originalFetch = globalThis.fetch;
    const mock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        snapshot: emptySnapshot
      })
    } as Response));

    globalThis.fetch = mock as unknown as typeof fetch;
    vi.stubGlobal('btoa', undefined);
    vi.stubGlobal('Buffer', undefined);
    vi.stubGlobal('crypto', {
      subtle: {
        importKey: async () => ({}),
        sign: async () => new Uint8Array([1, 2, 3]).buffer
      }
    });

    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        requestSigningSecret: 'unit-signing-secret'
      }
    };

    const client = createBackendClient(request.backend, request.backend?.engine);
    if (!client) {
      throw new Error('Expected backend client');
    }

    await client.runScan({ ...basePayload, request });

    const calls = mock.mock.calls as unknown as Array<FetchCall>;
    const firstInit = calls[0]![1];
    const headers = firstInit?.headers as HeadersInit;
    const signature = headers instanceof Headers
      ? headers.get('x-stlt-signature')
      : typeof headers === 'object' && headers !== null
        ? String((headers as Record<string, string>)['x-stlt-signature'] ?? '')
        : '';

    expect(signature).toBe('010203');
    globalThis.fetch = originalFetch;
  });

  it('falls back to deterministic signatures when WebCrypto is unavailable', async () => {
    const originalFetch = globalThis.fetch;
    const mock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        snapshot: emptySnapshot
      })
    } as Response));

    globalThis.fetch = mock as unknown as typeof fetch;
    vi.stubGlobal('crypto', {
      subtle: undefined
    });

    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        requestSigningSecret: 'unit-signing-secret'
      }
    };

    const client = createBackendClient(request.backend, request.backend?.engine);
    if (!client) {
      throw new Error('Expected backend client');
    }

    await client.runScan({ ...basePayload, request });

    const calls = mock.mock.calls as unknown as Array<FetchCall>;
    const firstInit = calls[0]![1];
    const headers = firstInit?.headers as HeadersInit;
    const signature = headers instanceof Headers
      ? headers.get('x-stlt-signature')
      : typeof headers === 'object' && headers !== null
        ? String((headers as Record<string, string>)['x-stlt-signature'] ?? '')
        : '';

    expect(signature).toMatch(/^fallback:/);
    globalThis.fetch = originalFetch;
  });

  it('uses Buffer-based base64 encoding when btoa is unavailable', async () => {
    const originalFetch = globalThis.fetch;
    const mock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        snapshot: emptySnapshot
      })
    } as Response));

    globalThis.fetch = mock as unknown as typeof fetch;
    vi.stubGlobal('btoa', undefined);
    vi.stubGlobal('crypto', {
      subtle: {
        importKey: async () => ({}),
        sign: async () => new Uint8Array([1, 2, 3]).buffer
      }
    });

    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        requestSigningSecret: 'unit-signing-secret'
      }
    };

    const client = createBackendClient(request.backend, request.backend?.engine);
    if (!client) {
      throw new Error('Expected backend client');
    }

    await client.runScan({ ...basePayload, request });

    const calls = mock.mock.calls as unknown as Array<FetchCall>;
    const firstInit = calls[0]![1];
    const headers = firstInit?.headers as HeadersInit;
    const signature = headers instanceof Headers
      ? headers.get('x-stlt-signature')
      : typeof headers === 'object' && headers !== null
        ? String((headers as Record<string, string>)['x-stlt-signature'] ?? '')
        : '';

    expect(signature).toBe('AQID');
    globalThis.fetch = originalFetch;
  });

  it('returns undefined for disabled or incomplete backend configs', () => {
    expect(createBackendClient({ enabled: false, mode: 'http', endpoint: 'https://localhost:3000' })).toBeUndefined();
    expect(createBackendClient({ enabled: true, mode: 'stdin' })).toBeUndefined();
    expect(createStdioBackendClient({ enabled: true, mode: 'stdin' }, undefined)).toBeUndefined();
    expect(createBackendAdapter({ enabled: true, mode: 'http' })).toBeUndefined();
  });

  it('builds adapter from backend mode', async () => {
    const request: ScanBackendConfig = {
      enabled: true,
      mode: 'stdin',
      required: false
    };

    const calls: BackendPayload[] = [];
    const executor: (payload: BackendPayload) => Promise<{ snapshot: unknown }> = (payload) => {
      calls.push(payload);
      return Promise.resolve({
        snapshot: emptySnapshot
      });
    };
    const adapter = createBackendAdapter(request, 'mcp', executor);

    expect(adapter).toBeInstanceOf(StdinBackendClient);
    const response = (await adapter?.runScan(basePayload)) as BackendScanResponse;
    expect(calls).toHaveLength(1);

    expect(response.snapshot.id).toBe('scan-1');
  });

  it('passes through the request engine when no selected engine is provided', async () => {
    const request: ScanBackendConfig = {
      enabled: true,
      mode: 'stdin',
      engine: 'stealth-playwright'
    };

    const calls: BackendPayload[] = [];
    const executor: (payload: BackendPayload) => Promise<{ snapshot: unknown }> = (payload) => {
      calls.push(payload);
      return Promise.resolve({
        snapshot: emptySnapshot
      });
    };

    const adapter = createStdioBackendClient(request, executor);
    if (!adapter) {
      throw new Error('Expected stdio adapter');
    }

    await adapter.runScan({
      ...basePayload,
      request: {
        ...baseRequest,
        backend: {
          ...baseRequest.backend,
          mode: 'stdin',
          engine: 'stealth-playwright'
        }
      }
    });

    expect(calls[0]?.request.backend?.engine).toBe('stealth-playwright');
  });

  it('enforces stdio payload limit', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        mode: 'stdin'
      }
    };

    const tooLarge = 'x'.repeat(70_000);
    const executor: (payload: BackendPayload) => Promise<{ snapshot: unknown }> = async () => ({
      snapshot: {
        ...emptySnapshot,
        url: tooLarge
      }
    });

    const adapter = createStdioBackendClient(request.backend, executor, request.backend?.engine);
    if (!adapter) {
      throw new Error('Expected stdio adapter');
    }

    const oversizedContext = {
      ...basePayload,
      request: {
        ...basePayload.request,
        requestId: tooLarge
      },
      pageContext: {
        ...basePayload.pageContext,
        canonical: tooLarge
      }
    };

    await expect(adapter.runScan(oversizedContext)).rejects.toThrow('Stdio backend payload exceeds');
  });

  it('times out stdio execution after timeoutMs', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      backend: {
        ...baseRequest.backend,
        mode: 'stdin',
        timeoutMs: 10
      }
    };

    const neverSettles: (payload: BackendPayload) => Promise<{ snapshot: unknown }> = () =>
      new Promise((resolve) => {
        setTimeout(() => resolve({ snapshot: emptySnapshot }), 1200);
      });

    const adapter = createStdioBackendClient(request.backend, neverSettles, request.backend?.engine);
    if (!adapter) {
      throw new Error('Expected stdio adapter');
    }

    await expect(adapter.runScan(basePayload)).rejects.toThrow('Stdio backend timed out');
  });
});
