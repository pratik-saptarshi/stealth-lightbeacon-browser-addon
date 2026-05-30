import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/background/service-worker';
import { SMOKE_VIEWPORTS, isExternalSmokeRequest } from '../../scripts/extension-load-smoke-helpers.mjs';
import type { RuleContext } from '../../src/shared/rule-engine';
import type { ScanRequest } from '../../src/shared/types';
import {
  type HistoryCompareReply,
  type HistoryLatestReply,
  type HistoryListReply,
  type ScanStartReply,
  type IssueListReply,
  type ReportBuildReply,
  type HistoryCompareResult,
  type HistoryLatestResult,
  type HistoryListResult,
  type ScanStartResult
} from '../../src/shared/message-contracts';

const context: RuleContext = {
  requestUrl: 'https://example.com/page',
  title: 'Hello',
  metaDescription: 'desc',
  lang: 'en',
  canonical: 'https://example.com/page',
  headings: { h1: 1, h2: 0, h3: 0 },
  images: [{ src: '/img.png', alt: 'logo' }],
  links: [{ href: 'https://example.com/about', text: 'about', rel: '', target: '', isInternal: true }],
  buttons: [],
  formInputs: []
};

const request: ScanRequest = {
  requestId: 'smoke-1',
  url: 'https://example.com/page',
  engine: 'dom-lite'
};

describe('phase 4 smoke contract flow', () => {
  it('runs scan and persists/compares history', async () => {
    const scanResponse = (await handleMessage({
      type: 'scan:start',
      request,
      pageContext: context,
      persistHistory: true
    } as const)) as ScanStartReply;

    expect(scanResponse.ok).toBe(true);
    if (!scanResponse.ok) {
      throw new Error(scanResponse.error);
    }

    const scanPayload = scanResponse.payload as ScanStartResult;
    expect(scanPayload.snapshot.origin).toBe('https://example.com');

    const listResponse = (await handleMessage({
      type: 'history:list',
      origin: 'https://example.com'
    })) as HistoryListReply;

    expect(listResponse.ok).toBe(true);
    if (!listResponse.ok) {
      throw new Error(listResponse.error);
    }

    const listPayload = listResponse.payload as HistoryListResult;
    expect(listPayload.snapshots).toHaveLength(1);

    const latestResponse = (await handleMessage({ type: 'history:latest', origin: 'https://example.com' })) as HistoryLatestReply;
    expect(latestResponse.ok).toBe(true);
    if (!latestResponse.ok) {
      throw new Error(latestResponse.error);
    }

    const latestPayload = latestResponse.payload as HistoryLatestResult;
    expect(latestPayload.snapshot?.url).toBe('https://example.com/page');

    const compareResponse = (await handleMessage({ type: 'history:compare', origin: 'https://example.com' })) as HistoryCompareReply;
    expect(compareResponse.ok).toBe(true);
    if (!compareResponse.ok) {
      throw new Error(compareResponse.error);
    }

    const comparePayload = compareResponse.payload as HistoryCompareResult;
    expect(comparePayload.latest).toBeDefined();
    expect(comparePayload.previous).toBeUndefined();
  });

  it('returns issue API view and report formats', async () => {
    const scanResponse = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'smoke-issue-report',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      },
      pageContext: {
        requestUrl: 'https://example.com/page',
        title: 'Hello',
        metaDescription: 'desc',
        lang: 'en',
        canonical: 'https://example.com/page',
        headings: { h1: 1, h2: 0, h3: 0 },
        images: [],
        links: [],
        buttons: [],
        formInputs: []
      }
    } as const) as ScanStartReply) as ScanStartReply;

    expect(scanResponse.ok).toBe(true);
    if (!scanResponse.ok) {
      throw new Error(scanResponse.error);
    }

    const issueResponse = (await handleMessage({
      type: 'issues:list',
      snapshot: scanResponse.payload.snapshot,
      filter: { source: 'dom-only' }
    })) as IssueListReply;

    expect(issueResponse.ok).toBe(true);
    if (!issueResponse.ok) {
      throw new Error(issueResponse.error);
    }

    expect(issueResponse.payload.count).toBeGreaterThanOrEqual(1);

    const reportResponse = (await handleMessage({
      type: 'report:build',
      snapshot: scanResponse.payload.snapshot,
      diff: scanResponse.payload.diff,
      format: 'html'
    })) as ReportBuildReply;

    expect(reportResponse.ok).toBe(true);
    if (!reportResponse.ok) {
      throw new Error(reportResponse.error);
    }

    expect(reportResponse.payload.format).toBe('html');
    expect(reportResponse.payload.report).toContain('<html');
  });

  it('tracks multiple snapshots and exercises history/report branches', async () => {
    const origin = 'https://phase4-history.example.com';
    const firstRequest: ScanRequest = {
      requestId: 'smoke-history-1',
      url: `${origin}/first`,
      engine: 'dom-lite'
    };
    const secondRequest: ScanRequest = {
      requestId: 'smoke-history-2',
      url: `${origin}/second`,
      engine: 'dom-lite'
    };

    const firstScanResponse = (await handleMessage({
      type: 'scan:start',
      request: firstRequest,
      pageContext: {
        ...context,
        requestUrl: firstRequest.url,
        canonical: firstRequest.url,
        title: 'First snapshot'
      },
      persistHistory: true
    } as const)) as ScanStartReply;

    expect(firstScanResponse.ok).toBe(true);
    if (!firstScanResponse.ok) {
      throw new Error(firstScanResponse.error);
    }

    await new Promise((resolve) => setTimeout(resolve, 5));

    const secondScanResponse = (await handleMessage({
      type: 'scan:start',
      request: secondRequest,
      pageContext: {
        ...context,
        requestUrl: secondRequest.url,
        canonical: secondRequest.url,
        title: 'Second snapshot'
      },
      persistHistory: true
    } as const)) as ScanStartReply;

    expect(secondScanResponse.ok).toBe(true);
    if (!secondScanResponse.ok) {
      throw new Error(secondScanResponse.error);
    }

    const listResponse = (await handleMessage({
      type: 'history:list',
      origin,
      limit: 1
    } as const)) as HistoryListReply;

    expect(listResponse.ok).toBe(true);
    if (!listResponse.ok) {
      throw new Error(listResponse.error);
    }

    const listPayload = listResponse.payload as HistoryListResult;
    expect(listPayload.snapshots).toHaveLength(1);
    expect(listPayload.snapshots[0].url).toBe(secondRequest.url);

    const latestResponse = (await handleMessage({
      type: 'history:latest',
      origin
    } as const)) as HistoryLatestReply;

    expect(latestResponse.ok).toBe(true);
    if (!latestResponse.ok) {
      throw new Error(latestResponse.error);
    }

    const latestPayload = latestResponse.payload as HistoryLatestResult;
    expect(latestPayload.snapshot?.url).toBe(secondRequest.url);

    const compareResponse = (await handleMessage({
      type: 'history:compare',
      origin
    } as const)) as HistoryCompareReply;

    expect(compareResponse.ok).toBe(true);
    if (!compareResponse.ok) {
      throw new Error(compareResponse.error);
    }

    const comparePayload = compareResponse.payload as HistoryCompareResult;
    expect(comparePayload.latest?.url).toBe(secondRequest.url);
    expect(comparePayload.previous?.url).toBe(firstRequest.url);
    expect(comparePayload.diff).toBeDefined();

    const jsonReportResponse = (await handleMessage({
      type: 'report:build',
      snapshot: secondScanResponse.payload.snapshot,
      diff: secondScanResponse.payload.diff,
      format: 'json'
    } as const)) as ReportBuildReply;

    expect(jsonReportResponse.ok).toBe(true);
    if (!jsonReportResponse.ok) {
      throw new Error(jsonReportResponse.error);
    }

    expect(jsonReportResponse.payload.format).toBe('json');
    expect(jsonReportResponse.payload.report).toContain('"url": "https://phase4-history.example.com/second"');

    const geoXmlReportResponse = (await handleMessage({
      type: 'report:build',
      snapshot: secondScanResponse.payload.snapshot,
      diff: secondScanResponse.payload.diff,
      format: 'geo-xml'
    } as const)) as ReportBuildReply;

    expect(geoXmlReportResponse.ok).toBe(true);
    if (!geoXmlReportResponse.ok) {
      throw new Error(geoXmlReportResponse.error);
    }

    expect(geoXmlReportResponse.payload.format).toBe('geo-xml');
    expect(geoXmlReportResponse.payload.report).toContain('<geoReport>');
  });

  it('returns informational unsupported scan result when no page context is supplied', async () => {
    const scanResponse = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'smoke-missing-context',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(scanResponse.ok).toBe(true);
    if (!scanResponse.ok) {
      throw new Error(scanResponse.error);
    }
    expect(scanResponse.payload.snapshot.issues[0]?.ruleId.startsWith('unsupported-page-')).toBe(true);
  });
});

describe('phase 4 browser smoke helpers', () => {
  it('treats only remote network protocols as external requests', () => {
    expect(isExternalSmokeRequest('https://example.com/app.js')).toBe(true);
    expect(isExternalSmokeRequest('http://example.com/app.js')).toBe(true);
    expect(isExternalSmokeRequest('wss://example.com/socket')).toBe(true);
    expect(isExternalSmokeRequest('ws://example.com/socket')).toBe(true);
    expect(isExternalSmokeRequest('file:///tmp/extension-load-smoke.html')).toBe(false);
    expect(isExternalSmokeRequest('chrome-extension://abc123/side-panel.html')).toBe(false);
    expect(isExternalSmokeRequest('about:blank')).toBe(false);
    expect(isExternalSmokeRequest('data:text/html,hello')).toBe(false);
  });

  it('covers a narrow and a wide popup viewport', () => {
    expect(SMOKE_VIEWPORTS).toEqual([
      { width: 390, height: 844 },
      { width: 1280, height: 900 }
    ]);
  });

  it('keeps the local smoke fixture page free of remote assets', () => {
    const fixturePath = resolve(process.cwd(), 'tests/phase4/fixtures/extension-load-smoke.html');
    const html = readFileSync(fixturePath, 'utf8');

    expect(html).toContain('data-testid="smoke-fixture"');
    expect(html).toContain('data-testid="local-fixture-marker"');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<script\s+src=/i);
    expect(html).not.toMatch(/<link\s+[^>]*rel=["'](?:stylesheet|preload|modulepreload|prefetch)["']/i);
    expect(html).not.toMatch(/<img\b/i);
  });
});
