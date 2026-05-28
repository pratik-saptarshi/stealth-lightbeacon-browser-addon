import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMessage } from '../../src/background/service-worker';
import type { ScanStartReply } from '../../src/shared/message-contracts';

type RuntimeLike = {
  fetch: typeof fetch;
};

const runtime = globalThis as unknown as RuntimeLike;
const defaultFetch = runtime.fetch;

const pageContext = {
  requestUrl: 'https://example.com/page',
  title: 'Example page',
  metaDescription: 'Example description',
  lang: 'en',
  canonical: 'https://example.com/page',
  headings: { h1: 1, h2: 0, h3: 0 },
  images: [],
  links: [],
  buttons: [],
  formInputs: []
};

beforeEach(() => {
  runtime.fetch = vi.fn(async () => ({
    ok: true,
    headers: {
      get(name: string) {
        const values: Record<string, string | null> = {
          'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src *",
          'strict-transport-security': null,
          'referrer-policy': 'unsafe-url'
        };

        return values[name.toLowerCase()] ?? null;
      }
    }
  } as unknown as Response)) as unknown as typeof fetch;
});

afterEach(() => {
  runtime.fetch = defaultFetch;
  vi.restoreAllMocks();
});

describe('security-header runtime evaluation', () => {
  it('surfaces runtime security-header findings without any backend dependency', async () => {
    const reply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'security-headers-runtime',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      },
      pageContext,
      persistHistory: false
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }

    const securityIssues = reply.payload.snapshot.issues.filter((issue) => issue.domain === 'security-headers');
    expect(securityIssues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        'security-header-csp-unsafe-inline',
        'security-header-hsts-missing',
        'security-header-referrer-policy-unsafe'
      ])
    );
    expect(runtime.fetch).toHaveBeenCalled();
    expect(reply.payload.snapshot.summary.byDomain['security-headers']).toBeGreaterThanOrEqual(3);
  });
});
