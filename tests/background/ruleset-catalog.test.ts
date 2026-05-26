import { describe, expect, it } from 'vitest';
import { loadEmbeddedCatalog } from '../../src/shared/rulesets/catalog';
import { MemoryRulesetCatalogStorage, RulesetCatalogManager } from '../../src/background/ruleset-catalog';
import type { AddonRulesCatalog } from '../../src/shared/rulesets/catalog';

describe('ruleset catalog manager', () => {
  it('loads embedded catalog when storage is empty', async () => {
    const catalogManager = new RulesetCatalogManager(new MemoryRulesetCatalogStorage());
    const catalog = await catalogManager.getCatalog();

    expect(catalog.version).toBe(loadEmbeddedCatalog().version);
    expect(catalog.categories.length).toBeGreaterThan(0);
    expect(catalog.categories[0].enabled).toBeDefined();
  });

  it('updates catalog categories through replacement', async () => {
    const catalogManager = new RulesetCatalogManager(new MemoryRulesetCatalogStorage());
    const baseline = await catalogManager.getCatalog();
    const replacement: AddonRulesCatalog = {
      ...baseline,
      version: '1.2.0',
      categories: [
        ...baseline.categories,
        { category: 'geo', enabled: true, rules: [{ id: 'geo-test', title: 'Geo test', severity: 'low', enabled: true }] }
      ]
    };

    await catalogManager.replaceCatalog(replacement);
    const refreshed = await catalogManager.getCatalog();

    expect(refreshed.version).toBe('1.2.0');
    expect(refreshed.categories.some((category) => category.category === 'geo')).toBe(true);
  });
});
