# src/ui/

## Responsibility
Presentation utilities for serialization and issue triage view preparation.

## Design
- Pure transformation functions only; no DOM renderer in the addon-lite scope.
- `groupIssuesByDomainAndSeverity` implements deterministic grouping for future panel rendering.
- `export.ts` is a report rendering strategy set (json/markdown/html/llm-markdown/geo-xml).

## Flow
1. Snapshot + optional diff are passed in.
2. Grouping creates aggregate buckets by `{domain,severity}`.
3. Export formatters render machine-readable or human-readable artifacts.
4. Service worker pipes selected format from `report:build` back to callers.

## Integration
- Uses shared models from `shared/types.ts` and `shared/rule-engine.ts`.
- Called by service-worker handlers and integration tests.
