export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type ScanEngine = 'dom-lite' | 'crawl-lite';

export type BackendEngine = 'http' | 'fast-obscura' | 'stealth-playwright' | 'mcp';

export type RuleDomain =
  | 'seo'
  | 'performance'
  | 'accessibility'
  | 'aeo'
  | 'ux'
  | 'drupal'
  | 'geo'
  | 'security-headers'
  | 'WCAG2.1AA'
  | 'WCAG2.2AA';

export type IssueSource = 'dom-only' | 'backend';

export type AddonRuleCategory = 'seo' | 'geo' | 'aeo' | 'security-headers' | 'WCAG2.1AA' | 'WCAG2.2AA';

export interface Issue {
  id: string;
  ruleId: string;
  title: string;
  severity: Severity;
  domain: RuleDomain;
  summary: string;
  evidence: string;
  selector?: string;
  source: IssueSource;
}

export interface EngineRecommendation {
  engine: BackendEngine;
  reason: string;
  confidence: number;
}

export interface ScanSnapshot {
  id: string;
  origin: string;
  url: string;
  timestamp: number;
  engine: 'dom-lite' | 'crawl-lite';
  issues: Issue[];
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byDomain: Record<string, number>;
  };
}

export interface CrawlNode {
  url: string;
  depth: number;
  status: 'queued' | 'running' | 'done' | 'error';
  errorType?: 'cors' | 'timeout' | 'blocked' | 'non_html' | 'other';
  discoveredFrom?: string;
  finalUrl?: string;
  statusCode?: number;
  note?: string;
}

export interface ScanRequest {
  requestId: string;
  url: string;
  tabId?: number;
  engine: ScanEngine;
  crawlDepth?: number;
  crawlMaxUrls?: number;
  ruleCategories?: RuleDomain[];
  backend?: {
    enabled?: boolean;
    mode?: 'http' | 'stdin';
    engine?: BackendEngine;
    endpoint?: string;
    auth?: {
      username: string;
      password: string;
    };
    timeoutMs?: number;
    required?: boolean;
  };
}

export interface ScanResult {
  requestId: string;
  snapshot: ScanSnapshot;
  crawlNodes?: CrawlNode[];
  recommendation?: EngineRecommendation;
}

export interface DiffResult {
  newIssues: Issue[];
  resolvedIssues: Issue[];
  regressions: Issue[];
  improvements: Issue[];
}

export interface StorageSnapshot {
  id: string;
  origin: string;
  snapshot: Omit<ScanSnapshot, 'id' | 'origin'>;
}
