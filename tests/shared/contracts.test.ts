import { describe, expect, it } from 'vitest';
import {
  addonRulesetSchema,
  assertBackendScanResponse,
  assertScanRequest,
  assertScanResult,
  assertScanSnapshot,
  backendRulesetCategorySchema,
  issueSchema,
  scanRequestSchema,
  scanResultSchema,
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

  it('rejects bad scan result', () => {
    expect(() => assertScanResult({ ...validSnapshot, url: 'not-a-url' })).toThrow();
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

  it('rejects snapshots whose origin does not match the url', () => {
    expect(() =>
      assertScanSnapshot({
        ...validSnapshot,
        origin: 'https://other.example.com'
      })
    ).toThrow(/origin/);
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

  it('validates backend scan responses and crawl nodes', () => {
    expect(() =>
      assertBackendScanResponse({
        snapshot: validSnapshot,
        crawlNodes: [{ url: 'https://example.com/a', depth: 1, status: 'done' }]
      })
    ).not.toThrow();

    expect(() =>
      assertBackendScanResponse({
        snapshot: validSnapshot,
        crawlNodes: [{ url: '', depth: 1, status: 'done' }]
      })
    ).toThrow(/crawl node\.url/);
  });

  it('validates fully populated requests, results, and bundle payloads', () => {
    const request = {
      requestId: 'r-full',
      url: 'https://example.com/page',
      tabId: 7,
      engine: 'crawl-lite',
      crawlDepth: 2,
      crawlMaxUrls: 50,
      ruleCategories: ['seo', 'aeo'],
      accessibilityProfile: {
        wcagLevel: 'AA',
        includeBestPractices: true
      },
      backend: {
        enabled: true,
        mode: 'stdin',
        engine: 'mcp',
        endpoint: 'https://localhost:3000',
        allowedHosts: ['api.example.com'],
        requestSigningSecret: 'secret-token',
        auth: {
          username: 'neo',
          password: 'lightbeacon'
        },
        timeoutMs: 15,
        required: true
      }
    };

    const result = {
      requestId: 'r-full',
      snapshot: {
        ...validSnapshot,
        id: 'scan-2',
        issues: [
          {
            ...issue,
            id: 'i2',
            selector: 'button.primary'
          }
        ],
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
      },
      crawlNodes: [{ url: 'https://example.com/a', depth: 1, status: 'done' as const }],
      recommendation: {
        engine: 'mcp' as const,
        reason: 'High-complexity page surface',
        confidence: 0.9
      }
    };

    const bundle = {
      version: '1.0.0',
      generatedAt: '2026-05-27T00:00:00Z',
      categories: [
        {
          category: 'seo' as const,
          enabled: true,
          rules: [
            {
              id: 'seo-title-missing',
              title: 'Title missing',
              enabled: false,
              severity: 'high' as const
            }
          ]
        }
      ]
    };

    expect(() => assertScanRequest(request)).not.toThrow();
    expect(() => scanRequestSchema.parse(request)).not.toThrow();
    expect(() => assertScanResult(result)).not.toThrow();
    expect(() => scanResultSchema.parse(result)).not.toThrow();
    expect(() => issueSchema.parse({ ...issue, selector: 'button.primary' })).not.toThrow();
    expect(() => backendRulesetCategorySchema.parse(bundle.categories)).not.toThrow();
    expect(() => addonRulesetSchema.parse(bundle)).not.toThrow();
  });

  it('rejects invalid request field values for backend configuration', () => {
    expect(() =>
      assertScanRequest({
        requestId: 'r-invalid',
        url: 'https://example.com/page',
        engine: 'dom-lite',
        backend: {
          enabled: true,
          mode: 'http',
          endpoint: 'https://localhost:3000',
          requestSigningSecret: 'x'.repeat(257)
        }
      })
    ).toThrow(/requestSigningSecret/);

    expect(() =>
      assertScanRequest({
        requestId: 'r-invalid-2',
        url: 'https://example.com/page',
        engine: 'dom-lite',
        backend: {
          enabled: true,
          mode: 'http',
          endpoint: 'https://localhost:3000',
          auth: {
            username: '',
            password: 'secret'
          }
        }
      })
    ).toThrow(/auth\.username/);

    expect(() =>
      assertScanRequest({
        requestId: 'r-invalid-3',
        url: 'https://example.com/page',
        engine: 'dom-lite',
        accessibilityProfile: {
          wcagLevel: 'A+',
          includeBestPractices: true
        }
      })
    ).toThrow(/accessibilityProfile\.wcagLevel/);

    expect(() =>
      assertScanRequest({
        requestId: 'r-invalid-3',
        url: 'https://example.com/page',
        engine: 'dom-lite',
        backend: {
          enabled: true,
          mode: 'http',
          endpoint: 'https://localhost:3000',
          timeoutMs: 0
        }
      })
    ).toThrow(/timeoutMs/);
  });
});
