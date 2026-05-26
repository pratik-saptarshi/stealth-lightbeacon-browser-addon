import { describe, expect, it } from 'vitest';
import { buildIssueReportLines, buildPdfDocument, buildIssuesPdfBlob } from '../../src/ui/pdf';
import type { Issue, ScanSnapshot } from '../../src/shared/types';

const issues: Issue[] = [
  {
    id: '1',
    ruleId: 'seo-title-missing',
    title: 'Title missing',
    severity: 'high',
    domain: 'seo',
    summary: 'No title',
    evidence: 'head > title',
    source: 'dom-only'
  }
];

const snapshot: ScanSnapshot = {
  id: 'scan-1',
  origin: 'https://example.com',
  url: 'https://example.com/page',
  timestamp: 1_700_000_000_000,
  engine: 'dom-lite',
  issues,
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

describe('pdf export', () => {
  it('builds line content for selected issues', () => {
    const lines = buildIssueReportLines(snapshot, issues);
    expect(lines.join('\n')).toContain('Scan ID: scan-1');
    expect(lines.join('\n')).toContain('[high] Title missing');
  });

  it('builds a valid pdf document header', () => {
    const pdf = buildPdfDocument('Stealth Lightbeacon', ['one', 'two']);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('startxref');
    expect(pdf).toContain('%%EOF');
  });

  it('creates a blob with pdf mime type', () => {
    const blob = buildIssuesPdfBlob(snapshot, issues);
    expect(blob.type).toBe('application/pdf');
  });
});
