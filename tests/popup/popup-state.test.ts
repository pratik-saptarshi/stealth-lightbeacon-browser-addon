import { describe, expect, it } from 'vitest';
import {
  buildIssueExportJson,
  buildIssueExportMarkdown,
  buildReportDownloadPath,
  buildPopupUiState,
  buildPopupIssuePanelModel,
  collectSelectors,
  normalizePopupUiState,
  sortIssuesForPanel
} from '../../src/popup/popup-state';
import type { Issue, ScanSnapshot } from '../../src/shared/types';

const issues: Issue[] = [
  {
    id: '3',
    ruleId: 'seo-003',
    title: 'Secondary heading missing',
    severity: 'low',
    domain: 'seo',
    summary: 'Page has no h2',
    evidence: 'h2',
    selector: 'main > section:nth-child(2)',
    source: 'dom-only'
  },
  {
    id: '1',
    ruleId: 'a11y-001',
    title: 'Button missing label',
    severity: 'critical',
    domain: 'accessibility',
    summary: 'Icon button has no accessible name',
    evidence: 'button',
    selector: 'button.icon-only',
    source: 'dom-only'
  },
  {
    id: '2',
    ruleId: 'seo-001',
    title: 'Meta description missing',
    severity: 'high',
    domain: 'seo',
    summary: 'Missing meta description',
    evidence: 'head',
    selector: 'head > meta[name="description"]',
    source: 'dom-only'
  },
  {
    id: '4',
    ruleId: 'seo-002',
    title: 'Title could be improved',
    severity: 'medium',
    domain: 'seo',
    summary: 'Title length is weak',
    evidence: 'title',
    source: 'dom-only'
  }
];

const snapshot: ScanSnapshot = {
  id: 'scan-123',
  origin: 'https://example.com',
  url: 'https://example.com/page',
  timestamp: 1_700_000_000_000,
  engine: 'dom-lite',
  issues,
  summary: {
    total: issues.length,
    bySeverity: { critical: 1, high: 1, medium: 1, low: 1 },
    byDomain: { accessibility: 1, seo: 3, performance: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 }
  }
};

describe('popup panel state', () => {
  it('sorts issues by domain, severity, then title', () => {
    const sorted = sortIssuesForPanel(issues);
    expect(sorted.map((issue) => issue.id)).toEqual(['1', '2', '4', '3']);
  });

  it('builds grouped issue panel model with delta data', () => {
    const model = buildPopupIssuePanelModel(
      snapshot,
      {
        newIssues: [issues[0]],
        resolvedIssues: [issues[1]],
        regressions: [],
        improvements: [issues[2]]
      },
      'complete'
    );

    expect(model.scanId).toBe('scan-123');
    expect(model.domains).toHaveLength(2);
    expect(model.domains[0].domain).toBe('accessibility');
    expect(model.domains[1].domain).toBe('seo');
    expect(model.domains[1].counts.high).toBe(1);
    expect(model.delta).toEqual({
      newCount: 1,
      fixedCount: 2,
      unchangedCount: 1
    });
  });

  it('groups same-severity issues together and omits delta when absent', () => {
    const model = buildPopupIssuePanelModel({
      ...snapshot,
      issues: [
        {
          ...issues[1],
          id: '5',
          title: 'Missing button label on search',
          ruleId: 'a11y-002'
        },
        {
          ...issues[1],
          id: '6',
          title: 'Missing button label on nav',
          ruleId: 'a11y-003'
        },
        {
          ...issues[2],
          id: '7',
          domain: 'seo',
          title: 'Metadata missing'
        }
      ]
    });

    expect(model.delta).toBeUndefined();
    expect(model.domains).toHaveLength(2);
    expect(model.domains[0].groups).toHaveLength(1);
    expect(model.domains[0].groups[0].issues).toHaveLength(2);
  });

  it('serializes selected issues for export', () => {
    expect(buildIssueExportJson([issues[0]], { scanId: 'scan-123', origin: snapshot.origin, url: snapshot.url, generatedAt: '2024-01-01T00:00:00.000Z' })).toContain(
      '"scanId": "scan-123"'
    );
    expect(buildIssueExportMarkdown([issues[0]], { scanId: 'scan-123', origin: snapshot.origin, url: snapshot.url, generatedAt: '2024-01-01T00:00:00.000Z' })).toContain(
      '## Issues'
    );
    expect(collectSelectors(issues)).toEqual([
      'main > section:nth-child(2)',
      'button.icon-only',
      'head > meta[name="description"]'
    ]);
  });

  it('normalizes popup ui state inputs', () => {
    expect(normalizePopupUiState(undefined)).toEqual({
      settingsOpen: false,
      scanId: undefined,
      selectedIssueIds: []
    });

    expect(
      normalizePopupUiState({
        settingsOpen: true,
        scanId: '  scan-123  ',
        selectedIssueIds: [' issue-1 ', 'issue-1', '', 4 as never]
      })
    ).toEqual({
      settingsOpen: true,
      scanId: 'scan-123',
      selectedIssueIds: ['issue-1']
    });
  });

  it('builds popup ui state payloads for persistence', () => {
    expect(
      buildPopupUiState({
        settingsOpen: true,
        scanId: '  scan-456  ',
        selectedIssueIds: new Set([' issue-2 ', 'issue-2', 'issue-3'])
      })
    ).toEqual({
      settingsOpen: true,
      scanId: 'scan-456',
      selectedIssueIds: ['issue-2', 'issue-3']
    });
  });

  it('normalizes empty and non-record popup state inputs', () => {
    expect(
      buildPopupUiState({
        settingsOpen: false,
        scanId: '   ',
        selectedIssueIds: []
      })
    ).toEqual({
      settingsOpen: false,
      scanId: undefined,
      selectedIssueIds: []
    });

    expect(normalizePopupUiState(null)).toEqual({
      settingsOpen: false,
      scanId: undefined,
      selectedIssueIds: []
    });
  });

  it('builds domain-scoped report download paths with UTC timestamp score and result', () => {
    const reportPath = buildReportDownloadPath(snapshot, 'html');
    expect(reportPath).toBe('example-com/example-com_report_2023-11-14T22-13-20-000Z_score_59_result_failed_success_false.html');

    const cleanSnapshot: ScanSnapshot = {
      ...snapshot,
      origin: 'https://www.docs.example.org',
      summary: {
        ...snapshot.summary,
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }
      }
    };
    expect(buildReportDownloadPath(cleanSnapshot, 'pdf')).toBe(
      'docs-example-org/docs-example-org_report_2023-11-14T22-13-20-000Z_score_100_result_passed_success_true.pdf'
    );
  });
});
