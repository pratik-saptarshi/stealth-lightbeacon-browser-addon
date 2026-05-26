# src/content/

## Responsibility
Client-side DOM collection boundary for active-tab context. Captures deterministic page signals required by local rules.

## Design
- Extractor composes a typed `RuleContext` from `Document` APIs.
- Message contract (`content:extract`) keeps host-side coupling narrow and synchronous enough for MV3 message passing.
- Lightweight parsing pipeline with URL normalization and internal-link detection.

## Flow
1. Content script receives `content:extract` message.
2. `buildPageContext` calls `extractPageContext(document, document.location.href)`.
3. DOM walker emits scalar summaries: title/lang/canonical/meta, headings counts, links, images, buttons, form fields.
4. Context is returned to sender (typically background orchestrator) for rule execution and optional crawl seed generation.

## Integration
- Shared dependency on `extractor.ts` contract and issue-independent types in `shared/rule-engine.ts`.
- Provides crawl seed input (`links`) for `orchestrator.runCrawl`.
