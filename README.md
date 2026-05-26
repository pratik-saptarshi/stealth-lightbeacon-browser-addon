# Stealth Lightbeacon Browser Addon

## Quick Start
- `npm install`
- `npm run build` - Type-check and compile.
- `npm test -- --run` to run all tests.

## What this repo contains
- Browser content-script extraction for DOM-only audits.
- Background orchestrator with crawl-lite and optional backend fallback.
- Pluggable categorized rule catalog stored as machine-readable JSON.
- Issue filtering, local diffing, and export/report rendering.

## Project Layout
- `src/` - core runtime code.
- `src/content/` - DOM extraction.
- `src/shared/` - contracts, rules, schema types.
- `src/background/` - scan orchestration, backend bridge, storage.
- `src/ui/` - grouping and export helpers.
- `api/openapi.yaml` - external backend contract.
- `docs/` - implementation and roadmap notes.
- `.github/workflows/test-matrix.yml` - CI matrix.

## Execution Phases
- Core implemented phases: DOM extraction, rule execution, crawl-lite, history compare, fallback messaging, and report generation.
- Deferred phase: workspace watcher mode (post-MCP).

## Planned runtime contract
- `scan:start` runs DOM rules and optional backend.
- `issues:list` applies optional filters.
- `report:build` renders multiple output formats.
- `history:*` supports list/latest/compare.
- `ruleset:get` / `ruleset:update` supports catalog updates.

## Backend integration (optional)
- Set request `backend` in `scan:start` with:
  - `enabled`
  - `mode: 'http'` + `endpoint` (+ optional `auth`)
  - `mode: 'stdin'` for local executor injection
- If backend is unavailable and not required, addon falls back to local rule engine.

## Notes
- Node modules are excluded in CI and not committed.
- For full roadmap and remaining items, see [`backlog.md`](backlog.md).
