# Browser Add-on Architecture

## Purpose
Provide a local-first audit path in-browser with optional backend coupling to the stealth-lightbeacon Python runtime.

## High-Level Shape
- `src/content/`: Tab-scoped extractor that produces a structured `RuleContext`.
- `src/shared/`: Domain model, contracts, anti-bot heuristics, and rule execution.
- `src/background/`: Scan orchestration, crawl-lite runtime, message contract handling, and storage.
- `src/ui/`: Issue grouping and export/report rendering utilities.
- `api/openapi.yaml`: External contract for backend and ruleset/report endpoints.

## Data & Control Flow
1. Content extraction sends/collects `RuleContext`.
2. Service worker receives `scan:start`, resolves catalog + history, and constructs `ScanOrchestrator`.
3. Orchestrator executes local rules and optional backend scan (`http` or `stdio`).
4. If backend fails and is optional, fallback returns local result and keeps `dom-only` policy for issues.
5. Crawl-lite optionally expands internal links with origin + redirect checks.
6. Results are persisted (memory/storage adapter) and surfaced through query APIs.

## Module Contracts
- **Message contracts**: `src/shared/message-contracts.ts`.
- **Validation**: `src/shared/contracts.ts` (Zod schema enforcement).
- **Execution result**: `ScanSnapshot`, `CrawlNode`, `DiffResult` in `src/shared/types.ts`.
- **Ruleset management**: `src/shared/rulesets/catalog.ts` + `src/background/ruleset-catalog.ts`.

## Security and Failure Modes
- Host permissions are scoped to HTTP/S by manifest.
- Crawl queue hard-blocks private/canonical-origin escape links and validates redirect destinations.
- Backend integration supports optional fallback; backend-only failures do not hard-fail unless `required: true`.

## Extension Points
- Add rule families by extending `src/shared/rules` and category metadata.
- Add engine families by expanding adapter layer around `BackendAdapter`.
- Add persistence adapters by implementing history and ruleset storage interfaces.
