# Store Publish Automation Strategy (Chrome + Edge + Firefox)

## Objective
Implement GitHub Actions that automatically produce and publish browser-extension bundles for:
- Chrome Web Store
- Microsoft Edge Add-ons
- Firefox Add-ons (AMO)

Deliverables per release:
- `addon-store.zip` (canonical upload package for Chrome/Edge stores)
- `addon-signed.xpi` (Firefox signed package)
- `addon-signed.crx` (Chromium sideload/enterprise package)

## Constraints and One-Time Bootstrap
1. Initial listing metadata and first listing creation are typically one-time/manual for each store.
2. Automation should target update/publish of an existing store listing.
3. Firefox Manifest V3 must include explicit `browser_specific_settings.gecko.id` before AMO submission.
4. Store review approval remains asynchronous; workflow should poll status and report pass/fail.

## Proposed Workflow Topology
1. `release-package.yml` (build + test + package artifacts)
2. `publish-firefox.yml` (sign/upload with AMO credentials)
3. `publish-chrome.yml` (upload + publish via Chrome Web Store API)
4. `publish-edge.yml` (upload + publish via Edge Add-ons API)
5. `publish-all.yml` (orchestrator on tag/release, fans out reusable workflows)

Trigger model:
- `workflow_dispatch` for dry runs and store-scoped publishes.
- `push` tags `v*` for production publish.
- Optional `release.published` for release-note-linked publish.

## Artifact Strategy
Single build source of truth:
1. Run existing validation gate:
   - `pnpm run build`
   - `pnpm run test:unit`
   - `pnpm run test:integration`
   - `pnpm run test:e2e`
   - `pnpm run test:ui-load:strict`
2. Create `addon-store.zip` from release payload (`dist/*`, manifest/assets only).
3. Generate `addon-signed.xpi` via `web-ext sign` (listed channel).
4. Generate `addon-signed.crx` using a stable private key in CI secret material.

Notes:
- Chrome/Edge stores consume zip uploads; `.crx` remains useful for enterprise/off-store distribution.
- Keep deterministic file ordering/timestamps to reduce diff noise between releases.

## Secret and Environment Design
Use GitHub Environments:
- `staging`: non-production channels where possible, dry-run validation, manual approval optional.
- `production`: required reviewers, protected tags, publish permissions.

Secrets:
- Firefox (AMO):
  - `AMO_JWT_ISSUER`
  - `AMO_JWT_SECRET`
  - `AMO_METADATA_JSON` (if needed for first/subsequent listed submissions)
- Chrome Web Store:
  - `CWS_EXTENSION_ID`
  - `CWS_CLIENT_ID`
  - `CWS_CLIENT_SECRET`
  - `CWS_REFRESH_TOKEN`
- Edge Add-ons:
  - `EDGE_PRODUCT_ID`
  - `EDGE_CLIENT_ID`
  - `EDGE_API_KEY` (or token flow equivalent configured in Partner Center)
- CRX signing:
  - `CRX_PRIVATE_KEY_PEM`

Hardening:
- Mask all secrets in logs.
- Use least-privilege PAT/scopes for store APIs.
- Fail closed if required secret missing.

## Store-Specific Publish Lanes
### Firefox (AMO)
- Use `web-ext sign --channel=listed`.
- Upload metadata JSON where required by AMO listing/update flow.
- Persist signed `.xpi` as workflow artifact + release asset.

### Chrome Web Store
- Use official API flow for upload + publish of existing item.
- Verify upload response and poll publish status before marking workflow success.

### Microsoft Edge Add-ons
- Use Edge Add-ons REST API update flow:
  - upload package,
  - poll operation status,
  - publish submission,
  - poll publish completion.

## Rollout Phases
### Phase A: Packaging Foundation
1. Add packaging workflow to create `zip`, `xpi`, `crx` artifacts without store publish.
2. Validate reproducibility and artifact integrity checksums.

### Phase B: Staging Publish
1. Enable store API calls behind `workflow_dispatch`.
2. Publish to staging/test listings only.
3. Verify status polling and error reporting.

### Phase C: Production Publish
1. Gate by signed tag (`v*`) and environment reviewers.
2. Auto-publish all stores after test matrix green.
3. Attach artifacts + manifest/version metadata to GitHub Release.

### Phase D: Operational Hardening
1. Add retry/backoff for transient store API failures.
2. Add notification hooks (Slack/email/GitHub summary).
3. Add rollback playbook links in workflow summary.

## Failure Handling and Rollback
1. If one store fails and others pass:
   - mark job failed,
   - keep successful artifacts,
   - allow store-specific rerun workflow.
2. Never rebuild artifacts during retry; reuse immutable artifact from the release SHA.
3. Keep a `publish-manifest.json` artifact:
   - commit SHA,
   - version,
   - artifact hashes,
   - per-store submission IDs/status.

## Definition of Done
1. Tag-driven production run publishes updates to Chrome, Edge, and Firefox listings.
2. Release assets include `zip`, `xpi`, and `crx`.
3. Per-store status and submission IDs are visible in workflow summary.
4. Rerun procedures are documented and tested for partial-failure recovery.

## References
- Chrome Web Store API docs (`developer.chrome.com/docs/webstore/api` and `.../using_webstore_api`).
- Microsoft Edge Add-ons publish/update API docs (`learn.microsoft.com/.../extensions/.../using-addons-api`).
- Firefox `web-ext sign` / AMO submission docs (`extensionworkshop.com/.../web-ext-command-reference`).
