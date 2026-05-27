import { describe, expect, it } from 'vitest';
import { assertBackendScanResponse, assertScanRequest, assertScanResult, assertScanSnapshot, summarizeIssues } from '../../src/shared/contracts';
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
});
