import { extractPageContext } from './extractor';

type RuntimeHost = {
  runtime?: {
    sendMessage: (..._args: any[]) => void;
    onMessage?: {
      addListener: (cb: (...args: any[]) => void) => void;
    };
  };
};

type BrowserLike = {
  chrome?: RuntimeHost;
  browser?: RuntimeHost;
};

export interface ContentMessage {
  type: 'content:extract';
}

export interface ContentAxeScanMessage {
  type: 'content:axe-scan';
}

type HighlightMessage = {
  type: 'issue:highlight';
  selector: string;
};

type ClearHighlightMessage = {
  type: 'issue:clear-highlight';
};

type RuntimeInboundMessage = ContentMessage | ContentAxeScanMessage | HighlightMessage | ClearHighlightMessage;

export interface ContentMessageResponse {
  ok: boolean;
  payload?: ReturnType<typeof extractPageContext>;
  error?: string;
}

export interface ContentAxeViolation {
  id: string;
  impact: string | null;
  help: string;
  description: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string | null;
  }>;
}

export interface ContentAxeScanResponse {
  ok: boolean;
  payload?: {
    violations: ContentAxeViolation[];
  };
  error?: string;
}

export function buildPageContext(documentRef: Document, requestUrl: string) {
  return extractPageContext(documentRef, requestUrl);
}

export function isContentExtractMessage(message: unknown): message is ContentMessage {
  return !!message && typeof message === 'object' && (message as Record<string, unknown>).type === 'content:extract';
}

function isContentAxeScanMessage(message: unknown): message is ContentAxeScanMessage {
  return !!message && typeof message === 'object' && (message as Record<string, unknown>).type === 'content:axe-scan';
}

function isIssueHighlightMessage(message: unknown): message is HighlightMessage {
  return (
    !!message &&
    typeof message === 'object' &&
    (message as Record<string, unknown>).type === 'issue:highlight' &&
    typeof (message as Record<string, unknown>).selector === 'string'
  );
}

function isClearHighlightMessage(message: unknown): message is ClearHighlightMessage {
  return !!message && typeof message === 'object' && (message as Record<string, unknown>).type === 'issue:clear-highlight';
}

function clearHighlightedElements(): void {
  document.querySelectorAll('[data-stealth-lightbeacon-highlight="true"]').forEach((node) => {
    if (node instanceof HTMLElement) {
      delete node.dataset.stealthLightbeaconHighlight;
      node.style.outline = '';
      node.style.outlineOffset = '';
    }
  });
}

function applyIssueHighlight(selector: string): void {
  clearHighlightedElements();
  const target = document.querySelector(selector);
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.dataset.stealthLightbeaconHighlight = 'true';
  target.style.outline = '2px solid #e67e22';
  target.style.outlineOffset = '2px';
}

const runtimeHost = (typeof globalThis === 'undefined' ? {} : (globalThis as BrowserLike)) as BrowserLike;

function bindRuntimeListener(): void {
  const runtime = runtimeHost.chrome?.runtime ?? runtimeHost.browser?.runtime;

  if (!runtime?.onMessage?.addListener) {
    return;
  }

  runtime.onMessage.addListener((message: RuntimeInboundMessage | unknown, _sender, sendResponse) => {
    if (!isContentExtractMessage(message) && !isContentAxeScanMessage(message)) {
      if (isIssueHighlightMessage(message)) {
        applyIssueHighlight(message.selector);
        sendResponse({ ok: true } as ContentMessageResponse);
        return true;
      }

      if (isClearHighlightMessage(message)) {
        clearHighlightedElements();
        sendResponse({ ok: true } as ContentMessageResponse);
        return true;
      }

      return;
    }

    if (isContentAxeScanMessage(message)) {
      void runAxeScan()
        .then((payload) => {
          sendResponse({ ok: true, payload } as ContentAxeScanResponse);
        })
        .catch((error) => {
          sendResponse({ ok: false, error: String(error) } as ContentAxeScanResponse);
        });
      return true;
    }

    const payload = buildPageContext(document, document.location.href);
    sendResponse({ ok: true, payload } as ContentMessageResponse);
    return true;
  });
}

async function runAxeScan(): Promise<{ violations: ContentAxeViolation[] }> {
  const host = globalThis as unknown as {
    axe?: {
      run?: () => Promise<{
        violations?: Array<{
          id: string;
          impact?: string | null;
          help?: string;
          description?: string;
          helpUrl?: string;
          nodes?: Array<{
            target?: string[];
            html?: string;
            failureSummary?: string | null;
          }>;
        }>;
      }>;
    };
  };
  if (!host.axe?.run) {
    throw new Error('axe runtime is unavailable in content context');
  }

  const result = await host.axe.run();
  const violations = (result.violations ?? []).map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    help: violation.help ?? violation.id,
    description: violation.description ?? '',
    helpUrl: violation.helpUrl ?? '',
    nodes: (violation.nodes ?? []).map((node) => ({
      target: Array.isArray(node.target) ? node.target : [],
      html: node.html ?? '',
      failureSummary: node.failureSummary ?? null
    }))
  }));

  return { violations };
}

bindRuntimeListener();
