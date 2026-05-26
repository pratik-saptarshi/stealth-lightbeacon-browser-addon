# Changelog

## 0.1.5 — 2026-05-26
- Refreshed the release documentation set with clearer installation, validation, contribution, and security guidance.
- Bumped version metadata to `0.1.5` across `package.json`, `package-lock.json`, and `manifest.json`.
- Documented the latest UI and packaging work, including PDF export, backend settings, performance tracing, and the OpenAPI spec link.
- Kept the browser-only default posture, opt-in backend coupling, and modular popup/service-worker split.

## 0.1.4 — 2026-05-26
- Added a polished root `readme.md` and supporting `contributing.md`, `security-policy.md`, and `release.md` docs.
- Bumped version metadata to `0.1.4` across the package manifest, lockfile, and extension manifest.
- Preserved the browser-only default posture, opt-in backend coupling, and modular popup/service-worker split.
- Retained PNG icon delivery for Chrome-compatible extension assets.

## 0.1.3 — 2026-05-26
- Added backend host policy and strict allowlist validation in service worker bootstrap.
- Enforced optional backend hard-fail + graceful fallback behavior on policy violations.
- Added machine-readable backend endpoint policy diagnostics in `backend-failure` integration tests.
- Added explicit version alignment checks in release prep for `package.json`, `package-lock.json`, and `manifest.json`.

## 0.1.2 — 2026-05-26
- Reduced extension permissions by removing broad host/page-match declarations.
- Added active-tab-first extraction path with optional on-demand content-script injection via `scripting`.
- Kept scan fallback when explicit page context is absent by resolving active tab context from runtime when available.
- Updated manifest contract tests for stricter, least-privilege permission posture.

## 0.1.1 — 2026-05-26
- Hardened backend transport pathing per engine and added adapter factory for `http` vs `stdin`.
- Added deterministic issue identity generation for stable historical diffing.
- Added concrete backend-fallback and required-backend-hard-fail coverage in unit, integration, and CI slices.
- Added machine-readable budget gate command (`scripts/audit-budget.mjs`) with exit-code-2 policy.
- Updated execution docs and CI matrix with strict phase-labeled test gates.

## 0.1.0 — 2026-05-26
- Added core browser-addon-lite runtime with manifest-driven background/content architecture.
- Implemented DOM extraction and typed rule context (`content-script`, `extractor`).
- Added shared rule engine with DOM-only SEO/AEO/accessibility/UX checks.
- Added bounded same-origin crawl-lite path with timeout/CORS/non-HTML/blocked classifications.
- Added optional backend mode (`http` + `stdin`) with basic-auth header support and hard-fail/fallback semantics.
- Added mutable machine-readable ruleset catalog with category updates (`ruleset:get`/`ruleset:update`).
- Added issue filtering API (`issues:list`) and multi-format export/reporting (`json`, `markdown`, `html`, `llm-markdown`, `geo-xml`).
- Added history comparison and retention for scan snapshots.
- Added anti-bot recommendation engine with concrete recommendation contracts.
- Added CI matrix labels for backend fallback and required-backend policies.
- Added code-mapping artifacts (`codemap.md`, `src/*/codemap.md`) and root `AGENTS.md` map section.

## 0.0.1 — 2026-05-26
- Repository scaffold created and initial phased implementation plan and backlog documents added.
- Initial API contract scaffold (`api/openapi.yaml`) and helper scripts for phased test execution.
