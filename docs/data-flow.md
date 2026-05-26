# Data Flow (Addon + Optional Backend)

## Runtime Modes
1. Embedded local mode:
   - `scan:start` runs `ScanOrchestrator` with local DOM rules by default.
   - Uses embedded ruleset catalog from `src/shared/rulesets/default-rulesets.json` when needed.
2. Remote backend mode:
   - `ScanRequest.backend.mode = http` uses `backend-bridge` HTTP client.
   - Optional `basic` auth is supported via `Authorization: Basic` header.
   - If remote call fails and is not required, scan falls back to local mode.
3. Local stdio mode:
   - `ScanRequest.backend.mode = stdin` uses injected executor payload bridge.
   - Intended for local Python runner integration.

## Flow
1. `content-script` extracts `RuleContext` and sends `scan:start`, or service worker injects and requests extraction from active tab.
2. `service-worker` resolves ruleset catalog via `ruleset:get` cache manager.
3. Orchestrator path:
   - chooses local rule subset using selected `ruleCategories` if present;
   - uses backend request when enabled;
   - falls back to local execution when backend unavailable/unconfigured or returns failure and not required.
4. Result produced as `ScanSnapshot` with `Issue.source` `dom-only` or `backend`.
5. If `crawl-lite`, bounded URL queue expands only internal links and records `CrawlNode` outcomes.
6. Snapshot optionally persisted via `chrome.storage.local`/`browser.storage.local` adapter, else memory fallback.
7. `history:list`, `history:latest`, `history:compare` read from storage.
8. `ruleset:update` updates catalog in local storage; restart path reads catalog via `ruleset:get`.

## Ruleset Storage
- Embedded default catalog in bundle: `src/shared/rulesets/default-rulesets.json`.
- Persisted and mutable via `src/background/ruleset-catalog.ts` and service message handlers.
- Categories supported: seo, geo, aeo, security-headers, WCAG2.1AA, WCAG2.2AA (+ existing legacy categories).

## Security/Privacy Boundaries
- No mandatory backend dependency in normal operation.
- All persisted records stay local extension context by default.
- Crawl constrained by depth/count and explicit failure classification.
- Workspace watcher mode remains out of scope until post-MCP work.
