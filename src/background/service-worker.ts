import type { ClientMessage, MessageResponseByType } from '../shared/message-contracts';
import { createFailure, isScanStartMessage } from '../shared/message-contracts';
import { ScanOrchestrator } from './orchestrator';
import { createBackendAdapter } from './backend-bridge';
import { assertBackendEndpointAllowed, isLoopbackHost, sanitizeBackendHostPolicy } from './host-policy';
import { MemoryHistoryStorage, ScanHistoryManager } from './scan-history';
import { createChromeHistoryStorage, type ChromeLike, type ChromeLikeStorageArea } from './storage';
import { createRulesetCatalogStorage, MemoryRulesetCatalogStorage, RulesetCatalogManager } from './ruleset-catalog';
import { createKnowledgeBaseStorage, KnowledgeBaseManager, MemoryKnowledgeBaseStorage } from './knowledge-base';
import { buildReport } from '../ui/export';
import { withEventLoopTrace } from '../shared/performance-trace';
import { applyToolbarState } from './toolbar-state';
import type { RuleContext } from '../shared/rule-engine';
import type { ScanRequest } from '../shared/types';

type RuntimeContext = {
  chrome?: {
    storage?: {
      local: unknown;
    };
    runtime?: {
      onMessage?: {
        addListener: (callback: (...args: any[]) => void) => void;
      };
    };
    tabs?: {
      query?: (query: Record<string, unknown>) => Promise<ActiveTabLookup[]>;
      sendMessage?: (tabId: number, message: unknown) => Promise<unknown>;
    };
    scripting?: {
      executeScript?: (details: {
        target: {
          tabId: number;
        };
        files: string[];
      }) => Promise<unknown>;
    };
    action?: {
      onClicked?: {
        addListener: (callback: (tab: { id?: number; windowId?: number }) => void | Promise<void>) => void;
      };
      setIcon?: (params: { path: Record<string, string>; tabId?: number }) => Promise<void> | void;
      setBadgeText?: (params: { text: string; tabId?: number }) => Promise<void> | void;
      setBadgeBackgroundColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      setBadgeTextColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      browserAction?: {
        setIcon?: (params: { path: Record<string, string>; tabId?: number }) => Promise<void> | void;
        setBadgeText?: (params: { text: string; tabId?: number }) => Promise<void> | void;
        setBadgeBackgroundColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
        setBadgeTextColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      };
    };
    sidePanel?: {
      open?: (details: { tabId?: number; windowId?: number }) => Promise<void> | void;
    };
    contextMenus?: {
      create?: (details: { id: string; title: string; contexts: string[] }) => void;
      onClicked?: {
        addListener: (callback: (info: { menuItemId?: string }, tab?: { id?: number; windowId?: number }) => void | Promise<void>) => void;
      };
    };
    browserAction?: {
      setIcon?: (params: { path: Record<string, string>; tabId?: number }) => Promise<void> | void;
      setBadgeText?: (params: { text: string; tabId?: number }) => Promise<void> | void;
      setBadgeBackgroundColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      setBadgeTextColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
    };
  };
  browser?: {
    storage?: {
      local: unknown;
    };
    runtime?: {
      onMessage?: {
        addListener: (callback: (...args: any[]) => void) => void;
      };
    };
    tabs?: {
      query?: (query: Record<string, unknown>) => Promise<ActiveTabLookup[]>;
      sendMessage?: (tabId: number, message: unknown) => Promise<unknown>;
    };
    scripting?: {
      executeScript?: (details: {
        target: {
          tabId: number;
        };
        files: string[];
      }) => Promise<unknown>;
    };
    action?: {
      onClicked?: {
        addListener: (callback: (tab: { id?: number; windowId?: number }) => void | Promise<void>) => void;
      };
      setIcon?: (params: { path: Record<string, string>; tabId?: number }) => Promise<void> | void;
      setBadgeText?: (params: { text: string; tabId?: number }) => Promise<void> | void;
      setBadgeBackgroundColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      setBadgeTextColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      browserAction?: {
        setIcon?: (params: { path: Record<string, string>; tabId?: number }) => Promise<void> | void;
        setBadgeText?: (params: { text: string; tabId?: number }) => Promise<void> | void;
        setBadgeBackgroundColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
        setBadgeTextColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      };
    };
    sidePanel?: {
      open?: (details: { tabId?: number; windowId?: number }) => Promise<void> | void;
    };
    contextMenus?: {
      create?: (details: { id: string; title: string; contexts: string[] }) => void;
      onClicked?: {
        addListener: (callback: (info: { menuItemId?: string }, tab?: { id?: number; windowId?: number }) => void | Promise<void>) => void;
      };
    };
    browserAction?: {
      setIcon?: (params: { path: Record<string, string>; tabId?: number }) => Promise<void> | void;
      setBadgeText?: (params: { text: string; tabId?: number }) => Promise<void> | void;
      setBadgeBackgroundColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
      setBadgeTextColor?: (params: { color: string; tabId?: number }) => Promise<void> | void;
    };
  };
  runtime?: {
    onMessage?: {
      addListener: (callback: (...args: any[]) => void) => void;
    };
  };
  fetch?: typeof fetch;
  __STEALTH_LIGHTBEACON_STDIN_EXECUTOR__?: unknown;
};

type ActiveTabLookup = {
  id?: number;
};

type RuntimeMessageResponse = {
  ok: boolean;
  payload?: RuleContext;
  error?: string;
};

const globalRuntime = (typeof globalThis === 'undefined' ? {} : (globalThis as unknown as RuntimeContext)) as RuntimeContext;
const SIDE_PANEL_CONTEXT_MENU_ID = 'stealth-lightbeacon-open-side-panel';
const chromeStorage = createChromeHistoryStorage(resolveHistoryStorage(globalRuntime));
const storage = chromeStorage ?? new MemoryHistoryStorage();
const historyManager = new ScanHistoryManager(storage);
const rulesetStorage = createRulesetCatalogStorage(resolveHistoryStorage(globalRuntime)?.storage?.local);
const rulesetManager = new RulesetCatalogManager(rulesetStorage ?? new MemoryRulesetCatalogStorage());
const knowledgeBaseStorage = createKnowledgeBaseStorage(resolveHistoryStorage(globalRuntime)?.storage?.local);
const knowledgeBaseManager = new KnowledgeBaseManager(knowledgeBaseStorage ?? new MemoryKnowledgeBaseStorage());

export async function handleMessage(message: ClientMessage): Promise<MessageResponseByType[keyof MessageResponseByType]> {
  try {
    if (isScanStartMessage(message)) {
      return await withEventLoopTrace('service-worker.scan:start', async () => {
        const pageContext = message.pageContext ?? await resolvePageContextFromActiveTab(message.request.tabId);
        if (!pageContext) {
          return {
            ok: false,
            error: createFailure('Page context is missing; provide pageContext or request.tabId with active-tab permissions')
          };
        }

        const sanitizedBackendRequest = message.request.backend
          ? {
              ...message.request.backend,
              allowedHosts: sanitizeBackendHostPolicy(message.request.backend)
            }
          : undefined;

        const pageHost = new URL(pageContext.requestUrl).hostname;
        const loopbackBackendAllowList = sanitizedBackendRequest?.allowedHosts?.some(isLoopbackHost) ?? false;
        const backendRequest = applyBackendHostPolicy(
          sanitizedBackendRequest,
          pageContext.requestUrl,
          isLoopbackHost(pageHost) || loopbackBackendAllowList
        );
        const backendClient = createBackendAdapter(
          backendRequest,
          message.request.backend?.engine,
          message.request.backend?.mode === 'stdin' ? resolveBackendStdioExecutor(globalRuntime) : undefined
        );

        const orchestrator = new ScanOrchestrator({
          backendClient,
          fetcher: globalRuntime.fetch,
          securityHeaderFetcher: globalRuntime.fetch
        });

        const previous = message.persistHistory ? await historyManager.getLatest(new URL(pageContext.requestUrl).origin) : undefined;
        const catalog = await rulesetManager.getCatalog();
        const requestUrl = resolveScanRequestUrl(message.request.url, pageContext.requestUrl);
        const result = await orchestrator.runScan(
          {
            ...message.request,
            url: requestUrl,
            backend: backendRequest
          },
          pageContext,
          previous,
          catalog
        );

        const tabId = message.request.tabId ?? (await resolveActiveTabId(globalRuntime));
        await applyToolbarState(globalRuntime, tabId, result.snapshot);

        if (message.persistHistory) {
          await historyManager.saveSnapshot(result.snapshot);
        }

        return {
          ok: true,
          payload: {
            snapshot: result.snapshot,
            diff: result.diff,
            crawlNodes: result.crawlNodes,
            recommendation: result.recommendation
          }
        };
      });
    }

    if (message.type === 'issues:list') {
      const issues = message.snapshot.issues.filter((issue) => {
        if (message.filter?.domain && issue.domain !== message.filter.domain) {
          return false;
        }

        if (message.filter?.severity && issue.severity !== message.filter.severity) {
          return false;
        }

        if (message.filter?.source && issue.source !== message.filter.source) {
          return false;
        }

        return true;
      });

      return { ok: true, payload: { issues, count: issues.length } };
    }

    if (message.type === 'report:build') {
      return await withEventLoopTrace('service-worker.report:build', async () => ({
        ok: true,
        payload: {
          report: buildReport(
            {
              generatedAt: new Date().toISOString(),
              snapshot: message.snapshot,
              diff: message.diff
            },
            message.format
          ),
          format: message.format
        }
      }));
    }

    if (message.type === 'history:list') {
      const snapshots = await historyManager.listSnapshots(message.origin, message.limit);
      return { ok: true, payload: { snapshots } };
    }

    if (message.type === 'history:latest') {
      const snapshot = await historyManager.getLatest(message.origin);
      return { ok: true, payload: { snapshot } };
    }

    if (message.type === 'history:compare') {
      const compare = await historyManager.compareLatest(message.origin);
      return { ok: true, payload: compare };
    }

    if (message.type === 'issue:highlight') {
      const tabId = message.tabId ?? (await resolveActiveTabId(globalRuntime));
      if (typeof tabId !== 'number') {
        return { ok: false, error: createFailure('No tab available for highlight action') };
      }

      const tabsApi = globalRuntime.chrome?.tabs ?? globalRuntime.browser?.tabs;
      await tabsApi?.sendMessage?.(tabId, {
        type: 'issue:highlight',
        selector: message.selector
      });
      return { ok: true, payload: { tabId } };
    }

    if (message.type === 'issue:clear-highlight') {
      const tabId = message.tabId ?? (await resolveActiveTabId(globalRuntime));
      if (typeof tabId !== 'number') {
        return { ok: false, error: createFailure('No tab available for clear highlight action') };
      }

      const tabsApi = globalRuntime.chrome?.tabs ?? globalRuntime.browser?.tabs;
      await tabsApi?.sendMessage?.(tabId, {
        type: 'issue:clear-highlight'
      });
      return { ok: true, payload: { tabId } };
    }

    if (message.type === 'ruleset:get') {
      const catalog = await rulesetManager.getCatalog();
      return { ok: true, payload: { catalog } };
    }

    if (message.type === 'ruleset:update') {
      await rulesetManager.replaceCatalog(message.catalog);
      const catalog = await rulesetManager.getCatalog();
      return { ok: true, payload: { catalog } };
    }

    if (message.type === 'knowledge-base:get') {
      const catalog = await knowledgeBaseManager.getKnowledgeBase();
      return { ok: true, payload: { catalog } };
    }

    if (message.type === 'knowledge-base:update') {
      await knowledgeBaseManager.replaceKnowledgeBase(message.catalog);
      const catalog = await knowledgeBaseManager.getKnowledgeBase();
      return { ok: true, payload: { catalog } };
    }

    return { ok: false, error: createFailure('Unknown message type') };
  } catch (error) {
    return {
      ok: false,
      error: createFailure(error)
    };
  }
}

export function startRuntimeListeners(): void {
  const runtime = globalRuntime.chrome?.runtime ?? globalRuntime.browser?.runtime ?? globalRuntime.runtime;

  if (!runtime?.onMessage?.addListener) {
    return;
  }

  runtime.onMessage.addListener((message: ClientMessage, _sender, sendResponse) => {
    if (!isKnownMessageType(message?.type)) {
      return false;
    }

    void handleMessage(message)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ ok: false, error: createFailure(error) }));

    return true;
  });
}

function registerShellEntrypoints(context: RuntimeContext): void {
  const host = context.chrome ?? context.browser;
  if (!host) {
    return;
  }

  host.action?.onClicked?.addListener(async (tab) => {
    const tabId = tab.id;
    if (typeof tabId === 'number') {
      await host.sidePanel?.open?.({ tabId });
      return;
    }

    if (typeof tab.windowId === 'number') {
      await host.sidePanel?.open?.({ windowId: tab.windowId });
    }
  });

  host.contextMenus?.create?.({
    id: SIDE_PANEL_CONTEXT_MENU_ID,
    title: 'Open Stealth Lightbeacon',
    contexts: ['page']
  });

  host.contextMenus?.onClicked?.addListener(async (info, tab) => {
    if (info.menuItemId !== SIDE_PANEL_CONTEXT_MENU_ID) {
      return;
    }

    if (typeof tab?.id === 'number') {
      await host.sidePanel?.open?.({ tabId: tab.id });
    }
  });
}

function isKnownMessageType(type: unknown): type is ClientMessage['type'] {
  return (
    type === 'scan:start' ||
    type === 'history:list' ||
    type === 'history:latest' ||
    type === 'history:compare' ||
    type === 'issue:highlight' ||
    type === 'issue:clear-highlight' ||
    type === 'ruleset:get' ||
    type === 'ruleset:update' ||
    type === 'knowledge-base:get' ||
    type === 'knowledge-base:update' ||
    type === 'issues:list' ||
    type === 'report:build'
  );
}

function resolveHistoryStorage(context: RuntimeContext): ChromeLike | undefined {
  const chromeStorageArea = context.chrome?.storage?.local;
  if (chromeStorageArea) {
    return { storage: { local: chromeStorageArea as ChromeLikeStorageArea } };
  }

  const browserStorageArea = context.browser?.storage?.local;
  if (browserStorageArea) {
    return { storage: { local: browserStorageArea as ChromeLikeStorageArea } };
  }

  return undefined;
}

async function resolvePageContextFromActiveTab(tabId?: number): Promise<RuleContext | undefined> {
  const runtimeTabs = resolveRuntimeTabs(globalRuntime);
  if (!runtimeTabs) {
    return undefined;
  }

  let activeTabId = tabId;
  if (!activeTabId) {
    const active = await pickActiveTabId(runtimeTabs);
    activeTabId = active?.id;
  }

  if (!activeTabId) {
    return undefined;
  }

  try {
    await ensureContentScriptLoaded(runtimeTabs, activeTabId);
  } catch {
    // Injection can fail on restricted pages or permission-scoped tabs.
    // Continue and try message-based extraction in case the script is already present.
  }

  const response = await requestContentContext(runtimeTabs, activeTabId);
  if (isRuntimeMessageResponse(response)) {
    return response.payload;
  }

  return undefined;
}

async function resolveActiveTabId(context: RuntimeContext): Promise<number | undefined> {
  const runtimeTabs = resolveRuntimeTabs(context);
  if (!runtimeTabs) {
    return undefined;
  }

  const activeTab = await pickActiveTabId(runtimeTabs);
  return activeTab?.id;
}

async function pickActiveTabId(tabs: NonNullable<RuntimeTabs>): Promise<ActiveTabLookup | undefined> {
  if (!tabs.query) {
    return undefined;
  }

  const matches = await tabs.query({ active: true, currentWindow: true });
  return matches?.[0];
}

async function ensureContentScriptLoaded(tabs: NonNullable<RuntimeTabs>, tabId: number): Promise<void> {
  const scripting = globalRuntime.chrome?.scripting ?? globalRuntime.browser?.scripting;
  if (!scripting?.executeScript) {
    return;
  }

  await scripting.executeScript({
    target: {
      tabId
    },
    files: ['content-script.js']
  });
}

async function requestContentContext(
  tabs: NonNullable<RuntimeTabs>,
  tabId: number
): Promise<unknown> {
  if (!tabs.sendMessage) {
    return undefined;
  }

  try {
    return await tabs.sendMessage(tabId, { type: 'content:extract' });
  } catch {
    return undefined;
  }
}

function resolveBackendStdioExecutor(
  context: RuntimeContext
): ((payload: unknown) => Promise<unknown>) | undefined {
  const candidate = context.__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__;
  if (typeof candidate === 'function') {
    return candidate as (payload: unknown) => Promise<unknown>;
  }

  return undefined;
}

type RuntimeTabs = {
  query?: (query: Record<string, unknown>) => Promise<ActiveTabLookup[]>;
  sendMessage?: (tabId: number, message: unknown) => Promise<unknown>;
  scripting?: {
    executeScript?: (details: {
      target: {
        tabId: number;
      };
      files: string[];
    }) => Promise<unknown>;
  };
};

function resolveRuntimeTabs(context: RuntimeContext): RuntimeTabs | undefined {
  const chromeTabs = context.chrome?.tabs;
  if (chromeTabs) {
    return chromeTabs;
  }

  const browserTabs = context.browser?.tabs;
  if (browserTabs) {
    return browserTabs as RuntimeTabs;
  }

  return undefined;
}

function applyBackendHostPolicy(
  backend: ScanRequest['backend'],
  pageUrl: string,
  allowLoopback = false
): ScanRequest['backend'] {
  if (!backend || backend.mode === 'stdin' || !backend.endpoint) {
    return backend;
  }

  const check = assertBackendEndpointAllowed({
    endpoint: backend.endpoint,
    pageUrl,
    allowLoopback,
    allowedHosts: backend.allowedHosts
  });

  if (check.ok) {
    return backend;
  }

  if (backend.required) {
    throw new Error(check.reason ?? 'Backend endpoint blocked by host policy');
  }

  return {
    ...backend,
    enabled: false
  };
}

function resolveScanRequestUrl(requestUrl: string, pageContextUrl: string): string {
  const normalized = requestUrl?.trim();
  if (normalized) {
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch {
      // fall through to page-context URL
    }
  }

  return pageContextUrl;
}

function isRuntimeMessageResponse(input: unknown): input is RuntimeMessageResponse {
  return !!input && typeof input === 'object' && 'ok' in (input as Record<string, unknown>);
}

export function registerRuntime(): void {
  startRuntimeListeners();
  registerShellEntrypoints(globalRuntime);
}

registerRuntime();
