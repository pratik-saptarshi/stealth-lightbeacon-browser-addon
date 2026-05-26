import type { RuleContext } from '../rule-engine';

export const sampleContext: RuleContext = {
  requestUrl: 'https://example.com/path',
  title: 'Example page title',
  lang: 'en',
  canonical: 'https://example.com/path',
  metaDescription: 'Example description',
  headings: {
    h1: 1,
    h2: 1,
    h3: 0
  },
  images: [],
  links: [],
  buttons: [],
  formInputs: []
};

export function buildRuleContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    ...sampleContext,
    ...overrides
  };
}
