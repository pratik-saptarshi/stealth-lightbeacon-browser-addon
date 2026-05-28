import { describe, expect, it } from 'vitest';
import { ScanOrchestrator } from '../../src/background/orchestrator';
import type { RuleContext } from '../../src/shared/rule-engine';
import type { ScanRequest } from '../../src/shared/types';

describe('scan orchestrator crawl-lite', () => {
  const context: RuleContext = {
    requestUrl: 'https://example.com/page',
    title: 'Example',
    metaDescription: 'desc',
    lang: 'en',
    canonical: 'https://example.com/page',
    headings: { h1: 1, h2: 0, h3: 0 },
    images: [],
    links: [
      { href: 'https://example.com/a', text: 'a', rel: '', target: '', isInternal: true },
      { href: 'https://other.com/b', text: 'b', rel: '', target: '', isInternal: false }
    ],
    buttons: [],
    formInputs: []
  };

  const request: ScanRequest = {
    requestId: 'r1',
    url: 'https://example.com/page',
    engine: 'crawl-lite',
    crawlDepth: 1,
    crawlMaxUrls: 10
  };

  it('marks blocked when fetcher is unavailable', async () => {
    const orchestrator = new ScanOrchestrator({ crawlMaxUrls: 10 });
    const result = await orchestrator.runScan(request, context);

    expect(result.crawlNodes?.length).toBe(1);
    expect(result.crawlNodes?.[0]).toMatchObject({ errorType: 'blocked' });
  });

  it('marks non_html content as non_html error', async () => {
    const orchestrator = new ScanOrchestrator({
      fetcher: async () =>
        ({
          ok: true,
          headers: { get: () => 'application/json' }
        } as unknown as Response),
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, context);

    expect(result.crawlNodes?.[0]).toMatchObject({ status: 'error', errorType: 'non_html' });
  });

  it('classifies timeouts distinctly', async () => {
    const orchestrator = new ScanOrchestrator({
      fetcher: async () => new Promise<Response>(() => {}),
      timeoutMs: 10,
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, context);
    expect(result.crawlNodes?.[0]?.errorType).toBe('timeout');
  });

  it('collects successful html crawl results', async () => {
    const orchestrator = new ScanOrchestrator({
      fetcher: async () =>
        ({
          ok: true,
          headers: { get: () => 'text/html; charset=utf-8' }
        } as unknown as Response),
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, context);
    expect(result.crawlNodes?.[0]).toMatchObject({ status: 'done' });
    expect(result.crawlNodes?.[0]?.errorType).toBeUndefined();
  });

  it('dedupes and filters crawl queue by internal links only', async () => {
    let fetchCalls = 0;

    const extendedContext: RuleContext = {
      ...context,
      links: [
        { href: 'https://example.com/a#top', text: 'dup', rel: '', target: '', isInternal: true },
        { href: 'https://example.com/a#section', text: 'dup2', rel: '', target: '', isInternal: true },
        { href: 'https://example.org/x', text: 'external', rel: '', target: '', isInternal: false }
      ]
    };

    const orchestrator = new ScanOrchestrator({
      fetcher: async () => {
        fetchCalls += 1;
        return {
          ok: true,
          headers: { get: () => 'text/html' }
        } as unknown as Response;
      },
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, extendedContext);

    expect(result.crawlNodes).toHaveLength(1);
    expect(fetchCalls).toBe(1);
    expect(result.crawlNodes?.[0]?.url).toBe('https://example.com/a');
  });

  it('caps crawl depth to configured max range', async () => {
    const orchestrator = new ScanOrchestrator({
      fetcher: async () =>
        ({
          ok: true,
          headers: { get: () => 'text/html' }
        } as unknown as Response),
      crawlMaxUrls: 10,
      crawlMaxDepth: 99
    });

    const overDepthRequest: ScanRequest = {
      ...request,
      crawlDepth: 4
    };

    const result = await orchestrator.runScan(overDepthRequest, context);

    expect(result.crawlNodes?.[0].depth).toBe(2);
  });

  it('blocks crawl targets blocked by SSRF policy', async () => {
    const privateContext: RuleContext = {
      ...context,
      links: [
        { href: 'https://127.0.0.1/admin', text: 'admin', rel: '', target: '', isInternal: true },
        { href: 'https://localhost:8080', text: 'local', rel: '', target: '', isInternal: true },
        { href: 'https://example.com/page2', text: 'safe', rel: '', target: '', isInternal: true }
      ]
    };

    const orchestrator = new ScanOrchestrator({
      fetcher: async () =>
        ({
          ok: true,
          status: 200,
          url: 'https://example.com/page2',
          headers: { get: () => 'text/html' }
        } as unknown as Response),
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, privateContext);

    expect(result.crawlNodes?.[0]?.errorType).toBe('blocked');
    expect(result.crawlNodes?.[1]?.errorType).toBe('blocked');
    expect(result.crawlNodes?.filter((node) => node.status === 'done')).toHaveLength(1);
  });

  it('blocks redirects that escape the crawl origin', async () => {
    const redirectContext: RuleContext = {
      ...context,
      links: [{ href: 'https://example.com/page2', text: 'safe', rel: '', target: '', isInternal: true }]
    };

    const orchestrator = new ScanOrchestrator({
      fetcher: async () =>
        ({
          ok: true,
          status: 200,
          url: 'https://evil.com/page',
          headers: { get: () => 'text/html' }
        } as unknown as Response),
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, redirectContext);

    expect(result.crawlNodes?.[0]).toMatchObject({ status: 'error', errorType: 'blocked' });
    expect(result.crawlNodes?.[0]?.finalUrl).toBe('https://evil.com/page');
  });

  it('turns crawl failures into backend issues for broken-link discovery', async () => {
    const failureContext: RuleContext = {
      ...context,
      links: [{ href: 'https://example.com/missing', text: 'missing', rel: '', target: '', isInternal: true }]
    };

    const orchestrator = new ScanOrchestrator({
      fetcher: async () =>
        ({
          ok: false,
          status: 404,
          url: 'https://example.com/missing',
          headers: { get: () => 'text/html' }
        } as unknown as Response),
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, failureContext);

    expect(result.crawlNodes?.[0]).toMatchObject({ status: 'error', statusCode: 404 });
    expect(result.snapshot.issues.some((issue) => issue.ruleId === 'crawl-broken-link')).toBe(true);
    expect(result.snapshot.issues.some((issue) => issue.source === 'backend')).toBe(true);
  });

  it('flags discovered Drupal-style endpoints during crawl', async () => {
    const drupalContext: RuleContext = {
      ...context,
      links: [{ href: 'https://example.com/jsonapi/node/article', text: 'api', rel: '', target: '', isInternal: true }]
    };

    const orchestrator = new ScanOrchestrator({
      fetcher: async () =>
        ({
          ok: true,
          status: 200,
          url: 'https://example.com/jsonapi/node/article',
          headers: { get: () => 'text/html' }
        } as unknown as Response),
      crawlMaxUrls: 10
    });

    const result = await orchestrator.runScan(request, drupalContext);

    expect(result.crawlNodes?.[0]).toMatchObject({ status: 'done' });
    expect(result.snapshot.issues.some((issue) => issue.ruleId === 'drupal-endpoint-exposed')).toBe(true);
    expect(result.snapshot.issues.some((issue) => issue.domain === 'drupal')).toBe(true);
  });
});
