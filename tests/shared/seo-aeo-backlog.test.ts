import { describe, expect, it } from 'vitest';
import { loadEmbeddedKnowledgeBase } from '../../src/shared/knowledge-base/catalog';
import { loadEmbeddedCatalog, filterEnabledRuleIds } from '../../src/shared/rulesets/catalog';
import { domRules } from '../../src/shared/rules/dom';
import { runRules } from '../../src/shared/rule-engine';
import type { RuleContext } from '../../src/shared/rule-engine';

describe('seo and aeo backlog coverage', () => {
  it('flags seo canonical mismatches as a dedicated seo issue', () => {
    const context: RuleContext = {
      requestUrl: 'https://example.com/articles/seo-checks',
      title: 'SEO checklist for launch',
      metaDescription: 'Launch checklist for SEO',
      lang: 'en',
      canonical: 'https://other.example.com/articles/seo-checks',
      headings: { h1: 1, h2: 1, h3: 0 },
      images: [],
      links: [],
      buttons: [],
      formInputs: []
    };

    const result = runRules(domRules, context);
    expect(result.issues.some((issue) => issue.ruleId === 'seo-canonical-consistency')).toBe(true);
  });

  it('flags aeo question pages without an answer summary', () => {
    const context: RuleContext = {
      requestUrl: 'https://example.com/help/how-to-audit',
      title: 'How do I audit a page quickly?',
      metaDescription: '',
      lang: 'en',
      canonical: 'https://example.com/help/how-to-audit',
      headings: { h1: 1, h2: 1, h3: 0 },
      images: [],
      links: [],
      buttons: [],
      formInputs: []
    };

    const result = runRules(domRules, context);
    expect(result.issues.some((issue) => issue.ruleId === 'aeo-answer-summary')).toBe(true);
  });

  it('maps seo and aeo backlog guidance into the bundled catalogs', () => {
    const rules = loadEmbeddedCatalog();
    expect(Array.from(filterEnabledRuleIds(rules))).toEqual(
      expect.arrayContaining(['seo-title-missing', 'seo-missing-meta-description', 'aeo-canonical-link'])
    );
    expect(Array.from(filterEnabledRuleIds(rules))).toContain('seo-canonical-consistency');
    expect(Array.from(filterEnabledRuleIds(rules))).toContain('aeo-answer-summary');

    const knowledgeBase = loadEmbeddedKnowledgeBase();
    const seoCategory = knowledgeBase.categories.find((category) => category.category === 'seo');
    const aeoCategory = knowledgeBase.categories.find((category) => category.category === 'aeo');

    expect(seoCategory?.entries.some((entry) => entry.summary.toLowerCase().includes('canonical consistency'))).toBe(true);
    expect(aeoCategory?.entries.some((entry) => entry.summary.toLowerCase().includes('direct answer'))).toBe(true);
  });
});
