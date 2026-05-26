import { describe, expect, it } from 'vitest';
import { loadEmbeddedKnowledgeBase } from '../../src/shared/knowledge-base/catalog';
import {
  KnowledgeBaseManager,
  MemoryKnowledgeBaseStorage
} from '../../src/background/knowledge-base';
import type { AddonKnowledgeBaseCatalog } from '../../src/shared/knowledge-base/catalog';

describe('knowledge base manager', () => {
  it('loads the embedded knowledge base when storage is empty', async () => {
    const manager = new KnowledgeBaseManager(new MemoryKnowledgeBaseStorage());
    const catalog = await manager.getKnowledgeBase();

    expect(catalog.version).toBe(loadEmbeddedKnowledgeBase().version);
    expect(catalog.categories.length).toBeGreaterThan(0);
    expect(catalog.categories[0].entries.length).toBeGreaterThan(0);
  });

  it('replaces the knowledge base catalog', async () => {
    const manager = new KnowledgeBaseManager(new MemoryKnowledgeBaseStorage());
    const baseline = await manager.getKnowledgeBase();
    const replacement: AddonKnowledgeBaseCatalog = {
      ...baseline,
      version: '2.0.0',
      categories: [
        ...baseline.categories,
        {
          category: 'geo',
          enabled: true,
          entries: [
            {
              id: 'geo-extra',
              title: 'Geo extra guidance',
              summary: 'Additional GEO guidance',
              notes: ['Prefer semantic clusters'],
              enabled: true
            }
          ]
        }
      ]
    };

    await manager.replaceKnowledgeBase(replacement);
    const refreshed = await manager.getKnowledgeBase();

    expect(refreshed.version).toBe('2.0.0');
    expect(refreshed.categories.some((category) => category.category === 'geo')).toBe(true);
  });
});
