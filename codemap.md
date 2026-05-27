# stealth-lightbeacon-browser-addon/

## Responsibility
Build a browser-addon-lite auditing runtime with optional backend coupling, local-first operation, and bounded crawl support.

## Design
- Modular architecture split by runtime boundary:
  - `content/`: extraction from active tab DOM.
  - `shared/`: contracts, schema validation, rule execution, anti-bot heuristics.
  - `background/`: orchestration, storage, backend bridging, message dispatch.
  - `ui/`: grouping and export shaping.
- Strongly typed contracts (`shared/contracts.ts`, `shared/message-contracts.ts`) and deterministic rule execution for testability.
- Port-based persistence and backend adapters prevent hard dependencies on browser APIs or remote services.
- CI gates are separated by named labels for fallback/contract-specific verification.

## Flow
1. Content script extracts `RuleContext` and sends payload to background.
2. Service worker receives `scan:start`, resolves previous snapshot/history and catalog, and invokes `ScanOrchestrator`.
3. Orchestrator runs local DOM rules plus optional backend scan (`http`/`stdin`) depending on request mode.
4. If backend is optional and fails, runtime returns local result with fallback recommendation behavior.
5. Optional crawl-lite expands internal links, classifies failures, records `CrawlNode` outcomes.
6. Snapshot/history/report APIs expose outputs for issues, diff, and render formats.

## Integration
- Public API and runtime contract defined by `shared/message-contracts.ts` and `api/openapi.yaml`.
- OpenAPI-aligned backend bridge supports local stdio or remote HTTP with optional basic auth.
- Optional ruleset update path (`ruleset:get`, `ruleset:update`) allows in-extension configuration changes.
- Tests validate unit, integration, and CI-patterned fallback contracts.
- Generated validation codemap in `docs/validation-codemap.md` tracks GEO, SEO, AEO, accessibility, and security gaps against representative tools.
- `shared-axioms.md` records the cross-repo ownership and validation rules.

## Repository dir Map
| path | responsibility |
| --- | --- |
| `src/` | core runtime and scanning engine |
| `api/` | OpenAPI contract for backend integration |
| `docs/` | execution plan, data flow, roadmap |
| `tests/` | unit/integration coverage by phase |
| `.github/` | CI matrix configuration |
| `docs/roadmap/roadmap.md` | offline evaluation roadmap, completion tracker, and Beads decomposition |
| `docs/roadmap/playwright-test-plan.md` | Playwright browser automation matrix derived from Beads child issues |
| `docs/release-milestones.md` | minor and major release planning gates tied to validation coverage |
| `docs/validation-codemap.md` | generated validation coverage and gap map |
| `.slim/codemap.json` | incremental code-map state |
