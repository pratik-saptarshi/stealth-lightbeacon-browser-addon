import { describe, expect, it } from 'vitest';
import {
  filterEnabledRuleIds,
  normalizeRuleSetIds,
  type AddonRulesCatalog
} from '../../src/shared/rulesets/catalog';

describe('shared ruleset catalog helpers', () => {
  it('normalizes rule titles, severities, and enabled flags', () => {
    const catalog: AddonRulesCatalog = {
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      categories: [
        {
          category: 'seo',
          rules: [
            {
              id: 'seo-title',
              title: '  SEO title  ',
              severity: 'urgent' as never
            },
            {
              id: 'seo-description',
              title: '   ',
              severity: 'high',
              enabled: false
            }
          ]
        }
      ]
    };

    const normalized = normalizeRuleSetIds(catalog);

    expect(normalized.categories[0].rules[0]).toEqual({
      id: 'seo-title',
      title: 'SEO title',
      severity: 'low',
      enabled: true
    });
    expect(normalized.categories[0].rules[1]).toEqual({
      id: 'seo-description',
      title: 'seo-description',
      severity: 'high',
      enabled: false
    });
  });

  it('filters enabled rule ids across all categories and selected categories', () => {
    const catalog: AddonRulesCatalog = {
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      categories: [
        {
          category: 'seo',
          rules: [
            { id: 'seo-a', title: 'A', severity: 'critical' },
            { id: 'seo-b', title: 'B', severity: 'low', enabled: false }
          ]
        },
        {
          category: 'accessibility',
          rules: [{ id: 'a11y-a', title: 'C', severity: 'medium' }]
        }
      ]
    };

    expect(Array.from(filterEnabledRuleIds(catalog))).toEqual(['seo-a', 'a11y-a']);
    expect(Array.from(filterEnabledRuleIds(catalog, ['seo']))).toEqual(['seo-a']);
  });
});
