import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { handleMessage } from '../../src/background/service-worker';
import type { ScanStartReply } from '../../src/shared/message-contracts';

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

let originalChrome: ChromeLikeRuntime | undefined;
let originalBrowser: ChromeLikeRuntime | undefined;

type WindowLike = ChromeLikeRuntime & { chrome?: ChromeLikeRuntime; browser?: ChromeLikeRuntime };

beforeEach(() => {
  const windowRuntime = globalThis as unknown as WindowLike;
  originalChrome = windowRuntime.chrome;
  originalBrowser = windowRuntime.browser;

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
    }
  };

  windowRuntime.chrome = runtime;
  delete windowRuntime.browser;
});

afterEach(() => {
  const windowRuntime = globalThis as unknown as WindowLike;
  if (originalChrome) {
    windowRuntime.chrome = originalChrome;
  } else {
    delete windowRuntime.chrome;
  }

  if (originalBrowser) {
    windowRuntime.browser = originalBrowser;
  } else {
    delete windowRuntime.browser;
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
});
