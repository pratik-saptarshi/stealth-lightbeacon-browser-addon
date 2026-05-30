import type { DiffResult, Issue, ScanSnapshot, Severity } from '../shared/types';

export type PopupScanStatus = 'idle' | 'loading' | 'complete' | 'failed' | 'fallback';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

export interface PopupUiState {
  settingsOpen: boolean;
  scanId?: string;
  selectedIssueIds: string[];
}

export const POPUP_UI_STATE_STORAGE_KEY = 'addon_popup_state';

export const DEFAULT_POPUP_UI_STATE: PopupUiState = {
  settingsOpen: false,
  scanId: undefined,
  selectedIssueIds: []
};

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

export function normalizePopupUiState(input: unknown): PopupUiState {
  if (!isRecord(input)) {
    return {
      settingsOpen: DEFAULT_POPUP_UI_STATE.settingsOpen,
      scanId: DEFAULT_POPUP_UI_STATE.scanId,
      selectedIssueIds: [...DEFAULT_POPUP_UI_STATE.selectedIssueIds]
    };
  }

  return {
    settingsOpen: typeof input.settingsOpen === 'boolean' ? input.settingsOpen : DEFAULT_POPUP_UI_STATE.settingsOpen,
    scanId: typeof input.scanId === 'string' && input.scanId.trim() ? input.scanId.trim() : undefined,
    selectedIssueIds: normalizeSelectedIssueIds(input.selectedIssueIds)
  };
}

export function buildPopupUiState(input: {
  settingsOpen: boolean;
  scanId?: string;
  selectedIssueIds: Iterable<string>;
}): PopupUiState {
  return {
    settingsOpen: input.settingsOpen,
    scanId: input.scanId?.trim() || undefined,
    selectedIssueIds: normalizeSelectedIssueIds(input.selectedIssueIds)
  };
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

export function buildReportDownloadPath(
  snapshot: ScanSnapshot,
  format: 'json' | 'markdown' | 'html' | 'pdf'
): string {
  const domain = toDomainSlug(snapshot.origin || snapshot.url);
  const utcTimestamp = new Date(snapshot.timestamp).toISOString().replace(/[:.]/g, '-');
  const score = computeSnapshotScore(snapshot);
  const success = snapshot.summary.total === 0;
  const result = success ? 'passed' : 'failed';
  const extension = format === 'markdown' ? 'md' : format;
  const fileName = `${domain}_report_${utcTimestamp}_score_${score}_result_${result}_success_${success ? 'true' : 'false'}.${extension}`;
  return `${domain}/${fileName}`;
}

function normalizeSelectedIssueIds(input: unknown): string[] {
  const values = toIterableArray(input);
  if (!values.length) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => Boolean(value))
    )
  );
}

function toIterableArray(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === 'object' && input !== null && Symbol.iterator in input) {
    return Array.from(input as Iterable<unknown>);
  }

  return [];
}

function toDomainSlug(value: string): string {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '').toLowerCase();
    const slug = host.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'unknown-domain';
  } catch {
    return 'unknown-domain';
  }
}

function computeSnapshotScore(snapshot: ScanSnapshot): number {
  const bySeverity = snapshot.summary.bySeverity;
  const penalty = bySeverity.critical * 25 + bySeverity.high * 10 + bySeverity.medium * 5 + bySeverity.low;
  return Math.max(0, 100 - penalty);
}
