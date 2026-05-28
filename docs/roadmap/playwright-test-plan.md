# Playwright Test Plan

This plan turns the offline-eval roadmap into browser automation slices that
are explicit in Beads and ordered by user value.

## Scope

- Offline-only checks stay in unit, jsdom, and existing smoke coverage.
- Browser-required checks move into Playwright persistent-context flows.
- Each row below maps to a concrete Beads child issue created from the roadmap.

## Matrix

| User value priority | Beads child issue(s) | Offline-only checks | Playwright checks | Pass criteria |
| --- | --- | --- | --- | --- |
| P0 trust baseline | `stealth-lightbeacon-browser-addon-zca.6.2.1` | Preserve `scripts/extension-load-smoke.mjs` and `tests/phase4/smoke.test.ts` as the no-network gate. | Load the packaged extension in a persistent context, open the popup on a local fixture page, and verify no external requests escape. | Extension loads offline; popup renders; offline banner, status, summary, and export controls behave; packaged `axe.min.js` remains available. |
| P1 browser shell | `stealth-lightbeacon-browser-addon-zca.6.3.1` | Keep contract coverage for popup initialization and state transitions. | Exercise popup and side-panel sizing, tab order, control reachability, and responsive breakpoints. | UI remains usable across viewports; focus and tab order stay stable; offline smoke remains green. |
| P1 accessibility parity | `stealth-lightbeacon-browser-addon-zca.6.4.1`, `stealth-lightbeacon-browser-addon-zca.6.5.1` | Keep structural and interaction rule fixtures deterministic in jsdom/unit coverage. | Run keyboard, focus, ARIA, and contrast checks against rendered local pages and popup flows. | Accessibility findings render with stable IDs; keyboard and focus regressions are caught in-browser. |
| P1 security depth | `stealth-lightbeacon-browser-addon-zca.6.6.1` | Keep catalog and report serialization coverage for security-header outputs. | Serve local HTTP fixtures with varying CSP, HSTS, and referrer-policy headers, then rescan. | Present, missing, and weak header cases emit deterministic findings and group correctly in reports. |
| P1 content-intent depth | `stealth-lightbeacon-browser-addon-zca.6.7.1`, `stealth-lightbeacon-browser-addon-zca.6.7.2`, `stealth-lightbeacon-browser-addon-zca.6.7.3` | Preserve title/meta/H1/canonical and export-format unit coverage. | Render local pages with structured data, answer blocks, semantic content, robots/sitemap cues, and duplicate indexability signals. | SEO, AEO, and GEO findings appear from browser-rendered fixtures; grouped counts and export fidelity stay stable. |
| P1 performance depth | `stealth-lightbeacon-browser-addon-zca.6.8.1` | Keep deterministic local-only performance summaries and thresholds in non-browser tests. | Exercise local fixture pages that trigger performance and PageSpeed-oriented findings. | Performance findings emit stable IDs and summary buckets; local-only measurement stays explicit. |
| P1 governance | `stealth-lightbeacon-browser-addon-zca.6.9.1`, `stealth-lightbeacon-browser-addon-zca.6.9.2` | Keep catalog/version normalization coverage in unit tests. | Verify ruleset enablement toggles and cross-KB normalization in browser-facing flows. | Rule families can be turned on and off without code churn; shared schema stays stable across families. |

## Execution Order

1. P0 trust baseline.
2. P1 browser shell and accessibility parity.
3. P1 security and content-intent depth.
4. P1 performance and governance.

## Validation Gate

- No row is complete until the offline-only checks and the Playwright checks both pass.
- The current smoke baseline remains `npm run test:ui-load` until the P0 Playwright slice is added to CI.
