## 0.1.3 — 2026-05-26
- Prepare a versioned release with hardened backend host-policy enforcement and release metadata alignment.
- Synchronized versioning to `0.1.3` in `package.json`, `package-lock.json`, and `manifest.json`.
- Added changelog entry for host-policy hardening and release preparation evidence.
- Finalized repo sanity posture for security/private network guardrails and local-default behavior.
- `npm run build` ✅
- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:ci:backend-fallback` ✅
- `npm run test:ci:issues:policy` ✅
- `npm run test:ci:required-backend-hard-fail` ✅
- `npm audit --audit-level=high` ⚠️ blocked by sandbox DNS/network restriction (`ENOTFOUND registry.npmjs.org`).

### Security / Privacy / Branding / Best-Practice Findings
- Permissions remain least-privilege (`storage`, `activeTab`, `scripting`) with no host permissions.
- Backend usage remains explicit and opt-in; no background polling/telemetry pipeline is shipped by default.
- No PII collection or analytics SDK usage was found in current source.
- Branding is consistent in README and manifest (`Stealth Lightbeacon`) and extension name remains unchanged.
- Security guardrails now block private/loopback/blocked host targets before backend request creation.
