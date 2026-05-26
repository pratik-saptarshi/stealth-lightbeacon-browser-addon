import { describe, expect, it, vi } from 'vitest';
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

describe('backend bridge', () => {
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

    const calledUrl = mock.mock.calls[0]![0] as string;

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
});
