import type { RuleContext, RuleSpec } from '../rule-engine';
import { createIssue } from '../rule-engine';

function getObservedSecurityHeaders(context: RuleContext) {
  const headers = context.securityHeaders;
  if (!headers?.observed) {
    return undefined;
  }

  return headers;
}

function buildEvidence(headerName: string, details: Record<string, unknown>): string {
  return `${headerName}: ${JSON.stringify(details)}`;
}

function hasUnsafeContentSecurityPolicy(policy: string): boolean {
  return /'unsafe-inline'|'unsafe-eval'/i.test(policy);
}

function isUnsafeReferrerPolicy(policy: string): boolean {
  const normalized = policy.trim().toLowerCase();
  return normalized === 'unsafe-url' || normalized === 'no-referrer-when-downgrade';
}

const securityHeaderCspMissing: RuleSpec = {
  id: 'security-header-csp-missing',
  title: 'Content Security Policy missing',
  severity: 'high',
  domain: 'security-headers',
  evaluate: (context: RuleContext) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }

    if ((headers.contentSecurityPolicy ?? '').trim()) {
      return [];
    }

    return [
      createIssue(
        securityHeaderCspMissing,
        'No enforced Content-Security-Policy header was observed',
        buildEvidence('Content-Security-Policy', {
          observed: headers.observed,
          value: headers.contentSecurityPolicy,
          requestUrl: context.requestUrl
        })
      )
    ];
  }
};

const securityHeaderCspUnsafeInline: RuleSpec = {
  id: 'security-header-csp-unsafe-inline',
  title: 'Content Security Policy allows unsafe inline script execution',
  severity: 'medium',
  domain: 'security-headers',
  evaluate: (context: RuleContext) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }

    const policy = headers?.contentSecurityPolicy?.trim();
    if (!policy) {
      return [];
    }

    if (!hasUnsafeContentSecurityPolicy(policy)) {
      return [];
    }

    return [
      createIssue(
        securityHeaderCspUnsafeInline,
        'CSP allows unsafe inline or eval execution',
        buildEvidence('Content-Security-Policy', {
          observed: headers.observed,
          value: policy,
          finding: 'unsafe-inline-or-eval'
        })
      )
    ];
  }
};

const securityHeaderHstsMissing: RuleSpec = {
  id: 'security-header-hsts-missing',
  title: 'Strict-Transport-Security missing',
  severity: 'high',
  domain: 'security-headers',
  evaluate: (context: RuleContext) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }

    if (new URL(context.requestUrl).protocol !== 'https:') {
      return [];
    }

    if ((headers.strictTransportSecurity ?? '').trim()) {
      return [];
    }

    return [
      createIssue(
        securityHeaderHstsMissing,
        'No Strict-Transport-Security header was observed on an HTTPS page',
        buildEvidence('Strict-Transport-Security', {
          observed: headers.observed,
          value: headers.strictTransportSecurity,
          requestUrl: context.requestUrl
        })
      )
    ];
  }
};

const securityHeaderReferrerPolicyMissing: RuleSpec = {
  id: 'security-header-referrer-policy-missing',
  title: 'Referrer policy missing',
  severity: 'low',
  domain: 'security-headers',
  evaluate: (context: RuleContext) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }

    if ((headers.referrerPolicy ?? '').trim()) {
      return [];
    }

    return [
      createIssue(
        securityHeaderReferrerPolicyMissing,
        'No Referrer-Policy header was observed',
        buildEvidence('Referrer-Policy', {
          observed: headers.observed,
          value: headers.referrerPolicy,
          requestUrl: context.requestUrl
        })
      )
    ];
  }
};

const securityHeaderReferrerPolicyUnsafe: RuleSpec = {
  id: 'security-header-referrer-policy-unsafe',
  title: 'Referrer policy allows too much leakage',
  severity: 'medium',
  domain: 'security-headers',
  evaluate: (context: RuleContext) => {
    const headers = getObservedSecurityHeaders(context);
    if (!headers) {
      return [];
    }

    const policy = headers?.referrerPolicy?.trim();
    if (!policy) {
      return [];
    }

    if (!isUnsafeReferrerPolicy(policy)) {
      return [];
    }

    return [
      createIssue(
        securityHeaderReferrerPolicyUnsafe,
        'Referrer policy allows cross-site leakage',
        buildEvidence('Referrer-Policy', {
          observed: headers.observed,
          value: policy,
          finding: 'unsafe-referrer-policy'
        })
      )
    ];
  }
};

export const securityHeaderRules: RuleSpec[] = [
  securityHeaderCspMissing,
  securityHeaderCspUnsafeInline,
  securityHeaderHstsMissing,
  securityHeaderReferrerPolicyMissing,
  securityHeaderReferrerPolicyUnsafe
];
