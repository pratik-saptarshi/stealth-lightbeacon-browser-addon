# src/shared/rulesets/

## Responsibility
Embedded and mutable rule catalog management for category-based rule enablement in add-on-only mode.

## Design
- `default-rulesets.json` stores machine-readable category catalog (versioned, time-stamped).
- Runtime layer normalizes IDs and default rule fields in `normalizeRuleSetIds`.
- `RulesetCatalogManager` caches catalog in memory and persists updates to chosen storage port.
- Storage adapters include memory fallback and chrome/browser local storage persistence.

## Flow
1. Manager initializes from embedded catalog and normalizes payload.
2. On `getCatalog`, reads cached state or loads/stores from storage once.
3. `replaceCatalog`/`updateCategory` updates normalized catalog and persists it.
4. Orchestrator uses enabled IDs to prune rules based on selected categories.

## Integration
- Message handlers in service worker expose `ruleset:get` and `ruleset:update`.
- Connected to backend payload planning through `ruleSetVersion` and selected categories.
