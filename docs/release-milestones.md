# Release Milestones

This doc turns the offline-eval backlog into concrete release-planning points.
It uses the repo's documented validation gates as the primary release signal:
`npm run test:unit`, `npm run test:integration`, `npm run test:ui-load`, and
the budget gate, with line coverage currently above 80%.

## Current Validation Snapshot

- Unit coverage: statements `88.41%`, lines `88.34%`, functions `94.36%`, branches `71.99%`
- Integration coverage: statements `90.69%`, lines `90.61%`, functions `95.49%`, branches `75.67%`
- Browser smoke: the build loads, but the current macOS smoke runner did not detect a service worker within the timeout

Branch coverage remains the lowest residual metric in the latest summary.
Treat it as a follow-up hardening target if your release policy requires every
coverage dimension to stay above 80%.

## Minor Release Planning

Plan a minor release when the P0/P1 offline-eval slices are closed:

- `stealth-lightbeacon-browser-addon-zca.6.2.1`
- `stealth-lightbeacon-browser-addon-zca.6.3.1`
- `stealth-lightbeacon-browser-addon-zca.6.4.1`
- `stealth-lightbeacon-browser-addon-zca.6.5.1`
- `stealth-lightbeacon-browser-addon-zca.6.6.1`
- `stealth-lightbeacon-browser-addon-zca.6.7.1`
- `stealth-lightbeacon-browser-addon-zca.6.7.2`
- `stealth-lightbeacon-browser-addon-zca.6.7.3`
- `stealth-lightbeacon-browser-addon-zca.6.8.1`
- `stealth-lightbeacon-browser-addon-zca.6.9.1`
- `stealth-lightbeacon-browser-addon-zca.6.9.2`

Minor-release gate:

- Offline-only validation harness exists and is stable.
- Playwright harness for popup, side-panel, security headers, SEO/AEO/GEO,
  accessibility, performance, and governance is present.
- `npm run build`, `npm test -- --run`, and `npm run test:ui-load` pass.
- Coverage remains above the documented line-coverage threshold.

## Major Release Planning

Plan a major release when the P2 workflow/persistence items are also complete:

- `stealth-lightbeacon-browser-addon-zca.6.10`
- `stealth-lightbeacon-browser-addon-zca.6.11`
- `stealth-lightbeacon-browser-addon-zca.6.12`

Major-release gate:

- P0/P1 and P2 backlog slices are closed.
- Browser automation is wired into CI for the P0/P1 matrix.
- Coverage remains stable at or above the documented threshold.
- Any remaining branch-coverage gap is either closed or explicitly accepted.

## Current Planning Status

- Public release `0.1.6` has been published from the current repository state.
- Minor release planning now tracks the remaining P0/P1 slices for the next cut.
- Major release planning remains later, after the P2 slices are complete.
