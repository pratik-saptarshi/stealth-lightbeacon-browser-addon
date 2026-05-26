# src/shared/rules/

## Responsibility
Rule catalog primitives (current domain-only DOM rule set) and extension points for pluggable checks.

## Design
- Rule spec shape (`RuleSpec`) enforces `id`, `domain`, `severity`, and pure evaluator function.
- Rules are grouped as composable arrays and exposed via registry to the orchestrator.
- Current implementation keeps all rules in-memory and deterministic for testability.

## Flow
1. `domRules` defines concrete check implementations.
2. `registry.ts` exposes `allRules` + `getRulesByDomain` selectors.
3. Orchestrator filters rule IDs via catalog/category selection; filtered rules are executed in `runRules`.

## Integration
- Consumed by `background/orchestrator.ts` during scan execution.
- Uses contract factory (`createIssue`) from `rule-engine.ts` to enforce consistent issue schema shape.
