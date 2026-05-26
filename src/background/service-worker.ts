import type { ClientMessage, MessageResponseByType } from '../shared/message-contracts';
import { createFailure, isScanStartMessage } from '../shared/message-contracts';
import { ScanOrchestrator } from './orchestrator';
import { createBackendClient, createStdioBackendClient } from './backend-bridge';
import { MemoryHistoryStorage, ScanHistoryManager } from './scan-history';
import { createChromeHistoryStorage, type ChromeLike, type ChromeLikeStorageArea } from './storage';
import { createRulesetCatalogStorage, MemoryRulesetCatalogStorage, RulesetCatalogManager } from './ruleset-catalog';
import { buildReport } from '../ui/export';

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
  };
  runtime?: {
    onMessage?: {
      addListener: (callback: (...args: any[]) => void) => void;
    };
  };
  __STEALTH_LIGHTBEACON_STDIN_EXECUTOR__?: unknown;
};

const globalRuntime = (typeof globalThis === 'undefined' ? {} : (globalThis as unknown as RuntimeContext)) as RuntimeContext;
const chromeStorage = createChromeHistoryStorage(resolveHistoryStorage(globalRuntime));
const storage = chromeStorage ?? new MemoryHistoryStorage();
const historyManager = new ScanHistoryManager(storage);
const rulesetStorage = createRulesetCatalogStorage(resolveHistoryStorage(globalRuntime)?.storage?.local);
const rulesetManager = new RulesetCatalogManager(rulesetStorage ?? new MemoryRulesetCatalogStorage());

export async function handleMessage(message: ClientMessage): Promise<MessageResponseByType[keyof MessageResponseByType]> {
  try {
    if (isScanStartMessage(message)) {
      const backendClient =
        message.request.backend?.mode === 'stdin'
          ? createStdioBackendClient(
              message.request.backend,
              resolveBackendStdioExecutor(globalRuntime)
            )
          : createBackendClient(message.request.backend);

      const orchestrator = new ScanOrchestrator({
        backendClient
      });

      const previous = message.persistHistory ? await historyManager.getLatest(new URL(message.pageContext.requestUrl).origin) : undefined;
      const catalog = await rulesetManager.getCatalog();
      const result = await orchestrator.runScan(message.request, message.pageContext, previous, catalog);

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
      return {
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
      };
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

    if (message.type === 'ruleset:get') {
      const catalog = await rulesetManager.getCatalog();
      return { ok: true, payload: { catalog } };
    }

    if (message.type === 'ruleset:update') {
      await rulesetManager.replaceCatalog(message.catalog);
      const catalog = await rulesetManager.getCatalog();
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

function isKnownMessageType(type: unknown): type is ClientMessage['type'] {
  return (
    type === 'scan:start' ||
    type === 'history:list' ||
    type === 'history:latest' ||
    type === 'history:compare' ||
    type === 'ruleset:get' ||
    type === 'ruleset:update' ||
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

function resolveBackendStdioExecutor(
  context: RuntimeContext
): ((payload: unknown) => Promise<unknown>) | undefined {
  const candidate = context.__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__;
  if (typeof candidate === 'function') {
    return candidate as (payload: unknown) => Promise<unknown>;
  }

  return undefined;
}

export function registerRuntime(): void {
  startRuntimeListeners();
}

registerRuntime();
