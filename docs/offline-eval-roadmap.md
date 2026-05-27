# Offline Evaluation Roadmap

## Scope
Map standalone offline validation capabilities and remaining backlog features across the core knowledge bases:
- README.md
- docs/implementation-plan.md
- docs/roadmap-priority.md
- docs/evala11y-implementation-backlog.md
- src/shared/knowledge-base/default-knowledge-base.json
- src/shared/rulesets/default-rulesets.json
- tests/*

## Current offline validation capabilities
- Local DOM extraction, rule execution, and issue summarization are offline by default.
- JSON, Markdown, HTML, LLM-markdown, and GEO XML exports are local-only.
- npm run test:unit, npm run test:integration, npm run test:ui-load, and npm run audit:budget -- --path <snapshot.json> --fail-on-critical --max-critical 0 are the current validation gates.
- Browser UI smoke exists, but the strongest proof is still contract/jsdom-heavy rather than full browser automation.

## Coverage map
| Area | Coverage state | Notes |
| --- | --- | --- |
| GEO | Catalog-only | No runtime evaluator; knowledge-base guidance exists. |
| SEO | Partial | Title, meta description, H1, canonical consistency, crawl-lite broken-link and Drupal-exposure signals are present. |
| AEO | Partial | Canonical link and answer-summary checks exist; direct-answer and schema-Q&A depth are missing. |
| Accessibility | Partial | Alt text, lang, button labels, and required labels exist; contrast, ARIA, keyboard, and focus-order checks are missing. |
| Security optimization | Catalog-only | Security header checks exist in the catalog only; no runtime evaluator. |

## Priority matrix
### P0
1. Standalone offline validation harness for browser addon
2. WCAG structural parity pack
3. WCAG interaction parity pack
4. Security header runtime evaluator

### P1
1. SEO/AEO/GEO/Drupal depth expansion
2. Performance/PageSpeed evaluator family
3. Ruleset and knowledge-base governance

### P2
1. Semantic persistence and history search
2. Workspace watcher mode
3. Deeper remote engine parity

## Beads alignment
- Epic: stealth-lightbeacon-browser-addon-zca.6 - Phase 4: offline evaluation and knowledge-base validation
- Child issues already present:
  - stealth-lightbeacon-browser-addon-zca.6.2 - P0 standalone offline validation harness for browser addon
  - stealth-lightbeacon-browser-addon-zca.6.1 - P1 bundled knowledge-base and ruleset offline parity
  - stealth-lightbeacon-browser-addon-zca.6.3 - P1 browser UI offline smoke and panel reliability

## Outcome-impact order
1. Prove offline-only validation with no network dependency.
2. Close accessibility parity gaps that most directly change defect detection quality.
3. Add runtime security-header validation.
4. Expand SEO/AEO/GEO and Drupal depth.
5. Add performance and governance depth.
6. Add persistence/search and watcher workflows later.
