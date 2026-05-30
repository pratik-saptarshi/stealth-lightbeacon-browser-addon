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

type HighlightMessage = {
  type: 'issue:highlight';
  selector: string;
};

type ClearHighlightMessage = {
  type: 'issue:clear-highlight';
};

type RuntimeInboundMessage = ContentMessage | HighlightMessage | ClearHighlightMessage;

export interface ContentMessageResponse {
  ok: boolean;
  payload?: ReturnType<typeof extractPageContext>;
  error?: string;
}

export function buildPageContext(documentRef: Document, requestUrl: string) {
  return extractPageContext(documentRef, requestUrl);
}

export function isContentExtractMessage(message: unknown): message is ContentMessage {
  return !!message && typeof message === 'object' && (message as Record<string, unknown>).type === 'content:extract';
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
    if (!isContentExtractMessage(message)) {
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

    const payload = buildPageContext(document, document.location.href);
    sendResponse({ ok: true, payload } as ContentMessageResponse);
    return true;
  });
}

bindRuntimeListener();
