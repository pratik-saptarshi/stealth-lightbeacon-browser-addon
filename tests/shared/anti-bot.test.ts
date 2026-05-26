import { describe, expect, it } from 'vitest';
import { recommendEngine } from '../../src/shared/anti-bot';
import type { ScanRequest } from '../../src/shared/types';
import type { RuleContext } from '../../src/shared/rule-engine';

describe('anti-bot engine recommendation', () => {
  const baseContext: RuleContext = {
    requestUrl: 'https://example.com/page',
    title: 'Example Page',
    metaDescription: 'desc',
    lang: 'en',
    canonical: 'https://example.com/page',
    headings: { h1: 1, h2: 1, h3: 1 },
    images: [],
    links: [],
    buttons: [],
    formInputs: []
  };

  const baseRequest: ScanRequest = {
    requestId: 'r-anti',
    url: 'https://example.com/page',
    engine: 'dom-lite'
  };

  it('chooses an HTTP fallback for low-complexity dom scan profiles', () => {
    const recommendation = recommendEngine(baseRequest, baseContext);

    expect(recommendation.engine).toBe('mcp');
    expect(recommendation.confidence).toBe(0);
  });

  it('escalates to fast-obscura for crawl-lite complexity', () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'r-anti-2',
      engine: 'crawl-lite'
    };

    const context: RuleContext = {
      ...baseContext,
      links: Array.from({ length: 13 }).map((_, index) => ({
        href: `https://example.com/page-${index}`,
        text: 'l',
        rel: '',
        target: '',
        isInternal: true
      })),
      images: []
    } as RuleContext;

    const recommendation = recommendEngine(request, context);

    expect(recommendation.engine).toBe('fast-obscura');
    expect(recommendation.confidence).toBe(0.35);
  });
});
