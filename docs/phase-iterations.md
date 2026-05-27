# Phase Iterations

This doc turns the remaining backlog into phased execution slices.

## Iteration 1: Readiness And Offline Trust

Scope:
- `stealth-lightbeacon-browser-addon-zca.1.1`
- `stealth-lightbeacon-browser-addon-zca.1`
- `stealth-lightbeacon-browser-addon-zca.6.2`
- `stealth-lightbeacon-browser-addon-zca.6.2.1`

Goal:
- Keep the repo above the documented validation gate before expanding the
  browser-automation surface.

Exit criteria:
- Coverage audit completed and tied to explicit follow-up work.
- Offline-only extension harness runs cleanly.
- Current unit, integration, and UI-load gates remain green.

Release signal:
- Safe foundation for a minor release candidate, but not enough on its own
  unless the higher-value P1 slices are also closed.

Implementation plan:
- See `docs/iteration-1-plan.md` for the execution-ready task breakdown and
  validation gates.

## Iteration 2: Browser-Visible User Value

Scope:
- `stealth-lightbeacon-browser-addon-zca.6.3`
- `stealth-lightbeacon-browser-addon-zca.6.3.1`
- `stealth-lightbeacon-browser-addon-zca.6.4`
- `stealth-lightbeacon-browser-addon-zca.6.4.1`
- `stealth-lightbeacon-browser-addon-zca.6.5`
- `stealth-lightbeacon-browser-addon-zca.6.5.1`
- `stealth-lightbeacon-browser-addon-zca.6.6`
- `stealth-lightbeacon-browser-addon-zca.6.6.1`

Goal:
- Close the highest user-value gaps in the browser UI: accessibility,
  security-header visibility, and popup / side-panel reliability.

Exit criteria:
- Playwright coverage exists for the browser shell and the high-value audit
  families.
- Accessibility and security findings render deterministically in-browser.
- Offline browser smoke remains stable.

Release signal:
- This is the earliest sensible minor release boundary once the validation
  gate remains green and the browser-facing slices are complete.

## Iteration 3: Content-Intent Depth And Governance

Scope:
- `stealth-lightbeacon-browser-addon-zca.6.7`
- `stealth-lightbeacon-browser-addon-zca.6.7.1`
- `stealth-lightbeacon-browser-addon-zca.6.7.2`
- `stealth-lightbeacon-browser-addon-zca.6.7.3`
- `stealth-lightbeacon-browser-addon-zca.6.8`
- `stealth-lightbeacon-browser-addon-zca.6.8.1`
- `stealth-lightbeacon-browser-addon-zca.6.9`
- `stealth-lightbeacon-browser-addon-zca.6.9.1`
- `stealth-lightbeacon-browser-addon-zca.6.9.2`

Goal:
- Expand the content-intent surface and add shared schema / enablement
  controls so the audit families remain consistent as the catalog grows.

Exit criteria:
- SEO, AEO, GEO, performance, and governance all have browser-visible and
  unit-visible coverage.
- Shared reporting stays stable across the knowledge-base families.

Release signal:
- Strong minor-release candidate once the browser-visible slices land.

## Iteration 4: Workflow Maturity

Scope:
- `stealth-lightbeacon-browser-addon-zca.6.10`
- `stealth-lightbeacon-browser-addon-zca.6.11`
- `stealth-lightbeacon-browser-addon-zca.6.12`

Goal:
- Finish the deferred persistence and workflow features.

Exit criteria:
- Workspace watcher is gated and reproducible.
- Historical persistence and trend queries preserve local-first behavior.
- Remote engine selection remains deterministic and testable.

Release signal:
- Major release planning belongs here, after the P0/P1 slices are stable and
  the workflow maturity items are closed.

## Ordering Rule

The execution order is:
1. Readiness and offline trust.
2. Browser-visible user value.
3. Content-intent depth and governance.
4. Workflow maturity.

Do not start Iteration 3 or 4 until Iteration 2 is release-clean.
