import type { RuleContext, RuleSpec } from '../rule-engine';
import { createIssue } from '../rule-engine';

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
  a11yImagesAlt,
  a11yLangAttribute,
  uxButtonLabel,
  uxFormsRequiredLabel,
  aeoCanonicalLink
];
