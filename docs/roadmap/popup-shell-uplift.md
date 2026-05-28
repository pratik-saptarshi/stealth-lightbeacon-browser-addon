# Popup Shell Uplift

This document tracks the consolidated popup UX work for the browser addon.

## Scope

- Tab shell with working `Overview`, `Connection`, `Results`, and `Settings` navigation.
- Standalone audit explanation on the `Connection` tab, including local-only audit behavior and bundled report generation.
- Concise per-tab guidance on the `Overview` tab.
- Responsive theme-color grid and popup layout adjustments in `Settings`.
- Results history, report download actions, and working collapse/expand controls.

## Feature Decomposition

| Area | Problem | Fix | Validation gate | Status |
| --- | --- | --- | --- | --- |
| Tabs | Tab buttons were present conceptually but did not control distinct views. | Add a real tab shell and synchronize ARIA / active state. | Vitest tab-switch tests and browser automation. | in progress |
| Connection | Standalone audit expectations were not explained in the popup. | Surface the local-only audit path, bundled rules, and report bridge. | Startup history load, connection tab smoke, and report download tests. | in progress |
| Overview | The popup did not explain each tab compactly. | Add quick cards for each tab and a direct jump action. | DOM assertions for overview copy and tab navigation. | in progress |
| Settings | Theme inputs needed a denser but responsive layout. | Keep theme colors in a responsive grid and preserve small-screen usability. | Browser layout check for grid behavior and mobile wrap. | in progress |
| Results | Runs were not listed, and report downloads were split across ad hoc exports. | Add a run history list and standard report downloads for JSON, Markdown, HTML, and PDF. | Report-generation tests and history-entry browser smoke. | in progress |
| Collapse controls | Expand/collapse affordances existed conceptually but had no effect. | Wire the controls to the results details state and keep the state stable across rerenders. | Collapse/expand DOM assertions and rerender checks. | in progress |

## Validation Gates

- Unit/integration coverage target: `>= 90%`.
- Browser-level checks: tab switching, responsive grid behavior, history rendering, report downloads, and collapse/expand controls.
- No regressions in the existing popup startup, clipboard fallback, and settings persistence paths.

## Notes

- The popup is now organized around the same runtime contracts that already exist in the background service worker: `history:compare`, `history:list`, and `report:build`.
- The report buttons use the background bridge when available and fall back to local generation when needed.
