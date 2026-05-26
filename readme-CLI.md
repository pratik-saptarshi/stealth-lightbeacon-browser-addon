# Browser Addon CLI Reference (Local Dev)

## Commands
- `npm run build`
  - Runs TypeScript type-check/build.
- `npm test -- --run`
  - Runs all tests.
- `npm run test:unit`
  - Runs unit suites (contracts, rules, orchestrator, history, exports).
- `npm run test:integration`
  - Runs integration smoke + backend-failure contract tests.
- `npm run test:ci:backend-fallback`
  - CI slice for fallback behavior.
- `npm run test:ci:issues:policy`
  - CI slice for issue policy (`dom-only` and filtering assertions).
- `npm run test:ci:required-backend-hard-fail`
  - CI slice for mandatory backend failures.

## Planned commands
- `npm run audit:budget -- --fail-on-critical`
  - Planned failure-gate script (exit code 2 for policy breaches).

## Environment Notes
- No required environment variables in local addon-only mode.
- Backend tests may inject `fetch` and `__STEALTH_LIGHTBEACON_STDIN_EXECUTOR__` in test runtime.
