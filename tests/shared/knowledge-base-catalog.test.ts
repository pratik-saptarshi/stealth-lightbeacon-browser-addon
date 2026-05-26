import { describe, expect, it } from 'vitest';
import {
  filterKnowledgeBaseCategories,
  normalizeKnowledgeBaseCatalog,
  type KnowledgeBaseStorageCatalog
} from '../../src/shared/knowledge-base/catalog';

describe('shared knowledge base catalog helpers', () => {
  it('normalizes entry titles, summaries, notes, and enabled flags', () => {
    const catalog: KnowledgeBaseStorageCatalog = {
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      categories: [
        {
          category: 'seo',
          entries: [
            {
              id: 'entry-1',
              title: '  Title  ',
              summary: '  Summary  ',
              notes: ['  note one  ', '   ', 'note two'],
              enabled: false
            },
            {
              id: 'entry-2',
              title: '   ',
              summary: '  Another summary  ',
              notes: [' ', ' keep ']
            }
          ]
        }
      ]
    };

    const normalized = normalizeKnowledgeBaseCatalog(catalog);

    expect(normalized.categories[0].entries[0]).toEqual({
      id: 'entry-1',
      title: 'Title',
      summary: 'Summary',
      notes: ['note one', 'note two'],
      enabled: false
    });
    expect(normalized.categories[0].entries[1]).toEqual({
      id: 'entry-2',
      title: 'entry-2',
      summary: 'Another summary',
      notes: ['keep'],
      enabled: true
    });
  });

  it('filters enabled categories across all categories and selected categories', () => {
    const catalog: KnowledgeBaseStorageCatalog = {
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      categories: [
        {
          category: 'seo',
          enabled: true,
          entries: [
            {
              id: 'seo-entry',
              title: 'SEO',
              summary: 'SEO note',
              notes: []
            }
          ]
        },
        {
          category: 'geo',
          enabled: false,
          entries: [
            {
              id: 'geo-entry',
              title: 'GEO',
              summary: 'GEO note',
              notes: []
            }
          ]
        }
      ]
    };

    expect(filterKnowledgeBaseCategories(catalog).map((category) => category.category)).toEqual(['seo']);
    expect(filterKnowledgeBaseCategories(catalog, ['geo']).map((category) => category.category)).toEqual([]);
    expect(filterKnowledgeBaseCategories(catalog, ['seo']).map((category) => category.category)).toEqual(['seo']);
  });
});
