# Offline Evaluation Roadmap

## Completion
- Roadmap artifact moved here from `docs/offline-eval-roadmap.md`.
- Source validation against the live repo docs is complete.
- Beads child issue decomposition is complete.
- Playwright browser automation is now captured in `docs/roadmap/playwright-test-plan.md`.
- Test coverage uplift tracking is now captured in `docs/roadmap/testing-coverage-uplift.md`.
- Phased backlog execution is now captured in `docs/phase-iterations.md`.
- Implementation of the roadmap items remains open.

## Validated Sources
| Source | Validation status | Notes |
| --- | --- | --- |
| `README.md` | validated | Source of current offline gates and local-first posture. |
| `docs/implementation-plan.md` | validated | Source of phase gating and remaining debt. |
| `docs/roadmap-priority.md` | validated | Source of outcome-priority ordering. |
| `docs/evala11y-implementation-backlog.md` | validated | Source of accessibility parity scope. |
| `src/shared/knowledge-base/default-knowledge-base.json` | validated | Source of GEO, SEO, AEO, WCAG, and security guidance. |
| `src/shared/rulesets/default-rulesets.json` | validated | Source of enabled and disabled rule families. |
| `tests/*` | validated | Source of executable coverage and smoke gates. |
| `docs/backlog.md` | absent | Not present in this checkout; not used. |

## Current Offline Validation Baseline
| Capability | Status | Evidence |
| --- | --- | --- |
| Local DOM extraction, rule execution, and issue summarization | complete | Shared runtime and tests. |
| JSON, Markdown, HTML, LLM-markdown, and GEO XML exports | complete | Export helpers and tests. |
| Unit, integration, UI-load, and budget validation gates | complete | Repo scripts and smoke checks. |
| Browser UI smoke with network disabled | partial | Present, but still heavier on contract/jsdom than live-browser automation. |
| GEO runtime evaluation | catalog-only | No runtime evaluator yet. |
| SEO runtime evaluation | partial | Title, meta description, H1, canonical consistency, crawl-lite failure discovery. |
| AEO runtime evaluation | partial | Canonical link and answer-summary checks only. |
| Accessibility runtime evaluation | partial | Alt text, lang, button labels, and required labels only. |
| Security optimization runtime evaluation | catalog-only | Security header checks only in catalog. |

## Playwright Test Plan
This summary points to the durable plan in `docs/roadmap/playwright-test-plan.md`.

| User value priority | Beads issue(s) | Playwright coverage | Status |
| --- | --- | --- | --- |
| P0 trust baseline | `stealth-lightbeacon-browser-addon-zca.6.2.1` | Launch the addon UI with network disabled, assert no external requests, and verify the offline scan flow still completes. | planned |
| P1 reviewer workflow | `stealth-lightbeacon-browser-addon-zca.6.3.1` | Exercise popup and side-panel sizing, tab order, and control reachability across viewport breakpoints. | planned |
| P1 accessibility parity | `stealth-lightbeacon-browser-addon-zca.6.4.1`, `.6.5.1` | Run browser-level accessibility smoke on representative fixtures and validate keyboard, focus, and ARIA states in the rendered UI. | planned |
| P1 security and content depth | `stealth-lightbeacon-browser-addon-zca.6.6.1`, `.6.7.1`, `.6.7.2`, `.6.7.3`, `.6.8.1` | Smoke the issue panel and report rendering for security-header, SEO/AEO/GEO, and performance result sets. | planned |
| P1 governance | `stealth-lightbeacon-browser-addon-zca.6.9.1`, `.6.9.2` | Verify ruleset enablement toggles, shared-schema normalization, and catalog-driven visibility in the UI. | planned |
| P2 persistence and workflows | `stealth-lightbeacon-browser-addon-zca.6.10`, `.6.11`, `.6.12` | Cover watcher, history/trend, and remote-engine selection flows once browser automation is wired. | deferred |

## Roadmap Decomposition
| Capability | Epic | Feature | User story | Tasks | Beads issue | Priority | Tracking status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Offline validation core | Standalone offline validation harness for browser addon | Browser-surface smoke and no-network assertions | As an auditor, I can validate the addon with network disabled. | Add no-network assertions; add browser-surface smoke; add a local test gate. | `stealth-lightbeacon-browser-addon-zca.6.2` | P0 | open |
| Offline validation core | Browser UI offline smoke and panel reliability | Responsive layout and live-browser validation | As a reviewer, I can inspect popup and side-panel UI locally. | Validate sizing; retain accessibility and control reachability; run offline browser smoke. | `stealth-lightbeacon-browser-addon-zca.6.3` | P1 | open |
| Accessibility parity | WCAG structural parity pack | Baseline DOM accessibility checks | As an auditor, I can catch the most common WCAG 2.1 AA defects. | Add alt, heading, link, and form-label checks; add fixtures; keep deterministic IDs. | `stealth-lightbeacon-browser-addon-zca.6.4` | P1 | open |
| Accessibility parity | WCAG interaction parity pack | Behavior-level accessibility checks | As a QA owner, I can detect keyboard, focus, contrast, and ARIA regressions. | Add contrast; ARIA; focus-visible; keyboard anti-pattern checks; add fixtures and snapshots. | `stealth-lightbeacon-browser-addon-zca.6.5` | P1 | open |
| Security optimization | Security header runtime evaluator | CSP/HSTS/referrer policy checks | As a reviewer, I can validate page-delivered security headers offline. | Implement CSP/HSTS/referrer-policy checks; wire the security-headers domain; add fixtures. | `stealth-lightbeacon-browser-addon-zca.6.6` | P1 | open |
| Content-intent evaluation | SEO/AEO/GEO/Drupal depth expansion | Structured-data, indexability, answer-summary, GEO intent, Drupal discovery | As an SEO/AEO analyst, I can go beyond title/meta/H1/canonical. | Add structured data; robots and sitemap checks; rendered-parity checks; direct-answer and citation-ready AEO; GEO intent alignment; Drupal discovery depth. | `stealth-lightbeacon-browser-addon-zca.6.7` | P1 | open |
| Performance diagnostics | Performance/PageSpeed evaluator family | Offline performance diagnostics | As a site owner, I can see performance regressions alongside content issues. | Add lab-style perf rules; define thresholds; split local-only vs backend-assisted measurement; add fixtures. | `stealth-lightbeacon-browser-addon-zca.6.8` | P1 | open |
| Governance | Ruleset and knowledge-base governance | Versioned metadata and enablement matrix | As a maintainer, I can turn evaluation families on and off without code churn. | Add metadata; define evala11y-lite/wcag-core/strict-a11y; align versions; test category filtering. | `stealth-lightbeacon-browser-addon-zca.6.9` | P1 | open |
| Persistence and workflow evolution | Semantic persistence and history search | Historical storage and trend queries | As an analyst, I can query prior scans and compare trends over time. | Add DuckDB/LanceDB path; define retrieval; add regression-trend queries; add migration tests. | `stealth-lightbeacon-browser-addon-zca.6.11` | P2 | open |
| Persistence and workflow evolution | Workspace watcher mode | Automatic rescan on content change | As a developer, I can keep audits fresh without manual reruns. | Define watch triggers; reconcile duplicate runs; add background tests; gate post-MCP stabilization. | `stealth-lightbeacon-browser-addon-zca.6.10` | P2 | open |
| Persistence and workflow evolution | Deeper remote engine parity | Engine selection beyond transport wiring | As an integrator, I can choose the best backend engine without changing the audit surface. | Refine recommendation; separate transport failure from validation failure; extend fallback semantics; add adapter tests. | `stealth-lightbeacon-browser-addon-zca.6.12` | P2 | open |

## Completion Tracker
| Item | Status | Evidence |
| --- | --- | --- |
| Roadmap artifact moved and validated | complete | This file. |
| Beads child issue decomposition | complete | `stealth-lightbeacon-browser-addon-zca.6.2` through `.6.12`. |
| Offline-only validation capability matrix | complete | Current runtime and script gates. |
| Playwright browser automation plan | planned | `docs/roadmap/playwright-test-plan.md` and child issues `.6.2.1` through `.6.9.2`. |
| Accessibility parity gap closure | planned | `stealth-lightbeacon-browser-addon-zca.6.4` and `.6.5`. |
| Security header evaluator | planned | `stealth-lightbeacon-browser-addon-zca.6.6`. |
| SEO/AEO/GEO/Drupal depth expansion | planned | `stealth-lightbeacon-browser-addon-zca.6.7`. |
| Performance/PageSpeed evaluator family | planned | `stealth-lightbeacon-browser-addon-zca.6.8`. |
| Ruleset and knowledge-base governance | planned | `stealth-lightbeacon-browser-addon-zca.6.9`. |
| Persistence/history search | planned | `stealth-lightbeacon-browser-addon-zca.6.11`. |
| Workspace watcher mode | planned | `stealth-lightbeacon-browser-addon-zca.6.10`. |
| Deeper remote engine parity | planned | `stealth-lightbeacon-browser-addon-zca.6.12`. |

## Addon Import Plan (Reference Addons)
- A dedicated integration plan is now tracked in:
  - `docs/roadmap/addon-feature-integration-plan.md`
- Strategic direction:
  - Make this addon side panel-first (`side_panel.default_path`).
  - Keep deterministic local-first execution and strict verification gates.
  - Import relevant feature patterns only (not wholesale architecture copy).
- Mandatory delivery discipline:
  - Test-driven development for each BEAD (red -> green -> refactor).
  - Verification-before-completion for all success claims and phase closure.

## Outcome Priority
1. Prove offline-only validation with no network dependency.
2. Close accessibility parity gaps that most directly change defect detection quality.
3. Add runtime security-header validation.
4. Expand SEO, AEO, GEO, and Drupal depth.
5. Add performance and governance depth.
6. Add persistence, search, and watcher workflows later.

## Release Milestones
- See `docs/release-milestones.md` for the minor and major release planning
  gates derived from this roadmap.
- Minor release planning tracks the P0/P1 slices that protect offline trust and
  browser-surface quality.
- Major release planning tracks the P2 slices that add persistence and
  workflow maturity.

## Phased Iterations
- See `docs/phase-iterations.md` for the four backlog iterations and their
  exit criteria.
- See `docs/iteration-1-plan.md` for the execution-ready plan for the first
  iteration.
- Iteration 1 protects the current release line.
- Iteration 2 is the earliest minor-release boundary.
- Iteration 4 is the major-release boundary.
