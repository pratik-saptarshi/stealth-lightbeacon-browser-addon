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

const runtimeHost = (typeof globalThis === 'undefined' ? {} : (globalThis as BrowserLike)) as BrowserLike;

function bindRuntimeListener(): void {
  const runtime = runtimeHost.chrome?.runtime ?? runtimeHost.browser?.runtime;

  if (!runtime?.onMessage?.addListener) {
    return;
  }

  runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isContentExtractMessage(message)) {
      return;
    }

    const payload = buildPageContext(document, document.location.href);
    sendResponse({ ok: true, payload } as ContentMessageResponse);
    return true;
  });
}

bindRuntimeListener();
