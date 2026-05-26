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

const runtimeHost = (typeof globalThis === 'undefined' ? {} : (globalThis as BrowserLike)) as BrowserLike;

function bindRuntimeListener(): void {
  const runtime = runtimeHost.chrome?.runtime ?? runtimeHost.browser?.runtime;

  if (!runtime?.onMessage?.addListener) {
    return;
  }

  runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    if (message.type !== 'content:extract') {
      return;
    }

    const payload = buildPageContext(document, document.location.href);
    sendResponse({ ok: true, payload } as ContentMessageResponse);
    return true;
  });
}

bindRuntimeListener();
