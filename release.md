# Stealth Lightbeacon Browser Addon Releases

Latest stable release: `v0.1.9` (2026-05-29)

## Release Summary

`v0.1.9` focuses on test reliability, side-panel-first behavior, and CI hardening:
- side-panel-only default manifest behavior (`side_panel.default_path` remains canonical),
- resilient Playwright launch strategy and fallback smoke bootstrap for constrained hosts,
- stricter repository hygiene and workflow hardening for repeatable CI.

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

- [v0.1.9](./docs/releases/v0.1.9.md)
- [v0.1.8](./docs/releases/v0.1.8.md)
- [v0.1.7](./docs/releases/v0.1.7.md)
