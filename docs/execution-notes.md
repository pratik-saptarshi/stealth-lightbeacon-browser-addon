# Execution Notes

## Latest Capability Coverage (Backlog Review)
- Completed: DOM-only rule engine, same-origin crawl-lite, history compare, issue grouping, exports, and message routing.
- Completed: optional backend modes (`http` + `stdin`) with Basic auth and backend-only hard-fail/fallback policy.
- Completed: anti-bot recommendation engine and SSRF/DNS/redirect hardening for crawl candidates.
- Completed: issue-level filtering/report APIs (`issues:list`, `report:build`) and additional formats (`html`, `llm-markdown`, `geo-xml`).
- Completed: deterministic issue IDs and stable diff identity matching.
- Completed: budget gate script (`audit:budget`) with exit-code-2 policy.
- Completed: dedicated CI matrix slices for `backend-fallback`, `issues:policy`, `required-backend-hard-fail`.
- Planned: Playwright browser automation mapped to `docs/roadmap/playwright-test-plan.md` and Beads child issues `.6.2.1` through `.6.9.2`; current smoke baseline remains `pnpm run test:ui-load`.
- Phased execution: see `docs/phase-iterations.md` for the four backlog iterations and their exit criteria.
- Iteration 1 implementation plan: see `docs/iteration-1-plan.md`.
- Iteration 2 implementation plan: see `docs/iteration-2-plan.md`; browser-shell
  and accessibility smoke are the active slice, with security-header runtime
  prep queued next.
- Release planning: see `docs/release-milestones.md`; minor release planning remains blocked on the open P0/P1 slices, while major release planning stays deferred until P2 persistence/workflow slices land.
- Deferred: PageSpeed engine family, broken-link discovery, DuckDB/LanceDB persistence, semantic search, and workspace watcher.

## Phase Status (Beads)
- BEAD-0001 ✅ Done.
- BEAD-0002 ✅ Done.
- BEAD-0003 ✅ Done.
- BEAD-0004 ✅ Done.
- BEAD-0005 ✅ Done.
- BEAD-0006 ✅ Done.
- BEAD-0007 ✅ Done.
- BEAD-0008 ✅ Done.
- BEAD-0009 ✅ Done.
- BEAD-0010 ✅ Done.
- BEAD-0011 ✅ Done.
- BEAD-0012 ✅ Done.
- BEAD-0013 ✅ Done.
- BEAD-0014 ✅ Done.
- BEAD-0015 ✅ Done.
- BEAD-0016 ✅ Done.
- BEAD-0017 ✅ Done.
- BEAD-0018 ✅ Done.
- BEAD-0019 ✅ Done.

## Phase PR-11 — Runtime Bootstrap Reliability (Latest)
- BEAD-0020 ✅ Done: bundle service-worker/content-script at extension root for unpacked loading.
- Validation: `pnpm run build`, `pnpm test -- --run`, `pnpm run test:ui-load`.

## Validation Log
- `pnpm run build`: success.
- `pnpm run test:unit`: success.
- `pnpm run test:integration`: success.
- `pnpm run test:ci:backend-fallback`: success.
- `pnpm run test:ci:issues:policy`: success.
- `pnpm run test:ci:required-backend-hard-fail`: success.
- `pnpm test -- --run`: success (53 tests, all green).
- `pnpm run test:ui-load`: success.
- Current coverage summary: lines `83.71%`, statements `83.73%`, functions `89.26%`, branches `66.81%`.
- Browser-extension E2E smoke: jsdom accessibility and axe smoke passed; Playwright E2E remains planned.

## Current Phase Conclusion
- All currently scoped phases are closed under this branch.
- Line coverage is above the documented 80% threshold; branch coverage is the remaining
  follow-up gap if a policy requires every coverage dimension to exceed 80%.
- Workspace watcher mode remains a post-MCP item and is deferred by design.
