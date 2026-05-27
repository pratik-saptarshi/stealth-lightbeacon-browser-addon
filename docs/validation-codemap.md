# Validation Codemap

This map tracks the current validation surface for GEO, SEO, AEO, accessibility, and security optimization.

## Coverage Matrix

| Area | Status | Current coverage | Major gaps |
| --- | --- | --- | --- |
| GEO | catalog-only | Catalog entry only, No runtime GEO evaluator yet | structured data, entity extraction, indexability, intent alignment |
| SEO | partial | title, meta description, H1 structure, canonical consistency, broken-link crawl | structured data, indexability, robots.txt, sitemaps, rendered crawl parity |
| AEO | partial | canonical link, answer-summary | answer-summary, schema question-answer coverage, direct answer extraction, citation-ready summaries |
| Accessibility | partial | alt text, lang attribute, button labels, required form labels | contrast, ARIA, keyboard, focus order |
| Security optimization | catalog-only | Catalog entry only, No runtime security-header evaluator yet | security headers, CSP, HSTS, referrer policy |

## Compared with famous tools

- Lighthouse: broad SEO, accessibility, and performance baseline, but no GEO-specific or answer-intent workflow.
- axe-core: deep accessibility engine, but no SEO, AEO, GEO, or security-header coverage.
- Screaming Frog: strong crawl and structured-data workflow, especially for indexability and site-scale SEO.
- Sitebulb: strong accessibility and structured-data analysis, but still focused on crawl mechanics rather than answer-summary generation.

## GEO

- Status: catalog-only
- Current coverage: Catalog entry only, No runtime GEO evaluator yet
- Major gaps: structured data, entity extraction, indexability, intent alignment
- Comparison: Lighthouse and axe-core do not target GEO at all, while crawl tools focus on page mechanics rather than generated-answer readiness.

## SEO

- Status: partial
- Current coverage: title, meta description, H1 structure, canonical consistency, broken-link crawl
- Major gaps: structured data, indexability, robots.txt, sitemaps, rendered crawl parity
- Comparison: Lighthouse covers basic SEO checks, while Screaming Frog and Sitebulb go deeper on crawl scale, structured data, and indexability workflows.

## AEO

- Status: partial
- Current coverage: canonical link, answer-summary
- Major gaps: answer-summary, schema question-answer coverage, direct answer extraction, citation-ready summaries
- Comparison: Lighthouse has no dedicated AEO lens, and crawler tools only partially approximate answer-intent analysis through structured data.

## Accessibility

- Status: partial
- Current coverage: alt text, lang attribute, button labels, required form labels
- Major gaps: contrast, ARIA, keyboard, focus order
- Comparison: axe-core is stronger on accessibility breadth, while Lighthouse and Sitebulb provide smaller automated accessibility slices.

## Security optimization

- Status: catalog-only
- Current coverage: Catalog entry only, No runtime security-header evaluator yet
- Major gaps: security headers, CSP, HSTS, referrer policy
- Comparison: Security-header validation is currently represented in the catalog, but not yet enforced by the runtime ruleset.
