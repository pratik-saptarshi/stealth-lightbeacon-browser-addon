# Branch Coverage Follow-up

## Goal

Raise branch coverage from `78.34%` to `85%+` without regressing statements/lines coverage.

## Baseline

- Command: `pnpm run test:integration -- --coverage`
- Current branch coverage: `78.34%`

## Hotspots

1. `src/side-panel/side-panel.ts` (`63.87%`)
2. `src/background/orchestrator.ts` (`66.84%`)
3. `src/ui/pdf.ts` (`64.28%`)
4. `src/background/storage.ts` (`66.66%`)

## TDD Plan

1. `popup.ts`
- Add tests for:
- export failure and fallback states
- no-snapshot and no-selection branches
- connection summary rendering across backend modes

2. `orchestrator.ts`
- Add tests for:
- backend-enabled success and backend-hard-fail rejection paths
- history compare when previous snapshot is missing
- header probe success/error branches

3. `pdf.ts`
- Add tests for:
- multi-page chunking branches
- selector-present vs selector-absent lines
- diff-present vs diff-absent report branches

4. `storage.ts`
- Add tests for:
- storage read/write failure recovery
- empty-key and corrupted payload branches

## Validation Gate

Run:

```bash
pnpm run test:unit
pnpm run test:integration -- --coverage
```

Pass criteria:

- Branch coverage >= `85%`
- Statements and lines remain >= `90%`
- No regressions in `test:ci:*` matrix jobs
