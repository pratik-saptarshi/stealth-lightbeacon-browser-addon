import { knowledgeBaseSchema, type AddonKnowledgeBase, type KnowledgeBaseCategory } from '../contracts';
import type { RuleDomain } from '../types';
import defaultKnowledgeBase from './default-knowledge-base.json';

export interface KnowledgeBaseStorageCatalog {
  version: string;
  generatedAt: string;
  categories: KnowledgeBaseCategory[];
}

export function loadEmbeddedKnowledgeBase(): KnowledgeBaseStorageCatalog {
  return knowledgeBaseSchema.parse(defaultKnowledgeBase);
}

export function normalizeKnowledgeBaseCatalog(catalog: KnowledgeBaseStorageCatalog): KnowledgeBaseStorageCatalog {
  return {
    ...catalog,
    categories: catalog.categories.map((category) => ({
      ...category,
      entries: category.entries.map((entry) => ({
        ...entry,
        title: entry.title.trim() || entry.id,
        summary: entry.summary.trim(),
        notes: entry.notes.map((note) => note.trim()).filter(Boolean),
        enabled: entry.enabled ?? true
      }))
    }))
  };
}

export function filterKnowledgeBaseCategories(
  catalog: KnowledgeBaseStorageCatalog,
  categories?: RuleDomain[]
): KnowledgeBaseCategory[] {
  if (!categories?.length) {
    return catalog.categories.filter((category) => category.enabled ?? true);
  }

  return catalog.categories.filter(
    (category) => categories.includes(category.category) && (category.enabled ?? true)
  );
}

export type AddonKnowledgeBaseCatalog = AddonKnowledgeBase;
