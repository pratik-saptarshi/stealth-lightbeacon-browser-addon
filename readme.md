# Stealth Lightbeacon Browser Addon

Stealth Lightbeacon Browser Addon is the browser-only companion to the Stealth Lightbeacon audit workflow. It performs local DOM auditing in the active tab, groups issues by domain and severity, supports manual rescan flows, and can optionally talk to a local or remote backend when you opt in.

Current release: `0.1.6`

## What it does
- Audits the active tab from a popup and side-panel UI.
- Groups findings by domain and severity.
- Exports issue data locally as JSON, Markdown, or PDF.
- Supports limited same-origin crawl discovery from the active origin.
- Keeps the default posture local-first with no broad host permissions.
- Supports optional backend-assisted recommendations over HTTP or stdio.
- Uses machine-readable rulesets for SEO, accessibility, AEO/GEO, UX, Drupal, and security-header checks.
- Surfaces the backend OpenAPI contract directly from the extension UI.
- Includes a settings drawer for panel color tuning, section visibility, and bug reporting.

## Supported browsers
- Google Chrome
- Microsoft Edge
- Mozilla Firefox (unpacked/developer load)

## Install for development
1. Clone the repository.
2. Install dependencies.
   ```bash
   npm install
   ```
3. Build the extension bundle.
   ```bash
   npm run build
   ```
4. Load the built `dist/` folder as an unpacked extension.

### Chrome
- Open `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select the `dist/` folder

### Microsoft Edge
- Open `edge://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select the `dist/` folder

### Firefox
- Open `about:debugging#/runtime/this-firefox`
- Click **Load Temporary Add-on**
- Select `dist/manifest.json`

## Validation
Run the local checks before publishing changes:

```bash
npm run test:unit
npm run test:integration
npm run test:ui-load
npm run audit:budget -- --path <snapshot.json> --fail-on-critical --max-critical 0
```

When the environment supports it, validate the extension in a real browser session with Playwright or the browser automation toolchain already available on the machine.
The UI-load smoke also loads `axe.min.js` and runs an automated accessibility scan when Playwright is available.

## Repository layout
- `src/background/` - orchestration, history, ruleset catalog, host policy, service worker
- `src/content/` - active-tab DOM extraction
- `src/popup/` - popup/side-panel state and UI logic
- `src/shared/` - contracts, rule engine, shared message types, and ruleset data
- `src/ui/` - export and grouping helpers
- `api/openapi.yaml` - backend interface contract
- `docs/` - planning, architecture, and analysis notes

## Security and privacy
- Default mode is local-only.
- No broad host permissions are declared.
- Backend use is opt-in and constrained by host-policy validation.
- No analytics or telemetry SDKs are bundled.
- Sensitive backend usage should stay behind explicit user configuration.
- Bug reports can be sent directly from the settings drawer to `pratik.saptarshi@outlook.com`.

## Related docs
- [Contributing](./contributing.md)
- [Security policy](./security-policy.md)
- [Release notes](./release.md)
- [Changelog](./changelog.md)
- [Shared axioms](./shared-axioms.md)
