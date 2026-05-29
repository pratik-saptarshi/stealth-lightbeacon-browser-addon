# Iteration 1 Plan

Iteration 1 protects the current release line. It keeps the repo above the
documented validation gate while we start expanding browser automation.

## Objective

- Prove the offline trust baseline stays stable.
- Turn the coverage audit into explicit follow-up work.
- Keep the existing unit, integration, and UI-load gates green.

## In Scope

- `stealth-lightbeacon-browser-addon-zca.1.1`
- `stealth-lightbeacon-browser-addon-zca.1`
- `stealth-lightbeacon-browser-addon-zca.6.2`
- `stealth-lightbeacon-browser-addon-zca.6.2.1`

## Work Packages

### 1. Coverage audit closure

Owner outcome:
- Identify the lowest-coverage modules and convert them into explicit test
  slices.

Tasks:
- Read the current coverage summary and isolate the largest line and branch
  gaps.
- Map the gaps to concrete tests instead of broad refactors.
- Keep the audit outcome attached to Beads so the next iteration has a hard
  backlog target.

Validation:
- Coverage audit output names the follow-up slices.
- No behavioral code changes are merged from the audit alone.

### 2. Offline validation harness stabilization

Owner outcome:
- Maintain a repeatable offline-only browser smoke path.

Tasks:
- Verify the packaged extension loads in a persistent browser context.
- Assert the popup can open on a local fixture page with no external requests.
- Keep the no-network assertion explicit in the smoke gate.

Validation:
- `pnpm run test:ui-load`
- Browser smoke is stable against local assets only.

### 3. Release-line regression gate

Owner outcome:
- Keep the current branch safe for the next release cut.

Tasks:
- Run the documented unit and integration suites.
- Keep the `pnpm run test:ui-load` gate as the browser smoke baseline.
- Document any residual coverage dimension gaps that remain below policy.

Validation:
- `pnpm run test:unit`
- `pnpm run test:integration`
- `pnpm run test:ui-load`
- `pnpm run audit:budget -- --path <snapshot.json> --fail-on-critical --max-critical 0`

## Exit Criteria

- Coverage audit is complete and points at explicit follow-up work.
- Offline-only extension smoke still passes.
- The existing validation gates remain green.
- The plan is ready to hand off into Iteration 2.

## Release Note

This iteration is not, by itself, a release boundary. It is the prerequisite
stability slice that makes the P1 browser-facing work safe to start.
