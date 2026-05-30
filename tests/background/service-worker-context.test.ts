import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handleMessage } from '../../src/background/service-worker';
import { registerRuntime } from '../../src/background/service-worker';
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
    get?: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  scripting?: {
    executeScript: ReturnType<typeof vi.fn>;
  };
  action?: {
    onClicked?: {
      addListener: ReturnType<typeof vi.fn>;
    };
    setIcon: ReturnType<typeof vi.fn>;
    setBadgeText: ReturnType<typeof vi.fn>;
    setBadgeBackgroundColor: ReturnType<typeof vi.fn>;
    setBadgeTextColor: ReturnType<typeof vi.fn>;
  };
  contextMenus?: {
    create: ReturnType<typeof vi.fn>;
    onClicked?: {
      addListener: ReturnType<typeof vi.fn>;
    };
  };
  sidePanel?: {
    open: ReturnType<typeof vi.fn>;
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
      onClicked: {
        addListener: vi.fn()
      },
      setIcon: vi.fn(async () => undefined),
      setBadgeText: vi.fn(async () => undefined),
      setBadgeBackgroundColor: vi.fn(async () => undefined),
      setBadgeTextColor: vi.fn(async () => undefined)
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: {
        addListener: vi.fn()
      }
    },
    sidePanel: {
      open: vi.fn(async () => undefined)
    }
  };

  currentWindowRuntime.chrome = runtime;
  delete currentWindowRuntime.browser;
});

it('registers side panel shell listeners and handles action/context-menu opens', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;

  registerRuntime();

  expect(chrome.action?.onClicked?.addListener).toHaveBeenCalledTimes(1);
  expect(chrome.contextMenus?.onClicked?.addListener).toHaveBeenCalledTimes(1);

  const actionHandler = chrome.action?.onClicked?.addListener.mock.calls[0]?.[0] as
    | ((tab: { id?: number; windowId?: number }) => Promise<void>)
    | undefined;
  expect(actionHandler).toBeTypeOf('function');

  await actionHandler?.({ id: 77, windowId: 9 });
  expect(chrome.sidePanel?.open).toHaveBeenCalledWith({ tabId: 77 });

  const contextMenuHandler = chrome.contextMenus?.onClicked?.addListener.mock.calls[0]?.[0] as
    | ((info: { menuItemId?: string }, tab?: { id?: number }) => Promise<void>)
    | undefined;
  expect(contextMenuHandler).toBeTypeOf('function');

  await contextMenuHandler?.({ menuItemId: 'stealth-lightbeacon-open-side-panel' }, { id: 77 });
  expect(chrome.sidePanel?.open).toHaveBeenCalledWith({ tabId: 77 });
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

it('continues scan when content script reinjection is blocked by permissions but extraction messaging succeeds', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalExecuteScript = chrome.scripting?.executeScript;
  const originalSendMessage = chrome.tabs?.sendMessage;

  if (chrome.scripting) {
    chrome.scripting.executeScript = vi.fn(async () => {
      throw new Error('Cannot access contents of the page. Extension manifest must request permission to access this host.');
    });
  }
  if (chrome.tabs) {
    chrome.tabs.sendMessage = vi.fn(async () => ({ ok: true, payload: extractedContext }));
  }

  try {
    const reply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'permission-blocked-reinject',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }

    expect(reply.payload.snapshot.origin).toBe('https://example.com');
  } finally {
    if (chrome.scripting) {
      chrome.scripting.executeScript = originalExecuteScript!;
    }
    if (chrome.tabs) {
      chrome.tabs.sendMessage = originalSendMessage!;
    }
  }
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

  expect(issuesReply.payload.count).toBe(1);
  expect(issuesReply.payload.issues).toHaveLength(1);
  expect(issuesReply.payload.issues[0]?.domain).toBe('seo');

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

  const highlightReply = await handleMessage({
    type: 'issue:highlight',
    tabId: 77,
    selector: 'button.icon-only'
  } as never);
  expect(highlightReply.ok).toBe(true);
  expect((currentWindowRuntime.chrome as ChromeLikeRuntime).tabs?.sendMessage).toHaveBeenCalledWith(77, {
    type: 'issue:highlight',
    selector: 'button.icon-only'
  });

  const clearHighlightReply = await handleMessage({
    type: 'issue:clear-highlight',
    tabId: 77
  } as never);
  expect(clearHighlightReply.ok).toBe(true);
  expect((currentWindowRuntime.chrome as ChromeLikeRuntime).tabs?.sendMessage).toHaveBeenCalledWith(77, {
    type: 'issue:clear-highlight'
  });

  const unknownReply = await handleMessage({ type: 'unexpected:message' } as never);
  expect(unknownReply.ok).toBe(false);
  if (unknownReply.ok) {
    throw new Error('Expected unknown message failure');
  }

  expect(unknownReply.error).toContain('Unknown message type');
});

it('returns an informational unsupported snapshot when scan context is unavailable', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalQuery = chrome.tabs?.query;

  if (chrome.tabs) {
    chrome.tabs.query = vi.fn(async () => []);
  }

  try {
    const reply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'missing-context',
        url: 'https://example.com/page',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }
    expect(reply.payload.snapshot.issues[0]?.ruleId.startsWith('unsupported-page-')).toBe(true);
    expect(reply.payload.snapshot.issues[0]?.domain).toBe('ux');
    expect(reply.payload.crawlNodes).toEqual([]);
    expect(reply.payload.recommendation).toBeUndefined();
    expect(reply.payload.diff.newIssues.length).toBe(1);
    expect(reply.payload.diff.resolvedIssues).toEqual([]);
  } finally {
    if (chrome.tabs) {
      chrome.tabs.query = originalQuery!;
    }
  }
});

it('runs axe deep checks when enabled even if request.tabId is omitted', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalSendMessage = chrome.tabs?.sendMessage;

  if (!chrome.tabs) {
    throw new Error('Expected tabs runtime for this test');
  }

  chrome.tabs.sendMessage = vi.fn(async (tabId: number, message: { type: string }) => {
    if (message.type === 'content:extract') {
      return { ok: true, payload: extractedContext };
    }

    if (message.type === 'content:axe-scan') {
      return {
        ok: true,
        payload: {
          violations: [
            {
              id: 'color-contrast',
              impact: 'serious',
              help: 'Elements must have sufficient color contrast',
              description: 'contrast issue',
              helpUrl: 'https://dequeuniversity.com/',
              nodes: [
                {
                  target: ['button.icon-only'],
                  html: '<button class="icon-only">Save</button>',
                  failureSummary: 'Fix contrast'
                }
              ]
            }
          ]
        }
      };
    }

    return { ok: true, payload: extractedContext };
  });

  try {
    const reply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'axe-without-tab-id',
        url: 'https://example.com/page',
        engine: 'dom-lite',
        accessibilityProfile: {
          wcagLevel: 'AA',
          includeBestPractices: true,
          includeAxeChecks: true
        }
      }
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }

    expect(reply.payload.snapshot.issues.some((issue) => issue.source === 'axe')).toBe(true);
    expect(chrome.scripting?.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 77 },
        files: ['axe.min.js']
      })
    );
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(77, { type: 'content:axe-scan' });
  } finally {
    chrome.tabs.sendMessage = originalSendMessage!;
  }
});

it('falls back to extracted page-context URL when request URL is blank', async () => {
  const reply = (await handleMessage({
    type: 'scan:start',
    request: {
      requestId: 'blank-request-url',
      url: '',
      engine: 'dom-lite'
    },
    pageContext: extractedContext
  } as const)) as ScanStartReply;

  expect(reply.ok).toBe(true);
  if (!reply.ok) {
    throw new Error(reply.error);
  }

  expect(reply.payload.snapshot.url).toBe(extractedContext.requestUrl);
  expect(reply.payload.snapshot.origin).toBe('https://example.com');
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
  expect(reply.payload.recommendation).toBeDefined();
  expect(reply.payload.recommendation?.engine).toBe('mcp');
  expect(reply.payload.recommendation?.confidence).toBeGreaterThanOrEqual(0);
});

it('classifies browser-internal unsupported targets and carries guidance into reports', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalQuery = chrome.tabs?.query;
  const originalSendMessage = chrome.tabs?.sendMessage;

  if (chrome.tabs) {
    chrome.tabs.query = vi.fn(async () => [{ id: 77, url: 'chrome://settings/' }]);
    chrome.tabs.sendMessage = vi.fn(async () => undefined);
  }

  try {
    const scanReply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'unsupported-browser-internal',
        url: '',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(scanReply.ok).toBe(true);
    if (!scanReply.ok) {
      throw new Error(scanReply.error);
    }

    const issue = scanReply.payload.snapshot.issues[0];
    expect(issue?.ruleId).toBe('unsupported-page-browser-internal');
    expect(issue?.evidence).toContain('Open a standard https:// page and run scan again.');

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
    expect(reportReply.payload.report).toContain('Open a standard https:// page and run scan again.');
  } finally {
    if (chrome.tabs) {
      chrome.tabs.query = originalQuery!;
      chrome.tabs.sendMessage = originalSendMessage!;
    }
  }
});

it('uses explicit tabId lookup when classifying unsupported targets', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalQuery = chrome.tabs?.query;
  const originalGet = chrome.tabs?.get;
  const originalSendMessage = chrome.tabs?.sendMessage;

  if (chrome.tabs) {
    chrome.tabs.query = vi.fn(async () => [{ id: 77, url: 'https://example.com/' }]);
    chrome.tabs.get = vi.fn(async (tabId: number) => (tabId === 99 ? { id: 99, url: 'chrome://settings/' } : undefined));
    chrome.tabs.sendMessage = vi.fn(async () => undefined);
  }

  try {
    const reply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'unsupported-explicit-tab',
        tabId: 99,
        url: '',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }
    expect(reply.payload.snapshot.issues[0]?.ruleId).toBe('unsupported-page-browser-internal');
  } finally {
    if (chrome.tabs) {
      chrome.tabs.query = originalQuery!;
      chrome.tabs.get = originalGet;
      chrome.tabs.sendMessage = originalSendMessage!;
    }
  }
});

it('classifies extension pages as unsupported extension targets', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalQuery = chrome.tabs?.query;
  const originalSendMessage = chrome.tabs?.sendMessage;

  if (chrome.tabs) {
    chrome.tabs.query = vi.fn(async () => [{ id: 77, url: 'chrome-extension://abc123/side-panel.html' }]);
    chrome.tabs.sendMessage = vi.fn(async () => undefined);
  }

  try {
    const reply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'unsupported-extension-page',
        url: '',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }

    expect(reply.payload.snapshot.issues[0]?.ruleId).toBe('unsupported-page-extension-page');
    expect(reply.payload.snapshot.issues[0]?.evidence).toContain('Switch to a public site tab');
  } finally {
    if (chrome.tabs) {
      chrome.tabs.query = originalQuery!;
      chrome.tabs.sendMessage = originalSendMessage!;
    }
  }
});

it('classifies file URLs as permission-scoped unsupported targets', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalQuery = chrome.tabs?.query;
  const originalSendMessage = chrome.tabs?.sendMessage;

  if (chrome.tabs) {
    chrome.tabs.query = vi.fn(async () => [{ id: 77, url: 'file:///tmp/example.html' }]);
    chrome.tabs.sendMessage = vi.fn(async () => undefined);
  }

  try {
    const reply = (await handleMessage({
      type: 'scan:start',
      request: {
        requestId: 'unsupported-file-url',
        url: '',
        engine: 'dom-lite'
      }
    } as const)) as ScanStartReply;

    expect(reply.ok).toBe(true);
    if (!reply.ok) {
      throw new Error(reply.error);
    }

    expect(reply.payload.snapshot.issues[0]?.ruleId).toBe('unsupported-page-permission-scoped');
    expect(reply.payload.snapshot.issues[0]?.evidence).toContain('Enable file URL access');
  } finally {
    if (chrome.tabs) {
      chrome.tabs.query = originalQuery!;
      chrome.tabs.sendMessage = originalSendMessage!;
    }
  }
});

it('loads axe runtime once per tab and reuses it on repeated scans', async () => {
  const chrome = currentWindowRuntime.chrome as ChromeLikeRuntime;
  const originalSendMessage = chrome.tabs?.sendMessage;

  if (!chrome.tabs) {
    throw new Error('Expected tabs runtime for this test');
  }

  chrome.tabs.sendMessage = vi.fn(async (_tabId: number, message: { type: string }) => {
    if (message.type === 'content:extract') {
      return { ok: true, payload: extractedContext };
    }

    if (message.type === 'content:axe-scan') {
      return {
        ok: true,
        payload: {
          violations: []
        }
      };
    }

    return { ok: true, payload: extractedContext };
  });

  try {
    const request = {
      requestId: 'axe-cache-reuse',
      tabId: 707,
      url: 'https://example.com/page',
      engine: 'dom-lite',
      accessibilityProfile: {
        wcagLevel: 'AA',
        includeBestPractices: true,
        includeAxeChecks: true
      }
    } as const;

    const firstReply = (await handleMessage({ type: 'scan:start', request } as const)) as ScanStartReply;
    const secondReply = (await handleMessage({
      type: 'scan:start',
      request: { ...request, requestId: 'axe-cache-reuse-2' }
    } as const)) as ScanStartReply;

    expect(firstReply.ok).toBe(true);
    expect(secondReply.ok).toBe(true);
    const axeScriptLoads =
      chrome.scripting?.executeScript.mock.calls.filter(
        ([arg]) =>
          Array.isArray((arg as { files?: string[] }).files) &&
          (arg as { files: string[] }).files.includes('axe.min.js')
      ) ?? [];
    expect(axeScriptLoads).toHaveLength(1);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(707, { type: 'content:axe-scan' });
  } finally {
    chrome.tabs.sendMessage = originalSendMessage!;
  }
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
    expect(currentWindowRuntime.browser?.runtime?.onMessage).toBeUndefined();
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
