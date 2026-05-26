import { describe, expect, it } from 'vitest';
import { getRulesByDomain } from '../../src/shared/rules/registry';
import { buildRuleContext, sampleContext } from '../../src/shared/rules/test-support';

describe('shared rules support helpers', () => {
  it('returns domain filtered rules and builds rule contexts from the shared sample', () => {
    const seoRules = getRulesByDomain('seo');
    expect(seoRules.length).toBeGreaterThan(0);
    expect(getRulesByDomain('non-existent-domain')).toEqual([]);

    const context = buildRuleContext({
      title: 'Override title',
      requestUrl: 'https://example.com/override'
    });

    expect(sampleContext.requestUrl).toBe('https://example.com/path');
    expect(context.title).toBe('Override title');
    expect(context.requestUrl).toBe('https://example.com/override');
  });
});
