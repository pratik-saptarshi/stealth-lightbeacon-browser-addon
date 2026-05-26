# Stealth Lightbeacon Browser Addon

Stealth Lightbeacon Browser Addon is a local-first audit assistant that runs in-browser, with optional backend coupling for expanded checks.

## What this repo contains
- DOM extraction and local rule execution in the browser context.
- Optional backend coupling to `stealth-lightbeacon` over HTTP or stdio.
- Pluggable machine-readable rulesets with category catalog updates.
- Crawl-lite with same-origin scope and SSRF hardening.
- Issue filtering, diffing, report generation, and optional export formats.
- CI-driven test slices for backend fallback and hard-fail behavior.

## Installation

## Supported browsers
- Google Chrome (or any Chromium-based browser)
- Microsoft Edge
- Mozilla Firefox (developer temporary load)

## Install from source (development/unpacked)

1. Install dependencies and build:

   ```bash
   git clone https://github.com/pratik-saptarshi/stealth-lightbeacon-browser-addon.git
   cd stealth-lightbeacon-browser-addon
   npm install
   npm run build
   ```

2. Load the built extension as unpacked:

### Chrome
- Open `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select the extension folder that contains `manifest.json`

### Microsoft Edge
- Open `edge://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select the extension folder that contains `manifest.json`

### Firefox
- Open `about:debugging#/runtime`
- Click **This Firefox**
- Click **Load Temporary Add-on**
- Choose `manifest.json` from the built folder

> Backend is optional. Local-only mode works without any server.

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
- **fallback policy:** optional backend failures fall back to embedded ruleset and keep `dom-only` issues.

## Permissions
- Active scan is requested with minimal privileges:
  - `storage`
  - `activeTab`
  - `scripting`
- No broad host permissions are declared in the manifest; tab extraction occurs through explicit on-demand script injection.

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
