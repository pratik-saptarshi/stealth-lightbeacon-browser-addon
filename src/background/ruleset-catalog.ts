import type { AddonRulesCatalog } from '../shared/rulesets/catalog';
import { loadEmbeddedCatalog, normalizeRuleSetIds as normalizeCatalogIds } from '../shared/rulesets/catalog';
import type { ChromeLikeStorageArea } from './storage';

const RULESET_STORAGE_KEY = 'addon_ruleset_catalog';

export interface RulesetCatalogStorage {
  load(): Promise<AddonRulesCatalog | undefined>;
  save(catalog: AddonRulesCatalog): Promise<void>;
}

export class RulesetCatalogManager {
  private readonly catalog: AddonRulesCatalog;
  private loadedPromise: Promise<AddonRulesCatalog> | null = null;

  constructor(
    private readonly storage: RulesetCatalogStorage
  ) {
    this.catalog = normalizeCatalogIds(loadEmbeddedCatalog());
  }

  async getCatalog(): Promise<AddonRulesCatalog> {
    if (!this.loadedPromise) {
      this.loadedPromise = this.loadOrCreateCatalog();
    }

    return this.loadedPromise;
  }

  async replaceCatalog(nextCatalog: AddonRulesCatalog): Promise<void> {
    const normalized = normalizeCatalogIds(nextCatalog);
    await this.storage.save(normalized);
    this.loadedPromise = Promise.resolve(normalized);
  }

  async updateCategory(category: string, updatedCategory: AddonRulesCatalog['categories'][number]): Promise<void> {
    const catalog = await this.getCatalog();
    const existing = catalog.categories.find((item) => item.category === category);
    if (!existing) {
      throw new Error(`Unknown ruleset category: ${category}`);
    }

    existing.rules = updatedCategory.rules ?? existing.rules;
    existing.enabled = updatedCategory.enabled ?? existing.enabled;

    await this.storage.save(catalog);
    this.loadedPromise = Promise.resolve(catalog);
  }

  private async loadOrCreateCatalog(): Promise<AddonRulesCatalog> {
    const stored = await this.storage.load();
    if (!stored?.categories?.length) {
      await this.storage.save(this.catalog);
      return this.catalog;
    }

    try {
      const normalized = normalizeCatalogIds(stored);
      return normalized;
    } catch {
      await this.storage.save(this.catalog);
      return this.catalog;
    }
  }
}

export class MemoryRulesetCatalogStorage implements RulesetCatalogStorage {
  private catalog: AddonRulesCatalog | undefined;

  async load(): Promise<AddonRulesCatalog | undefined> {
    return this.catalog;
  }

  async save(catalog: AddonRulesCatalog): Promise<void> {
    this.catalog = catalog;
  }
}

export class ChromeRulesetCatalogStorage implements RulesetCatalogStorage {
  constructor(private readonly storage: ChromeLikeStorageArea) {}

  async load(): Promise<AddonRulesCatalog | undefined> {
    const payload = await this.storage.get<AddonRulesCatalog>([RULESET_STORAGE_KEY]);
    return payload[RULESET_STORAGE_KEY];
  }

  async save(catalog: AddonRulesCatalog): Promise<void> {
    await this.storage.set({ [RULESET_STORAGE_KEY]: catalog });
  }
}

export function createRulesetCatalogStorage(candidate?: ChromeLikeStorageArea): RulesetCatalogStorage | undefined {
  if (!candidate?.get || !candidate?.set) {
    return undefined;
  }

  return new ChromeRulesetCatalogStorage(candidate);
}
