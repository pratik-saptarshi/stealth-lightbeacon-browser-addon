import { createIssue, type RuleContext, type RuleSpec } from '../rule-engine';

function buildEvidence(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

function requiresAccessibleLabel(type: string): boolean {
  return !['hidden', 'button', 'submit', 'reset', 'image'].includes(type.toLowerCase());
}

const wcag21HeadingStructure: RuleSpec = {
  id: 'wcag21-heading-structure',
  title: 'Heading hierarchy should remain structural',
  severity: 'medium',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    const issues = [];

    if (context.headings.h2 > 0 && context.headings.h1 === 0) {
      issues.push(
        createIssue(
          wcag21HeadingStructure,
          'Subordinate headings appear without a top-level heading',
          buildEvidence({
            finding: 'missing-h1-before-h2',
            h1: context.headings.h1,
            h2: context.headings.h2,
            h3: context.headings.h3
          })
        )
      );
    }

    if (context.headings.h3 > 0 && context.headings.h2 === 0) {
      issues.push(
        createIssue(
          wcag21HeadingStructure,
          'H3 headings appear without an H2 structure',
          buildEvidence({
            finding: 'missing-h2-before-h3',
            h1: context.headings.h1,
            h2: context.headings.h2,
            h3: context.headings.h3
          })
        )
      );
    }

    return issues;
  }
};

const wcag21LinkName: RuleSpec = {
  id: 'wcag21-link-name',
  title: 'Links need discernible text',
  severity: 'medium',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    return context.links
      .map((link, index) => ({ link, index }))
      .filter(({ link }) => !link.text.trim())
      .map(({ link, index }) =>
        createIssue(
          wcag21LinkName,
          'Link has no discernible text',
          buildEvidence({
            finding: 'missing-link-name',
            href: link.href,
            index,
            internal: link.isInternal,
            text: link.text
          })
        )
      );
  }
};

const wcag21FormLabel: RuleSpec = {
  id: 'wcag21-form-label',
  title: 'Form controls need accessible labels',
  severity: 'high',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    return context.formInputs
      .map((field, index) => ({ field, index }))
      .filter(({ field }) => requiresAccessibleLabel(field.type) && !field.labelText?.trim())
      .map(({ field, index }) =>
        createIssue(
          wcag21FormLabel,
          'Form control lacks a programmatic label',
          buildEvidence({
            finding: 'missing-form-label',
            index,
            required: field.required,
            type: field.type,
            labelText: field.labelText
          })
        )
      );
  }
};

export const wcagStructuralRules: RuleSpec[] = [
  wcag21HeadingStructure,
  wcag21LinkName,
  wcag21FormLabel
];
