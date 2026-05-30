# Addon Feature Integration Plan (Reference Addons -> Stealth Lightbeacon)

## Objective
- Integrate relevant feature patterns from:
  - `tmp/<reference-addon-a>/`
  - `tmp/<reference-addon-b>/`
- Preserve current repo strengths:
  - typed contracts, deterministic behavior, test coverage, strict CI gates
- Deliver shell migration to side panel-first:
  - `manifest.side_panel.default_path`
  - action click/context-menu open flow

## Non-goals
- No broad-permission regression (`<all_urls>` is not adopted by default).
- No untyped, global-state architecture regression.
- No direct code copy from addon bundles without adaptation to current contracts.

## Source Findings -> Plan Mapping (Traceability)
| Finding ID | Source | Imported concern | Category | Plan action |
| --- | --- | --- | --- | --- |
| AF-01 | Reference addon A manifest + SW | Side panel-first UX with action/context-menu open | Must-fix | Phase 11 BEAD-0020/0021 |
| AF-02 | Reference addon A scanner | Configurable axe profile execution | Bundle | Phase 12 BEAD-0023 |
| AF-03 | Reference addon A SW | Highlight/clear focus workflow | Bundle | Phase 12 BEAD-0025 |
| QF-01 | Reference addon B auditor | Deeper SEO extraction primitives | Must-fix | Phase 12 BEAD-0024 |
| QF-02 | Reference addon B sidepanel | History/compare-centric panel workflow | Bundle | Phase 12 BEAD-0026 |
| QF-03 | Reference addon B manifest | Broad host/tabs permission posture | Defer (rejected) | Keep current least-privilege model |

## Delivery Stages

## Stage A — Side Panel Shell and Runtime Routing
### Scope
- Manifest update:
  - add `side_panel.default_path`
  - retain popup during transition with explicit deprecation notes
- Background runtime:
  - add `chrome.action.onClicked` side panel open behavior
  - add context menu entry and `chrome.contextMenus.onClicked` open flow
- UI entrypoint:
  - side panel bootstrap route to current popup state and rendering model

### TDD sequence
1. Add failing unit tests for manifest and side panel declarations.
2. Add failing background runtime tests for click/context-menu event handling.
3. Add failing integration test for side panel launch + state hydration.
4. Implement minimal code to pass.
5. Refactor for shared shell wiring with popup without behavior change.

### Verification gate
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`
- `pnpm run test:ui-load:strict`

## Stage B — Accessibility Scan Profile Uplift (Reference-derived)
### Scope
- Extend runtime-configurable accessibility profile tags:
  - WCAG A/AA/AAA and best-practice toggles
- Preserve current deterministic issue contracts and grouping pipeline.
- Add side panel controls for profile selection and explainability text.

### TDD sequence
1. Failing unit tests in shared rule/runtime settings normalization.
2. Failing integration tests for message contract -> scan execution mapping.
3. Failing e2e test for profile selection visibility and result impact.
4. Minimal implementation and refactor.

### Verification gate
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`

## Stage C — SEO/AI Visibility Extraction Depth (Reference-derived)
### Scope
- Extend extraction model with:
  - heading hierarchy sequence checks
  - canonical consistency signals
  - richer link and image metadata
  - URL quality signals
- Keep contract versioning explicit in `src/shared/contracts.ts`.

### TDD sequence
1. Failing unit tests for extractor additions and normalization.
2. Failing unit tests for rule-engine consumers of new signals.
3. Failing integration tests for end-to-end scan snapshot schema.
4. Minimal implementation and refactor.

### Verification gate
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm exec vitest --run --coverage`

## Stage D — Highlight UX + History/Compare Flow Uplift
### Scope
- Add explicit issue highlight and clear-highlight actions in side panel.
- Strengthen history compare workflow in side panel without breaking exports.
- Keep source policy and fallback behavior unchanged.

### TDD sequence
1. Failing unit tests for highlight action model and selector behavior.
2. Failing integration tests for service-worker message handling.
3. Failing e2e tests for highlight/clear and compare interaction flow.
4. Minimal implementation and refactor.

### Verification gate
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`

## Stage E — Hardening, CI Gating, and Release Readiness
### Scope
- Ensure CI has required green status for:
  - unit, integration, strict runtime smoke, playwright e2e
- Add release-note and migration-note updates:
  - side panel-first shell
  - compatibility and fallback notes

### TDD sequence
1. Add failing CI/pipeline tests where behavior changed.
2. Minimal workflow/config updates to pass.
3. Refactor scripts/docs only after green gates.

### Verification gate
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:e2e`
- `pnpm run test:ui-load:strict`
- `pnpm exec vitest --run --coverage`

## Governance Gates
- Security/data-integrity veto:
  - do not adopt broad host permissions unless explicitly approved.
- Scope expansion veto:
  - no paid-feature/paywall integration from reference-addon scope.
- Disputed critical rule:
  - if side panel migration breaks offline determinism, block stage close.

## Completion Criteria
- Side panel-first experience is default and verified by automated tests.
- Context menu + action click open flow is verified in browser automation.
- Imported extraction and accessibility features are contract-tested and regression-safe.
- Documentation and release notes are updated in-repo.
- No completion claim is made without fresh verification outputs.

## Iterative Execution Cadence (Backlog-Complete Loop)
For each stage (A -> E), repeat this loop until stage backlog is empty:
1. Select one BEAD-sized slice.
2. Write failing tests first (RED) and verify expected failure.
3. Implement minimal behavior to pass (GREEN).
4. Refactor without behavior drift.
5. Run stage verification gate commands and capture outputs.
6. Mark slice complete only when verification is green.

Do not advance to the next stage with open slices in the current stage.
