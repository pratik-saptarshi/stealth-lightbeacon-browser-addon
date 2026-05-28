import { describe, expect, it } from 'vitest';
import { loadEmbeddedCatalog, filterEnabledRuleIds } from '../../src/shared/rulesets/catalog';
import { domRules } from '../../src/shared/rules/dom';
import { runRules } from '../../src/shared/rule-engine';
import { buildRuleContext } from '../../src/shared/rules/test-support';

describe('wcag structural parity pack', () => {
  it('flags missing H1s, skipped heading levels, and empty headings', () => {
    const context = buildRuleContext({
      title: 'Accessibility structural parity test page with a sufficiently long title',
      headingSequence: [
        { level: 2, text: '' },
        { level: 4, text: 'Deep section' },
        { level: 6, text: 'Nested topic' }
      ]
    });

    const result = runRules(domRules, context);

    expect(result.issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        'wcag21-heading-structure',
        'wcag21-heading-empty',
        'wcag21-heading-skipped-levels'
      ])
    );
    expect(result.issues.some((issue) => issue.domain === 'WCAG2.1AA')).toBe(true);
  });

  it('flags multiple H1s when the page has more than one top-level heading', () => {
    const context = buildRuleContext({
      title: 'Accessibility structural parity test page with a sufficiently long title',
      headingSequence: [
        { level: 1, text: 'Primary heading' },
        { level: 2, text: 'Supporting section' },
        { level: 1, text: 'Secondary heading' }
      ]
    });

    const result = runRules(domRules, context);

    expect(result.issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        'wcag21-heading-multiple-h1'
      ])
    );
    expect(result.issues.some((issue) => issue.domain === 'WCAG2.1AA')).toBe(true);
  });

  it('flags links without discernible text or a useful destination hint', () => {
    const context = buildRuleContext({
      title: 'Accessibility structural parity test page with a sufficiently long title',
      links: [
        {
          href: 'https://example.com/docs#',
          text: '',
          rel: '',
          target: '',
          isInternal: true
        },
        {
          href: 'https://example.com/read-more',
          text: 'Read more',
          rel: '',
          target: '',
          isInternal: true
        },
        {
          href: 'https://example.com/contact',
          text: '',
          rel: '',
          target: '',
          ariaLabel: 'Contact us',
          title: null,
          isInternal: true
        }
      ]
    });

    const result = runRules(domRules, context);

    expect(result.issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        'wcag21-link-name',
        'wcag21-link-vague-text',
        'wcag21-link-non-functional'
      ])
    );
  });

  it('flags unlabeled form controls and placeholder-only fields', () => {
    const context = buildRuleContext({
      title: 'Accessibility structural parity test page with a sufficiently long title',
      formInputs: [
        {
          required: false,
          labelText: null,
          placeholder: 'Nickname',
          ariaLabel: null,
          ariaLabelledBy: null,
          title: null,
          type: 'text'
        },
        {
          required: false,
          labelText: null,
          placeholder: null,
          ariaLabel: null,
          ariaLabelledBy: null,
          title: null,
          type: 'email'
        },
        {
          required: false,
          labelText: 'Search',
          placeholder: 'Search...',
          ariaLabel: null,
          ariaLabelledBy: null,
          title: null,
          type: 'search'
        }
      ]
    });

    const result = runRules(domRules, context);

    expect(result.issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining(['wcag21-form-placeholder-only', 'wcag21-form-label'])
    );
    expect(result.issues.every((issue) => issue.domain === 'WCAG2.1AA' || issue.domain === 'ux')).toBe(true);
  });

  it('surfaces the wcag structural pack in the embedded catalog', () => {
    const catalog = loadEmbeddedCatalog();

    expect(Array.from(filterEnabledRuleIds(catalog, ['WCAG2.1AA']))).toEqual(
      expect.arrayContaining([
        'wcag21-heading-structure',
        'wcag21-heading-multiple-h1',
        'wcag21-heading-empty',
        'wcag21-heading-skipped-levels',
        'wcag21-link-name',
        'wcag21-link-vague-text',
        'wcag21-link-non-functional',
        'wcag21-form-label',
        'wcag21-form-placeholder-only'
      ])
    );
  });
});
