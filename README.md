 - `mode: 'stdin'` for local executor injection
# Stealth Lightbeacon Browser Addon

## What this repo contains
- DOM extraction and local rule execution in the browser context.
- Optional backend coupling to `stealth-lightbeacon` backend (HTTP or stdio).
- Pluggable machine-readable rulesets with category catalog updates.
- Crawl-lite with same-origin and SSRF hardening.
- Issue filtering, diffing, report generation, and optional export.
- CI-driven test phases with dedicated slices for backend-fallback behavior and hard-fail policies.

## High-level architecture
- `src/content/`: extracts `RuleContext` from the active tab.
- `src/background/`: scan orchestration, backend adapter, history, and ruleset catalog state.
- `src/shared/`: schemas, contracts, and rule engine.
- `src/ui/`: issue grouping and report rendering.
- `api/openapi.yaml`: OpenAPI contract for backend/stdio coupling.

## Runtime modes
- **local-only (default):** backend disabled; local DOM evaluators plus crawl-lite.
- **remote backend (http):** optional endpoint mode with optional Basic auth and engine hint.
- **local runner (stdio):** optional `__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__` payload injector.
- **fallback policy:** optional backend failures fallback to embedded ruleset and keep `dom-only` issues.

## Permissions
- Active scan is requested with minimal privileges:
  - `storage`
  - `activeTab`
  - `scripting`
- No broad host permissions are declared in manifest; tab context extraction occurs through explicit on-demand script injection.

## Commands
- `npm install`
- `npm run build` — TypeScript build.
- `npm run test -- --run` — full suite.
- `npm run test:unit` — unit slice.
- `npm run test:integration` — integration slice.
- `npm run test:ci:backend-fallback` — CI slice for fallback behavior.
- `npm run test:ci:issues:policy` — CI slice for `dom-only` policy and filtering.
- `npm run test:ci:required-backend-hard-fail` — CI slice for required-backend failures.
- `npm run audit:budget -- --path <snapshot.json> --fail-on-critical --max-critical 0`.

## Workflow notes
- Run `npm run build` and the three CI slices before considering any phase complete.
- Workspace watcher mode is intentionally deferred to post-MCP.
