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
  3. Add “re-scan page” action.
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

1. Manifest V3-first runtime for Chrome/Edge, with Firefox compatibility path.
2. Local-first execution by default, with optional backend coupling:
   - remote HTTP backend via `POST /v1/audit/scan` (basic auth supported),
   - optional local stdio backend bridge for `stealth-lightbeacon`,
   - embedded fallback to bundled rules when backend unavailable.
3. Feature-flagged behavior for browser capability differences.

### Core Runtime

1. Content Script extracts deterministic `RuleContext`.
2. Service Worker orchestrates scan jobs, same-origin crawl, ruleset lookup, and persistence.
3. Shared core owns message contracts, schema validation, rule engine, and reporting utilities.

### Data and Contracts

1. `ScanSnapshot`, `CrawlNode`, and `DiffResult` are the core runtime artifacts.
2. Message contracts support:
   - `scan:start`
   - `issues:list`
   - `report:build`
   - `history:list/latest/compare`
   - `ruleset:get` / `ruleset:update`

### Ruleset Model

1. `AddonRuleCatalog` is stored in-bundle at `src/shared/rulesets/default-rulesets.json`.
2. Catalog can be updated at runtime via `ruleset:update`.
3. Current machine-readable categories in bundle:
   - `seo`
   - `geo`
   - `aeo`
   - `security-headers`
   - `WCAG2.1AA`
   - `WCAG2.2AA`

### Security and Hardening

1. Crawl queue validates same-origin and redirect targets.
2. DNS/private IP range checks prevent SSRF and local network access.
3. Backend errors preserve deterministic local fallback policy when not required.
4. Workspace watcher is intentionally deferred.

---

## Validation Against Original Backlog

| # | Capability | Status | Evidence | Remediation |
| --- | --- | --- | --- | --- |
| 1 | Async crawl depth/max-URL + same-domain bounds | ✅ Implemented | `src/background/orchestrator.ts` | Phase 1 closed |
| 2 | SSRF + redirect re-validation | ✅ Implemented | `src/background/orchestrator.ts` | Phase 1 closed |
| 3 | Multi-engine scraping (`http`, `fast-obscura`, `stealth-playwright`, `mcp`) | ⚠️ Partial | Engine recommendation and endpoint selection in backend bridge | transport phase complete; server-side parity remains |
| 4 | Anti-bot advisor + recommendation | ✅ Implemented | `src/shared/anti-bot.ts` | Phase 1 closed |
| 5 | Pluggable evaluators: SEO/AEO/Accessibility/UX + GEO + others | ⚠️ Partial | Core DOM evaluators implemented; other domains represented in catalog | evaluator expansion remaining |
| 6 | Broken-link + Drupal API exposure probing | 🚧 Remaining | not implemented | future phase |
| 7 | Report generation (JSON/HTML/LLM/GEO XML) | ✅ Implemented | `src/ui/export.ts` + `src/background/service-worker.ts` | Phase 6 closed |
| 8 | CI exit contracts (`--fail-on-critical`, exit code 2) | ✅ Implemented | `scripts/audit-budget.mjs`, `test:unit` coverage | Phase 6 closed |
| 9 | Optional persistence + semantic search | ⚠️ Partial | local history + catalog storage | DuckDB/LanceDB deferred |
| 10 | Historical diff with stable issue IDs | ✅ Implemented | `src/shared/rule-engine.ts` | Phase 1 closed |
| 11 | Workspace watcher mode | 🚧 Deferred | post-MCP reminder | post-MCP queue |

### Backlog B Status

- Epic 1: Task 1 complete, task 4 complete, export present; issue panel state + explicit rescan action remain.
- Epic 2: Tasks 1-4 complete (crawl-lite queue, explicit failures, limits).
- Epic 3: Local persistence and compare are implemented; IndexedDB/docs work remains for hardening.

---

## Merged Phase-wise Backlog (Remaining)

### Phase A — Deferred Capability Parity
- Implement performance/PageSpeed, broken-link discovery, Drupal API probing, and remaining security/coverage checks.
- Add category execution gates so all catalog categories can be enabled/disabled consistently.

### Phase B — Backend/Engine Extension
- Expand backend runtime integration beyond transport wiring to actual engine-specific behavior contracts and hardening.

### Phase C — Persistence Evolution
- Add optional DuckDB/LanceDB + semantic search adapters with local fallback.

### Post-MCP (Deferred)
- Workspace watcher mode.
