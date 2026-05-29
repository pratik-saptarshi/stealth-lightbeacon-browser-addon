# Iteration 2 Plan

Iteration 2 turns the browser-facing backlog into the next executable slice.
It starts with the browser shell and accessibility parity work, then queues the
security-header evaluator as the next follow-on unit.

## Objective

- Close the browser-shell and accessibility gaps that directly affect reviewer
  workflow.
- Keep the offline smoke gate stable while expanding browser coverage.
- Prepare the security-header evaluator slice so it can start immediately
  after the browser-shell work lands.

## In Scope

- `stealth-lightbeacon-browser-addon-zca.6.3`
- `stealth-lightbeacon-browser-addon-zca.6.3.1`
- `stealth-lightbeacon-browser-addon-zca.6.4`
- `stealth-lightbeacon-browser-addon-zca.6.4.1`
- `stealth-lightbeacon-browser-addon-zca.6.5`
- `stealth-lightbeacon-browser-addon-zca.6.5.1`

Queued next:

- `stealth-lightbeacon-browser-addon-zca.6.6`
- `stealth-lightbeacon-browser-addon-zca.6.6.1`

## Work Packages

### 1. Browser shell and offline smoke hardening

Owner outcome:
- Prove the popup shell remains reachable and usable in a persistent browser
  context.

Tasks:
- Extend the browser smoke to assert the packaged extension opens without any
  external requests.
- Exercise the popup at multiple viewport widths so the responsive shell stays
  usable.
- Verify the settings drawer, primary actions, and offline banner remain
  reachable in the browser runtime.

Validation:
- `pnpm run test:ui-load`
- Browser smoke reports the Playwright path when Chromium is available.

### 2. Accessibility parity smoke

Owner outcome:
- Keep the rendered popup accessible under browser automation, not just jsdom.

Tasks:
- Run axe against the popup in the live browser path.
- Assert keyboard reachability for the settings drawer and primary actions.
- Keep focus and aria-state checks stable against the rendered shell.

Validation:
- `pnpm run test:ui-load`
- Popup accessibility assertions pass in Playwright and fallback cleanly to jsdom.

### 3. Security-header evaluator prep

Owner outcome:
- Define the implementation boundary for the missing security-header runtime
  path.

Tasks:
- Confirm the minimal runtime data required for CSP, HSTS, and referrer-policy
  evaluation.
- Identify the rule and contract surfaces that will need extension.
- Queue fixtures and tests for the next cycle.

Validation:
- Planning only in this iteration.
- No security-header code lands until the runtime contract is explicit.

## Exit Criteria

- Browser-shell smoke passes in a live browser context.
- Offline-only validation remains stable.
- Accessibility checks run in-browser and stay deterministic.
- The security-header slice is fully scoped for the next execution pass.

## Release Note

This iteration is the earliest user-visible release slice after the offline
trust baseline. It is release-ready only once the browser-shell work and
accessibility smoke are clean.
