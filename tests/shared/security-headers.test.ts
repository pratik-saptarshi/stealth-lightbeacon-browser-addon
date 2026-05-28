import { describe, expect, it } from 'vitest';
import { runRules } from '../../src/shared/rule-engine';
import { getRulesByDomain } from '../../src/shared/rules';
import type { RuleContext } from '../../src/shared/rule-engine';

type SecurityHeaderContext = RuleContext & {
  securityHeaders: {
    observed: true;
    contentSecurityPolicy: string | null;
    strictTransportSecurity: string | null;
    referrerPolicy: string | null;
  };
};

const secureContext: SecurityHeaderContext = {
  requestUrl: 'https://example.com/page',
  title: 'Example page',
  metaDescription: 'Example description',
  lang: 'en',
  canonical: 'https://example.com/page',
  headings: { h1: 1, h2: 0, h3: 0 },
  images: [],
  links: [],
  buttons: [],
  formInputs: [],
  securityHeaders: {
    observed: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src *",
    strictTransportSecurity: null,
    referrerPolicy: 'unsafe-url'
  }
};

describe('security-header rules', () => {
  it('reports CSP, HSTS, and referrer-policy findings from runtime signals', () => {
    const rules = getRulesByDomain('security-headers');
    const result = runRules(rules, secureContext);

    expect(result.issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        'security-header-csp-unsafe-inline',
        'security-header-hsts-missing',
        'security-header-referrer-policy-unsafe'
      ])
    );
    expect(result.snapshot.summary.byDomain['security-headers']).toBeGreaterThanOrEqual(3);
    expect(
      result.issues.every(
        (issue) =>
          issue.domain === 'security-headers' &&
          issue.evidence.includes('Content-Security-Policy') ||
          issue.evidence.includes('Strict-Transport-Security') ||
          issue.evidence.includes('Referrer-Policy')
      )
    ).toBe(true);
  });

  it('reports missing security headers when observed values are blank', () => {
    const rules = getRulesByDomain('security-headers');
    const result = runRules(rules, {
      ...secureContext,
      securityHeaders: {
        observed: true,
        contentSecurityPolicy: null,
        strictTransportSecurity: null,
        referrerPolicy: null
      }
    });

    expect(result.issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        'security-header-csp-missing',
        'security-header-hsts-missing',
        'security-header-referrer-policy-missing'
      ])
    );
  });

  it('accepts safe header values and skips HSTS on non-https pages', () => {
    const rules = getRulesByDomain('security-headers');
    const result = runRules(rules, {
      ...secureContext,
      requestUrl: 'http://example.com/page',
      securityHeaders: {
        observed: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'self'",
        strictTransportSecurity: null,
        referrerPolicy: 'strict-origin-when-cross-origin'
      }
    });

    expect(result.issues).toHaveLength(0);
  });

  it('does not report security-header issues when no runtime signals are present', () => {
    const rules = getRulesByDomain('security-headers');
    const result = runRules(rules, {
      ...secureContext,
      securityHeaders: {
        observed: false,
        contentSecurityPolicy: null,
        strictTransportSecurity: null,
        referrerPolicy: null
      }
    });

    expect(result.issues).toHaveLength(0);
    expect(result.snapshot.summary.byDomain['security-headers']).toBe(0);
  });
});
