import { domRules } from './dom';

export const allRules = [...domRules];

export function getRulesByDomain(domain: string) {
  return allRules.filter((rule) => rule.domain === domain);
}
