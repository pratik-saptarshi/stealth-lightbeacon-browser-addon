import type {
  DiffResult,
  Issue,
  EngineRecommendation,
  ScanRequest,
  ScanResult,
  ScanSnapshot,
  Severity,
  RuleDomain,
  CrawlNode
} from './types';

type Schema<T> = {
  parse(input: unknown): T;
};

function createSchema<T>(parser: (input: unknown) => T): Schema<T> {
  return {
    parse: parser
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isEnumValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return isString(value) && allowed.includes(value as T);
}

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const DOMAINS = [
  'seo',
  'performance',
  'accessibility',
  'aeo',
  'ux',
  'drupal',
  'geo',
  'security-headers',
  'WCAG2.1AA',
  'WCAG2.2AA'
] as const;
const ISSUE_SOURCES = ['dom-only', 'backend', 'axe'] as const;
const BACKEND_ENGINES = ['http', 'fast-obscura', 'stealth-playwright', 'mcp'] as const;
const SCAN_ENGINES = ['dom-lite', 'crawl-lite'] as const;
const BACKEND_MODES = ['http', 'stdin'] as const;
const CRAWL_ERROR_TYPES = ['cors', 'timeout', 'blocked', 'non_html', 'other'] as const;

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  summary: string;
  notes: string[];
  enabled?: boolean;
}

export interface KnowledgeBaseCategory {
  category: RuleDomain;
  enabled?: boolean;
  entries: KnowledgeBaseEntry[];
}

export interface AddonKnowledgeBase {
  version: string;
  generatedAt: string;
  categories: KnowledgeBaseCategory[];
}

function assertIssueCountsBySeverity(input: unknown, path: string): Record<Severity, number> {
  assert(isRecord(input), `${path} must be an object`);
  for (const key of SEVERITIES) {
    assert(isNonNegativeNumber(input[key]), `${path}.${key} must be a non-negative number`);
  }
  const counts = input as Record<Severity, number>;
  return {
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    low: counts.low
  };
}

function assertIssueCountsByDomain(input: unknown, path: string): Record<string, number> {
  assert(isRecord(input), `${path} must be an object`);
  for (const [key, value] of Object.entries(input)) {
    assert(isNonNegativeNumber(value), `${path}.${key} must be a non-negative number`);
  }
  for (const key of DOMAINS) {
    if (!(key in input)) {
      continue;
    }
    assert(isNonNegativeNumber(input[key]), `${path}.${key} must be a non-negative number`);
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value as number])
  );
}

function assertIssue(input: unknown): Issue {
  assert(isRecord(input), 'issue must be an object');
  assert(isNonEmptyString(input.id), 'issue.id must be a non-empty string');
  assert(isNonEmptyString(input.ruleId), 'issue.ruleId must be a non-empty string');
  assert(isNonEmptyString(input.title), 'issue.title must be a non-empty string');
  assert(isEnumValue(input.severity, SEVERITIES), 'issue.severity must be one of critical, high, medium, low');
  assert(isEnumValue(input.domain, DOMAINS), 'issue.domain must be a supported domain');
  assert(isNonEmptyString(input.summary), 'issue.summary must be a non-empty string');
  assert(isNonEmptyString(input.evidence), 'issue.evidence must be a non-empty string');
  if ('selector' in input && input.selector !== undefined) {
    assert(isString(input.selector), 'issue.selector must be a string when present');
  }
  assert(isEnumValue(input.source, ISSUE_SOURCES), 'issue.source must be dom-only, backend, or axe');

  return {
    id: input.id,
    ruleId: input.ruleId,
    title: input.title,
    severity: input.severity,
    domain: input.domain,
    summary: input.summary,
    evidence: input.evidence,
    selector: input.selector as string | undefined,
    source: input.source as 'dom-only' | 'backend'
  };
}

function assertEngineRecommendation(input: unknown): EngineRecommendation {
  assert(isRecord(input), 'recommendation must be an object');
  assert(isEnumValue(input.engine, BACKEND_ENGINES), 'recommendation.engine must be a supported backend engine');
  assert(isNonEmptyString(input.reason), 'recommendation.reason must be a non-empty string');
  assert(isFiniteNumber(input.confidence) && input.confidence >= 0 && input.confidence <= 1, 'recommendation.confidence must be between 0 and 1');

  return {
    engine: input.engine as EngineRecommendation['engine'],
    reason: input.reason,
    confidence: input.confidence
  };
}

function assertCrawlNode(input: unknown): CrawlNode {
  assert(isRecord(input), 'crawl node must be an object');
  assert(isNonEmptyString(input.url), 'crawl node.url must be a non-empty string');
  assert(isNonNegativeInteger(input.depth), 'crawl node.depth must be a non-negative integer');
  assert(isEnumValue(input.status, ['queued', 'running', 'done', 'error'] as const), 'crawl node.status must be queued, running, done, or error');
  if ('errorType' in input && input.errorType !== undefined) {
    assert(isEnumValue(input.errorType, CRAWL_ERROR_TYPES), 'crawl node.errorType is invalid');
  }
  if ('discoveredFrom' in input && input.discoveredFrom !== undefined) {
    assert(isNonEmptyString(input.discoveredFrom), 'crawl node.discoveredFrom must be a non-empty string when present');
  }
  if ('finalUrl' in input && input.finalUrl !== undefined) {
    assert(isNonEmptyString(input.finalUrl), 'crawl node.finalUrl must be a non-empty string when present');
  }
  if ('statusCode' in input && input.statusCode !== undefined) {
    assert(isNonNegativeNumber(input.statusCode), 'crawl node.statusCode must be a non-negative number when present');
  }
  if ('note' in input && input.note !== undefined) {
    assert(isString(input.note), 'crawl node.note must be a string when present');
  }

  return {
    url: input.url,
    depth: input.depth,
    status: input.status,
    errorType: input.errorType as CrawlNode['errorType'],
    discoveredFrom: input.discoveredFrom as string | undefined,
    finalUrl: input.finalUrl as string | undefined,
    statusCode: input.statusCode as number | undefined,
    note: input.note as string | undefined
  };
}

function assertScanRequestInput(input: unknown): ScanRequest {
  assert(isRecord(input), 'scan request must be an object');
  assert(isNonEmptyString(input.requestId), 'scan request.requestId must be a non-empty string');
  assert(isNonEmptyString(input.url), 'scan request.url must be a non-empty string');
  assert(isEnumValue(input.engine, SCAN_ENGINES), 'scan request.engine must be dom-lite or crawl-lite');

  try {
    new URL(input.url);
  } catch {
    throw new Error('scan request.url must be a valid URL');
  }

  if ('tabId' in input && input.tabId !== undefined) {
    assert(isNonNegativeInteger(input.tabId), 'scan request.tabId must be a non-negative integer when present');
  }
  if ('crawlDepth' in input && input.crawlDepth !== undefined) {
    assert(isNonNegativeInteger(input.crawlDepth) && input.crawlDepth <= 4, 'scan request.crawlDepth must be a non-negative integer no greater than 4');
  }
  if ('crawlMaxUrls' in input && input.crawlMaxUrls !== undefined) {
    assert(isNonNegativeInteger(input.crawlMaxUrls) && input.crawlMaxUrls <= 500, 'scan request.crawlMaxUrls must be a non-negative integer no greater than 500');
  }
  if ('ruleCategories' in input && input.ruleCategories !== undefined) {
    assert(Array.isArray(input.ruleCategories) && input.ruleCategories.length > 0, 'scan request.ruleCategories must be a non-empty array when present');
    assert(input.ruleCategories.every((entry: unknown) => isEnumValue(entry, DOMAINS)), 'scan request.ruleCategories contains unsupported domain values');
  }
  if ('accessibilityProfile' in input && input.accessibilityProfile !== undefined) {
    assert(isRecord(input.accessibilityProfile), 'scan request.accessibilityProfile must be an object when present');
    const profile = input.accessibilityProfile;
    assert(isEnumValue(profile.wcagLevel, ['A', 'AA', 'AAA'] as const), 'scan request.accessibilityProfile.wcagLevel must be A, AA, or AAA');
    assert(typeof profile.includeBestPractices === 'boolean', 'scan request.accessibilityProfile.includeBestPractices must be a boolean');
    if ('includeAxeChecks' in profile && profile.includeAxeChecks !== undefined) {
      assert(typeof profile.includeAxeChecks === 'boolean', 'scan request.accessibilityProfile.includeAxeChecks must be a boolean');
    }
  }
  if ('backend' in input && input.backend !== undefined) {
    assert(isRecord(input.backend), 'scan request.backend must be an object when present');
    const backend = input.backend;
    if ('enabled' in backend && backend.enabled !== undefined) {
      assert(typeof backend.enabled === 'boolean', 'scan request.backend.enabled must be a boolean when present');
    }
    if ('mode' in backend && backend.mode !== undefined) {
      assert(isEnumValue(backend.mode, BACKEND_MODES), 'scan request.backend.mode must be http or stdin');
    }
    if ('engine' in backend && backend.engine !== undefined) {
      assert(isEnumValue(backend.engine, BACKEND_ENGINES), 'scan request.backend.engine must be a supported backend engine');
    }
    if ('endpoint' in backend && backend.endpoint !== undefined) {
      assert(isNonEmptyString(backend.endpoint), 'scan request.backend.endpoint must be a non-empty string');
      try {
        new URL(backend.endpoint);
      } catch {
        throw new Error('scan request.backend.endpoint must be a valid URL');
      }
    }
    if ('allowedHosts' in backend && backend.allowedHosts !== undefined) {
      assert(isStringArray(backend.allowedHosts), 'scan request.backend.allowedHosts must be an array of non-empty strings');
    }
    if ('requestSigningSecret' in backend && backend.requestSigningSecret !== undefined) {
      assert(isNonEmptyString(backend.requestSigningSecret) && backend.requestSigningSecret.length <= 256, 'scan request.backend.requestSigningSecret must be 1-256 characters');
    }
    if ('auth' in backend && backend.auth !== undefined) {
      assert(isRecord(backend.auth), 'scan request.backend.auth must be an object');
      assert(isNonEmptyString(backend.auth.username), 'scan request.backend.auth.username must be a non-empty string');
      assert(isNonEmptyString(backend.auth.password), 'scan request.backend.auth.password must be a non-empty string');
    }
    if ('timeoutMs' in backend && backend.timeoutMs !== undefined) {
      assert(isPositiveNumber(backend.timeoutMs), 'scan request.backend.timeoutMs must be a positive number');
    }
    if ('required' in backend && backend.required !== undefined) {
      assert(typeof backend.required === 'boolean', 'scan request.backend.required must be a boolean when present');
    }
  }

  return input as unknown as ScanRequest;
}

function assertScanSnapshotInput(input: unknown): ScanSnapshot {
  assert(isRecord(input), 'scan snapshot must be an object');
  assert(isNonEmptyString(input.id), 'scan snapshot.id must be a non-empty string');
  assert(isNonEmptyString(input.origin), 'scan snapshot.origin must be a non-empty string');
  assert(isNonEmptyString(input.url), 'scan snapshot.url must be a non-empty string');
  assert(isEnumValue(input.engine, SCAN_ENGINES), 'scan snapshot.engine must be dom-lite or crawl-lite');
  assert(isNonNegativeNumber(input.timestamp), 'scan snapshot.timestamp must be a non-negative number');

  try {
    new URL(input.url);
  } catch {
    throw new Error('scan snapshot.url must be a valid URL');
  }

  const snapshotUrlOrigin = new URL(input.url).origin;
  if (input.origin === 'null') {
    assert(snapshotUrlOrigin === 'null', 'scan snapshot.origin must match scan snapshot.url origin');
  } else {
    try {
      new URL(input.origin);
    } catch {
      throw new Error('scan snapshot.origin must be a valid URL');
    }

    assert(snapshotUrlOrigin === new URL(input.origin).origin, 'scan snapshot.origin must match scan snapshot.url origin');
  }

  assert(Array.isArray(input.issues), 'scan snapshot.issues must be an array');
  const issues = input.issues.map(assertIssue);
  assert(isRecord(input.summary), 'scan snapshot.summary must be an object');
  assert(isNonNegativeNumber(input.summary.total), 'scan snapshot.summary.total must be a non-negative number');
  const bySeverity = assertIssueCountsBySeverity(input.summary.bySeverity, 'scan snapshot.summary.bySeverity');
  const byDomain = assertIssueCountsByDomain(input.summary.byDomain, 'scan snapshot.summary.byDomain');
  assertSummaryMatchesIssues(
    {
      total: input.summary.total,
      bySeverity,
      byDomain
    },
    issues
  );

  return {
    id: input.id,
    origin: input.origin,
    url: input.url,
    timestamp: input.timestamp,
    engine: input.engine,
    issues,
    summary: {
      total: input.summary.total,
      bySeverity,
      byDomain
    }
  };
}

function assertDiffResultInput(input: unknown): DiffResult {
  assert(isRecord(input), 'diff result must be an object');
  assert(Array.isArray(input.newIssues), 'diff result.newIssues must be an array');
  assert(Array.isArray(input.resolvedIssues), 'diff result.resolvedIssues must be an array');
  assert(Array.isArray(input.regressions), 'diff result.regressions must be an array');
  assert(Array.isArray(input.improvements), 'diff result.improvements must be an array');

  return {
    newIssues: input.newIssues.map(assertIssue),
    resolvedIssues: input.resolvedIssues.map(assertIssue),
    regressions: input.regressions.map(assertIssue),
    improvements: input.improvements.map(assertIssue)
  };
}

function assertSummaryMatchesIssues(
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byDomain: Record<string, number>;
  },
  issues: Issue[]
) {
  const expected = summarizeIssues(issues);
  assert(summary.total === expected.total, `scan snapshot.summary.total must equal the issue count (${expected.total})`);

  for (const severity of SEVERITIES) {
    assert(
      summary.bySeverity[severity] === expected.bySeverity[severity],
      `scan snapshot.summary.bySeverity.${severity} must equal ${expected.bySeverity[severity]}`
    );
  }

  const expectedByDomain = expected.byDomain as Record<string, number>;

  for (const domain of Object.keys(expectedByDomain)) {
    const actualCount = summary.byDomain[domain] ?? 0;
    assert(
      actualCount === expectedByDomain[domain],
      `scan snapshot.summary.byDomain.${domain} must equal ${expectedByDomain[domain]}`
    );
  }

  for (const [domain, count] of Object.entries(summary.byDomain) as Array<[string, number]>) {
    assert(
      expectedByDomain[domain] !== undefined || count === 0,
      `scan snapshot.summary.byDomain.${domain} must equal 0 when the domain is not present in the issue list`
    );
  }
}

function assertScanResultInput(input: unknown): ScanResult {
  assert(isRecord(input), 'scan result must be an object');
  assert(isNonEmptyString(input.requestId), 'scan result.requestId must be a non-empty string');
  const snapshot = assertScanSnapshotInput(input.snapshot);
  const crawlNodes = 'crawlNodes' in input && input.crawlNodes !== undefined
    ? (assert(Array.isArray(input.crawlNodes), 'scan result.crawlNodes must be an array when present'), input.crawlNodes.map(assertCrawlNode))
    : undefined;
  const recommendation = 'recommendation' in input && input.recommendation !== undefined
    ? assertEngineRecommendation(input.recommendation)
    : undefined;

  return {
    requestId: input.requestId,
    snapshot,
    crawlNodes,
    recommendation
  };
}

function assertBackendScanResponseInput(input: unknown) {
  assert(isRecord(input), 'backend response must be an object');
  const snapshot = assertScanSnapshotInput(input.snapshot);
  const crawlNodes = 'crawlNodes' in input && input.crawlNodes !== undefined
    ? (assert(Array.isArray(input.crawlNodes), 'backend response.crawlNodes must be an array when present'), input.crawlNodes.map(assertCrawlNode))
    : undefined;

  return {
    snapshot,
    crawlNodes
  };
}

function assertBackendRulesetCategoryEntry(input: unknown): BackendRulesetCategory {
  assert(isRecord(input), 'ruleset category must be an object');
  assert(isEnumValue(input.category, [...DOMAINS, 'performance', 'accessibility', 'ux', 'drupal'] as const), 'ruleset category must be supported');
  assert(Array.isArray(input.rules), 'ruleset category.rules must be an array');
  const rules = input.rules.map((rule: unknown) => {
    assert(isRecord(rule), 'ruleset rule must be an object');
    assert(isNonEmptyString(rule.id), 'ruleset rule.id must be a non-empty string');
    assert(isNonEmptyString(rule.title), 'ruleset rule.title must be a non-empty string');
    if ('enabled' in rule && rule.enabled !== undefined) {
      assert(typeof rule.enabled === 'boolean', 'ruleset rule.enabled must be a boolean when present');
    }
    assert(isEnumValue(rule.severity, SEVERITIES), 'ruleset rule.severity must be valid');
    return {
      id: rule.id,
      title: rule.title,
      enabled: rule.enabled as boolean | undefined,
      severity: rule.severity
    };
  });
  if ('enabled' in input && input.enabled !== undefined) {
    assert(typeof input.enabled === 'boolean', 'ruleset category.enabled must be a boolean when present');
  }

  return {
    category: input.category as BackendRulesetCategory['category'],
    rules,
    enabled: input.enabled as boolean | undefined
  };
}

function assertBackendRulesetCategoryArray(input: unknown): BackendRulesetCategory[] {
  assert(Array.isArray(input) && input.length > 0, 'ruleset category payload must be a non-empty array');
  return input.map(assertBackendRulesetCategoryEntry);
}

function assertAddonRulesetPayload(input: unknown): BackendRulesetPayload {
  assert(isRecord(input), 'addon ruleset must be an object');
  assert(isNonEmptyString(input.version), 'addon ruleset.version must be a non-empty string');
  assert(isNonEmptyString(input.generatedAt), 'addon ruleset.generatedAt must be a non-empty string');
  const categories = assertBackendRulesetCategoryArray(input.categories);

  return {
    version: input.version,
    generatedAt: input.generatedAt,
    categories
  };
}

function assertKnowledgeBaseEntry(input: unknown): KnowledgeBaseEntry {
  assert(isRecord(input), 'knowledge base entry must be an object');
  assert(isNonEmptyString(input.id), 'knowledge base entry.id must be a non-empty string');
  assert(isNonEmptyString(input.title), 'knowledge base entry.title must be a non-empty string');
  assert(isNonEmptyString(input.summary), 'knowledge base entry.summary must be a non-empty string');
  assert(Array.isArray(input.notes), 'knowledge base entry.notes must be an array');
  assert(input.notes.every((entry: unknown) => isNonEmptyString(entry)), 'knowledge base entry.notes must contain non-empty strings');
  if ('enabled' in input && input.enabled !== undefined) {
    assert(typeof input.enabled === 'boolean', 'knowledge base entry.enabled must be a boolean when present');
  }

  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    notes: input.notes as string[],
    enabled: input.enabled as boolean | undefined
  };
}

function assertKnowledgeBaseCategory(input: unknown): KnowledgeBaseCategory {
  assert(isRecord(input), 'knowledge base category must be an object');
  assert(isEnumValue(input.category, DOMAINS), 'knowledge base category must be supported');
  assert(Array.isArray(input.entries), 'knowledge base category.entries must be an array');
  if ('enabled' in input && input.enabled !== undefined) {
    assert(typeof input.enabled === 'boolean', 'knowledge base category.enabled must be a boolean when present');
  }

  return {
    category: input.category as KnowledgeBaseCategory['category'],
    enabled: input.enabled as boolean | undefined,
    entries: input.entries.map(assertKnowledgeBaseEntry)
  };
}

function assertKnowledgeBasePayload(input: unknown): AddonKnowledgeBase {
  assert(isRecord(input), 'knowledge base must be an object');
  assert(isNonEmptyString(input.version), 'knowledge base.version must be a non-empty string');
  assert(isNonEmptyString(input.generatedAt), 'knowledge base.generatedAt must be a non-empty string');
  assert(Array.isArray(input.categories) && input.categories.length > 0, 'knowledge base.categories must be a non-empty array');

  return {
    version: input.version,
    generatedAt: input.generatedAt,
    categories: input.categories.map(assertKnowledgeBaseCategory)
  };
}

export const issueSchema = createSchema(assertIssue);
export const scanRequestSchema = createSchema(assertScanRequestInput);
export const scanSnapshotSchema = createSchema(assertScanSnapshotInput);
export const crawlNodeSchema = createSchema(assertCrawlNode);
export const scanResultSchema = createSchema(assertScanResultInput);
export const backendScanResponseSchema = createSchema(assertBackendScanResponseInput);
export const diffResultSchema = createSchema(assertDiffResultInput);
export const backendRulesetCategorySchema = createSchema(assertBackendRulesetCategoryArray);
export const addonRulesetSchema = createSchema(assertAddonRulesetPayload);
export const knowledgeBaseSchema = createSchema(assertKnowledgeBasePayload);

export function summarizeIssues(issues: Issue[]) {
  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  } satisfies Record<Severity, number>;

  const byDomain = {
    seo: 0,
    performance: 0,
    accessibility: 0,
    aeo: 0,
    ux: 0,
    drupal: 0,
    geo: 0,
    'security-headers': 0,
    'WCAG2.1AA': 0,
    'WCAG2.2AA': 0
  };

  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
    byDomain[issue.domain] = (byDomain[issue.domain] ?? 0) + 1;
  }

  return {
    total: issues.length,
    bySeverity,
    byDomain
  };
}

export function assertScanRequest(input: unknown) {
  return scanRequestSchema.parse(input);
}

export function assertScanSnapshot(input: unknown) {
  return scanSnapshotSchema.parse(input);
}

export function assertScanResult(input: unknown) {
  return scanResultSchema.parse(input);
}

export function assertBackendScanResponse(input: unknown) {
  return backendScanResponseSchema.parse(input);
}

export function assertDiffResult(input: unknown) {
  return diffResultSchema.parse(input);
}

export function assertAddonRuleset(input: unknown) {
  return addonRulesetSchema.parse(input);
}

export type BackendRulesetCategory = {
  category: RuleDomain | 'performance' | 'accessibility' | 'ux' | 'drupal';
  rules: Array<{
    id: string;
    title: string;
    enabled?: boolean;
    severity: Severity;
  }>;
  enabled?: boolean;
};

export type BackendRulesetPayload = {
  version: string;
  generatedAt: string;
  categories: BackendRulesetCategory[];
};

export type { EngineRecommendation, CrawlNode, DiffResult, Issue, ScanRequest, ScanResult, ScanSnapshot };
