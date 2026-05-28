import { describe, expect, it, vi } from 'vitest';
import { loadEmbeddedCatalog, type AddonRulesCatalog } from '../../src/shared/rulesets/catalog';
import {
  createRulesetCatalogStorage,
  RulesetCatalogManager
} from '../../src/background/ruleset-catalog';

function makeStorage(initialCatalog: AddonRulesCatalog | undefined) {
  let catalog = initialCatalog;
  const load = vi.fn(async () => catalog);
  const save = vi.fn(async (nextCatalog: AddonRulesCatalog) => {
    catalog = nextCatalog;
  });

  return { load, save };
}

describe('ruleset catalog manager', () => {
  it('loads the embedded catalog when storage is empty and caches the result', async () => {
    const storage = makeStorage(undefined);
    const catalogManager = new RulesetCatalogManager(storage);

    const firstCatalog = await catalogManager.getCatalog();
    const secondCatalog = await catalogManager.getCatalog();

    expect(storage.load).toHaveBeenCalledTimes(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(firstCatalog).toBe(secondCatalog);
    expect(firstCatalog.version).toBe(loadEmbeddedCatalog().version);
    expect(firstCatalog.categories.length).toBeGreaterThan(0);
  });

  it('falls back to the embedded catalog when stored data cannot be normalized', async () => {
    const storage = makeStorage({
      version: 'broken',
      generatedAt: '2026-01-01T00:00:00.000Z',
      categories: [
        {
          category: 'seo',
          rules: [{ id: 'broken-rule' } as never]
        }
      ]
    } as never);
    const catalogManager = new RulesetCatalogManager(storage);

    const catalog = await catalogManager.getCatalog();

    expect(storage.load).toHaveBeenCalledTimes(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(catalog.version).toBe(loadEmbeddedCatalog().version);
    expect(catalog.categories.length).toBeGreaterThan(0);
  });

  it('updates a category in place and rejects unknown categories', async () => {
    const baseline = loadEmbeddedCatalog();
    const storage = makeStorage(baseline);
    const catalogManager = new RulesetCatalogManager(storage);

    const loadedCatalog = await catalogManager.getCatalog();
    const targetCategory = loadedCatalog.categories[0];

    await catalogManager.updateCategory(targetCategory.category, {
      category: targetCategory.category,
      enabled: false,
      rules: targetCategory.rules
    });

    const refreshedCatalog = await catalogManager.getCatalog();
    expect(refreshedCatalog.categories[0].enabled).toBe(false);
    expect(storage.save).toHaveBeenCalledTimes(1);

    await expect(
      catalogManager.updateCategory('missing' as never, {
        category: targetCategory.category,
        enabled: true,
        rules: targetCategory.rules
      })
    ).rejects.toThrow('Unknown ruleset category: missing');
  });

  it('returns a storage adapter only when the chrome storage area is complete', () => {
    expect(createRulesetCatalogStorage({ get: vi.fn() as never } as never)).toBeUndefined();
    expect(createRulesetCatalogStorage({ set: vi.fn() as never } as never)).toBeUndefined();

    const storage = createRulesetCatalogStorage({
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => undefined)
    } as never);

    expect(storage).toBeDefined();
  });
});
