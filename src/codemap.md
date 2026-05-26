# src Atlas

## Responsibility
Core extension runtime split into content extraction, shared domain model/rule engine, background orchestration, and report/output services.

## Project Responsibility
A browser-addon-lite auditor with optional remote/backend coupling that performs deterministic DOM-first checks, bounded internal crawling, and fallback semantics when backend transport is unavailable.

## System Entry Points
- `src/background/service-worker.ts`: Message router + runtime registration.
- `src/background/orchestrator.ts`: Scan orchestration, rule execution, and crawl pipeline.
- `src/background/backend-bridge.ts`: HTTP/stdin backend adapters.
- `src/background/storage.ts` / `src/background/scan-history.ts`: Persistence abstraction.
- `src/content/content-script.ts` + `src/content/extractor.ts`: DOM context extraction.

## dir Map
| dir | Responsibility | Detailed Map |
| `src/background/` | Service-layer orchestration, runtime messaging, crawl execution, persistence, and backend bridge orchestration. | [View Map](src/background/codemap.md) |
| `src/content/` | Active-tab DOM extraction and content-script message listener. | [View Map](src/content/codemap.md) |
| `src/shared/` | Schemas, rule execution primitives, anti-bot recommendation, and message contracts. | [View Map](src/shared/codemap.md) |
| `src/shared/rules/` | DOM rule registry and concrete checks. | [View Map](src/shared/rules/codemap.md) |
| `src/shared/rulesets/` | Machine-readable ruleset catalog + update/normalization behavior. | [View Map](src/shared/rulesets/codemap.md) |
| `src/ui/` | Issue grouping and report rendering adapters. | [View Map](src/ui/codemap.md) |
