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
