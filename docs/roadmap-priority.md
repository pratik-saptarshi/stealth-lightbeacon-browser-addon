# Prioritized Roadmap (Now / Next / Later)

## Now

1. Finalize cross-context stdio backend contract
   - Validate how `stealth-lightbeacon` Python runner is invoked by CLI/stdio shim.
   - Add adapter entrypoint and docs for runner integration.
   - Effort: 1 day.
   - Validation: `npm test -- --run`, contract demo with local runner.

2. Add policy-aware backend error contracts
   - Distinguish transport failures vs validation failures and preserve fallback semantics.
   - Effort: 0.5 day.
   - Validation: unit tests + fake endpoint harness.

## Next

1. Expand capability parity from backlog gaps
   - Broken-link discovery and Drupal endpoint probing.
   - PageSpeed and performance-depth checks.
   - Effort: 3-5 days.
   - Validation: TDD + mocked security test vectors.

2. Runtime parity enhancements
   - Add deterministic output IDs for CI budget gating.
   - Implement optional workspace watcher after MCP stabilization.
   - Effort: 2 days.
   - Validation: schema tests + smoke harness.

## Later

1. Workspace watcher mode
   - Planned after MCP engine coupling is stabilized.
   - Effort: 2-3 days.
   - Validation: background watcher acceptance tests + run reconciliation logic.

2. Remote scanning engine integration
   - fast/Obscura, stealth/Playwright, MCP adapter selection.
   - Effort: 3-5 days.
   - Validation: integration tests with mock engine adapters.

3. Persistence and search maturity
   - Optional DuckDB/LanceDB path for historical corpora.
   - Semantic search and regression trend analytics.
   - Effort: 2+ days.
   - Validation: migration + benchmark + reproducibility checks.
