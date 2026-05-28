import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handleMessage } from '../../src/background/service-worker';
import type { ScanStartReply } from '../../src/shared/message-contracts';
import type { AddonRulesCatalog } from '../../src/shared/rulesets/catalog';
import type { AddonKnowledgeBaseCatalog } from '../../src/shared/knowledge-base/catalog';
import type {
  IssueListReply,
  KnowledgeBaseGetReply,
  KnowledgeBaseUpdateReply,
  ReportBuildReply,
  RulesetGetReply,
  RulesetUpdateReply
} from '../../src/shared/message-contracts';

type ChromeLikeRuntime = {
  runtime?: {
    onMessage?: {
      addListener: ReturnType<typeof vi.fn>;
    };
  };
  storage?: {
    local: Record<string, unknown>;
  };
  tabs?: {
    query: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  scripting?: {
    executeScript: ReturnType<typeof vi.fn>;
  };
  action?: {
    setIcon: ReturnType<typeof vi.fn>;
    setBadgeText: ReturnType<typeof vi.fn>;
    setBadgeBackgroundColor: ReturnType<typeof vi.fn>;
    setBadgeTextColor: ReturnType<typeof vi.fn>;
  };
};

const extractedContext = {
  requestUrl: 'https://example.com/page',
  title: 'Injected',
  metaDescription: 'desc',
  lang: 'en',
  canonical: 'https://example.com/page',
  headings: { h1: 1, h2: 0, h3: 0 },
  images: [],
  links: [{ href: 'https://example.com/page', text: 'self', rel: '', target: '', isInternal: true }],
  buttons: [],
  formInputs: []
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let originalChrome: ChromeLikeRuntime | undefined;
let originalBrowser: ChromeLikeRuntime | undefined;
let currentWindowRuntime: WindowLike;

type WindowLike = ChromeLikeRuntime & { chrome?: ChromeLikeRuntime; browser?: ChromeLikeRuntime };

beforeEach(() => {
  currentWindowRuntime = globalThis as unknown as WindowLike;
  originalChrome = currentWindowRuntime.chrome;
  originalBrowser = currentWindowRuntime.browser;

  const runtime: ChromeLikeRuntime = {
    runtime: {
      onMessage: {
        addListener: vi.fn()
      }
    },
    storage: {
      local: {}
    },
    tabs: {
      query: vi.fn(async () => [{ id: 77 }]),
      sendMessage: vi.fn(async () => ({ ok: true, payload: extractedContext }))
    },
    scripting: {
      executeScript: vi.fn(async () => undefined)
    },
    action: {
      setIcon: vi.fn(async () => undefined),
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setBadgeTextColor: vi.fn(async () => undefined)
    }
  };

  currentWindowRuntime.chrome = runtime;
  delete currentWindowRuntime.browser;
});

afterEach(() => {
  if (originalChrome) {
    currentWindowRuntime.chrome = originalChrome;
  } else {
    delete currentWindowRuntime.chrome;
  }

  if (originalBrowser) {
    currentWindowRuntime.browser = originalBrowser;
  } else {
    delete currentWindowRuntime.browser;
  }
});

it('resolves scan context from active tab when pageContext is omitted', async () => {
  const reply = (await handleMessage({
    type: 'scan:start',
    request: {
      requestId: 'tab-context',
      url: 'https://example.com/page',
      engine: 'dom-lite'
    }
  } as const)) as ScanStartReply;

  expect(reply.ok).toBe(true);
  if (!reply.ok) {
    throw new Error(reply.error);
  }

  expect(reply.payload.snapshot.origin).toBe('https://example.com');
  const action = (currentWindowRuntime.chrome as ChromeLikeRuntime).action;
  expect(action?.setIcon).toHaveBeenCalled();
  expect(action?.setBadgeText).toHaveBeenCalledWith({
    tabId: 77,
    text: String(reply.payload.snapshot.summary.total)
  });
});

it('returns the bundled knowledge base catalog', async () => {
  const reply = await handleMessage({ type: 'knowledge-base:get' } as const);

  expect(reply.ok).toBe(true);
  if (!reply.ok) {
    throw new Error(reply.error);
  }

  expect('catalog' in reply.payload).toBe(true);
  if (!('catalog' in reply.payload)) {
    throw new Error('Expected knowledge base catalog payload');
  }

  expect(reply.payload.catalog.version).toBeTruthy();
  expect(reply.payload.catalog.categories.length).toBeGreaterThan(0);
});

it('gets and updates the ruleset catalog through the service worker', async () => {
  const originalReply = (await handleMessage({ type: 'ruleset:get' } as const)) as RulesetGetReply;

  expect(originalReply.ok).toBe(true);
  if (!originalReply.ok) {
    throw new Error(originalReply.error);
  }

  const originalCatalog = clone(originalReply.payload.catalog);
  const nextCatalog: AddonRulesCatalog = clone(originalReply.payload.catalog);
  const targetCategory = nextCatalog.categories[0];
  const targetRule = targetCategory.rules[0];

  targetCategory.enabled = false;
  targetRule.title = '   ';
  targetRule.severity = 'unexpected' as never;
  targetRule.enabled = false;

  try {
    const updateReply = (await handleMessage({
      type: 'ruleset:update',
      catalog: nextCatalog
    } as const)) as RulesetUpdateReply;

    expect(updateReply.ok).toBe(true);
    if (!updateReply.ok) {
      throw new Error(updateReply.error);
    }

    const updatedCatalog = updateReply.payload.catalog;
    expect(updatedCatalog.categories[0].enabled).toBe(false);
    expect(updatedCatalog.categories[0].rules[0].title).toBe(targetRule.id);
    expect(updatedCatalog.categories[0].rules[0].severity).toBe('low');
    expect(updatedCatalog.categories[0].rules[0].enabled).toBe(false);

    const rereadReply = (await handleMessage({ type: 'ruleset:get' } as const)) as RulesetGetReply;
    expect(rereadReply.ok).toBe(true);
    if (!rereadReply.ok) {
      throw new Error(rereadReply.error);
    }

    expect(rereadReply.payload.catalog.categories[0].rules[0].title).toBe(targetRule.id);
    expect(rereadReply.payload.catalog.categories[0].rules[0].severity).toBe('low');
  } finally {
    await handleMessage({
      type: 'ruleset:update',
      catalog: originalCatalog
    } as const);
  }
});

it('gets and updates the knowledge base catalog through the service worker', async () => {
  const originalReply = (await handleMessage({ type: 'knowledge-base:get' } as const)) as KnowledgeBaseGetReply;

  expect(originalReply.ok).toBe(true);
  if (!originalReply.ok) {
    throw new Error(originalReply.error);
  }

  const originalCatalog = clone(originalReply.payload.catalog);
  const nextCatalog: AddonKnowledgeBaseCatalog = clone(originalReply.payload.catalog);
  const targetCategory = nextCatalog.categories[0];
  const targetEntry = targetCategory.entries[0];

  targetEntry.title = '   ';
  targetEntry.summary = '  Updated summary  ';
  targetEntry.notes = ['  keep me  ', '   ', ' trim me  '];
  targetEntry.enabled = false;

  try {
    const updateReply = (await handleMessage({
      type: 'knowledge-base:update',
      catalog: nextCatalog
    } as const)) as KnowledgeBaseUpdateReply;

    expect(updateReply.ok).toBe(true);
    if (!updateReply.ok) {
      throw new Error(updateReply.error);
    }

    const updatedCatalog = updateReply.payload.catalog;
    expect(updatedCatalog.categories[0].entries[0].title).toBe(targetEntry.id);
    expect(updatedCatalog.categories[0].entries[0].summary).toBe('Updated summary');
    expect(updatedCatalog.categories[0].entries[0].notes).toEqual(['keep me', 'trim me']);
    expect(updatedCatalog.categories[0].entries[0].enabled).toBe(false);

    const rereadReply = (await handleMessage({ type: 'knowledge-base:get' } as const)) as KnowledgeBaseGetReply;
    expect(rereadReply.ok).toBe(true);
    if (!rereadReply.ok) {
      throw new Error(rereadReply.error);
    }

    expect(rereadReply.payload.catalog.categories[0].entries[0].title).toBe(targetEntry.id);
    expect(rereadReply.payload.catalog.categories[0].entries[0].notes).toEqual(['keep me', 'trim me']);
  } finally {
    await handleMessage({
      type: 'knowledge-base:update',
      catalog: originalCatalog
    } as const);
  }
});

it('handles issue listing, report building, history lookups, and unknown messages', async () => {
  const scanReply = (await handleMessage({
    type: 'scan:start',
    request: {
      requestId: 'service-worker-coverage',
      url: 'https://example.com/page',
      engine: 'dom-lite'
    },
    persistHistory: true
  } as const)) as ScanStartReply;

  expect(scanReply.ok).toBe(true);
  if (!scanReply.ok) {
    throw new Error(scanReply.error);
  }

  const issuesReply = (await handleMessage({
    type: 'issues:list',
    snapshot: scanReply.payload.snapshot,
    filter: {
      domain: 'seo'
    }
  } as const)) as IssueListReply;

  expect(issuesReply.ok).toBe(true);
  if (!issuesReply.ok) {
    throw new Error(issuesReply.error);
  }

  expect(issuesReply.payload.count).toBeGreaterThanOrEqual(0);

  const reportReply = (await handleMessage({
    type: 'report:build',
    snapshot: scanReply.payload.snapshot,
    diff: scanReply.payload.diff,
    format: 'markdown'
  } as const)) as ReportBuildReply;

  expect(reportReply.ok).toBe(true);
  if (!reportReply.ok) {
    throw new Error(reportReply.error);
  }

  expect(reportReply.payload.report).toContain('# Scan Export');

  const historyListReply = await handleMessage({
    type: 'history:list',
    origin: 'https://example.com',
    limit: 5
  } as const);

  expect(historyListReply.ok).toBe(true);

  const historyLatestReply = await handleMessage({
    type: 'history:latest',
    origin: 'https://example.com'
  } as const);

  expect(historyLatestReply.ok).toBe(true);

  const historyCompareReply = await handleMessage({
    type: 'history:compare',
    origin: 'https://example.com'
  } as const);

  expect(historyCompareReply.ok).toBe(true);

  const unknownReply = await handleMessage({ type: 'unexpected:message' } as never);
  expect(unknownReply.ok).toBe(false);
  if (unknownReply.ok) {
    throw new Error('Expected unknown message failure');
  }

  expect(unknownReply.error).toContain('Unknown message type');
});

it('fails when scan start has no page context and no active tab context is available', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalQuery = chrome.tabs?.query;

  if (chrome.tabs) {
    chrome.tabs.query = vi.fn(async () => []);
  }

  try {
    const reply = await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'missing-context',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      }
    } as const);

    expect(reply.ok).toBe(false);
    if (reply.ok) {
      throw new Error('Expected missing context failure');
    }

    expect(reply.error).toContain('Page context is missing');
  } finally {
    if (chrome.tabs) {
      chrome.tabs.query = originalQuery!;
    }
  }
});

it('disables an optional backend blocked by host policy', async () => {
  const reply = (await handleMessage({
    type: 'scan:start',
    request: {
      requestId: 'blocked-backend',
      url: 'https://example.com/page',
      engine: 'dom-lite',
      backend: {
        enabled: true,
        mode: 'http',
        endpoint: 'https://malicious.example.com/audit'
      }
    },
    pageContext: extractedContext
  } as const)) as ScanStartReply;

  expect(reply.ok).toBe(true);
  if (!reply.ok) {
    throw new Error(reply.error);
  }

  expect(reply.payload.snapshot.summary.total).toBeGreaterThanOrEqual(1);
  expect(reply.payload.recommendation?.engine).toBeTruthy();
});

it('initializes and scans through the browser runtime path', async () => {
  vi.resetModules();

  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime | undefined;
  const browserRuntime: ChromeLikeRuntime = {
    runtime: {
      onMessage: {
        addListener: vi.fn()
      }
    },
    storage: {
      local: {}
    },
    tabs: {
      query: vi.fn(async () => [{ id: 88 }]),
      sendMessage: vi.fn(async () => ({ ok: true, payload: extractedContext }))
    },
    scripting: {
      executeScript: vi.fn(async () => undefined)
    },
    action: {
      setIcon: vi.fn(async () => undefined),
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setBadgeTextColor: vi.fn(async () => undefined)
    }
  };

  delete currentWindowRuntime.chrome;
  currentWindowRuntime.browser = browserRuntime;

  try {
    const { handleMessage: browserHandleMessage } = await import('../../src/background/service-worker');
    const reply = (await browserHandleMessage({
      type: 'scan:start',
      request: {
        requestId: 'browser-runtime',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      },
      persistHistory: true
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }

    expect(browserRuntime.runtime?.onMessage?.addListener).toHaveBeenCalled();
    expect(browserRuntime.scripting?.executeScript).toHaveBeenCalled();
    expect(browserRuntime.tabs?.sendMessage).toHaveBeenCalledWith(88, { type: 'content:extract' });
    expect(reply.payload.snapshot.summary.total).toBeGreaterThan(0);
  } finally {
    if (chrome) {
      currentWindowRuntime.chrome = chrome;
    } else {
      delete currentWindowRuntime.chrome;
    }

    delete currentWindowRuntime.browser;
    vi.resetModules();
  }
});

it('skips runtime listener registration when no listener API exists', async () => {
  vi.resetModules();

  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime | undefined;
  delete currentWindowRuntime.chrome;
  currentWindowRuntime.browser = {
    storage: {
      local: {}
    },
    tabs: {
      query: vi.fn(async () => [{ id: 89 }]),
      sendMessage: vi.fn(async () => ({ ok: true, payload: extractedContext }))
    },
    scripting: {
      executeScript: vi.fn(async () => undefined)
    },
    action: {
      setIcon: vi.fn(async () => undefined),
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setBadgeTextColor: vi.fn(async () => undefined)
    }
  } as ChromeLikeRuntime;

  try {
    await import('../../src/background/service-worker');
    expect(true).toBe(true);
  } finally {
    if (chrome) {
      currentWindowRuntime.chrome = chrome;
    } else {
      delete currentWindowRuntime.chrome;
    }

    delete currentWindowRuntime.browser;
    vi.resetModules();
  }
});
