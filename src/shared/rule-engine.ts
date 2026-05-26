import { summarizeIssues } from './contracts';
import type { DiffResult, Issue, ScanSnapshot, Severity, RuleDomain } from './types';

export interface RuleContext {
  requestUrl: string;
  title: string;
  metaDescription?: string | null;
  lang: string | null;
  canonical?: string | null;
  headings: {
    h1: number;
    h2: number;
    h3: number;
  };
  images: Array<{
    src: string;
    alt: string | null;
    ariaLabel?: string | null;
    role?: string | null;
  }>;
  links: Array<{
    href: string;
    text: string;
    rel: string;
    target: string;
    isInternal: boolean;
  }>;
  buttons: Array<{
    text: string;
    ariaLabel: string | null;
    title: string;
    type: string;
  }>;
  formInputs: Array<{
    required: boolean;
    labelText: string | null;
    type: string;
  }>;
}

export interface RuleSpec {
  id: string;
  title: string;
  severity: Severity;
  domain: RuleDomain;
  evaluate: (context: RuleContext) => Issue[];
}

export interface RuleExecutionResult {
  issues: Issue[];
  snapshot: Omit<ScanSnapshot, 'id'>;
}

function createIssueId() {
  if (typeof globalThis?.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function createIssue(
  rule: Pick<RuleSpec, 'id' | 'title' | 'severity' | 'domain'>,
  summary: string,
  evidence: string,
  selector?: string
): Issue {
  return {
    id: createIssueId(),
    ruleId: rule.id,
    title: rule.title,
    severity: rule.severity,
    domain: rule.domain,
    summary,
    evidence,
    selector,
    source: 'dom-only'
  };
}

export function runRules(rules: RuleSpec[], context: RuleContext): RuleExecutionResult {
  const issues = rules.flatMap((rule) => rule.evaluate(context));

  const normalized = normalizeIssues(issues);
  const origin = new URL(context.requestUrl).origin;

  return {
    issues: normalized,
    snapshot: {
      issues: normalized,
      origin,
      url: context.requestUrl,
      timestamp: Date.now(),
      engine: 'dom-lite',
      summary: summarizeIssues(normalized)
    }
  };
}

function normalizeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  const unique: Issue[] = [];

  for (const issue of issues) {
    const key = [issue.ruleId, issue.evidence, issue.selector ?? '']
      .join('::')
      .toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(issue);
  }

  return unique;
}

export function diffSnapshots(current: ScanSnapshot, previous?: ScanSnapshot): DiffResult {
  const prevMap = new Map(previous?.issues.map((issue) => [issue.id, issue]));
  const currMap = new Map(current.issues.map((issue) => [issue.id, issue]));

  const newIssues: Issue[] = [];
  const resolvedIssues: Issue[] = [];
  const regressions: Issue[] = [];
  const improvements: Issue[] = [];

  if (!previous) {
    return { newIssues: current.issues, resolvedIssues, regressions, improvements };
  }

  for (const [id, issue] of currMap) {
    if (!prevMap.has(id)) {
      newIssues.push(issue);
      continue;
    }

    const previousIssue = prevMap.get(id);
    if (issue.severity !== previousIssue?.severity) {
      if (severityWorse(issue.severity, previousIssue?.severity ?? 'low')) {
        regressions.push(issue);
      } else {
        improvements.push(issue);
      }
    }
  }

  for (const [id, issue] of prevMap) {
    if (!currMap.has(id)) {
      resolvedIssues.push(issue);
      improvements.push(issue);
    }
  }

  return { newIssues, resolvedIssues, regressions, improvements };
}

export function buildZeroDomainCounts(categories: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const category of categories) {
    result[category] = 0;
  }

  return result;
}

export function countIssuesByDomain(issues: Issue[]): Record<string, number> {
  const counts = buildZeroDomainCounts([]);
  for (const issue of issues) {
    counts[issue.domain] = (counts[issue.domain] ?? 0) + 1;
  }

  return counts;
}

function severityWorse(current: string, previous: string) {
  const rank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  return rank[current] > rank[previous];
}
