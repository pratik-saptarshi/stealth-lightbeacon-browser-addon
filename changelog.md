# Changelog

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
