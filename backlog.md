# Backlog

## Capability Map (from current codebase)

1. Async site crawling with depth/max-URL controls and same-domain bounds.
2. SSRF protection with DNS/IP range validation and redirect re-validation.
3. Multi-engine scraping (http, fast/Obscura, stealth/Playwright, mcp).
4. Anti-bot recon advisor with auto engine recommendation.
5. Pluggable evaluators: SEO, Performance/PageSpeed, Accessibility, AEO/GEO, UX, Drupal/security.
6. Broken-link discovery and Drupal API exposure probing.
7. Report generation: JSON, HTML, LLM Markdown, GEO XML.
8. CI-oriented exit contracts (--fail-on-critical, budget gate exit code 2).
9. Optional persistence (DuckDB + LanceDB/fallback) and semantic search.
10. Historical diffing of runs (regressions/improvements/new-resolved issue IDs).
11. Workspace watcher mode.

---

## Backlog B: Browser Addon (no server; Chrome/Edge/Firefox)

Partially suitable; focus on in-tab/client-side subset. Full parity is not feasible without backend/native helper.

### Epic 1: In-Page Audit Lite

- Feature: Active-tab DOM auditing (content script)
- User story: As a marketer, I audit the currently open page instantly.
- Tasks:
  1. Port SEO/accessibility/UX/AEO rules that require only page DOM.
  2. Build issue panel grouped by domain/severity.
  3. Add "re-scan page" action.
  4. Export JSON/Markdown locally.

### Epic 2: Limited Same-Origin Crawl

- Feature: Limited same-origin crawl from active origin
- User story: As a tester, I discover top internal links and audit a small set.
- Tasks:
  1. Parse links from active page.
  2. Use extension background fetch where allowed.
  3. Cap crawl depth/URL count aggressively.
  4. Handle CORS/fetch failures explicitly.

### Epic 3: Local History in Extension Storage

- Feature: Persist scan snapshots and compare
- User story: As a user, I compare before/after scans in browser.
- Tasks:
  1. Document data-flow and local-only behavior.
  2. Store normalized scan snapshots in IndexedDB.
  3. Add comparison view for regressions/improvements.
  4. Enforce retention policy (max snapshots per origin).

---

## Proposed Technology Architecture (Browser Addon)

### Platform Targets

1. Build for Manifest V3 first (Chrome/Edge), with Firefox compatibility path.
2. Keep client-side operation as the default path, with optional remote/backend coupling:
   - remote HTTP backend via `POST /v1/audit/scan` (basic auth supported)
   - optional local stdio backend bridge for `stealth-lightbeacon` Python runner
   - fallback to embedded in-bundle rules when backend is disabled or unavailable
3. Use capability flags per browser for API differences.
3. Use capability flags per browser for API differences.

### Runtime Components

1. Content Script
   1. Collects DOM, metadata, accessibility signals, link graph seeds.
   2. Runs DOM-only evaluators in isolated, deterministic passes.
2. Service Worker (Background)
   1. Orchestrates scan jobs and limited same-origin crawl queue.
   2. Performs network fetches where extension permissions allow.
   3. Centralizes throttling, timeout, retry, and failure classification.
   4. Resolves backend mode (`local`, `http`, `stdin`) and applies local fallback when needed.
3. Extension UI (Side Panel or Popup)
   1. Displays issue list grouped by domain/severity.
   2. Shows scan status, rescans, export, and history compare.
4. Shared Core (TypeScript modules)
   1. Rule engine, issue schema, scoring, serializer/export utilities.
   2. Message contracts between content/background/UI.

### Data Model

1. `ScanSnapshot`
   1. `id`, `origin`, `url`, `timestamp`, `engine=dom-lite|crawl-lite`.
   2. `issues[]` with `ruleId`, `severity`, `domain`, `evidence`, `selector`.
   3. `summary` with counts and score deltas.
2. `CrawlNode`
   1. `url`, `depth`, `status`, `errorType`, `discoveredFrom`.
3. `DiffResult`
    1. `newIssues[]`, `resolvedIssues[]`, `regressions[]`, `improvements[]`.

### Ruleset Data Model

1. `AddonRuleCatalog` is stored in bundle at `src/shared/rulesets/default-rulesets.json`.
2. Catalog is loaded and can be updated through `ruleset:get`/`ruleset:update`.
3. Categories currently included for this phase:
   - `seo`, `geo`, `aeo`, `security-headers`, `WCAG2.1AA`, `WCAG2.2AA`.

### Storage Strategy

1. Primary: IndexedDB (`scans`, `crawl_nodes`, `exports_meta`).
2. Small config: `chrome.storage.local` / `browser.storage.local`.
3. Retention:
   1. Default cap by origin (for example 20 snapshots).
   2. LRU cleanup on write when over cap.

### Security and Privacy

1. Host permissions minimized to active tab + optional user-granted origins.
2. Same-origin crawl enforcement at queue admission and fetch execution.
3. No data exfiltration by default; exports are explicit user actions.
4. Strip sensitive query params from persisted URLs when possible.

### Rule Engine Porting Plan

1. Include first: SEO basics, heading structure, metadata, image alt, link hygiene, basic accessibility checks, lightweight UX heuristics.
2. Exclude/defer: server-only checks (SSRF, DNS/IP validation, deep anti-bot recon, PageSpeed API, Drupal API probing needing remote orchestration).
3. Add rule metadata: `requiresNetwork`, `requiresCrossPage`, `domOnly`.

### Crawl-Lite Constraints

1. Hard limits (configurable): max depth 1-2, max URLs 25-100, per-request timeout.
2. Deduplicate normalized URLs and hash fragments.
3. Explicitly record CORS, blocked, timeout, and non-HTML outcomes.

### Messaging and Execution Flow

1. UI triggers scan command to service worker.
2. Service worker asks active content script for DOM extract.
3. Shared rule engine evaluates and returns issues.
4. Optional crawl-lite runs in background queue.
5. Snapshot persisted, diff computed against latest prior snapshot, UI updated.

### Export and Reporting

1. JSON export: full machine-readable snapshot + diff.
2. Markdown export: human-readable grouped findings and summary.
3. Optional XML profile for GEO-style output if needed by downstream tooling.

### Recommended Implementation Stack

1. TypeScript for all extension code.
2. Build: Vite + `@crxjs/vite-plugin` (or equivalent MV3-friendly bundler).
3. UI: React + lightweight state store (Zustand or Redux Toolkit).
4. Validation: Zod schemas for message payloads and persisted records.
5. Tests:
   1. Unit: Vitest for rule logic and diffing.
   2. E2E: Playwright extension tests on Chromium; smoke checks for Firefox.

### Delivery Phases

1. Phase 1: DOM audit + issue panel + rescan + JSON/Markdown export.
2. Phase 2: Crawl-lite + explicit network failure handling.
3. Phase 3: Local history + diff visualization + retention controls.
4. Phase 4: Browser parity hardening and performance tuning.

## Prioritized Roadmap (Now / Next / Later)

### Now

1. Complete cross-browser runtime hardening and in-repo Phase 5 checks.
   - Scope: browser runtime guards, crawl hardening tests, manifest and storage edge validation.
   - Effort: 0.5 day.

### Next

1. Add minimal extension-side issue panel state and rescan command surface.
   - Scope: issue grouping model, diff summary model, local action wiring.
   - Effort: 1–2 days.

2. Add IndexedDB-backed storage adapter path and docs for local-only flow.
   - Effort: 2 days.

### Later

1. Add Playwright extension E2E coverage (Chromium baseline + Firefox smoke).
   - Effort: 1 day plus CI integration.

2. Expand rule set to performance and security subsets.
   - Effort: 2–3 days.

## Reminder
- Workspace watcher mode is scheduled for **post-MCP** implementation and not in the current addon-only plan.

## Validation Against Original Backlog

### Capability Map Status

| # | Capability | Status | Evidence | Phase/Remediation |
| --- | --- | --- | --- | --- |
| 1 | Async crawl depth/max-URL + same-domain bounds | ✅ Implemented | `src/background/orchestrator.ts` (`runCrawl`, `clamp`, dedupe, internal-link filter, URL caps) | Phase 1 complete |
| 2 | SSRF + redirect re-validation | ✅ Implemented | `src/background/orchestrator.ts` (`validateCrawlTarget`, final-url origin check) | Phase 1 complete |
| 3 | Multi-engine scraping (`http`, `fast-obscura`, `stealth-playwright`, `mcp`) | ⚠️ Partial | Recommendation produced in `src/shared/anti-bot.ts`; no engine-adapter execution layer or per-engine runtime parity yet | Phase 2 remaining |
| 4 | Anti-bot advisor + recommendation | ✅ Implemented | `src/shared/anti-bot.ts`, verified by `tests/shared/anti-bot.test.ts` | Phase 1 complete |
| 5 | Pluggable evaluators: SEO/AEO/Accessibility/UX + GEO + others | ⚠️ Partial | DOM evaluators exist for seo/aeo/accessibility/ux; GEO/WCAG/security/performance/drupal placeholders only in catalog metadata | Phase 2 remaining |
| 6 | Broken-link + Drupal API exposure probing | ⚠️ Not Implemented | No link-status or Drupal endpoint checks in orchestrator/extractor | Phase 3 remaining |
| 7 | Report generation formats (JSON/HTML/LLM/GEO XML) | ✅ Implemented | `src/ui/export.ts`, `tests/ui/grouping-and-export.test.ts` | Phase 1 complete |
| 8 | CI exit contracts (`--fail-on-critical`, exit code 2) | ⚠️ Not Implemented | No budget gate command exists in package scripts; matrix is label-only | Phase 4 remaining |
| 9 | Optional persistence + semantic search | ⚠️ Partial | In-memory/chrome history + mutable catalog; no DuckDB/LanceDB path | Phase 3 remaining |
| 10 | Historical diff with resolved/regression IDs | ⚠️ Partial | Diff runs, but issue IDs regenerate per run, so stable matching is weak | Phase 1 complete with blocker |
| 11 | Workspace watcher mode | 🚧 Deferred | Explicitly scheduled post-MCP | Post-MCP blocked |

### Backlog B Status

- Epic 1 (DOM Audit Lite): Tasks 1,2,4 partially done through extractor + grouping/export plumbing; issue panel and rescan action are UI gaps.
- Epic 2 (Limited Crawl): Tasks 1-4 done in extraction, background fetch, depth/URL limits, and explicit failure types.
- Epic 3 (Local History): Data flow exists, persistence and compare implemented; full IndexedDB-backed storage and explicit data-flow docs still pending.

## Adversarial Remediation Backlog (Phase-Merged)

## Phase 0 — Validation Closure
1. **Stabilize issue identity diffing**
   - Replace random per-run IDs with deterministic deterministic issue keys.
   - Acceptance: unchanged context/rules yields zero deltas for unchanged issues.
   - Test: add unit for stable keying; extend integration diff assertions in `tests/background/orchestrator-backend.test.ts`.

2. **Fix `recommendEngine` recommendation contract for `dom-lite` path**
   - Document that recommendation includes concrete confidence/reason even when backend disabled.
   - Acceptance: snapshot includes recommendation object for all scan modes.
   - Test: add explicit unit + CI coverage (`issues:policy`).

## Phase 1 — Remaining Parity Core
3. **Implement backend engine adapters for all advertised engines**
   - Add adapter strategy for `fast-obscura`, `stealth-playwright`, `mcp` and explicit unsupported-mode fallback.
   - Acceptance: transport mode is configurable and validated by API contract.
   - Risk: high.

4. **Add remaining evaluator families**
   - Add minimal rule scaffolding + execution toggles for performance/PageSpeed, security-headers, broken-link, Drupal API exposure, WCAG variants.
   - Acceptance: each category appears as domain and can be enabled/disabled from ruleset catalog.
   - Test: add rule-unit and category-gated execution tests.

5. **Implement broken-link discovery**
   - Crawl/seed link status checks and expose broken-link issues with stable evidence.
   - Acceptance: at least one category-level fixture demonstrates non-HTML/404/timeout handling.
   - Test: integration on crawl nodes and issue filtering.

## Phase 2 — Operational Hardening
6. **Add budget contract and exit policy gate**
   - Add `npm run audit:budget` that fails with code `2` when critical/high issues exceed thresholds.
   - Acceptance: CI matrix uses `required-backend-hard-fail`, `backend-fallback`, `issues:policy`, and `budget-gate` labels.
   - Test: unit/CI label for each policy outcome.

7. **Persistency depth**
   - Add DuckDB/LanceDB fallback path and semantic lookup stubs behind `StoragePort` interface.
   - Acceptance: local fallback keeps current behavior when native deps absent.
   - Test: unit for feature-flag and adapter resolution.

## Phase 3 — UI + UX Completion
8. **Build issue panel + re-scan command wiring**
   - Add grouped panel view and explicit re-scan action via background messaging.
   - Acceptance: scan output updates issue buckets + history compare delta in one path.
   - Test: component/integration tests (or harness stub if non-browser).

9. **Document local-only storage flow and IndexedDB adapter**
   - Add concrete architecture doc and adapter for IndexedDB-backed snapshot store.
   - Acceptance: docs + tests for migration and fallback to memory storage.

## Phase 4 — Post-MCP Queue (deferred)
10. **Workspace watcher mode**
   - Keep deferred explicitly; execute only after MCP runtime coupling milestone.
