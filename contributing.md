# Contributing to Stealth Lightbeacon Browser Addon

## Workflow
1. Create a topic branch from `main`.
2. Make the smallest coherent change set that fits the request.
3. Use conventional commit messages.
4. Run the relevant validation slice before opening a PR.

## Development rules
- Keep the addon local-first by default.
- Avoid adding broad host permissions unless there is a documented need.
- Keep runtime validation in TypeScript source; do not ship library-only validation code into the compiled bundles.
- Keep the service worker and UI entrypoints modular.
- Prefer explicit, typed message contracts over ad hoc payloads.

## Recommended validation
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:ui-load`
- `npm run audit:budget -- --path <snapshot.json> --fail-on-critical --max-critical 0`

## Pull request checklist
- Source builds successfully.
- Tests pass.
- UI loads in the extension shell.
- Manifest and version metadata stay aligned.
- Docs are updated if the user-facing behavior changes.

## Commit message style
Use a short conventional commit prefix such as:
- `feat(...)`
- `fix(...)`
- `docs(...)`
- `test(...)`
- `chore(...)`
