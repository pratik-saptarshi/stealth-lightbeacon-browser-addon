# Browser Add-on Architecture

## Purpose
Provide a local-first audit path in-browser with optional backend coupling.

## High-Level Shape
- `src/content/`: tab-scoped extractor that produces a structured `RuleContext`.
- `src/shared/`: domain model, contracts, anti-bot heuristics, and rule execution.
- `src/background/`: orchestration, crawl-lite runtime, backend adapters, and storage.
- `src/ui/`: issue grouping and report rendering utilities.
- `api/openapi.yaml`: external contract for remote/backend endpoints.

## Data & Control Flow
1. UI/runtime supplies `RuleContext` directly, or service worker derives it from active tab context.
2. Service worker receives `scan:start`, resolves catalog and prior history.
3. Orchestrator runs local evaluators, optional `http`/`stdin` backend, and crawl-lite.
4. Engine recommendation is generated from anti-bot signal and passed into backend payload where applicable.
5. On optional backend failure, execution returns local result (`dom-only` issue source).
6. On required backend failure, scan fails with explicit reason.
7. Results are persisted, then diffed against latest prior snapshot.

## Module Contracts
- **Message contracts**: `src/shared/message-contracts.ts` and explicit response typing.
- **Validation**: `src/shared/contracts.ts` for request/result schemas.
- **Execution model**: `ScanSnapshot`, `CrawlNode`, `DiffResult` in `src/shared/types.ts`.
- **Ruleset management**: `src/shared/rulesets/catalog.ts` + `src/background/ruleset-catalog.ts`.
- **Backend transport**: `src/background/backend-bridge.ts`.

## Security and Failure Modes
- Crawl validation blocks non-HTTP/HTTPS, private/reserved hostnames, cross-origin seeds, and redirect escapes.
- Backend path supports Basic auth and timeout control.
- Failure taxonomy is explicit: `cors`, `timeout`, `blocked`, `non_html`, `other`.

## Permission posture
- Manifest requests only minimal browser permissions: `storage`, `activeTab`, and `scripting`.
- No broad host permissions are declared; page extraction uses explicit on-demand tab scripting only.

## Extension Points
- Add rule families by extending `src/shared/rules` + `src/shared/rulesets`.
- Add engine families by extending adapter behavior around `BackendAdapter`.
- Add persistence engines by implementing history and catalog storage interfaces.
