import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('openapi contract', () => {
  it('publishes the addon backend contract in source form', () => {
    const raw = readFileSync(resolve(process.cwd(), 'api/openapi.yaml'), 'utf8');

    expect(raw).toContain('openapi: 3.1.0');
    expect(raw).toContain('/v1/audit/scan');
    expect(raw).toContain('/v1/rulesets');
    expect(raw).toContain('basicAuth');
    expect(raw).toContain('AddonRuleCatalog');
  });
});
