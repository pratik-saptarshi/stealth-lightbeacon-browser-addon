import { z } from 'zod';
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

const severitySchema = z.enum(['critical', 'high', 'medium', 'low']);
const domainSchema = z.enum([
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
]);

const issueCountBySeveritySchema = z.object({
  critical: z.number().nonnegative(),
  high: z.number().nonnegative(),
  medium: z.number().nonnegative(),
  low: z.number().nonnegative()
});

const issueCountByDomainSchema = z
  .object({
    seo: z.number().nonnegative(),
    performance: z.number().nonnegative(),
    accessibility: z.number().nonnegative(),
    aeo: z.number().nonnegative(),
    ux: z.number().nonnegative(),
    drupal: z.number().nonnegative(),
    geo: z.number().nonnegative(),
    'security-headers': z.number().nonnegative(),
    'WCAG2.1AA': z.number().nonnegative(),
    'WCAG2.2AA': z.number().nonnegative()
  })
  .catchall(z.number().nonnegative());

export const issueSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  title: z.string().min(1),
  severity: severitySchema,
  domain: domainSchema,
  summary: z.string().min(1),
  evidence: z.string().min(1),
  selector: z.string().optional(),
  source: z.enum(['dom-only', 'backend'])
});

const engineRecommendationSchema = z.object({
  engine: z.enum(['http', 'fast-obscura', 'stealth-playwright', 'mcp']),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const scanRequestSchema = z.object({
  requestId: z.string().min(1),
  url: z.string().url(),
  tabId: z.number().int().nonnegative().optional(),
  engine: z.enum(['dom-lite', 'crawl-lite']),
  crawlDepth: z.number().int().nonnegative().max(4).optional(),
  crawlMaxUrls: z.number().int().nonnegative().max(500).optional(),
  ruleCategories: z.array(domainSchema).min(1).optional(),
  backend: z
    .object({
      enabled: z.boolean().optional(),
      mode: z.enum(['http', 'stdin']).optional(),
      engine: z.enum(['http', 'fast-obscura', 'stealth-playwright', 'mcp']).optional(),
      endpoint: z.string().url().optional(),
      allowedHosts: z.array(z.string().min(1)).optional(),
      auth: z
        .object({
          username: z.string().min(1),
          password: z.string().min(1)
        })
        .optional(),
      timeoutMs: z.number().int().positive().optional(),
      required: z.boolean().optional()
    })
    .optional()
});

export const scanSnapshotSchema = z.object({
  id: z.string().min(1),
  origin: z.string().min(1),
  url: z.string().url(),
  timestamp: z.number().nonnegative(),
  engine: z.enum(['dom-lite', 'crawl-lite']),
  issues: z.array(issueSchema),
  summary: z.object({
    total: z.number().nonnegative(),
    bySeverity: issueCountBySeveritySchema,
    byDomain: issueCountByDomainSchema
  })
});

export const crawlNodeSchema = z.object({
  url: z.string().url(),
  depth: z.number().int().nonnegative(),
  status: z.enum(['queued', 'running', 'done', 'error']),
  errorType: z.enum(['cors', 'timeout', 'blocked', 'non_html', 'other']).optional(),
  discoveredFrom: z.string().url().optional(),
  finalUrl: z.string().url().optional(),
  statusCode: z.number().nonnegative().optional(),
  note: z.string().optional()
});

export const scanResultSchema = z.object({
  requestId: z.string().min(1),
  snapshot: scanSnapshotSchema,
  crawlNodes: z.array(crawlNodeSchema).optional(),
  recommendation: engineRecommendationSchema.optional()
});

export const diffResultSchema = z.object({
  newIssues: z.array(issueSchema),
  resolvedIssues: z.array(issueSchema),
  regressions: z.array(issueSchema),
  improvements: z.array(issueSchema)
});

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

export function assertScanRequest(input: unknown): ScanRequest {
  return scanRequestSchema.parse(input);
}

export function assertScanSnapshot(input: unknown): ScanSnapshot {
  return scanSnapshotSchema.parse(input);
}

export function assertScanResult(input: unknown): ScanResult {
  return scanResultSchema.parse(input);
}

export function assertDiffResult(input: unknown): DiffResult {
  return diffResultSchema.parse(input);
}

export const backendRulesetCategorySchema = z.array(
  z.object({
    category: z.enum([
      'seo',
      'geo',
      'aeo',
      'security-headers',
      'WCAG2.1AA',
      'WCAG2.2AA',
      'performance',
      'accessibility',
      'ux',
      'drupal'
    ]),
    rules: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        enabled: z.boolean().optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low'])
      })
    ),
    enabled: z.boolean().optional()
  })
).min(1);

export const addonRulesetSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string().min(1),
  categories: backendRulesetCategorySchema
});

export type BackendRulesetCategory = z.infer<typeof addonRulesetSchema>['categories'][number];
export type BackendRulesetPayload = z.infer<typeof addonRulesetSchema>;

export type { EngineRecommendation, CrawlNode, DiffResult, Issue, ScanRequest, ScanResult, ScanSnapshot };
