# Security Policy

Security guidance for this repository follows the browser-extension principle of least privilege: collect as little as possible, send as little as possible, and make any networked behavior explicit.

## Scope
This repository ships a browser extension that performs local DOM analysis and optional backend-assisted checks. Security concerns typically fall into one of these areas:
- host policy handling
- extension permission scope
- content-script data extraction
- backend request construction
- release artifact integrity
- documentation accuracy for the published build

## Supported reporting path
If you find a security issue, report it privately through the GitHub security reporting flow for this repository. Include:
- a short summary
- affected version or commit
- reproduction steps
- expected impact
- any relevant proof-of-concept details

Do not publish the details publicly until the issue has been acknowledged and a fix strategy has been agreed.

## Data handling
- Default operation is local-only.
- Backend integration is opt-in.
- Do not send secrets, tokens, or unrelated page data to a backend.
- Keep host allowlists and loopback handling explicit and reviewable.
- Prefer local file exports over remote persistence when possible.

## Extension security posture
- Avoid broad host permissions.
- Keep the content security policy strict.
- Prefer static bundled assets over remote runtime code.
- Treat extension storage as local application state, not as a secure secrets store.
- Validate backend endpoints before building outbound requests.

## Response targets
Security reports should be acknowledged as soon as practical. The maintainer response should include one of the following:
- confirmation of the issue
- a request for more information
- a mitigation or fix plan
- a reasoned rejection if the report is not actionable

## Release hygiene
- Do not publish a release until the published tag, manifest version, package version, and release notes match.
- Prefer a changelog entry and release note that identify the exact behavior change set.
