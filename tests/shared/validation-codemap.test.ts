import { describe, expect, it } from 'vitest';
import {
  buildValidationCodemapMarkdown,
  getValidationCoverageAreas
} from '../../src/shared/validation-codemap';

describe('validation codemap', () => {
  it('covers geo, seo, aeo, accessibility, and security optimization gaps', () => {
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
  });

  it('compares gaps against famous tools in the generated codemap', () => {
    const markdown = buildValidationCodemapMarkdown();

    expect(markdown).toContain('# Validation Codemap');
    expect(markdown).toContain('Compared with famous tools');
    expect(markdown).toContain('Lighthouse');
    expect(markdown).toContain('axe-core');
    expect(markdown).toContain('Screaming Frog');
    expect(markdown).toContain('Sitebulb');
    expect(markdown).toContain('GEO');
    expect(markdown).toContain('SEO');
    expect(markdown).toContain('AEO');
    expect(markdown).toContain('Accessibility');
    expect(markdown).toContain('Security optimization');
  });

  it('highlights the major missing checks for each validation family', () => {
    const markdown = buildValidationCodemapMarkdown();

    expect(markdown).toContain('structured data');
    expect(markdown).toContain('indexability');
    expect(markdown).toContain('answer-summary');
    expect(markdown).toContain('contrast');
    expect(markdown).toContain('ARIA');
    expect(markdown).toContain('keyboard');
    expect(markdown).toContain('heading structure');
    expect(markdown).toContain('link text');
    expect(markdown).toContain('form labels');
    expect(markdown).toContain('security headers');
  });
});
