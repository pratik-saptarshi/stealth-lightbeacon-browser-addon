import { describe, expect, it } from 'vitest';
import { loadEmbeddedCatalog, filterEnabledRuleIds } from '../../src/shared/rulesets/catalog';
import { domRules } from '../../src/shared/rules/dom';
import { runRules } from '../../src/shared/rule-engine';
import { buildRuleContext } from '../../src/shared/rules/test-support';

describe('accessibility structural parity pack', () => {
  it('flags skipped heading levels as a wcag 2.1 structural issue', () => {
    const context = buildRuleContext({
      title: 'Accessibility structural parity test page with a sufficiently long title',
      headings: { h1: 1, h2: 0, h3: 1 }
    });

    const result = runRules(domRules, context);

    expect(result.issues.some((issue) => issue.ruleId === 'wcag21-heading-structure')).toBe(true);
    expect(result.issues.some((issue) => issue.domain === 'WCAG2.1AA')).toBe(true);
  });

  it('flags links without discernible text as a wcag 2.1 structural issue', () => {
    const context = buildRuleContext({
      title: 'Accessibility structural parity test page with a sufficiently long title',
      links: [
        {
          href: 'https://example.com/docs',
          text: '   ',
          rel: '',
          target: '',
          isInternal: true
        }
      ]
    });

    const result = runRules(domRules, context);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'wcag21-link-name',
          domain: 'WCAG2.1AA',
          source: 'dom-only'
        })
      ])
    );
  });

  it('flags unlabeled form controls even when they are not required', () => {
    const context = buildRuleContext({
      title: 'Accessibility structural parity test page with a sufficiently long title',
      formInputs: [
        {
          required: false,
          labelText: null,
          type: 'email'
        }
      ]
    });

    const result = runRules(domRules, context);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'wcag21-form-label',
          domain: 'WCAG2.1AA',
          source: 'dom-only'
        })
      ])
    );
  });

  it('surfaces the wcag structural pack in the embedded catalog', () => {
    const catalog = loadEmbeddedCatalog();

    expect(Array.from(filterEnabledRuleIds(catalog, ['WCAG2.1AA']))).toEqual(
      expect.arrayContaining([
        'wcag21-heading-structure',
        'wcag21-link-name',
        'wcag21-form-label'
      ])
    );
  });
});
