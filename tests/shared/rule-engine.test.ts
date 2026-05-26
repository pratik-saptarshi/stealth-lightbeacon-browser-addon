import { describe, expect, it } from 'vitest';
import { createIssue, diffSnapshots, runRules } from '../../src/shared/rule-engine';
import { domRules } from '../../src/shared/rules/dom';
import type { RuleContext } from '../../src/shared/rule-engine';
import type { Issue, ScanSnapshot } from '../../src/shared/types';

const baseContext: RuleContext = {
  requestUrl: 'https://example.com/',
  title: 'T',
  metaDescription: '',
  lang: null,
  canonical: null,
  headings: { h1: 0, h2: 0, h3: 0 },
  images: [{ src: '/img.png', alt: '' }],
  links: [{ href: 'https://example.com/a', text: 'A', rel: '', target: '', isInternal: true }],
  buttons: [{ text: '', ariaLabel: null, title: '', type: 'button' }],
  formInputs: [{ required: true, labelText: null, type: 'text' }]
};

describe('rule-engine', () => {
  it('runs dom rules over page context', () => {
    const result = runRules(domRules, baseContext);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toMatchObject({
      source: 'dom-only',
      ruleId: expect.any(String)
    });
  });

  it('produces deterministic snapshot summaries', () => {
    const summary = runRules(domRules, baseContext).snapshot.summary;
    expect(summary.bySeverity.low).toBeGreaterThanOrEqual(1);
    expect(summary.total).toBe(summary.bySeverity.critical + summary.bySeverity.high + summary.bySeverity.medium + summary.bySeverity.low);
  });

  it('tracks new and resolved issues between scans', () => {
    const issue: Issue = createIssue(
      {
        id: 'seo-title-missing',
        title: 'Title tag missing',
        severity: 'high',
        domain: 'seo'
      },
      'missing title',
      'no title'
    );

    const current: ScanSnapshot = {
      id: 'current',
      origin: 'https://example.com',
      url: baseContext.requestUrl,
      timestamp: 2,
      engine: 'dom-lite',
      issues: [issue],
      summary: { total: 1, bySeverity: { critical: 0, high: 1, medium: 0, low: 0 }, byDomain: { seo: 1, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, "security-headers": 0, "WCAG2.1AA": 0, "WCAG2.2AA": 0 } }
    };

    const previous: ScanSnapshot = {
      id: 'previous',
      origin: 'https://example.com',
      url: baseContext.requestUrl,
      timestamp: 1,
      engine: 'dom-lite',
      issues: [
        issue,
        createIssue({ id: 'seo-title-short', title: 'Short title', severity: 'medium', domain: 'seo' }, 'short', 'len')
      ],
      summary: { total: 2, bySeverity: { critical: 0, high: 1, medium: 1, low: 0 }, byDomain: { seo: 2, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, "security-headers": 0, "WCAG2.1AA": 0, "WCAG2.2AA": 0 } }
    };

    const diff = diffSnapshots(current, previous);
    expect(diff.newIssues.length).toBe(0);
    expect(diff.resolvedIssues).toHaveLength(1);
    expect(diff.regressions).toHaveLength(0);
  });
});
