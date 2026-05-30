# Implementation Plan (Multiphase TDD + Beads)

## Outcome
Deliver browser-addon-lite to match `backlog.md` while keeping deterministic local behavior as default.

## Bead Format
- `BEAD-####`: single deliverable with explicit test gate.
- Scope is locked before implementation and validated after each phase.

## Phase 1 — Rule Core and Contracts
- BEAD-0001: `src/shared/types.ts`, `src/shared/contracts.ts`, `src/shared/rules/`
- BEAD-0002: `tests/shared/contracts.test.ts`, `tests/shared/rule-engine.test.ts`
- Validation:
  - `pnpm test -- --run`

## Phase 2 — Orchestrator + Crawl-Lite Runtime
- BEAD-0003: `src/background/orchestrator.ts`
- BEAD-0004: Crawl node schema, dedupe, same-origin filtering, and timeout/CORS/non-html error cases
- BEAD-0005: `tests/background/orchestrator.test.ts`
- Validation:
  - `pnpm test -- --run`

## Phase 3 — Add-on Contracts, Messaging, and Runtime Wiring
- BEAD-0006: `src/shared/message-contracts.ts`, `src/background/service-worker.ts`, `src/background/storage.ts`, `src/background/scan-history.ts`
- BEAD-0007: `tests/background/scan-history.test.ts`, `tests/phase4/smoke.test.ts`
- Validation:
  - `pnpm run build`
  - `pnpm test -- --run`

## Phase 4 — Persistence, Export, and Local History UX Baseline
- BEAD-0008: `src/ui/grouping.ts`, `src/ui/export.ts`
- BEAD-0009: `tests/ui/grouping-and-export.test.ts`
- Validation:
  - `pnpm test -- --run`

## Phase 5 — Backend Connector + Ruleset Catalog
- BEAD-0010: `src/background/backend-bridge.ts`, `src/background/ruleset-catalog.ts`, `src/background/service-worker.ts`
- BEAD-0011: `api/openapi.yaml` OpenAPI v3 contract
- BEAD-0012: `src/shared/rulesets/default-rulesets.json`, `src/shared/rulesets/catalog.ts`
- BEAD-0013: `tests/background/ruleset-catalog.test.ts`, `tests/background/orchestrator-backend.test.ts`
- Capability:
  - Remote backend via `basic` auth (`http`) and optional `stdin` executor mode.
  - Local fallback to embedded rulesets when backend is disabled or unavailable.
  - CRUD-style local catalog retrieval/update (`ruleset:get`, `ruleset:update`) in service-worker.
- Validation:
  - `pnpm run build`
  - `pnpm test -- --run`

## Phase 6 — Capability Gap Closure
- BEAD-0014: Missing parity items from original backlog: SSRF/DNS range checks, redirect revalidation, anti-bot recommendation/engine selection.
  - Validation: `pnpm test -- --run`, `pnpm run build`.
- BEAD-0015: Add issue-level API and report formats for JSON/HTML/LLM markdown/GEO XML.
  - Validation: `pnpm test -- --run`, `pnpm run build`.

## Phase 6 Closure Notes
- `report:build` and `issues:list` message handlers now expose issue filtering and report rendering from addon runtime.
- `export.ts` now supports `html`, `llm-markdown`, and `geo-xml`.
- `orchestrator.ts` now includes redirect/candidate validation and restricted-host filtering for crawl operations.
- `anti-bot.ts` provides heuristics-driven engine recommendation for backend mode.
- OpenAPI contract updated with backend mode/engine coupling and issue/report paths for additive backend parity.

## Phase 7 — Unit Suite: Backend-Failure Contracts
- BEAD-0016: Extend `tests/background/orchestrator-backend.test.ts` with strict unit assertions for recommendation contract and fallback policy.
- Validation (named phase gate):
  - `pnpm run test:unit`
  - `pnpm run build`
- Assertions:
  - `backend-fallback`: concrete recommendation fields when optional backend fails.
  - `issues:policy`: fallback source policy stays `dom-only`.

## Phase 8 — Integration Suite: Backend Failure Modes
- BEAD-0017: Expand `tests/background/backend-failure-integration.test.ts` for service-worker orchestration and transport-mode behavior.
- Validation (named phase gate):
  - `pnpm run test:integration`
- Assertions:
  - HTTP fallback is returned as concrete scan success when optional endpoint backend fails.
  - `issues:list` enforces source/domain/severity filtering after fallback.
  - stdio fallback returns concrete recommendation and dom-only issue policy.
  - `required-backend-hard-fail`: mandatory backend failures fail scan in both `http` and `stdio` modes.

## Phase 9 — CI Matrix: Backend Labels
- BEAD-0018: Split CI test execution into strict, named matrix labels.
- Validation (named phase gates):
  - `pnpm run test:ci:backend-fallback`
  - `pnpm run test:ci:issues:policy`
  - `pnpm run test:ci:required-backend-hard-fail`
- Wiring:
  - `.github/workflows/test-matrix.yml`
  - Matrix labels: `unit`, `integration`, `backend-fallback`, `issues:policy`, `required-backend-hard-fail`
  - Label-to-script mapping:
    - `backend-fallback` -> `test:ci:backend-fallback`
    - `issues:policy` -> `test:ci:issues:policy`
    - `required-backend-hard-fail` -> `test:ci:required-backend-hard-fail`

## Post-MCP Reminder
  - Workspace watcher remains intentionally deferred and is scheduled for a post-MCP phase.

## Phase 10 — Backend Host Policy and Allowlist Gate
- BEAD-0019: Add runtime host-policy enforcement for backend endpoints with optional loopback allow flag, allowlist normalization, and policy tests.
- Validation (named phase gates):
  - `pnpm run build`
  - `pnpm run test:unit`
  - `pnpm run test:integration`
  - `pnpm run test:ci:backend-fallback`
  - `pnpm run test:ci:issues:policy`
  - `pnpm run test:ci:required-backend-hard-fail`
- Scope:
  - `src/background/host-policy.ts`
  - `src/background/service-worker.ts`
  - `src/shared/contracts.ts` and `src/shared/types.ts` (`allowedHosts`)
  - `tests/background/host-policy.test.ts`
  - `tests/background/backend-failure-integration.test.ts`
  - `api/openapi.yaml`

## Phase 11 — Side Panel-First Shell Migration (TDD Required)
- BEAD-0020: Convert shell to side panel-first by adding `side_panel.default_path` and keeping popup compatibility during migration.
- BEAD-0021: Add click/context-menu open flow in service worker for active tab side-panel launch.
- BEAD-0022: Add side-panel HTML entrypoint and state bootstrap wiring from existing popup state model.
- Validation (must run before completion claim):
  - `pnpm run test:unit` (new shell + runtime contract tests)
  - `pnpm run test:integration` (message flow + history + export wiring)
  - `pnpm run test:e2e` (side panel open flow and action/context-menu behavior)
  - `pnpm run test:ui-load:strict` (runtime smoke, no jsdom fallback)
- TDD gate:
  - For each BEAD, write failing test first, verify red, then implement minimal pass.
  - No production code for side-panel migration without a preceding failing test.

## Phase 12 — Imported Addon Capability Integration (TDD + Verification-First)
- BEAD-0023: Accessibility scan profile uplift from reference addon patterns (axe tag/profile configurability, deterministic violations pipeline).
- BEAD-0024: SEO/AI-visibility extraction uplift from reference addon patterns (headings hierarchy, canonical/url/link/image metadata depth).
- BEAD-0025: Highlight and issue-focus UX parity (stable selector targeting and clear-highlight flows).
- BEAD-0026: History/compare UX upgrades in side panel (snapshot compare surface and export continuity).
- Validation (must run before completion claim):
  - `pnpm run test:unit`
  - `pnpm run test:integration`
  - `pnpm run test:e2e`
  - `pnpm exec vitest --run --coverage --exclude tests/side-panel/side-panel.playwright.spec.ts`
- Verification-before-completion gate:
  - Completion or "done" claims are blocked unless fresh command outputs above are captured and green.

## Phase 13 — Multi-Store Publish Automation (GitHub Actions)
- BEAD-0027: Deterministic release packaging pipeline producing:
  - canonical store upload zip (`dist` payload),
  - signed Firefox `.xpi` via `web-ext sign`,
  - `.crx` bundle for Chromium-family sideload/enterprise use.
- BEAD-0028: Automated store submission/publish lanes:
  - Chrome Web Store API publish for existing item ID.
  - Microsoft Edge Add-ons REST API publish for existing product ID.
  - Firefox AMO listed-channel submission via `web-ext sign`.
- BEAD-0029: Environment and secret governance:
  - GitHub environments (`staging`, `production`) with required reviewers.
  - Store credentials as environment-scoped secrets.
  - OIDC where supported; short-lived tokens preferred over long-lived secrets.
- Validation (must run before completion claim):
  - `pnpm run build`
  - `pnpm run test:unit`
  - `pnpm run test:integration`
  - `pnpm run test:e2e`
  - `pnpm run test:ui-load:strict`
  - Dry-run publish workflow to staging lanes only.
  - Production publish from signed tag only.
- Documentation:
  - `docs/roadmap/store-publish-automation.md`
  - release runbook updates with rollback and re-submit paths per store.

## Current Execution Outcome
- Phases 1-10 and PR-11 are complete under this repo scope.
- Remaining implementation debt is explicitly deferred or tracked in `backlog.md`:
  - deeper remote engine parity beyond transport wiring
  - performance/PageSpeed and full WCAG/security/Drupal evaluator families
  - broken-link and Drupal API discovery probes
  - DuckDB/LanceDB + semantic search
- workspace watcher mode

## PR-11 — Runtime Bootstrap Reliability (Completed)
- Bundle service-worker and content-script at extension root.
- Keep host-permission surface minimal (only `storage`, `activeTab`, `scripting`, empty `host_permissions`).
- Add build-time copy to `dist/service-worker.js` and `dist/content-script.js` for predictable package mode.

## Exit Criteria
- All checks green after each phase.
- `pnpm run build`
- `pnpm test -- --run`

## Reminder
- Workspace watcher mode is intentionally deferred to **post-MCP integration** phase.
