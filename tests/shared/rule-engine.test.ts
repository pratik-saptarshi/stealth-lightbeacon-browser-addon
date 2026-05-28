import { describe, expect, it } from 'vitest';
import {
  buildZeroDomainCounts,
  countIssuesByDomain,
  createIssue,
  diffSnapshots,
  runRules
} from '../../src/shared/rule-engine';
import { domRules } from '../../src/shared/rules/dom';
import type { RuleContext } from '../../src/shared/rule-engine';
import type { ScanSnapshot } from '../../src/shared/types';

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

const currentBase: ScanSnapshot = {
  id: 'current',
  origin: 'https://example.com',
  url: baseContext.requestUrl,
  timestamp: 2,
  engine: 'dom-lite',
  issues: [
    createIssue(
      { id: 'seo-title-missing', title: 'Title tag missing', severity: 'high', domain: 'seo' },
      'missing title',
      'no title'
    )
  ],
  summary: { total: 1, bySeverity: { critical: 0, high: 1, medium: 0, low: 0 }, byDomain: { seo: 1, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 } }
};

const previousBase: ScanSnapshot = {
  id: 'previous',
  origin: 'https://example.com',
  url: baseContext.requestUrl,
  timestamp: 1,
  engine: 'dom-lite',
  issues: [
    createIssue({ id: 'seo-title-missing', title: 'Title tag missing', severity: 'high', domain: 'seo' }, 'missing title', 'no title'),
    createIssue({ id: 'seo-title-short', title: 'Short title', severity: 'medium', domain: 'seo' }, 'short', 'len')
  ],
  summary: { total: 2, bySeverity: { critical: 0, high: 1, medium: 1, low: 0 }, byDomain: { seo: 2, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 } }
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
    const current = { ...currentBase };
    const previous = { ...previousBase };

    const diff = diffSnapshots(current, previous);
    expect(diff.newIssues.length).toBe(0);
    expect(diff.resolvedIssues).toHaveLength(1);
    expect(diff.regressions).toHaveLength(0);
  });

  it('generates deterministic issue ids from rule context', () => {
    const first = createIssue(
      {
        id: 'seo-title-missing',
        title: 'Title tag missing',
        severity: 'high',
        domain: 'seo'
      },
      'missing title',
      'no title'
    );

    const second = createIssue(
      {
        id: 'seo-title-missing',
        title: 'Title tag missing',
        severity: 'high',
        domain: 'seo'
      },
      'missing title',
      'no title'
    );

    expect(second.id).toBe(first.id);
  });

  it('diffs unchanged issue shapes by stable identity even when ids differ', () => {
    const current = {
      ...currentBase
    };

    const previous = {
      ...previousBase
    };

    const unchangedCurrent = {
      ...current,
      issues: [{
        ...current.issues[0],
        id: 'different-id',
        source: 'dom-only' as const
      }]
    };

    const unchangedPrevious = {
      ...previous,
      issues: [
        {
          ...previous.issues[0],
          id: 'other-id',
          source: 'dom-only' as const
        }
      ]
    } as ScanSnapshot;

    const same = diffSnapshots(unchangedCurrent, unchangedPrevious);
    expect(same.newIssues).toHaveLength(0);
    expect(same.resolvedIssues).toHaveLength(0);
    expect(same.regressions).toHaveLength(0);
    expect(same.improvements).toHaveLength(0);
  });

  it('tracks regressions and improvements when severity changes', () => {
    const current: ScanSnapshot = {
      ...currentBase,
      issues: [
        createIssue(
          { id: 'seo-title-missing', title: 'Title tag missing', severity: 'high', domain: 'seo' },
          'missing title',
          'no title'
        ),
        createIssue(
          { id: 'seo-title-short', title: 'Short title', severity: 'low', domain: 'seo' },
          'short',
          'len'
        )
      ],
      summary: {
        total: 2,
        bySeverity: { critical: 0, high: 1, medium: 0, low: 1 },
        byDomain: { seo: 2, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
      }
    };

    const previous: ScanSnapshot = {
      ...previousBase,
      issues: [
        createIssue(
          { id: 'seo-title-missing', title: 'Title tag missing', severity: 'medium', domain: 'seo' },
          'missing title',
          'no title'
        ),
        createIssue(
          { id: 'seo-title-short', title: 'Short title', severity: 'high', domain: 'seo' },
          'short',
          'len'
        )
      ],
      summary: {
        total: 2,
        bySeverity: { critical: 0, high: 1, medium: 1, low: 0 },
        byDomain: { seo: 2, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
      }
    };

    const diff = diffSnapshots(current, previous);
    expect(diff.newIssues).toHaveLength(0);
    expect(diff.resolvedIssues).toHaveLength(0);
    expect(diff.regressions).toHaveLength(1);
    expect(diff.improvements).toHaveLength(1);
  });

  it('counts domains and seeds requested zero counts', () => {
    expect(buildZeroDomainCounts(['seo', 'ux'])).toEqual({ seo: 0, ux: 0 });
    expect(
      countIssuesByDomain([
        createIssue({ id: 'seo-title-missing', title: 'Title tag missing', severity: 'high', domain: 'seo' }, 'missing title', 'no title'),
        createIssue({ id: 'ux-label', title: 'Label missing', severity: 'low', domain: 'ux' }, 'missing label', 'label')
      ])
    ).toMatchObject({ seo: 1, ux: 1 });
  });

  it('rejects invalid rule context urls', () => {
    expect(() => runRules([], { ...baseContext, requestUrl: 'not-a-url' })).toThrow(
      'rule context.requestUrl must be a valid URL'
    );
  });
});
