# Stealth Lightbeacon Browser Addon

Stealth Lightbeacon is a side-panel-first browser extension for fast, local website quality audits.

It scans the active page, groups issues by severity and category, tracks history, and exports reports without requiring a remote service by default.

Current package version: `0.1.11`

## Key Features
- Side-panel-first workflow with action and context-menu open flows.
- Local DOM-first auditing with deterministic rule evaluation.
- Optional backend integration (`http` or `stdin`) with host-policy guardrails.
- Issue grouping, history compare, and diff summaries (`new`, `fixed`, `unchanged`).
- Issue highlight / clear-highlight actions in-page.
- Export support for JSON, Markdown, HTML, PDF, LLM Markdown, and GEO XML.
- Ruleset and knowledge-base catalogs with local update overlays.

## Security and Privacy
- Local-first default behavior.
- No broad `<all_urls>` permission posture.
- Backend access is opt-in and validated against runtime host policy.
- No telemetry SDK bundled.

## Browser Support
- Chrome (primary)
- Edge
- Firefox (developer/unpacked flow)

## Quick Start (Development)
1. Install dependencies:
```bash
pnpm install
```
2. Build extension assets:
```bash
pnpm run build
```
3. Load `dist/` as unpacked extension.

### Load in Chrome
1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the repo `dist/` directory

### Load in Edge
1. Open `edge://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the repo `dist/` directory

### Load in Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on`
3. Select `dist/manifest.json`

## Validation Commands
Run these before release:

```bash
pnpm run build
pnpm run test:unit
pnpm run test:integration
pnpm exec vitest --run --coverage --exclude tests/popup/popup.playwright.spec.ts
pnpm run test:e2e
pnpm run test:ui-load:strict
```

Note: Browser-runtime tests (`test:e2e`, `test:ui-load:strict`) require a launchable Chrome/Chromium runtime in the host environment.

## Architecture Overview
- `src/background/`: service worker orchestration, storage/history, backend bridge, host policy
- `src/content/`: page extraction and in-page highlight behavior
- `src/popup/`: side panel UI, state model, actions, exports
- `src/shared/`: contracts, schemas, rule engine, catalog data
- `src/ui/`: report/export rendering utilities
- `api/openapi.yaml`: backend contract

## Repository Quality Bar
- Conventional commits.
- Strict test-first workflow for behavior changes.
- Deterministic contracts across background/content/popup boundaries.
- CI matrix gates for unit, integration, backend fallback policy, and release-readiness contracts.
- GitHub Actions least-privilege defaults with explicit permissions and concurrency cancellation.

## Related Documentation
- [Contributing](./contributing.md)
- [Security Policy](./security-policy.md)
- [Release Notes](./release.md)
- [Changelog](./changelog.md)
- [Implementation Plan](./docs/implementation-plan.md)
