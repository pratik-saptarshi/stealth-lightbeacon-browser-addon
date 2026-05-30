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

## Multi-Store Publish Automation

Automated workflows:
- `.github/workflows/release-package.yml`
- `.github/workflows/publish-firefox.yml`
- `.github/workflows/publish-chrome.yml`
- `.github/workflows/publish-edge.yml`
- `.github/workflows/publish-all.yml`

Produced artifacts:
- `artifacts/addon-store.zip`
- `artifacts/addon-signed.xpi` (Firefox lane output)
- `artifacts/addon-signed.crx` (when `CRX_PRIVATE_KEY_PEM` is provided)
- `artifacts/publish-manifest.json`

### Required GitHub environment secrets

`production` and/or `staging` environments:

- Firefox:
  - `AMO_JWT_ISSUER`
  - `AMO_JWT_SECRET`
  - `AMO_METADATA_JSON` (optional; for listing metadata submission)
- Chrome Web Store:
  - `CWS_CLIENT_ID`
  - `CWS_CLIENT_SECRET`
  - `CWS_REFRESH_TOKEN`
  - `CWS_PUBLISHER_ID`
  - `CWS_EXTENSION_ID`
- Edge Add-ons:
  - `EDGE_TENANT_ID` (optional; defaults to `common`)
  - `EDGE_CLIENT_ID`
  - `EDGE_CLIENT_SECRET`
  - `EDGE_PRODUCT_ID`
- CRX signing:
  - `CRX_PRIVATE_KEY_PEM`

### Manual execution

1. Trigger `publish-all` via `workflow_dispatch`.
2. Select `staging` (dry run / non-production listing IDs) or `production`.
3. Keep `run_validation=true` for release-grade publish.
4. For production, use protected tags (`v*`) and required reviewers on the environment.

## Versioned Notes

- [v0.1.11](./docs/releases/v0.1.11.md)
- [v0.1.10](./docs/releases/v0.1.10.md)
- [v0.1.9](./docs/releases/v0.1.9.md)
- [v0.1.8](./docs/releases/v0.1.8.md)
- [v0.1.7](./docs/releases/v0.1.7.md)
