import type { AddonKnowledgeBaseCatalog } from '../shared/knowledge-base/catalog';
import { loadEmbeddedKnowledgeBase, normalizeKnowledgeBaseCatalog as normalizeCatalog } from '../shared/knowledge-base/catalog';
import type { ChromeLikeStorageArea } from './storage';

const KNOWLEDGE_BASE_STORAGE_KEY = 'addon_knowledge_base_catalog';

export interface KnowledgeBaseStorage {
  load(): Promise<AddonKnowledgeBaseCatalog | undefined>;
  save(catalog: AddonKnowledgeBaseCatalog): Promise<void>;
}

export class KnowledgeBaseManager {
  private loadedPromise: Promise<AddonKnowledgeBaseCatalog> | null = null;

  constructor(private readonly storage: KnowledgeBaseStorage) {}

  async getKnowledgeBase(): Promise<AddonKnowledgeBaseCatalog> {
    if (!this.loadedPromise) {
      this.loadedPromise = this.loadOrCreateKnowledgeBase();
    }

    return this.loadedPromise;
  }

  async replaceKnowledgeBase(nextCatalog: AddonKnowledgeBaseCatalog): Promise<void> {
    const normalized = normalizeCatalog(nextCatalog);
    await this.storage.save(normalized);
    this.loadedPromise = Promise.resolve(normalized);
  }

  private async loadOrCreateKnowledgeBase(): Promise<AddonKnowledgeBaseCatalog> {
    const stored = await this.storage.load();
    if (!stored?.categories?.length) {
      const embedded = normalizeCatalog(loadEmbeddedKnowledgeBase());
      await this.storage.save(embedded);
      return embedded;
    }

    try {
      return normalizeCatalog(stored);
    } catch {
      const embedded = normalizeCatalog(loadEmbeddedKnowledgeBase());
      await this.storage.save(embedded);
      return embedded;
    }
  }
}

export class MemoryKnowledgeBaseStorage implements KnowledgeBaseStorage {
  private catalog: AddonKnowledgeBaseCatalog | undefined;

  async load(): Promise<AddonKnowledgeBaseCatalog | undefined> {
    return this.catalog;
  }

  async save(catalog: AddonKnowledgeBaseCatalog): Promise<void> {
    this.catalog = catalog;
  }
}

export class ChromeKnowledgeBaseStorage implements KnowledgeBaseStorage {
  constructor(private readonly storage: ChromeLikeStorageArea) {}

  async load(): Promise<AddonKnowledgeBaseCatalog | undefined> {
    const payload = await this.storage.get<AddonKnowledgeBaseCatalog>([KNOWLEDGE_BASE_STORAGE_KEY]);
    return payload[KNOWLEDGE_BASE_STORAGE_KEY];
  }

  async save(catalog: AddonKnowledgeBaseCatalog): Promise<void> {
    await this.storage.set({ [KNOWLEDGE_BASE_STORAGE_KEY]: catalog });
  }
}

export function createKnowledgeBaseStorage(candidate?: ChromeLikeStorageArea): KnowledgeBaseStorage | undefined {
  if (!candidate?.get || !candidate?.set) {
    return undefined;
  }

  return new ChromeKnowledgeBaseStorage(candidate);
}
