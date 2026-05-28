import { describe, expect, it } from 'vitest';
import {
  buildReport,
  toHtmlExport,
  toGeoXmlExport,
  toMarkdownExport,
  toLlmMarkdownExport,
  type ExportBundle
} from '../../src/ui/export';
import type { ScanSnapshot } from '../../src/shared/types';

const snapshot: ScanSnapshot = {
  id: 'scan-branch',
  origin: 'https://example.com',
  url: 'https://example.com/path?query=1&sort=<top>',
  timestamp: 1_700_000_000_000,
  engine: 'dom-lite',
  issues: [
    {
      id: 'issue-1',
      ruleId: 'rule<&>"\'',
      title: 'Escaped issue',
      severity: 'high',
      domain: 'seo',
      summary: 'Summary with <tag> & "quotes" and \'apostrophes\'',
      evidence: 'Evidence > here & there',
      source: 'dom-only'
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
};

const bundle: ExportBundle = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  snapshot,
  diff: {
    newIssues: [snapshot.issues[0]],
    resolvedIssues: [],
    regressions: [],
    improvements: []
  }
};

describe('ui export branches', () => {
  it('escapes xml entities in geo xml exports', () => {
    const xml = toGeoXmlExport(bundle);

    expect(xml).toContain('&lt;top&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;quotes&quot;');
    expect(xml).toContain('&apos;apostrophes&apos;');
    expect(xml).toContain('Evidence &gt; here &amp; there');
  });

  it('renders markdown diffs and falls back to markdown for unknown report formats', () => {
    const markdown = toMarkdownExport(bundle);
    const fallback = buildReport(bundle, 'unexpected-format' as any);

    expect(markdown).toContain('## Diff');
    expect(markdown).toContain('- New: 1');
    expect(fallback).toBe(markdown);
  });

  it('covers html, llm markdown, and json report branches with diff data', () => {
    expect(toHtmlExport(bundle)).toContain('<h2>Diff</h2>');
    expect(toLlmMarkdownExport(bundle)).toContain('## Delta');
    expect(buildReport(bundle, 'json' as any)).toContain('"generatedAt"');
  });
});
