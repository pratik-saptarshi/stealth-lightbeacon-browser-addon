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

  it('chooses HTTP for a moderately complex dom-lite profile', () => {
    const recommendation = recommendEngine(
      baseRequest,
      {
        ...baseContext,
        links: Array.from({ length: 13 }).map((_, index) => ({
          href: `https://example.com/page-${index}`,
          text: 'l',
          rel: '',
          target: '',
          isInternal: true
        }))
      }
    );

    expect(recommendation.engine).toBe('http');
    expect(recommendation.reason).toContain('HTTP backend path');
    expect(recommendation.confidence).toBe(0.2);
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

  it('escalates to stealth-playwright when crawl-lite pages look dynamic', () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'r-anti-3',
      engine: 'crawl-lite'
    };

    const recommendation = recommendEngine(request, {
      ...baseContext,
      metaDescription: null,
      canonical: null,
      lang: null,
      images: Array.from({ length: 11 }).map((_, index) => ({
        src: `https://example.com/image-${index}.png`,
        alt: null
      }))
    });

    expect(recommendation.engine).toBe('stealth-playwright');
    expect(recommendation.reason).toContain('dynamic rendering');
    expect(recommendation.confidence).toBe(0.5);
  });

  it('escalates to mcp for high-complexity crawl-lite pages', () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'r-anti-4',
      engine: 'crawl-lite'
    };

    const recommendation = recommendEngine(request, {
      ...baseContext,
      metaDescription: null,
      canonical: null,
      lang: null,
      headings: { h1: 1, h2: 1, h3: 9 },
      links: Array.from({ length: 46 }).map((_, index) => ({
        href: `https://example.com/page-${index}`,
        text: 'l',
        rel: '',
        target: '',
        isInternal: true
      })),
      images: Array.from({ length: 21 }).map((_, index) => ({
        src: `https://example.com/image-${index}.png`,
        alt: null
      }))
    });

    expect(recommendation.engine).toBe('mcp');
    expect(recommendation.reason).toContain('High-complexity page surface');
    expect(recommendation.confidence).toBe(0.9);
  });
});
