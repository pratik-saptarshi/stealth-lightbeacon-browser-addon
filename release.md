# Stealth Lightbeacon Browser Addon v0.1.6

## Highlights
- Expanded accessibility parity with structural WCAG 2.1 AA rules for headings, links, and form labeling.
- Added a standalone security-header evaluator and wired it into the background scan path.
- Improved popup workflow coverage for tabs, settings, history, and report downloads.
- Added launch and browser-connected Playwright scripts for the unpacked extension flow.
- Refreshed release documentation to report coverage by test type, category, and technology.

## Validation
- `pnpm run build`
- `pnpm run test:unit -- --coverage`
- `pnpm run test:integration -- --coverage`
- `pnpm run test:ui-load`

## Coverage by Test Type

| Test type | Statements | Lines | Functions | Branches | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Unit | 88.41% | 88.34% | 94.36% | 71.99% | Vitest run over the unit-focused slice, with V8 coverage enabled. |
| Integration | 90.69% | 90.61% | 95.49% | 75.67% | Vitest integration run covering background, popup, shared, content, and UI flows. |
| UI smoke | n/a | n/a | n/a | n/a | Built extension smoke executed; the current macOS browser profile did not expose a service worker within the smoke timeout. |

## Coverage by Category and Technology

| Category / technology | Statements | Lines | Functions | Branches | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Shared TypeScript validators and rule engine | 96.55% | 96.48% | 95.34% | 88.62% | Contracts, validation codemap, rule engine, anti-bot, and shared rules. |
| Background TypeScript runtime | 80.00% | 80.06% | 88.37% | 64.57% | Orchestrator, service worker, host policy, storage, and history. |
| Content TypeScript extraction | 98.30% | 98.21% | 100% | 80.00% | Page context extraction and DOM normalization. |
| Popup TypeScript UI | 85.12% | 84.97% | 94.23% | 60.00% | Tabs, settings drawer, history, and report actions. |
| UI export helpers | 97.60% | 97.54% | 100% | 78.78% | Grouping and PDF/report serialization helpers. |
| Browser automation smoke | n/a | n/a | n/a | n/a | Chrome-connected and extension-load smoke paths are wired, but the smoke runner is still environment-sensitive on this host. |

## Notes
- The addon remains local-first by default.
- Optional backend usage stays behind explicit configuration and host-policy checks.
- The release includes the current icon and UI asset updates already present in the repository.
- The release notes intentionally match the published tag and package version.
- Branch coverage remains lower than statements and lines, but the release is being published from the current repository state as requested.
