import { describe, expect, it, vi } from 'vitest';
import { loadEmbeddedKnowledgeBase, type AddonKnowledgeBaseCatalog } from '../../src/shared/knowledge-base/catalog';
import {
  createKnowledgeBaseStorage,
  KnowledgeBaseManager
} from '../../src/background/knowledge-base';

function makeStorage(initialCatalog: AddonKnowledgeBaseCatalog | undefined) {
  let catalog = initialCatalog;
  const load = vi.fn(async () => catalog);
  const save = vi.fn(async (nextCatalog: AddonKnowledgeBaseCatalog) => {
    catalog = nextCatalog;
  });

  return { load, save };
}

describe('knowledge base manager', () => {
  it('loads the embedded knowledge base when storage is empty and caches the result', async () => {
    const storage = makeStorage(undefined);
    const manager = new KnowledgeBaseManager(storage);

    const firstCatalog = await manager.getKnowledgeBase();
    const secondCatalog = await manager.getKnowledgeBase();

    expect(storage.load).toHaveBeenCalledTimes(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(firstCatalog).toBe(secondCatalog);
    expect(firstCatalog.version).toBe(loadEmbeddedKnowledgeBase().version);
    expect(firstCatalog.categories.length).toBeGreaterThan(0);
  });

  it('falls back to the embedded knowledge base when stored data cannot be normalized', async () => {
    const storage = makeStorage({
      version: 'broken',
      generatedAt: '2026-01-01T00:00:00.000Z',
      categories: [
        {
          category: 'seo',
          entries: [{ id: 'broken-entry' } as never]
        }
      ]
    } as never);
    const manager = new KnowledgeBaseManager(storage);

    const catalog = await manager.getKnowledgeBase();

    expect(storage.load).toHaveBeenCalledTimes(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(catalog.version).toBe(loadEmbeddedKnowledgeBase().version);
    expect(catalog.categories.length).toBeGreaterThan(0);
  });

  it('replaces the knowledge base catalog with normalized entries', async () => {
    const baseline = loadEmbeddedKnowledgeBase();
    const storage = makeStorage(baseline);
    const manager = new KnowledgeBaseManager(storage);
    const loadedCatalog = await manager.getKnowledgeBase();
    const targetCategory = loadedCatalog.categories[0];
    const targetEntry = targetCategory.entries[0];

    await manager.replaceKnowledgeBase({
      ...loadedCatalog,
      version: '2.0.0',
      categories: [
        ...loadedCatalog.categories,
        {
          category: 'geo',
          enabled: true,
          entries: [
            {
              id: 'geo-extra',
              title: '   ',
              summary: '  Additional GEO guidance  ',
              notes: ['  Prefer semantic clusters  ', '   '],
              enabled: false
            }
          ]
        }
      ]
    });

    const refreshedCatalog = await manager.getKnowledgeBase();
    const geoCategory = refreshedCatalog.categories.at(-1);

    expect(refreshedCatalog.version).toBe('2.0.0');
    expect(refreshedCatalog.categories[0].entries[0].title).toBe(targetEntry.title);
    expect(geoCategory?.category).toBe('geo');
    expect(geoCategory?.entries[0].title).toBe('geo-extra');
    expect(geoCategory?.entries[0].summary).toBe('Additional GEO guidance');
    expect(geoCategory?.entries[0].notes).toEqual(['Prefer semantic clusters']);
    expect(geoCategory?.entries[0].enabled).toBe(false);
    expect(storage.save).toHaveBeenCalledTimes(1);
  });

  it('returns a storage adapter only when the chrome storage area is complete', () => {
    expect(createKnowledgeBaseStorage({ get: vi.fn() as never } as never)).toBeUndefined();
    expect(createKnowledgeBaseStorage({ set: vi.fn() as never } as never)).toBeUndefined();

    const storage = createKnowledgeBaseStorage({
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => undefined)
    } as never);

    expect(storage).toBeDefined();
  });
});
