# src/background/

## Responsibility
Service layer that owns browser extension runtime orchestration: inbound message dispatch, scan orchestration, crawl execution, persistence, and external backend integration.

## Design
Uses thin orchestration classes and ports for dependency isolation.
- Message dispatch: command fan-in in `service-worker.ts` routes typed requests through `handleMessage`.
- Strategy-like injection for backend transport (`BackendAdapter`) and storage (`HistoryStoragePort`, `RulesetCatalogStorage`).
- Facade pattern for runtime setup: `registerRuntime`/`startRuntimeListeners` abstracts MV3/browser/host differences.
- Deterministic fallback behavior: backend optionality, required/optional failure semantics.

## Flow
1. `scan:start` message creates `ScanOrchestrator`, loads catalog snapshot, and resolves previous history.
2. Orchestrator runs `runRules` for embedded DOM rules first.
3. If backend is enabled, adapter runs `/v1/audit/scan` (http/stdin) with request + page context.
4. If backend is unavailable and not required, runtime falls back to local DOM snapshot.
5. Crawl-lite queue executes deduped internal links with redirect and MIME checks.
6. Snapshot optionally persisted by `ScanHistoryManager`; responses include recommendation/crawl nodes.

## Integration
- Depends on `shared/contracts.ts`, `shared/message-contracts.ts`, `shared/rule-engine.ts`, `shared/rulesets/catalog.ts`.
- Uses `backend-bridge.ts`, `storage.ts`, `scan-history.ts`, and `ruleset-catalog.ts`.
- Emits responses to UI/content via `chrome.runtime` / `browser.runtime` messaging.
