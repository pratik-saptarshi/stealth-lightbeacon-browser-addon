# Stealth Lightbeacon Browser Addon Releases

Latest stable release: `v0.1.10` (2026-05-30)

## Release Summary

`v0.1.10` focuses on standalone scan reliability and report-output quality:
- restores standalone embedded-rule scanning when active-tab URL is unavailable,
- aligns HTML/Markdown exports to executive-style fidelity report formatting,
- updates runtime messaging to side-panel-first terminology and keeps CI hardening current.

## Validation Gate

Run these before publishing:

```bash
pnpm run build
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run test:ui-load:strict
pnpm exec vitest --run --coverage --exclude tests/popup/popup.playwright.spec.ts
```

## Versioned Notes

- [v0.1.10](./docs/releases/v0.1.10.md)
- [v0.1.9](./docs/releases/v0.1.9.md)
- [v0.1.8](./docs/releases/v0.1.8.md)
- [v0.1.7](./docs/releases/v0.1.7.md)
