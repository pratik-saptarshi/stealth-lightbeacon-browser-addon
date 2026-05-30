# Stealth Lightbeacon Browser Addon Releases

Latest stable release: `v0.1.11` (2026-05-30)

## Release Summary

`v0.1.11` focuses on hybrid scan trust and resilient standalone execution:
- auto-escalates from `dom-lite` to `stealth-playwright` on dynamic-page trigger conditions,
- merges local embedded-rule findings with backend findings for higher-trust outputs,
- tolerates permission-related content script injection failures when extraction messaging remains available.

## Validation Gate

Run these before publishing:

```bash
pnpm run build
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run test:ui-load:strict
pnpm exec vitest --run --coverage --exclude tests/side-panel/side-panel.playwright.spec.ts
```

## Versioned Notes

- [v0.1.11](./docs/releases/v0.1.11.md)
- [v0.1.10](./docs/releases/v0.1.10.md)
- [v0.1.9](./docs/releases/v0.1.9.md)
- [v0.1.8](./docs/releases/v0.1.8.md)
- [v0.1.7](./docs/releases/v0.1.7.md)
