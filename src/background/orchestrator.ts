import { assertBackendScanResponse, assertScanRequest, summarizeIssues } from '../shared/contracts';
import { recommendEngine } from '../shared/anti-bot';
import { createIssue } from '../shared/rule-engine';
import type {
  CrawlNode,
  DiffResult,
  RuleDomain,
  ScanRequest,
  ScanResult,
  ScanSnapshot,
  BackendEngine,
  SecurityHeaderSignals
} from '../shared/types';
import type { RuleContext } from '../shared/rule-engine';
import { diffSnapshots, issueIdentityKey, runRules } from '../shared/rule-engine';
import { allRules } from '../shared/rules';
import { filterEnabledRuleIds } from '../shared/rulesets/catalog';
import type { AddonRulesCatalog } from '../shared/rulesets/catalog';
import type { BackendAdapter, BackendPayload } from './backend-bridge';

type FailureType = CrawlNode['errorType'];

export interface OrchestratorDeps {
  fetcher?: typeof fetch;
  securityHeaderFetcher?: typeof fetch;
  clock?: () => number;
  crawlMaxDepth?: number;
  crawlMaxUrls?: number;
  timeoutMs?: number;
  crawlMaxUrlLimit?: number;
  crawlConcurrency?: number;
  backendClient?: BackendAdapter;
}

export class ScanOrchestrator {
  private readonly fetcher: typeof fetch | undefined;
  private readonly securityHeaderFetcher: typeof fetch | undefined;
  private readonly clock: () => number;
  private readonly backendClient?: BackendAdapter;

  constructor(private readonly deps: OrchestratorDeps = {}) {
    this.fetcher = deps.fetcher;
    this.securityHeaderFetcher = deps.securityHeaderFetcher;
    this.clock = deps.clock ?? (() => Date.now());
    this.backendClient = deps.backendClient;
  }

  async runScan(
    request: ScanRequest,
    pageContext: RuleContext,
    previousSnapshot?: ScanSnapshot,
    rulesetCatalog?: AddonRulesCatalog
  ): Promise<ScanResult & { diff: DiffResult }> {
    const validated = assertScanRequest(request);
    const recommendation = recommendEngine(validated, pageContext);
    const effectiveRequest: ScanRequest = this.enrichBackendRequest(validated, recommendation);
    const rules = this.selectRules(effectiveRequest, rulesetCatalog);
    const enrichedContext = await this.enrichSecurityHeaderContext(pageContext, validated.url);
    const localResult = runRules(rules, enrichedContext);
    const hybridStealthEscalation = this.shouldRunHybridStealthScan(effectiveRequest, enrichedContext);

    let snapshotIssues = [...localResult.snapshot.issues];
    let crawlNodes: CrawlNode[] | undefined;

    if (this.shouldUseBackend(effectiveRequest)) {
      const backendRequest = hybridStealthEscalation
        ? this.withForcedBackendEngine(effectiveRequest, 'stealth-playwright')
        : effectiveRequest;
      const backendResult = await this.runBackendScan(backendRequest, pageContext, rulesetCatalog);
      if (backendResult) {
        if (hybridStealthEscalation) {
          snapshotIssues = this.mergeIssues(localResult.snapshot.issues, backendResult.snapshot.issues);
        } else {
          snapshotIssues = [...backendResult.snapshot.issues];
        }
        crawlNodes = backendResult.crawlNodes;
      }
    }

    if (!crawlNodes) {
      crawlNodes = await this.runCrawl(validated, pageContext);
    } else if (!crawlNodes.length && validated.engine === 'crawl-lite') {
      crawlNodes = await this.runCrawl(validated, pageContext);
    }

    const crawlIssues = buildCrawlIssues(crawlNodes, validated.url);
    const mergedIssues = [...snapshotIssues, ...crawlIssues];

    const resultSnapshot: ScanSnapshot = {
      id: `scan-${this.clock()}`,
      origin: localResult.snapshot.origin,
      url: validated.url,
      timestamp: this.clock(),
      engine: validated.engine,
      issues: mergedIssues,
      summary: summarizeIssues(mergedIssues)
    };

    const diff = diffSnapshots(resultSnapshot, previousSnapshot);

    return {
      requestId: validated.requestId,
      snapshot: resultSnapshot,
      crawlNodes,
      recommendation,
      diff
    };
  }

  private enrichBackendRequest(request: ScanRequest, recommendation: { engine: BackendEngine }): ScanRequest {
    if (!request.backend || request.backend.enabled === false) {
      return request;
    }

    if (request.backend.mode === 'stdin' || request.backend.mode === undefined) {
      return {
        ...request,
        backend: {
          ...request.backend,
          engine: request.backend.engine ?? recommendation.engine
        }
      };
    }

    return request;
  }

  private shouldUseBackend(request: ScanRequest): boolean {
    if (!request.backend) {
      return false;
    }

    return request.backend.enabled !== false;
  }

  private shouldRunHybridStealthScan(request: ScanRequest, context: RuleContext): boolean {
    if (request.engine !== 'dom-lite') {
      return false;
    }

    if (!request.backend || request.backend.enabled === false) {
      return false;
    }

    const linkHeavy = context.links.length >= 30;
    const imageHeavy = context.images.length >= 12;
    const headingHeavy = context.headings.h3 >= 10;
    const weakMetadata = !context.metaDescription || !context.canonical || !context.lang;

    return linkHeavy || imageHeavy || headingHeavy || weakMetadata;
  }

  private withForcedBackendEngine(request: ScanRequest, engine: BackendEngine): ScanRequest {
    return {
      ...request,
      backend: {
        ...request.backend,
        enabled: true,
        engine
      }
    };
  }

  private mergeIssues(
    localIssues: ScanSnapshot['issues'],
    backendIssues: ScanSnapshot['issues']
  ): ScanSnapshot['issues'] {
    const mergedIssues = [...localIssues];
    const seenKeys = new Set(localIssues.map((issue) => issueIdentityKey(issue)));

    for (const issue of backendIssues) {
      const key = issueIdentityKey(issue);
      if (seenKeys.has(key)) {
        continue;
      }

      mergedIssues.push(issue);
      seenKeys.add(key);
    }

    return mergedIssues;
  }

  private async enrichSecurityHeaderContext(pageContext: RuleContext, requestUrl: string): Promise<RuleContext> {
    if (pageContext.securityHeaders?.observed) {
      return pageContext;
    }

    const securityHeaders = await this.probeSecurityHeaders(requestUrl);
    if (!securityHeaders) {
      return pageContext;
    }

    return {
      ...pageContext,
      securityHeaders
    };
  }

  private async probeSecurityHeaders(requestUrl: string): Promise<SecurityHeaderSignals | undefined> {
    if (!this.securityHeaderFetcher) {
      return undefined;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(requestUrl);
    } catch {
      return undefined;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return undefined;
    }

    try {
      const response = await fetchWithTimeoutSignal(
        this.securityHeaderFetcher,
        parsedUrl.toString(),
        {
          method: 'HEAD',
          redirect: 'follow',
          cache: 'no-store'
        },
        this.deps.timeoutMs ?? 2000
      );

      return {
        observed: true,
        contentSecurityPolicy: response.headers.get('content-security-policy'),
        strictTransportSecurity: response.headers.get('strict-transport-security'),
        referrerPolicy: response.headers.get('referrer-policy')
      };
    } catch {
      return {
        observed: false,
        contentSecurityPolicy: null,
        strictTransportSecurity: null,
        referrerPolicy: null
      };
    }
  }

  private async runBackendScan(
    request: ScanRequest,
    pageContext: RuleContext,
    rulesetCatalog?: AddonRulesCatalog
  ): Promise<{ snapshot: ScanSnapshot; crawlNodes?: CrawlNode[] } | undefined> {
    if (!this.backendClient) {
      if (request.backend?.required) {
        throw new Error('Backend required but backend client is unavailable');
      }

      return undefined;
    }

    const payload: BackendPayload = {
      request,
      pageContext,
      ruleSetVersion: rulesetCatalog?.version
    };

    if (request.ruleCategories) {
      payload.selectedCategories = request.ruleCategories;
    }

    try {
      return assertBackendScanResponse(await this.backendClient.runScan(payload));
    } catch (error) {
      if (request.backend?.required) {
        throw error;
      }

      return undefined;
    }
  }

  private selectRules(request: ScanRequest, rulesetCatalog?: AddonRulesCatalog) {
    const ruleIds = rulesetCatalog && request.ruleCategories?.length
      ? filterEnabledRuleIds(rulesetCatalog, request.ruleCategories)
      : undefined;

    if (!request.ruleCategories?.length) {
      return [...allRules];
    }

    if (!ruleIds?.size) {
      return allRules.filter((rule) => request.ruleCategories?.includes(rule.domain));
    }

    return allRules.filter((rule) => ruleIds.has(rule.id));
  }

  private async runCrawl(request: ScanRequest, pageContext: RuleContext): Promise<CrawlNode[]> {
    if (request.engine !== 'crawl-lite' || !pageContext.links.length) {
      return [];
    }

    const requestedDepth = request.crawlDepth ?? this.deps.crawlMaxDepth ?? 0;
    const crawlDepth = clamp(requestedDepth, 0, 2);
    if (!crawlDepth) {
      return [];
    }

    const configuredMax = request.crawlMaxUrls ?? this.deps.crawlMaxUrls ?? 0;
    const cap = this.deps.crawlMaxUrlLimit ?? 100;
    const limit = Math.min((configuredMax || 25), cap);
    if (!limit) {
      return [];
    }

    const seedUrl = new URL(request.url);
    const crawlQueue = normalizeAndDedupLinks(pageContext.links)
      .filter((item) => item.isInternal)
      .slice(0, limit)
      .map((item) => ({
        url: normalizeForCrawl(item.href),
        depth: crawlDepth,
        status: 'queued' as const,
        discoveredFrom: request.url
      }))
      .filter((item) => item.url);

    if (!crawlQueue.length) {
      return [];
    }

    if (!this.fetcher) {
      return crawlQueue.map((node) => ({
        ...node,
        status: 'error' as const,
        errorType: 'blocked'
      }));
    }

    const results: CrawlNode[] = new Array(crawlQueue.length);
    const concurrency = clamp(this.deps.crawlConcurrency ?? 4, 1, 8);

    const processNode = async (node: (typeof crawlQueue)[number]): Promise<CrawlNode> => {
      const safety = validateCrawlTarget(node.url, seedUrl.origin);
      if (!safety.ok) {
        return {
          ...node,
          status: 'error',
          errorType: 'blocked',
          note: safety.reason
        };
      }

      const marker: CrawlNode = {
        url: node.url,
        depth: node.depth,
        status: 'running',
        discoveredFrom: node.discoveredFrom
      };

      try {
        const response = await fetchWithTimeoutSignal(
          this.fetcher!,
          node.url,
          { method: 'HEAD' },
          this.deps.timeoutMs ?? 2000
        );

        marker.statusCode = response.status;
        marker.finalUrl = response.url;

        const redirectCheck = response.url ? validateCrawlTarget(response.url, seedUrl.origin) : { ok: true };

        if (!redirectCheck.ok) {
          marker.status = 'error';
          marker.errorType = 'blocked';
          marker.note = redirectCheck.reason;
          return marker;
        }

        if (!response.ok) {
          marker.status = 'error';
          marker.errorType = 'other';
          marker.note = `HTTP ${response.status}`;
          return marker;
        }

        const contentType = typeof response.headers?.get === 'function' ? response.headers.get('content-type') ?? '' : '';
        if (!contentType || !contentType.toLowerCase().includes('text/html')) {
          marker.status = 'error';
          marker.errorType = 'non_html';
          return marker;
        }

        marker.status = 'done';
        return marker;
      } catch (error) {
        marker.status = 'error';
        marker.errorType = classifyError(error);
        return marker;
      }
    };

    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, crawlQueue.length) }, async () => {
      while (cursor < crawlQueue.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await processNode(crawlQueue[index]);
      }
    });
    await Promise.all(workers);

    return results.filter(Boolean);
  }
}

function buildCrawlIssues(crawlNodes: CrawlNode[] | undefined, scanUrl: string) {
  if (!crawlNodes?.length) {
    return [];
  }

  const sourceUrl = new URL(scanUrl);

  return crawlNodes.flatMap((node) => {
    const discoveredFrom = node.discoveredFrom ?? scanUrl;
    const evidence = node.finalUrl && node.finalUrl !== node.url
      ? `Crawl target ${node.url} redirected to ${node.finalUrl}`
      : `Crawl target ${node.url} discovered from ${discoveredFrom}`;

    if (node.status === 'error') {
      if (node.statusCode && node.statusCode >= 400) {
        return [
          createIssue(
            {
              id: 'crawl-broken-link',
              title: 'Broken internal link discovered',
              severity: node.statusCode >= 500 ? 'high' : 'medium',
              domain: 'seo'
            },
            `Crawl target returned HTTP ${node.statusCode}`,
            evidence,
            undefined,
            'backend'
          )
        ];
      }

      if (node.errorType === 'cors' || node.errorType === 'timeout' || node.errorType === 'blocked') {
        return [
          createIssue(
            {
              id: `crawl-${node.errorType ?? 'other'}-target`,
              title: 'Crawl target could not be verified',
              severity: node.errorType === 'timeout' ? 'high' : 'medium',
              domain: 'seo'
            },
            `Crawl target ${node.errorType ?? 'other'} during verification`,
            evidence,
            undefined,
            'backend'
          )
        ];
      }

      if (node.errorType === 'non_html') {
        return [
          createIssue(
            {
              id: 'crawl-non-html-target',
              title: 'Crawl target is not HTML',
              severity: 'low',
              domain: 'seo'
            },
            'Crawl target returned a non-HTML document',
            evidence,
            undefined,
            'backend'
          )
        ];
      }
    }

    if (looksLikeDrupalEndpoint(node.url)) {
      return [
        createIssue(
          {
            id: 'drupal-endpoint-exposed',
            title: 'Drupal API endpoint exposed',
            severity: 'low',
            domain: 'drupal'
          },
          `Discovered Drupal-oriented endpoint at ${node.url}`,
          evidence,
          undefined,
          'backend'
        )
      ];
    }

    if (node.status === 'done' && node.finalUrl && node.finalUrl !== node.url) {
      return [
        createIssue(
          {
            id: 'crawl-redirect-observed',
            title: 'Internal link redirected during crawl',
            severity: 'low',
            domain: 'seo'
          },
          `Crawl target redirected to ${node.finalUrl}`,
          evidence,
          undefined,
          'backend'
        )
      ];
    }

    if (node.status === 'done' && sourceUrl.origin === new URL(node.url).origin && node.url !== scanUrl) {
      return [];
    }

    return [];
  });
}

function looksLikeDrupalEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    const target = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return (
      target.includes('/jsonapi') ||
      target.includes('/rest') ||
      target.includes('/graphql') ||
      target.includes('/entity/')
    );
  } catch {
    return false;
  }
}

function validateCrawlTarget(candidate: string, seedOrigin: string): { ok: boolean; reason?: string } {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: 'Malformed URL' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { ok: false, reason: `Blocked protocol ${url.protocol}` };
  }

  if (url.origin !== seedOrigin) {
    return { ok: false, reason: 'Cross-origin target blocked by crawler policy' };
  }

  if (isPrivateOrRestrictedHost(url.hostname)) {
    return { ok: false, reason: 'Potential SSRF/private host target blocked' };
  }

  return { ok: true };
}

function normalizeAndDedupLinks(links: RuleContext['links']) {
  const seen = new Set<string>();
  return links
    .filter((link) => !isIgnored(link.href))
    .filter((link) => {
      const id = normalizeForCrawl(link.href);
      if (seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });
}

function isIgnored(url: string): boolean {
  return !url;
}

function isPrivateOrRestrictedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\]$/, '').replace(/^\[/, '');

  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }

  if (normalized === '::1' || normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  const ipv4Match = normalized.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4Match) {
    return false;
  }

  const first = Number(ipv4Match[1]);
  const second = Number(ipv4Match[2]);
  const third = Number(ipv4Match[3]);

  if (first === 10 || first === 127 || first === 0 || first === 169 && second === 254 || first === 192 && second === 168) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return first === 100 && second >= 64 && second <= 127;
}

function classifyError(error: unknown): FailureType {
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return 'timeout';
  }

  const message = (error instanceof Error ? error.message : '').toLowerCase();
  if (message.includes('cors') || message.includes('cross-origin')) {
    return 'cors';
  }

  if (message.includes('blocked')) {
    return 'blocked';
  }

  return 'other';
}

async function fetchWithTimeoutSignal(
  fetcher: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  if (typeof AbortController === 'undefined') {
    return fetcher(input, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeForCrawl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = '';
    url.search = new URLSearchParams(url.searchParams).toString();
    return url.toString();
  } catch {
    return input;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
