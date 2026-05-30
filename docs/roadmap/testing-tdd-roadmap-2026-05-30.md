# Testing TDD Roadmap (2026-05-30)

## Goal
Implement all identified testing recommendations with strict test-driven development:
- Write failing test first (RED)
- Implement minimal change (GREEN)
- Refactor safely (REFACTOR)

## Baseline (2026-05-30)
- `test:unit` passed
- `test:integration` passed
- `test:e2e` passed
- `test:ui-load` failed due to TypeScript errors in `src/side-panel/side-panel.ts`
- Coverage: statements `88.94%`, branches `77.51%`, functions `92.29%`, lines `88.92%`

## Phase 0: Stabilize Gate Preconditions
1. RED: Add/adjust a focused test that captures the `unknown[]` typing path in side-panel latency metrics usage.
2. GREEN: Apply minimal typing fix in `src/side-panel/side-panel.ts` and/or helper function signatures.
3. Verify: `pnpm run test:unit -- tests/side-panel/*` and `pnpm run test:ui-load`.

## Phase 1: Unit Test Quality Hardening
1. Replace vacuous assertions with behavior assertions:
   - `tests/background/service-worker-context.test.ts`
2. Remove global mutation flake risk:
   - enforce `try/finally` for every `globalThis.fetch` override in `tests/background/backend-bridge.test.ts`
3. Add missing branch-depth tests (RED first for each):
   - unsupported target: `chrome-extension://...` classification
   - unsupported target: `file://...` classification
   - axe cache behavior: first scan injects `axe.min.js`, second scan same tab reuses cache
4. Verify:
   - `pnpm run test:unit -- tests/background/service-worker-context.test.ts tests/background/backend-bridge.test.ts`

## Phase 2: Integration Boundary Coverage
1. RED: Add side-panel integration tests for `scan:start` hard-fail (`ok: false`) and assert:
   - visible error/unsupported state
   - status pill/status line semantics
   - safe retry flow
2. RED: Add history bootstrap error-propagation assertions (`history:list`/`history:compare` failures).
3. GREEN: Minimal side-panel behavior changes only where tests prove missing behavior.
4. Verify:
   - `pnpm run test:integration -- tests/side-panel/side-panel-interactions.test.ts tests/side-panel/side-panel-tabs.test.ts`

## Phase 3: E2E Runtime Realism
1. RED: Add strict extension-runtime Playwright scenario that fails if fallback `file://` bootstrap is used.
2. RED: Add e2e scenario for runtime failure journey (`scan:start` reject/timeout path surfaced to user).
3. GREEN: Minimal Playwright harness and script changes (`scripts/run-side-panel-playwright.mjs` / `tests/side-panel/side-panel.playwright.spec.ts`) to enforce extension-origin execution.
4. Verify:
   - `pnpm run test:e2e`
   - `pnpm run test:side-panel:connected` (when runtime is available)

## Phase 4: CI Policy and Threshold Hardening
1. RED: Add CI test assertions for branch threshold and e2e gate requirements.
2. GREEN:
   - raise branch threshold target (proposed: `78` then `80` when Phase 3 lands)
   - ensure CI includes strict runtime-realist lane
3. Verify:
   - `pnpm run test:integration -- tests/phase4/ci-release-readiness.test.ts`

## Phase 5: Full Regression and Coverage Audit
1. Run full suite:
   - `pnpm run test:unit -- --coverage`
   - `pnpm run test:integration -- --coverage`
   - `pnpm run test:e2e`
   - `pnpm run test:ui-load`
2. Capture updated metrics and unresolved gaps in `docs/roadmap/testing-coverage-uplift.md`.

## Definition of Done
- All new tests were observed failing before code changes.
- `test:ui-load` passes.
- Runtime-realism e2e checks no longer rely on `file://` fallback for core path.
- Unit/integration/e2e gap findings from 2026-05-30 audit are addressed or explicitly documented with follow-up issues.

## Implementation Tracker (2026-05-30)
### Completed
- Phase 0 GREEN: fixed side-panel latency typing path by normalizing storage payload before `computeLatencyStats` and `appendLatencySample`.
- Phase 1 GREEN: hardened `backend-bridge` fetch override cleanup with `try/finally` and stricter auth/signature assertions.
- Phase 1 GREEN: added service-worker unsupported target coverage for `chrome-extension://` and `file://`.
- Phase 1 GREEN: added repeated-axe-injection cache reuse assertion for same tab.
- Phase 2 GREEN: added side-panel integration failure + retry flow assertions for `scan:start`.
- Phase 4 GREEN: raised Vitest branch threshold gate from `77` to `78` and codified threshold check in CI-readiness test.

### Validated in this run
- `pnpm -s vitest --run tests/background/backend-bridge.test.ts`
- `pnpm -s vitest --run tests/background/service-worker-context.test.ts tests/side-panel/side-panel-interactions.test.ts`
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:ui-load`

### Remaining
- Phase 3 runtime-realism e2e is blocked in this environment by Playwright Chromium launch permission error (`MachPortRendezvousServer ... Permission denied (1100)`), so `pnpm run test:e2e` could not be validated locally here.
- When environment allows browser launch, run:
  - `pnpm run test:e2e`
  - `pnpm run test:ui-load:strict`
