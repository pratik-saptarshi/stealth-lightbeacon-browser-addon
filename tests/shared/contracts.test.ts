import { describe, expect, it } from 'vitest';
import {
  assertAddonRuleset,
  assertDiffResult,
  assertScanRequest,
  assertScanResult,
  assertScanSnapshot,
  knowledgeBaseSchema,
  summarizeIssues
} from '../../src/shared/contracts';
import type { Issue, RuleDomain, Severity } from '../../src/shared/types';

const issue: Issue = {
  id: 'i1',
  ruleId: 'seo-title-missing',
  title: 'Title missing',
  severity: 'high',
  domain: 'seo',
  summary: 'Title is empty',
  evidence: 'https://example.com/page',
  source: 'dom-only'
};

const validSnapshot = {
  id: 'scan-1',
  origin: 'https://example.com',
  url: 'https://example.com/page',
  timestamp: 1,
  engine: 'dom-lite',
  issues: [issue],
  summary: {
    total: 1,
    bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
    byDomain: {
      seo: 1,
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

const validCrawlNode = {
  url: 'https://example.com/child',
  depth: 1,
  status: 'done' as const,
  discoveredFrom: 'https://example.com/page',
  finalUrl: 'https://example.com/child',
  statusCode: 200,
  note: 'ok'
};

const validScanResult = {
  requestId: 'scan-result-1',
  snapshot: validSnapshot,
  crawlNodes: [validCrawlNode],
  recommendation: {
    engine: 'mcp',
    reason: 'high-complexity surface',
    confidence: 0.9
  }
};

const validRuleset = {
  version: 'v1',
  generatedAt: '2024-01-01T00:00:00.000Z',
  categories: [
    {
      category: 'seo',
      enabled: true,
      rules: [
        {
          id: 'seo-001',
          title: 'Missing title',
          enabled: true,
          severity: 'high'
        }
      ]
    }
  ]
};

const validKnowledgeBase = {
  version: 'v1',
  generatedAt: '2024-01-01T00:00:00.000Z',
  categories: [
    {
      category: 'seo',
      enabled: true,
      entries: [
        {
          id: 'kb-1',
          title: 'SEO title guidance',
          summary: 'Use descriptive titles',
          notes: ['keep titles short', 'avoid duplication'],
          enabled: true
        }
      ]
    }
  ]
};

describe('contracts', () => {
  it('summarizes issues consistently', () => {
    const issues: Issue[] = [
      { ...issue, id: '1', ruleId: 'seo-title-missing', source: 'dom-only' },
      { ...issue, id: '2', ruleId: 'seo-title-short', severity: 'medium' as Severity, domain: 'ux' as RuleDomain, source: 'dom-only' },
      { ...issue, id: '3', ruleId: 'a11y-alt', severity: 'low' as Severity, domain: 'accessibility' as RuleDomain, source: 'dom-only' }
    ];

    const summary = summarizeIssues(issues);

    expect(summary.total).toBe(3);
    expect(summary.bySeverity.critical).toBe(0);
    expect(summary.bySeverity.high).toBe(1);
    expect(summary.byDomain.seo).toBe(1);
    expect(summary.byDomain.ux).toBe(1);
  });

  it('validates request payload shape', () => {
    const request = {
      requestId: 'r1',
      url: 'https://example.com/page',
      engine: 'dom-lite',
      backend: {
        mode: 'http',
        engine: 'mcp'
      }
    };

    expect(() => assertScanRequest(request)).not.toThrow();
  });

  it('rejects invalid scan request variants across backend and crawl controls', () => {
    const invalidRequests: Array<[string, unknown, RegExp]> = [
      ['crawl depth', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', crawlDepth: 5 }, /crawlDepth/],
      ['crawl max urls', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', crawlMaxUrls: 501 }, /crawlMaxUrls/],
      ['rule categories', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', ruleCategories: ['invalid'] }, /unsupported domain/],
      ['backend enabled', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { enabled: 'yes' } }, /enabled/],
      ['backend mode', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { mode: 'ws' } }, /mode/],
      ['backend endpoint', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { endpoint: 'not-a-url' } }, /endpoint must be a valid URL/],
      ['backend hosts', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { allowedHosts: ['ok', 123] } }, /allowedHosts/],
      ['backend secret', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { requestSigningSecret: 'x'.repeat(257) } }, /requestSigningSecret/],
      ['backend auth', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { auth: { username: '', password: 'pass' } } }, /auth\.username/],
      ['backend timeout', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { timeoutMs: 0 } }, /timeoutMs/],
      ['backend required', { requestId: 'r', url: 'https://example.com/page', engine: 'dom-lite', backend: { required: 'yes' } }, /required/]
    ];

    for (const [, payload, pattern] of invalidRequests) {
      expect(() => assertScanRequest(payload)).toThrow(pattern);
    }
  });

  it('rejects bad scan result', () => {
    expect(() => assertScanResult({ ...validSnapshot, url: 'not-a-url' })).toThrow();
  });

  it('validates complete scan results with crawl nodes and recommendations', () => {
    expect(() => assertScanResult(validScanResult)).not.toThrow();
  });

  it('rejects invalid nested crawl nodes and recommendations', () => {
    expect(() =>
      assertScanResult({
        ...validScanResult,
        crawlNodes: [{ ...validCrawlNode, errorType: 'bogus' }]
      })
    ).toThrow(/crawl node.errorType/);

    expect(() =>
      assertScanResult({
        ...validScanResult,
        recommendation: { ...validScanResult.recommendation, engine: 'bogus' as never }
      })
    ).toThrow(/recommendation.engine/);
  });

  it('rejects snapshots whose summary does not match the issues', () => {
    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        summary: {
          ...validSnapshot.summary,
          total: 2
        }
      })
    ).toThrow(/summary\.total/);
  });

  it('rejects snapshots whose domain counts do not match the issues', () => {
    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        summary: {
          ...validSnapshot.summary,
          byDomain: {
            ...validSnapshot.summary.byDomain,
            seo: 2
          }
        }
      })
    ).toThrow(/summary\.byDomain\.seo/);
  });

  it('rejects snapshots whose origin does not match the url', () => {
    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        origin: 'https://other.example.com'
      })
    ).toThrow(/origin/);
  });

  it('rejects invalid issue shapes and severity counts in snapshots', () => {
    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        issues: [
          {
            ...issue,
            selector: 1 as never
          }
        ]
      })
    ).toThrow(/issue\.selector/);

    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        issues: [
          {
            ...issue,
            source: 'backend-only' as never
          }
        ]
      })
    ).toThrow(/issue\.source/);

    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        summary: {
          ...validSnapshot.summary,
          bySeverity: {
            ...validSnapshot.summary.bySeverity,
            high: -1
          }
        }
      })
    ).toThrow(/bySeverity\.high/);
  });

  it('accepts sparse domain summaries and opaque origins', () => {
    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        origin: 'null',
        url: 'file:///Users/neo/example.html',
        summary: {
          total: 1,
          bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
          byDomain: { seo: 1 }
        }
      })
    ).not.toThrow();
  });

  it('rejects summaries that report unexpected non-zero domains', () => {
    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        summary: {
          ...validSnapshot.summary,
          byDomain: {
            ...validSnapshot.summary.byDomain,
            unexpected: 1
          }
        }
      })
    ).toThrow(/unexpected/);
  });

  it('validates diff results and rule/knowledge-base payloads', () => {
    expect(() =>
      assertDiffResult({
        newIssues: [issue],
        resolvedIssues: [],
        regressions: [],
        improvements: []
      })
    ).not.toThrow();

    expect(() =>
      assertDiffResult({
        newIssues: 'nope' as never,
        resolvedIssues: [],
        regressions: [],
        improvements: []
      })
    ).toThrow(/newIssues/);

    expect(() => assertAddonRuleset(validRuleset)).not.toThrow();
    expect(() => assertAddonRuleset({ ...validRuleset, categories: [] })).toThrow(/non-empty array/);

    expect(() => knowledgeBaseSchema.parse(validKnowledgeBase)).not.toThrow();
    expect(() =>
      knowledgeBaseSchema.parse({
        ...validKnowledgeBase,
        categories: [
          {
            ...validKnowledgeBase.categories[0],
            entries: [
              {
                ...validKnowledgeBase.categories[0].entries[0],
                notes: ['good', '']
              }
            ]
          }
        ]
      })
    ).toThrow(/notes/);
  });
});
