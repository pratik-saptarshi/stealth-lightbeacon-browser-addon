import type { DiffResult, Issue, ScanSnapshot, Severity } from '../shared/types';

export type PopupScanStatus = 'idle' | 'loading' | 'complete' | 'failed' | 'fallback';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

export interface PopupDomainGroup {
  domain: string;
  total: number;
  counts: Record<Severity, number>;
  groups: Array<{
    severity: Severity;
    issues: Issue[];
  }>;
}

export interface PopupIssuePanelModel {
  scanId: string;
  scanStatus: PopupScanStatus;
  origin: string;
  url: string;
  generatedAt: string;
  total: number;
  counts: Record<Severity, number>;
  domains: PopupDomainGroup[];
  delta?: {
    newCount: number;
    fixedCount: number;
    unchangedCount: number;
  };
}

export function sortIssuesForPanel(issues: Issue[]): Issue[] {
  return [...issues].sort((left, right) => {
    if (left.domain !== right.domain) {
      return left.domain.localeCompare(right.domain);
    }

    const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }

    const titleDelta = left.title.localeCompare(right.title);
    if (titleDelta !== 0) {
      return titleDelta;
    }

    const ruleDelta = left.ruleId.localeCompare(right.ruleId);
    if (ruleDelta !== 0) {
      return ruleDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildPopupIssuePanelModel(
  snapshot: ScanSnapshot,
  diff?: DiffResult,
  scanStatus: PopupScanStatus = 'complete'
): PopupIssuePanelModel {
  const sortedIssues = sortIssuesForPanel(snapshot.issues);
  const groupedByDomain = new Map<string, PopupDomainGroup>();
  const counts: Record<Severity, number> = {
    critical: snapshot.summary.bySeverity.critical ?? 0,
    high: snapshot.summary.bySeverity.high ?? 0,
    medium: snapshot.summary.bySeverity.medium ?? 0,
    low: snapshot.summary.bySeverity.low ?? 0
  };

  for (const issue of sortedIssues) {
    const current = groupedByDomain.get(issue.domain) ?? {
      domain: issue.domain,
      total: 0,
      counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      groups: []
    };

    current.total += 1;
    current.counts[issue.severity] += 1;

    const severityGroup = current.groups.find((entry) => entry.severity === issue.severity);
    if (severityGroup) {
      severityGroup.issues.push(issue);
    } else {
      current.groups.push({
        severity: issue.severity,
        issues: [issue]
      });
      current.groups.sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]);
    }

    groupedByDomain.set(issue.domain, current);
  }

  const domains = Array.from(groupedByDomain.values()).sort((left, right) => left.domain.localeCompare(right.domain));

  return {
    scanId: snapshot.id,
    scanStatus,
    origin: snapshot.origin,
    url: snapshot.url,
    generatedAt: new Date(snapshot.timestamp).toISOString(),
    total: snapshot.summary.total,
    counts,
    domains,
    delta: diff
      ? {
          newCount: diff.newIssues.length,
          fixedCount: diff.resolvedIssues.length + diff.improvements.length,
          unchangedCount: Math.max(snapshot.summary.total - diff.newIssues.length - (diff.resolvedIssues.length + diff.improvements.length), 0)
        }
      : undefined
  };
}

export function buildIssueExportJson(issues: Issue[], meta: { scanId: string; origin: string; url: string; generatedAt: string }): string {
  return JSON.stringify(
    {
      ...meta,
      issues
    },
    null,
    2
  );
}

export function buildIssueExportMarkdown(
  issues: Issue[],
  meta: { scanId: string; origin: string; url: string; generatedAt: string }
): string {
  const lines = [
    '# Stealth Lightbeacon Issue Export',
    `- Scan ID: ${meta.scanId}`,
    `- Origin: ${meta.origin}`,
    `- URL: ${meta.url}`,
    `- Generated: ${meta.generatedAt}`,
    '',
    '## Issues'
  ];

  for (const issue of issues) {
    lines.push(`- [${issue.severity}] **${issue.domain}** / ${issue.ruleId}: ${issue.title}`);
    lines.push(`  - Summary: ${issue.summary}`);
    lines.push(`  - Evidence: ${issue.evidence}`);
    if (issue.selector) {
      lines.push(`  - Selector: ${issue.selector}`);
    }
  }

  return lines.join('\n');
}

export function collectSelectors(issues: Issue[]): string[] {
  return Array.from(
    new Set(
      issues
        .map((issue) => issue.selector?.trim())
        .filter((selector): selector is string => Boolean(selector))
    )
  );
}
