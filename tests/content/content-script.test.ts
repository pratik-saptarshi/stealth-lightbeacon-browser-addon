// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isContentExtractMessage } from '../../src/content/content-script';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('content script runtime message guard', () => {
  it('accepts only the content extract message shape', () => {
    expect(isContentExtractMessage({ type: 'content:extract' })).toBe(true);
    expect(isContentExtractMessage({ type: 'scan:start' })).toBe(false);
    expect(isContentExtractMessage(null)).toBe(false);
    expect(isContentExtractMessage(undefined)).toBe(false);
    expect(isContentExtractMessage({})).toBe(false);
  });

  it('binds the runtime listener and responds with page context payloads', async () => {
    document.head.innerHTML = `
      <title>Listener title</title>
      <meta name="description" content="Listener summary">
    `;
    document.documentElement.setAttribute('lang', 'en');

    const addListener = vi.fn();
    vi.stubGlobal('browser', {
      runtime: {
        onMessage: {
          addListener
        }
      }
    });

    const module = await import('../../src/content/content-script');

    expect(addListener).toHaveBeenCalledTimes(1);

    const listener = addListener.mock.calls[0][0] as (
      message: unknown,
      sender: unknown,
      sendResponse: (response: unknown) => void
    ) => unknown;
    const sendResponse = vi.fn();

    expect(listener({ type: 'content:extract' }, {}, sendResponse)).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        payload: expect.objectContaining({
          title: 'Listener title',
          lang: 'en',
          metaDescription: 'Listener summary'
        })
      })
    );

    expect(listener({ type: 'scan:start' }, {}, sendResponse)).toBeUndefined();
    expect(module.isContentExtractMessage({ type: 'content:extract' })).toBe(true);
  });
});
