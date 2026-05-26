# EvalA11y Analysis & Implementation Backlog

Source reviewed:
- `https://github.com/prateekvr/evala11y`
- `README.md`
- `evala11y.user.js` (single userscript, single-run client-side execution model)

Reference version:
- Userscript metadata shows `@version 1.0.0`.

## 1) Extracted Ruleset

### A. DOM Accessibility Checks (EvalA11y)

1. Images
   - Missing `alt` attribute (critical).
   - Empty `alt` on non-decorative image (major).
   - Redundant alt phrases (`"image of"`, `"picture of"`, `"image"`).
2. Headings
   - Skipped heading level (e.g., h2 -> h4).
   - Empty heading text.
   - Missing `<h1>`.
   - Multiple `<h1>`.
3. Links
   - Empty link text without accessible fallback (`img[alt]` or `aria-label`).
   - Vague link labels (`click here`, `read more`, `here`, `more`, `link`, `learn more`).
   - Non-functional links (`href` missing/empty/`#` with no handler role fallback).
4. Forms
   - Missing control label (`<label>`, `aria-label`, `aria-labelledby`, `title`).
   - Placeholder-only labeling.
   - Radio/checkbox group missing `<fieldset>` when same-name siblings exist.
5. Contrast
   - Text/background luminance contrast below threshold.
   - 4.5:1 for normal text, 3:1 for large text.
6. ARIA
   - Invalid role value.
   - `aria-hidden="true"` with focusable descendants.
   - Broken `aria-labelledby` ID references.
7. Focus indicators
   - Potential missing visible focus when outline is suppressed and no visible focus state.
8. Keyboard
   - Positive `tabindex`.
   - `onclick` with no keyboard affordance on non-native controls.
   - Mouse-only handlers (`onmouseover`/`onmouseout`/`onmouseenter`/`onmouseleave`) with no focus/blur equivalent.

### B. UI / UX and Reporting Features

1. Floating page button injects “♿ EvalA11y”.
2. Side panel with:
   - severity summary,
   - grouped issues by category,
   - collapsible issue groups,
   - issue jump-to-element actions.
3. On-page highlighting/overlay:
   - severity color badges,
   - hover tooltip with title/description/WCAG mapping.
4. Export formats:
   - JSON (structured issue list + summary),
   - CSV,
   - HTML/PDF-friendly printable output.

### C. Operational Characteristics

1. Runs at `document-end` on all pages via userscript injection.
2. 100% client-side; no network calls and no dependencies.
3. No page mutation except temporary overlays and style nodes.
4. Single run model (no background service/watch loop).
5. Explicitly noted limitations:
   - dynamic content after initial run not re-scanned,
   - contrast checks best-effort for solid backgrounds,
   - no cognitive accessibility checks,
   - PDF export depends on browser print workflow.

## 2) Implementation Mapping to Current Addon

| EvalA11y area | Current addon status | Gap severity |
| --- | --- | --- |
| Floating trigger + panel | Partial | Low |
| Issue grouping + severity summary | Partial (implemented for broader domains) | Low |
| JSON/CSV/HTML/print output | Partial | Low |
| Image-alt checks | Missing | High |
| Heading structure checks | Missing | High |
| Link semantics checks | Missing | High |
| Form label checks | Missing | High |
| Contrast rule checks | Missing | High |
| ARIA role/reference checks | Missing | High |
| Focus indicator checks | Missing | Medium |
| Keyboard interaction checks | Missing | High |
| Overlay/highlight system | Implemented in-browser | Low |
| Backend/API coupling | Advanced (beyond EvalA11y) | N/A |

## 3) Phased Implementation Plan (for Productboard-ready backlog)

### Phase 1 — Foundation and parity extraction (Now)
Goal: move from current DOM baseline to deterministic accessibility rule parity.

- Story: As a product analyst, I can evaluate core accessibility defects from the current page in the side panel.
- Tasks:
  1. Add image rules (`missing alt`, `empty alt`, `redundant alt phrases`) with category `WCAG2.1AA`.
  2. Add heading rules (`missing h1`, `multiple h1`, `skipped levels`, `empty headings`) with category `WCAG2.1AA`.
  3. Add link rules (`empty link`, `vague link text`, `non-functional links`) with category `WCAG2.1AA`.
  4. Add form rules (`missing labels`, `placeholder-only`, `missing fieldset`) with category `WCAG2.1AA`.
  5. Normalize severity mapping to existing taxonomy (`critical/high/medium/low` + domain summary buckets).
- Acceptance:
  - New fixtures for each rule category.
  - End-to-end panel shows these issues in grouped by domain view.
  - Export payload includes deterministic issue IDs and references.
- Dependencies: shared issue model + rule runner + extractor signal extension.

### Phase 2 — Interaction and robustness checks (Now)
Goal: add WCAG behavior-level checks beyond structural content.

- Story: As a QA owner, I can detect interaction regressions affecting keyboard users.
- Tasks:
  1. Add contrast checker with font-size/weight handling.
  2. Add ARIA validation checks (`role` whitelist, `aria-labelledby` integrity, hidden+focusable).
  3. Add focus indicator heuristic and keyboard anti-pattern checks (`tabindex>0`, click-only elements, mouse-only events).
  4. Add regression confidence metrics in issue metadata:
     - `check_version`, `evidence`, `raw_value`.
- Acceptance:
  - Rule coverage includes sample pages for focus/keyboard/aria cases.
  - False-positive risk tracked with explicit TODO suppression tags for ambiguous cases.

### Phase 3 — UX and export parity (Now)
Goal: match EvalA11y UX expectations inside addon UX constraints.

- Story: As a marketer, I can run one-click audits and export structured results.
- Tasks:
  1. Add rescan/re-run action path tied to current tab context.
  2. Add collapsible issue grouping and jump-to-issue behavior for all categories.
  3. Add optional on-demand highlighting toggle and issue-level tooltip.
  4. Add JSON/CSV/PDF-equivalent export rows for:
     - rule id, title, description, severity, source element selector, category.
- Acceptance:
  - Re-scan produces diff of changed counts for user-visible validation.
  - Existing CI passes existing test slices and new accessibility export tests.

### Phase 4 — Rule governance and productization (Next)
Goal: make EvalA11y-derived rules maintainable and enterprise-friendly.

- Story: As an integrator, I can manage rulesets and behavior without user-script-level edits.
- Tasks:
  1. Move all EvalA11y rule definitions to machine-readable JSON schema entries.
  2. Add catalog metadata flags (`category`, `wcag`, `version`, `owner`, `enabledByDefault`).
  3. Add category-level enablement matrix (`evala11y-lite`, `wcag-core`, `strict-a11y`).
  4. Add rule quality checks and changelog notes for each schema change.
- Acceptance:
  - Rule additions can be introduced through existing ruleset-catalog pathway.
  - Backward-compatible defaults maintain current behavior when ruleset unavailable.

### Phase 5 — Optional hardening pass (Later)
Goal: reduce noise and improve signal confidence.

- Story: As an accessibility reviewer, I can trust findings by eliminating obvious false positives.
- Tasks:
  1. Add DOM context guards for SVG/background gradients and icon-font text nodes.
  2. Add allowlist/ignore list support via extension settings and per-site overrides.
  3. Add localization-ready rule messaging and richer remediation hints.
  4. Add optional telemetry-free local benchmark dataset for pre/post fix comparisons.
- Acceptance:
  - Positive precision improvements in smoke scenarios.
  - Documented decision matrix for ignored warnings.

## 4) Backlog IDs (ready for Productboard import)

- BEV-ALY-001 — Implement image `alt` parity checks.
- BEV-ALY-002 — Implement heading hierarchy parity checks.
- BEV-ALY-003 — Implement link accessibility parity checks.
- BEV-ALY-004 — Implement form-label parity checks.
- BEV-ALY-005 — Implement contrast parity checks.
- BEV-ALY-006 — Implement ARIA integrity parity checks.
- BEV-ALY-007 — Implement focus indicator parity checks.
- BEV-ALY-008 — Implement keyboard interaction parity checks.
- BEV-ALY-009 — Add one-click rescan + overlay/re-scan workflow.
- BEV-ALY-010 — Add issue comparison on rerun and export parity enhancements.
- BEV-ALY-011 — Migrate EvalA11y checks into shared machine-readable rule catalog.

## 5) Recommended Productboard note fields

- Title: `Implement EvalA11y rule parity in extension (WCAG core ruleset)`
- Objective: Improve baseline in-page audit depth and WCAG coverage.
- Priority: `P1` (Phase 1+2), `P2` (Phase 3), `P3` (Phase 4+5).
- Assignee group: `Web Platform Accessibility`.
- Tag suggestion: `a11y`, `wcag`, `frontend`, `backlog`.
- Validation references:
  - `evala11y.user.js` rule functions,
  - `README.md` accessibility checks table,
  - local test suite additions in `tests/shared` + `tests/ui`.
