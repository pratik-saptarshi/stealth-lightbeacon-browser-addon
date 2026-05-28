import { domRules } from './dom';
import { securityHeaderRules } from './security-headers';

export const allRules = [...domRules, ...securityHeaderRules];

export function getRulesByDomain(domain: string) {
  return allRules.filter((rule) => rule.domain === domain);
}
