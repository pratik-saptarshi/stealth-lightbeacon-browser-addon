import { describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/background/service-worker';
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

  it('requires active context when no page context is supplied', async () => {
    const scanResponse = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'smoke-missing-context',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(scanResponse.ok).toBe(false);
    if (scanResponse.ok) {
      throw new Error('Expected scan to fail');
    }

    expect(scanResponse.error).toContain('Page context is missing');
  });
});
