# Release Milestones

This doc turns the offline-eval backlog into concrete release-planning points.
It uses the repo's documented validation gates as the primary release signal:
`pnpm run test:unit`, `pnpm run test:integration`, `pnpm run test:ui-load`, and
the budget gate, with line coverage currently above 80%.

## Current Validation Snapshot

- Line coverage: `83.71%`
- Statement coverage: `83.73%`
- Function coverage: `89.26%`
- Branch coverage: `66.81%`

Branch coverage is still the lowest residual metric in the latest summary.
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
- `pnpm run build`, `pnpm test -- --run`, and `pnpm run test:ui-load` pass.
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

- Minor release planning: not yet ready, because the P0/P1 slices are still
  open.
- Major release planning: later, after the P2 slices are complete.
- See `docs/phase-iterations.md` for the ordered backlog phases that feed
  these release gates.
