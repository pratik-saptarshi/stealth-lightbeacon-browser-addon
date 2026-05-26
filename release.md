# Stealth Lightbeacon Browser Addon v0.1.4

## Highlights
- Refreshed the public documentation set with a professional README, contributor guide, security policy, and release notes.
- Aligned the release metadata to a new versioned cut.
- Preserved the browser-only default posture, minimal permissions, and opt-in backend coupling.
- Kept the browser UI split into modular assets rather than a monolithic bundle.

## Validation
- `npm run build`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:ui-load`

## Notes
- The addon remains local-first by default.
- Optional backend usage stays behind explicit configuration and host-policy checks.
- The release includes the current icon and UI asset updates already present in the repository.
