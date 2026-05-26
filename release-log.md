## 0.1.4 — 2026-05-26
- Prepared a versioned release with polished public docs and synchronized release metadata.
- Synchronized versioning to `0.1.4` in `package.json`, `package-lock.json`, and `manifest.json`.
- Added `readme.md`, `contributing.md`, `security-policy.md`, and `release.md` for release hygiene.
- Finalized repo sanity posture for security/private network guardrails and local-default behavior.
- `npm run build` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:ui-load` ✅
- `npm audit --audit-level=moderate` ⚠️ local lockfile refresh was unavailable before this release pass.

### Security / Privacy / Branding / Best-Practice Findings
- Permissions remain least-privilege (`storage`, `activeTab`, `scripting`) with no host permissions.
- Backend usage remains explicit and opt-in; no background polling/telemetry pipeline is shipped by default.
- No PII collection or analytics SDK usage was found in current source.
- Branding is consistent in docs and manifest (`Stealth Lightbeacon`) and extension name remains unchanged.
- Security guardrails now block private/loopback/blocked host targets before backend request creation.
