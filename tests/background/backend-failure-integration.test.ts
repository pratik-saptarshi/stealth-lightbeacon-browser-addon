import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleMessage } from '../../src/background/service-worker';
import type { RuleContext } from '../../src/shared/rule-engine';
import type { ScanRequest } from '../../src/shared/types';
import type {
  ScanStartReply,
  IssueListReply
} from '../../src/shared/message-contracts';

type FetchFn = typeof fetch;

type Runtime = {
  fetch: FetchFn;
  __STEALTH_LIGHTBEACON_STDIN_EXECUTOR__?: (payload: unknown) => Promise<unknown>;
};

const runtime = globalThis as unknown as Runtime;
const defaultFetch = runtime.fetch;

const context: RuleContext = {
  requestUrl: 'https://example.com/page',
  title: '',
  metaDescription: '',
  lang: null,
  canonical: null,
  headings: { h1: 0, h2: 0, h3: 0 },
  images: [{ src: '/hero.png', alt: '' }],
  links: [],
  buttons: [{ text: '', ariaLabel: null, title: '', type: 'button' }],
  formInputs: [{ required: true, labelText: null, type: 'text' }]
};

function scanRequest(base: ScanRequest['backend']): ScanRequest {
  return {
    requestId: `backend-failure-${Math.random().toString(16).slice(2)}`,
    url: 'https://example.com/page',
    engine: 'dom-lite',
    backend: base
  };
}

describe('backend failure integration: endpoint + stdio', () => {
  afterEach(() => {
    runtime.fetch = defaultFetch;
    delete runtime.__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__;
    vi.restoreAllMocks();
  });

  it('backend-fallback issues:policy: returns dom-only policy and filtered issue views on HTTP failure', async () => {
    runtime.fetch = vi.fn(async () => {
      throw new Error('endpoint unavailable');
    }) as FetchFn;
    const policyCheckSpy = vi.spyOn(globalThis, 'fetch');

    const endpointRequest = scanRequest({
      enabled: true,
      mode: 'http',
      endpoint: 'https://backend.example.com:9999',
      allowedHosts: ['backend.example.com'],
      required: false
    });

    const startResponse = (await handleMessage({
      type: 'scan:start',
      request: endpointRequest,
      pageContext: context,
      persistHistory: false
    }) as ScanStartReply);

    expect(startResponse.ok).toBe(true);
    if (!startResponse.ok) {
      throw new Error(startResponse.error);
    }

    expect(startResponse.payload.recommendation).toBeDefined();
    expect(startResponse.payload.recommendation?.engine).toBe('http');
    expect(startResponse.payload.recommendation?.reason.length).toBeGreaterThan(0);
    expect(startResponse.payload.recommendation?.confidence).toBeGreaterThan(0);

    const issues = startResponse.payload.snapshot.issues;
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.source === 'dom-only')).toBe(true);

    const highResponse = (await handleMessage({
      type: 'issues:list',
      snapshot: startResponse.payload.snapshot,
      filter: { source: 'dom-only', severity: 'high' }
    }) as IssueListReply);

    expect(highResponse.ok).toBe(true);
    if (!highResponse.ok) {
      throw new Error(highResponse.error);
    }

    expect(highResponse.payload.count).toBeGreaterThan(0);
    expect(highResponse.payload.issues.every((issue) => issue.source === 'dom-only')).toBe(true);
    expect(highResponse.payload.issues.every((issue) => issue.severity === 'high')).toBe(true);

    const seoResponse = (await handleMessage({
      type: 'issues:list',
      snapshot: startResponse.payload.snapshot,
      filter: { domain: 'seo' }
    }) as IssueListReply);

    expect(seoResponse.ok).toBe(true);
    if (!seoResponse.ok) {
      throw new Error(seoResponse.error);
    }

    expect(seoResponse.payload.issues.every((issue) => issue.domain === 'seo')).toBe(true);
    expect(policyCheckSpy).toHaveBeenCalled();
  });

  it('falls back to local policy on stdio backend failure', async () => {
    runtime.__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__ = async () => {
      throw new Error('stdio executor crashed');
    };

    const stdioRequest = scanRequest({
      enabled: true,
      mode: 'stdin',
      required: false
    });

    const startResponse = (await handleMessage({
      type: 'scan:start',
      request: stdioRequest,
      pageContext: context,
      persistHistory: false
    }) as ScanStartReply);

    expect(startResponse.ok).toBe(true);
    if (!startResponse.ok) {
      throw new Error(startResponse.error);
    }

    expect(startResponse.payload.recommendation?.engine).toMatch(/^(mcp|http|fast-obscura|stealth)$/);
    expect(startResponse.payload.snapshot.issues.length).toBeGreaterThan(0);
    expect(startResponse.payload.snapshot.issues.every((issue) => issue.source === 'dom-only')).toBe(true);
  });

  it('backend-fallback: returns concrete recommendation even when stdio backend throws', async () => {
    runtime.__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__ = async () => {
      throw new Error('stdio executor unavailable');
    };

    const stdioRequest = scanRequest({
      enabled: true,
      mode: 'stdin',
      required: false
    });

    const startResponse = (await handleMessage({
      type: 'scan:start',
      request: stdioRequest,
      pageContext: context,
      persistHistory: false
    }) as ScanStartReply);

    expect(startResponse.ok).toBe(true);
    if (!startResponse.ok) {
      throw new Error(startResponse.error);
    }

    expect(startResponse.payload.recommendation?.engine).toMatch(/^(mcp|http|fast-obscura|stealth)$/);
    expect(startResponse.payload.recommendation?.reason).toBeTruthy();
    expect(startResponse.payload.recommendation?.confidence).toBeGreaterThanOrEqual(0);
    expect(startResponse.payload.snapshot.issues.every((issue) => issue.source === 'dom-only')).toBe(true);
  });

  it('required-backend-hard-fail: fails scan when HTTP backend is mandatory', async () => {
    runtime.fetch = vi.fn(async () => {
      throw new Error('endpoint unavailable');
    }) as FetchFn;

    const requiredEndpointRequest = scanRequest({
      enabled: true,
      mode: 'http',
      endpoint: 'https://backend.example.com:9999',
      allowedHosts: ['backend.example.com'],
      required: true
    });

    const startResponse = (await handleMessage({
      type: 'scan:start',
      request: requiredEndpointRequest,
      pageContext: context,
      persistHistory: false
    }) as ScanStartReply);

    expect(startResponse.ok).toBe(false);
    if (startResponse.ok) {
      throw new Error('Expected required backend hard-fail path');
    }

    expect(startResponse.error).toContain('endpoint unavailable');
  });

  it('required-backend-hard-fail: blocks backend when endpoint violates host policy', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('endpoint unavailable');
    }) as FetchFn;
    runtime.fetch = fetchSpy;

    const requiredEndpointRequest = scanRequest({
      enabled: true,
      mode: 'http',
      endpoint: 'https://127.0.0.1:9999',
      required: true
    });

    const startResponse = (await handleMessage({
      type: 'scan:start',
      request: requiredEndpointRequest,
      pageContext: context,
      persistHistory: false
    }) as ScanStartReply);

    expect(startResponse.ok).toBe(false);
    if (startResponse.ok) {
      throw new Error('Expected required backend hard-fail path');
    }

    expect(startResponse.error).toContain('Backend endpoint targets local/private network and is blocked by host policy');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('required-backend-hard-fail: returns scan failure when stdio backend is required but unavailable', async () => {
    runtime.__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__ = async () => {
      throw new Error('stdio required failure');
    };

    const requiredRequest = scanRequest({
      enabled: true,
      mode: 'stdin',
      required: true
    });

    const startResponse = (await handleMessage({
      type: 'scan:start',
      request: requiredRequest,
      pageContext: context,
      persistHistory: false
    }) as ScanStartReply);

    expect(startResponse.ok).toBe(false);
    if (startResponse.ok) {
      throw new Error('Expected backend-required failure path');
    }

    expect(startResponse.error).toContain('stdio required failure');
  });
});
