import type { RuleContext, RuleSpec } from '../rule-engine';
import { createIssue } from '../rule-engine';
import { wcagStructuralRules } from './accessibility-structure';

const seoTitleMissing: RuleSpec = {
  id: 'seo-title-missing',
  title: 'Title tag missing',
  severity: 'high',
  domain: 'seo',
  evaluate: (context: RuleContext) => {
    if (context.title.trim()) {
      return [];
    }

    return [
      createIssue(
        seoTitleMissing,
        'Title element is missing or empty',
        `URL ${context.requestUrl} has empty document.title`
      )
    ];
  }
};

const seoTitleShort: RuleSpec = {
  id: 'seo-title-short',
  title: 'Title too short',
  severity: 'medium',
  domain: 'seo',
  evaluate: (context: RuleContext) => {
    if (context.title.trim().length >= 25) {
      return [];
    }

    return [
      createIssue(
        seoTitleShort,
        'Title is under 25 characters',
        `Title text was: "${context.title}"`
      )
    ];
  }
};

const seoMetaDescriptionMissing: RuleSpec = {
  id: 'seo-missing-meta-description',
  title: 'Meta description missing',
  severity: 'medium',
  domain: 'seo',
  evaluate: (context: RuleContext) => {
    if ((context.metaDescription ?? '').trim()) {
      return [];
    }

    return [
      createIssue(
        seoMetaDescriptionMissing,
        'Document is missing a meta description',
        `Meta description for ${context.requestUrl} is blank`
      )
    ];
  }
};

const seoHeadingStructure: RuleSpec = {
  id: 'seo-h1-required',
  title: 'Page should have one H1',
  severity: 'high',
  domain: 'seo',
  evaluate: (context: RuleContext) => {
    if (context.headings.h1 === 1) {
      return [];
    }

    const severityText = context.headings.h1 === 0 ? 'none' : 'more than one';
    return [
      createIssue(
        seoHeadingStructure,
        `Page has ${severityText} H1 elements`,
        `Found ${context.headings.h1} H1 heading(s)`
      )
    ];
  }
};

const seoCanonicalConsistency: RuleSpec = {
  id: 'seo-canonical-consistency',
  title: 'Canonical should match page origin',
  severity: 'medium',
  domain: 'seo',
  evaluate: (context: RuleContext) => {
    if (!context.canonical?.trim()) {
      return [];
    }

    try {
      const canonicalOrigin = new URL(context.canonical).origin;
      const pageOrigin = new URL(context.requestUrl).origin;
      if (canonicalOrigin === pageOrigin) {
        return [];
      }

      return [
        createIssue(
          seoCanonicalConsistency,
          'Canonical points to a different origin',
          `Canonical ${context.canonical} differs from page origin ${pageOrigin}`
        )
      ];
    } catch {
      return [];
    }
  }
};

const a11yImagesAlt: RuleSpec = {
  id: 'a11y-images-alt',
  title: 'Image missing alt text',
  severity: 'high',
  domain: 'accessibility',
  evaluate: (context: RuleContext) => {
    return context.images
      .filter((img) => !img.alt || !img.alt.trim())
      .map((img) =>
        createIssue(
          a11yImagesAlt,
          'Decorative or meaningful image has missing alt',
          `Image missing alt: ${img.src}`
        )
      );
  }
};

const a11yLangAttribute: RuleSpec = {
  id: 'a11y-lang-attribute',
  title: 'HTML lang missing',
  severity: 'critical',
  domain: 'accessibility',
  evaluate: (context: RuleContext) => {
    if (context.lang) {
      return [];
    }

    return [
      createIssue(
        a11yLangAttribute,
        'Root language is missing',
        'Top-level document has no lang attribute'
      )
    ];
  }
};

function getHeadingSequence(context: RuleContext) {
  return context.headingSequence ?? [];
}

function normalizeLinkLabel(text: string) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function hasAccessibleLinkLabel(link: RuleContext['links'][number]) {
  return Boolean(link.text.trim() || link.ariaLabel?.trim() || link.title?.trim());
}

function hasAccessibleFormLabel(field: RuleContext['formInputs'][number]) {
  return Boolean(field.labelText?.trim() || field.ariaLabel?.trim() || field.ariaLabelledBy?.trim() || field.title?.trim());
}

const a11yHeadingMissingH1: RuleSpec = {
  id: 'wcag21-heading-structure',
  title: 'Page should contain one H1',
  severity: 'high',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    const headings = getHeadingSequence(context);
    if (!headings.length || headings.some((heading) => heading.level === 1)) {
      return [];
    }

    return [
      createIssue(
        a11yHeadingMissingH1,
        'Page does not contain an H1 heading',
        'No heading in the extracted heading sequence uses level 1'
      )
    ];
  }
};

const a11yHeadingMultipleH1: RuleSpec = {
  id: 'wcag21-heading-multiple-h1',
  title: 'Page should not contain multiple H1s',
  severity: 'medium',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    const headings = getHeadingSequence(context);
    const h1Count = headings.filter((heading) => heading.level === 1).length;
    if (h1Count <= 1) {
      return [];
    }

    return [
      createIssue(
        a11yHeadingMultipleH1,
        `Page contains ${h1Count} H1 headings`,
        `Heading sequence contains ${h1Count} level-one headings`
      )
    ];
  }
};

const a11yHeadingEmptyText: RuleSpec = {
  id: 'wcag21-heading-empty',
  title: 'Heading text should not be empty',
  severity: 'medium',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    const headings = getHeadingSequence(context);
    return headings
      .filter((heading) => !heading.text.trim())
      .map((heading, index) =>
        createIssue(
          a11yHeadingEmptyText,
          `Heading ${index + 1} is empty`,
          `Extracted ${headingLabel(heading.level)} with no text content`
        )
      );
  }
};

const a11yHeadingSkippedLevels: RuleSpec = {
  id: 'wcag21-heading-skipped-levels',
  title: 'Heading levels should not skip levels',
  severity: 'medium',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    const headings = getHeadingSequence(context).filter((heading) => heading.text.trim());
    if (headings.length < 2) {
      return [];
    }

    const issues: ReturnType<typeof createIssue>[] = [];
    let previous = headings[0];
    for (let index = 1; index < headings.length; index += 1) {
      const current = headings[index];
      if (current.level - previous.level > 1) {
        issues.push(
          createIssue(
            a11yHeadingSkippedLevels,
            `Heading level skips from ${headingLabel(previous.level)} to ${headingLabel(current.level)}`,
            `Sequence jumped from ${headingLabel(previous.level)} to ${headingLabel(current.level)}`
          )
        );
      }
      previous = current;
    }

    return issues;
  }
};

const a11yLinkMissingLabel: RuleSpec = {
  id: 'wcag21-link-name',
  title: 'Link needs accessible text',
  severity: 'high',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    return context.links
      .filter((link) => !hasAccessibleLinkLabel(link))
      .map((link) =>
        createIssue(
          a11yLinkMissingLabel,
          'Link has no accessible text',
          `Link target ${link.href} has no visible text, aria-label, or title`
        )
      );
  }
};

const a11yLinkVagueText: RuleSpec = {
  id: 'wcag21-link-vague-text',
  title: 'Link text should be descriptive',
  severity: 'low',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    const vagueLabels = new Set(['click here', 'read more', 'here', 'more', 'link', 'learn more']);
    return context.links
      .filter((link) => {
        const text = normalizeLinkLabel(link.text);
        return text.length > 0 && vagueLabels.has(text) && !link.ariaLabel?.trim() && !link.title?.trim();
      })
      .map((link) =>
        createIssue(
          a11yLinkVagueText,
          'Link text is vague or non-descriptive',
          `Link text "${link.text}" does not describe its destination`
        )
      );
  }
};

const a11yLinkNonFunctional: RuleSpec = {
  id: 'wcag21-link-non-functional',
  title: 'Link should point somewhere useful',
  severity: 'medium',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    return context.links
      .filter((link) => link.href.endsWith('#'))
      .map((link) =>
        createIssue(
          a11yLinkNonFunctional,
          'Link points to a non-functional fragment target',
          `Link href ${link.href} ends with a fragment-only target`
        )
      );
  }
};

const a11yFormMissingLabel: RuleSpec = {
  id: 'wcag21-form-label',
  title: 'Form controls need labels',
  severity: 'high',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    return context.formInputs
      .filter((field) => !field.placeholder && !hasAccessibleFormLabel(field))
      .map((field) =>
        createIssue(
          a11yFormMissingLabel,
          'Form control has no accessible label',
          `Input type ${field.type} has no label, aria-label, aria-labelledby, or title`
        )
      );
  }
};

const a11yFormPlaceholderOnly: RuleSpec = {
  id: 'wcag21-form-placeholder-only',
  title: 'Placeholder-only inputs need labels',
  severity: 'medium',
  domain: 'WCAG2.1AA',
  evaluate: (context: RuleContext) => {
    return context.formInputs
      .filter((field) => Boolean(field.placeholder?.trim()) && !hasAccessibleFormLabel(field))
      .map((field) =>
        createIssue(
          a11yFormPlaceholderOnly,
          'Form control relies on placeholder text only',
          `Input type ${field.type} uses placeholder "${field.placeholder}" instead of a real label`
        )
      );
  }
};

const uxButtonLabel: RuleSpec = {
  id: 'ux-button-label',
  title: 'Buttons need accessible labels',
  severity: 'medium',
  domain: 'accessibility',
  evaluate: (context: RuleContext) => {
    return context.buttons
      .filter((btn) => !btn.text.trim() && !btn.ariaLabel?.trim() && !btn.title.trim())
      .map(() =>
        createIssue(
          uxButtonLabel,
          'Button has no accessible label',
          `Button without text or aria-label on ${context.requestUrl}`
        )
      );
  }
};

const uxFormsRequiredLabel: RuleSpec = {
  id: 'ux-forms-required-label',
  title: 'Required inputs require label',
  severity: 'low',
  domain: 'ux',
  evaluate: (context: RuleContext) => {
    return context.formInputs
      .filter((field) => field.required && !field.labelText)
      .map((field) =>
        createIssue(
          uxFormsRequiredLabel,
          'Required form control missing label',
          `Input type ${field.type} is required but missing label text`
        )
      );
  }
};

const aeoAnswerSummary: RuleSpec = {
  id: 'aeo-answer-summary',
  title: 'Answer summary missing',
  severity: 'low',
  domain: 'aeo',
  evaluate: (context: RuleContext) => {
    const normalizedTitle = context.title.trim();
    const looksLikeQuestion =
      /\?$/.test(normalizedTitle) ||
      /^(how|what|why|when|where|who|which|can|should|does|do|is|are)\b/i.test(normalizedTitle);
    const answerSummary = (context.metaDescription ?? '').trim();

    if (!looksLikeQuestion || answerSummary.length >= 20) {
      return [];
    }

    return [
      createIssue(
        aeoAnswerSummary,
        'Question-style page lacks a concise answer summary',
        `Title "${context.title}" has no useful answer summary`
      )
    ];
  }
};

const aeoCanonicalLink: RuleSpec = {
  id: 'aeo-canonical-link',
  title: 'Canonical link missing',
  severity: 'low',
  domain: 'aeo',
  evaluate: (context: RuleContext) => {
    if (context.canonical) {
      return [];
    }

    return [
      createIssue(aeoCanonicalLink, 'No canonical link found', 'Canonical URL not present in head')
    ];
  }
};

export const domRules: RuleSpec[] = [
  seoTitleMissing,
  seoTitleShort,
  seoMetaDescriptionMissing,
  seoHeadingStructure,
  seoCanonicalConsistency,
  a11yImagesAlt,
  a11yLangAttribute,
  a11yHeadingMissingH1,
  a11yHeadingMultipleH1,
  a11yHeadingEmptyText,
  a11yHeadingSkippedLevels,
  a11yLinkMissingLabel,
  a11yLinkVagueText,
  a11yLinkNonFunctional,
  a11yFormMissingLabel,
  a11yFormPlaceholderOnly,
  uxButtonLabel,
  uxFormsRequiredLabel,
  aeoAnswerSummary,
  aeoCanonicalLink,
  ...wcagStructuralRules
];

function headingLabel(level: number): string {
  return `h${level}`;
}
