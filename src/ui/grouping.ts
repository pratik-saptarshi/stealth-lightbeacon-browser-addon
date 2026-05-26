import type { Issue } from '../shared/types';

export interface GroupedIssue {
  domain: string;
  severity: string;
  count: number;
  issues: Issue[];
}

export function groupIssuesByDomainAndSeverity(issues: Issue[]): GroupedIssue[] {
  const keyMap = new Map<string, GroupedIssue>();

  for (const issue of issues) {
    const key = `${issue.domain}::${issue.severity}`;
    if (!keyMap.has(key)) {
      keyMap.set(key, {
        domain: issue.domain,
        severity: issue.severity,
        count: 0,
        issues: []
      });
    }

    const current = keyMap.get(key);
    if (!current) {
      continue;
    }

    current.count += 1;
    current.issues.push(issue);
  }

  return Array.from(keyMap.values()).sort((left, right) => {
    if (left.domain !== right.domain) {
      return left.domain.localeCompare(right.domain);
    }
    return left.severity.localeCompare(right.severity);
  });
}
