// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractPageContext } from '../../src/content/extractor';
import { runRules } from '../../src/shared/rule-engine';
import { domRules } from '../../src/shared/rules/dom';

const baseContext = {
  requestUrl: 'https://example.com/',
  title: 'T',
  metaDescription: '',
  lang: null,
  canonical: null,
  headings: { h1: 0, h2: 0, h3: 0 },
  images: [],
  links: [],
  buttons: [],
  formInputs: []
};

describe('adversarial validation suite', () => {
  it('drops unsafe link protocols during page extraction', () => {
    document.documentElement.setAttribute('lang', 'en');
    document.head.innerHTML = '<title>Safe links only</title>';
    document.body.innerHTML = `
      <a href="javascript:alert(1)">JS</a>
      <a href="mailto:ops@example.com">Mail</a>
      <a href="data:text/plain,hello">Data</a>
      <a href="/safe">Safe</a>
    `;

    const context = extractPageContext(document, 'https://example.com/base/');

    expect(context.links).toEqual([
      {
        href: 'https://example.com/safe',
        text: 'Safe',
        rel: '',
        target: '',
        isInternal: true
      }
    ]);
  });

  it('rejects malformed rule-context URLs with a clear error', () => {
    expect(() =>
      runRules(domRules, {
        ...baseContext,
        requestUrl: 'not-a-url'
      })
    ).toThrow('rule context.requestUrl must be a valid URL');
  });

  it('documents current coverage gaps and tool comparisons', async () => {
    const { buildValidationCodemapMarkdown, getValidationCoverageAreas } = await import(
      '../../src/shared/validation-codemap'
    );

    const areas = getValidationCoverageAreas();
    expect(areas.map((area) => area.name)).toEqual([
      'GEO',
      'SEO',
      'AEO',
      'Accessibility',
      'Security optimization'
    ]);

    expect(areas.find((area) => area.name === 'GEO')?.status).toBe('catalog-only');
    expect(areas.find((area) => area.name === 'SEO')?.status).toBe('partial');
    expect(areas.find((area) => area.name === 'AEO')?.status).toBe('partial');
    expect(areas.find((area) => area.name === 'Accessibility')?.status).toBe('partial');
    expect(areas.find((area) => area.name === 'Security optimization')?.status).toBe('catalog-only');

    const markdown = buildValidationCodemapMarkdown();
    expect(markdown).toContain('# Validation Codemap');
    expect(markdown).toContain('Compared with famous tools');
    expect(markdown).toContain('Lighthouse');
    expect(markdown).toContain('axe-core');
    expect(markdown).toContain('Screaming Frog');
    expect(markdown).toContain('Sitebulb');
    expect(markdown).toContain('structured data');
    expect(markdown).toContain('indexability');
    expect(markdown).toContain('answer-summary');
    expect(markdown).toContain('contrast');
    expect(markdown).toContain('ARIA');
    expect(markdown).toContain('keyboard');
    expect(markdown).toContain('security headers');
  });
});
