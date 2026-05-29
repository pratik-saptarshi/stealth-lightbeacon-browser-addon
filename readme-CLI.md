# Browser Addon CLI Reference (Local Dev)

## Commands
- `pnpm run build`
  - Runs TypeScript type-check/build.
- `pnpm test -- --run`
  - Runs all tests.
- `pnpm run test:unit`
  - Runs unit suites (contracts, rules, orchestrator, history, exports).
- `pnpm run test:integration`
  - Runs integration smoke + backend-failure contract tests.
- `pnpm run test:ci:backend-fallback`
  - CI slice for fallback behavior.
- `pnpm run test:ci:issues:policy`
  - CI slice for issue policy (`dom-only` and filtering assertions).
- `pnpm run test:ci:required-backend-hard-fail`
  - CI slice for mandatory backend failures.
- `pnpm run audit:budget -- --path <jsonFile> --fail-on-critical --max-critical 0`
  - Enforces critical budget (and optional high budget) on a snapshot payload.
  - Exits with code `2` when budget is exceeded.

## CI Test Phase Matrix
- `unit`
- `integration`
- `backend-fallback` (`test:ci:backend-fallback`)
- `issues:policy` (`test:ci:issues:policy`)
- `required-backend-hard-fail` (`test:ci:required-backend-hard-fail`)

## Environment Notes
- No required environment variables in local addon-only mode.
- Backend tests may inject `fetch` and `__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__` in test runtime.
