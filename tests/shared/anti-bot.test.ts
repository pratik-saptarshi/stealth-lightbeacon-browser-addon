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

  it('chooses HTTP for dom-lite scans with moderate complexity', () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'r-anti-http',
      engine: 'dom-lite'
    };

    const context: RuleContext = {
      ...baseContext,
      links: Array.from({ length: 13 }, (_, index) => ({
        href: `https://example.com/page-${index}`,
        text: `Link ${index}`,
        rel: '',
        target: '',
        isInternal: true
      }))
    };

    const recommendation = recommendEngine(request, context);

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

  it('escalates crawl-lite to stealth-playwright for dynamic surfaces', () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'r-anti-stealth',
      engine: 'crawl-lite'
    };

    const context: RuleContext = {
      ...baseContext,
      metaDescription: null,
      canonical: null,
      lang: null,
      links: Array.from({ length: 13 }, (_, index) => ({
        href: `https://example.com/cluster-${index}`,
        text: `Cluster ${index}`,
        rel: '',
        target: '',
        isInternal: true
      }))
    };

    const recommendation = recommendEngine(request, context);

    expect(recommendation.engine).toBe('stealth-playwright');
    expect(recommendation.reason).toContain('headless capture');
    expect(recommendation.confidence).toBe(0.5);
  });

  it('escalates crawl-lite to MCP for dense surfaces', () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'r-anti-mcp',
      engine: 'crawl-lite'
    };

    const context: RuleContext = {
      ...baseContext,
      metaDescription: null,
      canonical: null,
      lang: null,
      headings: { h1: 1, h2: 1, h3: 9 },
      images: Array.from({ length: 21 }, (_, index) => ({
        src: `/img-${index}.png`,
        alt: null
      })),
      links: Array.from({ length: 13 }, (_, index) => ({
        href: `https://example.com/deep-${index}`,
        text: `Deep ${index}`,
        rel: '',
        target: '',
        isInternal: true
      }))
    };

    const recommendation = recommendEngine(request, context);

    expect(recommendation.engine).toBe('mcp');
    expect(recommendation.reason).toContain('High-complexity');
    expect(recommendation.confidence).toBe(0.7);
  });

  it('caps dom-lite confidence at 1 for high-signal pages', () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'r-anti-cap',
      engine: 'dom-lite'
    };

    const context: RuleContext = {
      ...baseContext,
      metaDescription: null,
      canonical: null,
      lang: null,
      headings: { h1: 1, h2: 1, h3: 9 },
      images: Array.from({ length: 22 }, (_, index) => ({
        src: `/img-${index}.png`,
        alt: null
      })),
      links: Array.from({ length: 46 }, (_, index) => ({
        href: `https://example.com/cap-${index}`,
        text: `Cap ${index}`,
        rel: '',
        target: '',
        isInternal: true
      }))
    };

    const recommendation = recommendEngine(request, context);

    expect(recommendation.engine).toBe('http');
    expect(recommendation.confidence).toBe(1);
  });
});
