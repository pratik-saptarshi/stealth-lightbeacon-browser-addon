## 0.1.6 — 2026-05-27
- Published a public release with refreshed markdown release notes and synchronized version metadata.
- Updated the public release note to include coverage by test type, category, and technology.
- Synchronized versioning to `0.1.6` in `package.json`, `package-lock.json`, `manifest.json`, and the root README.
- Extended the release documentation to reflect the current validation snapshot and browser smoke status.
- Validation snapshot:
  - Unit coverage: statements `88.41%`, lines `88.34%`, functions `94.36%`, branches `71.99%`
  - Integration coverage: statements `90.69%`, lines `90.61%`, functions `95.49%`, branches `75.67%`
  - Browser smoke: extension bundle built, but the smoke runner did not detect a service worker within the current environment timeout

### Security / Privacy / Branding / Best-Practice Findings
- Permissions remain least-privilege (`storage`, `activeTab`, `scripting`) with no host permissions.
- Backend usage remains explicit and opt-in; no background polling/telemetry pipeline is shipped by default.
- No PII collection or analytics SDK usage was found in current source.
- Branding is consistent in docs and manifest (`Stealth Lightbeacon`) and extension name remains unchanged.
- Security guardrails continue to block private/loopback/blocked host targets before backend request creation.

## 0.1.5 — 2026-05-26
- Prepared a versioned release with refreshed public docs and synchronized release metadata.
- Synchronized versioning to `0.1.5` in `package.json`, `package-lock.json`, and `manifest.json`.
- Updated `readme.md`, `contributing.md`, `security-policy.md`, and `release.md` for release hygiene.
- Documented the latest browser UI and packaging work, including PDF export, backend settings, performance tracing, and the OpenAPI link.
- `npm run build` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:ui-load` ✅

### Security / Privacy / Branding / Best-Practice Findings
- Permissions remain least-privilege (`storage`, `activeTab`, `scripting`) with no host permissions.
- Backend usage remains explicit and opt-in; no background polling/telemetry pipeline is shipped by default.
- No PII collection or analytics SDK usage was found in current source.
- Branding is consistent in docs and manifest (`Stealth Lightbeacon`) and extension name remains unchanged.
- Security guardrails now block private/loopback/blocked host targets before backend request creation.
