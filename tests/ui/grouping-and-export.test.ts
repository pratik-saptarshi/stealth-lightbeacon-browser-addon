import { describe, expect, it } from 'vitest';
import {
  toJsonExport,
  toMarkdownExport,
  toHtmlExport,
  toLlmMarkdownExport,
  toGeoXmlExport,
  buildReport
} from '../../src/ui/export';
import { groupIssuesByDomainAndSeverity } from '../../src/ui/grouping';
import type { Issue, ScanSnapshot } from '../../src/shared/types';

const issues: Issue[] = [
  {
    id: '1',
    ruleId: 'r1',
    title: 'Meta missing',
    severity: 'high',
    domain: 'seo',
    summary: 'No meta description',
    evidence: 'body',
    source: 'dom-only'
  },
  {
    id: '2',
    ruleId: 'r2',
    title: 'Heading issue',
    severity: 'low',
    domain: 'seo',
    summary: 'No h1',
    evidence: 'body',
    source: 'dom-only'
  },
  {
    id: '3',
    ruleId: 'r3',
    title: 'Button label',
    severity: 'medium',
    domain: 'accessibility',
    summary: 'Missing label',
    evidence: 'button',
    source: 'dom-only'
  }
];

const snapshot: ScanSnapshot = {
  id: 's',
  origin: 'https://example.com',
  url: 'https://example.com/page',
  timestamp: 100,
  engine: 'dom-lite',
  issues,
  summary: {
    total: 3,
    bySeverity: { critical: 0, high: 1, medium: 1, low: 1 },
    byDomain: { seo: 2, performance: 0, accessibility: 1, aeo: 0, ux: 0, drupal: 0, geo: 0, "security-headers": 0, "WCAG2.1AA": 0, "WCAG2.2AA": 0 }
  }
};

describe('ui helpers', () => {
  it('groups issues by domain and severity', () => {
    const groups = groupIssuesByDomainAndSeverity(issues);
    expect(groups).toHaveLength(3);
    expect(groups[0].domain).toBe('accessibility');
    expect(groups[1].domain).toBe('seo');
  });

  it('renders markdown and json export', () => {
    const json = toJsonExport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot });
    expect(json).toContain('"id": "s"');

    const md = toMarkdownExport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot });
    expect(md).toContain('# Scan Export');
    expect(md).toContain('- Total issues: 3');
    expect(md).toContain('## seo');
    expect(md).toContain('## accessibility');
  });

  it('renders html, llm-markdown, and geo xml exports', () => {
    expect(toHtmlExport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot })).toContain('<!doctype html>');
    expect(toLlmMarkdownExport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot })).toContain('# Audit Findings');
    expect(toGeoXmlExport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot })).toContain('<geoReport>');
  });

  it('builds report by requested format', () => {
    expect(buildReport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot }, 'html')).toContain('<html');
    expect(buildReport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot }, 'geo-xml')).toContain('<geoReport>');
    expect(buildReport({ generatedAt: '2026-01-01T00:00:00.000Z', snapshot }, 'llm-markdown')).toContain('## Prioritized Issue List');
  });
});
