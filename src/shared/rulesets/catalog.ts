import { addonRulesetSchema } from '../contracts';
import defaultCatalog from './default-rulesets.json';
import type { RuleDomain } from '../types';

export interface AddonRule {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled?: boolean;
}

export interface AddonRuleSet {
  category: RuleDomain;
  enabled?: boolean;
  rules: AddonRule[];
}

export interface AddonRulesCatalog {
  version: string;
  generatedAt: string;
  categories: AddonRuleSet[];
}

export function loadEmbeddedCatalog(): AddonRulesCatalog {
  return addonRulesetSchema.parse(defaultCatalog);
}

export function normalizeRuleSetIds(catalog: AddonRulesCatalog): AddonRulesCatalog {
  return {
    ...catalog,
    categories: catalog.categories.map((category) => ({
      ...category,
      rules: category.rules.map((rule) => ({
        ...rule,
        severity: ['critical', 'high', 'medium', 'low'].includes(rule.severity) ? rule.severity : 'low',
        enabled: rule.enabled ?? true,
        title: rule.title.trim() || rule.id
      }))
    }))
  };
}

export function filterEnabledRuleIds(
  catalog: AddonRulesCatalog,
  categories?: RuleDomain[]
): Set<string> {
  if (!categories?.length) {
    return new Set(
      catalog.categories.flatMap((category) =>
        category.rules
          .filter((rule) => (rule.enabled ?? true))
          .map((rule) => rule.id)
      )
    );
  }

  const selected = new Set<string>();
  for (const category of catalog.categories) {
    if (!categories.includes(category.category)) {
      continue;
    }

    for (const rule of category.rules) {
      if (rule.enabled ?? true) {
        selected.add(rule.id);
      }
    }
  }

  return selected;
}
