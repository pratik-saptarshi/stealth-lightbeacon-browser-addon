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

### Epic 4: Add-on Branding and Browser Action Icon

- Feature: Balanced visibility icon and browser-action button treatment.
- User story: As a marketer, I can instantly identify scan state and issue severity in the toolbar.
- Tasks:
  1. Add scalable SVG icon at `src/assets/icon.svg` using the approved markup.
  2. Generate extension icon sizes from the SVG for `manifest.json` (`16/32/48/64/128`).
  3. Add dynamic toolbar state swap (e.g., normal/alert/fail) using the inline color values.
  4. Add fallback icon behavior for environments that do not render animated SVG.

### Reference SVG (`src/assets/icon.svg`)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="Lightbeacon Security Metric Icon">
  <defs>
    <clipPath id="badgeClip">
      <circle cx="64" cy="64" r="40"></circle>
    </clipPath>

    <style>
      .issue-flash {
        animation: pulse 1.8s infinite ease-in-out;
        transform-origin: 64px 52px;
      }
      @keyframes pulse {
        0% { opacity: 0.3; transform: scale(0.9); }
        50% { opacity: 0.9; transform: scale(1.1); }
        100% { opacity: 0.3; transform: scale(0.9); }
      }
      .metric-text {
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
    </style>
  </defs>

  <!-- Toggle grade color for state (normal/danger/success) -->
  <text x="64" y="20" text-anchor="middle" class="metric-text" font-size="18" font-weight="900" fill="#990000">A</text>

  <circle cx="64" cy="64" r="42" fill="none" stroke="#2C3E50" stroke-width="2"></circle>

  <g clip-path="url(#badgeClip)">
    <rect x="20" y="20" width="88" height="88" fill="#A8DADC"></rect>

    <path d="M82,48 C85,48 87,46 87,43 C87,40 84,38 81,39 C80,36 76,34 73,36 C70,36 68,38 68,41 C66,41 64,43 64,45 C64,47 66,49 68,49 Z" fill="#F1F1F1" opacity="0.9"></path>

    <rect x="20" y="78" width="88" height="30" fill="#1D3557"></rect>

    <polygon points="64,52 34,92 94,92" fill="#F1C40F" opacity="0.4"></polygon>

    <polygon points="56,94 72,94 68,58 60,58" fill="#E67E22" stroke="#D68A0A" stroke-width="1"></polygon>
    <rect x="60" y="48" width="8" height="10" fill="none" stroke="#E67E22" stroke-width="1.5"></rect>
    <polygon points="58,48 70,48 64,40" fill="#E67E22"></polygon>

    <path d="M59,76 L63,80 L70,70" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
  </g>

  <circle cx="64" cy="52" r="10" class="issue-flash" fill="#E74C3C" opacity="0.6" style="mix-blend-mode: screen;"></circle>
  <circle cx="64" cy="52" r="3" fill="#E74C3C"></circle>

  <!-- Toggle counter text color with state mapping -->
  <text x="64" y="122" text-anchor="middle" class="metric-text" font-size="15" font-weight="700" letter-spacing="-0.5" fill="#D49A17">999</text>
</svg>
```

Implementation notes:
- Use the `Blood-Red` color (`#990000`) and `Dirty-Yellow` color (`#D49A17`) via inline styles and swap tokens at runtime.
- Keep grade text at `y="20"` and counter at `y="122"` to avoid clipping under the circular badge.
- The badge geometry is aligned to center (`r="40"`) to preserve legibility for triple-digit counts like `999`.

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

## Plan-Review Integrator Remediation Backlog

### Classified Findings

- Delivery & Product Risk
  - No published extension (Chrome Web Store / AMO).
  - Missing user documentation and onboarding examples.
  - No batch / multi-tab scanning or scheduling automation.

- Capability Risk
  - Incomplete advanced ruleset (performance/PageSpeed, Drupal/security, deep AEO/GEO, full security checks).
  - Broken-link discovery and Drupal API exposure probing still partial.
  - Local-only storage evolution (DuckDB/LanceDB + semantic search) not complete.

- Security & Privacy Risk
  - DOM-exposure/privacy exposure around sensitive fields during backend send.
  - Stdio execution payload (`__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__`) lacks strict sandbox policy.
  - Backend endpoint trust and host-policy enforcement still needs hardened allow/deny semantics.
  - Input/output sanitization and request signing are not fully codified.

- Reliability & Quality Risk
  - Manifest CSP currently absent.
  - Retry/queue behavior for backend/transport failures is coarse.
  - Large-page extraction/processing can spike memory/CPU.
  - Test vectors for iframe/shadow-DOM/error-path coverage are not exhaustive.

### Prioritized Multi-Phase Implementation Plan

#### Phase PR-1 — Security, Privacy, Data Safety (Now, 1–2 weeks)
- P0: add explicit extension-level CSP and permission tightening.
- P0: add explicit runtime policy and signed backend request headers for transport calls.
- P0: add consent flow for remote backend submission and minimal PII redaction.
- P0: harden stdio bridge with whitelist-based binary/argument schema and execution timeout.
- PR-TEST-01: unit tests for policy validation + signed request generation.
- PR-TEST-02: integration tests for opt-in gating and redaction.
- PR-TEST-03: regression test for CSP and denied inline execution paths.

#### Phase PR-2 — Capability Completion (Now, 2–3 weeks)
- P1: implement advanced rule families:
  - PageSpeed/Performance checks,
  - Drupal + security-header checks,
  - GEO/AEO quality heuristics.
- P1: finish broken-link discovery and Drupal API probing feature.
- P1: complete EvalA11y-derived WCAG 2.1/2.2 rule coverage in DOM engine.
- PR-TEST-04: property-based tests for host-safe link extraction and issue canonical IDs.
- PR-TEST-05: golden fixtures for each new category with deterministic issue IDs.

#### Phase PR-3 — Backend Robustness & Interop (Now→Next, 1.5–2 weeks)
- P1: OAuth2/API-key auth option in backend client config.
- P1: robust retry/queue and circuit-breaker logic for transport failures.
- P1: cert pinning and endpoint allowlist sync in `host-policy`.
- P1: explicit backend vs local-fallback policy tests for partial mode failures.
- PR-TEST-06: integration tests for backend hard-fail/fallback matrix.
- PR-TEST-07: negative tests for SSRF, redirected host swap, loopback restrictions.

- PR-TEST-08: compatibility tests for Firefox MV3 + Chrome Edge fallback paths.

#### Phase PR-4 — Scale, UX, and Operator Features (Next, 2–3 weeks)
- P1: batch/multi-tab scan orchestration with bounded fan-out and dedupe.
- P1: background scheduling triggers (`cron-like`) with user-defined intervals.
- P1: local indexed history diff dashboard + policy-driven retention.
- P1: release artifact pipeline: browser-store submission checklists and release notes.
- PR-TEST-09: integration tests for tab-batch orchestration and concurrency limits.
- PR-TEST-10: e2e smoke for schedule simulation + manifest/permission compatibility.

#### Phase PR-5 — Market Readiness (Later, 1–2 weeks)
- P2: publish to Chrome Web Store and AMO.
- P2: ship user guide, config matrix, and troubleshooting guide.
- P2: add rule-catalog governance docs and migration notes.
- PR-TEST-11: acceptance checklist for install paths, signed package verification, documentation smoke.

#### Post-MCP Reminder
- Workspace watcher mode remains scheduled post-MCP.

### Action Mapping to Existing Backlog

1. PR-1 items map to security/privacy hardening and host-policy completion.
2. PR-2 items map to "Deferred capability parity" + accessibility parity.
3. PR-3 items map to backend contract, connector, and auth hardening.
4. PR-4 items map to scale/automation and operator functionality.
5. PR-5 items map to final release/readiness closure.
