import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '..', '..');

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('stage e ci and release-readiness contracts', () => {
  it('keeps required ci scripts for stage e gates', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['test:unit']).toBeTypeOf('string');
    expect(packageJson.scripts['test:integration']).toBeTypeOf('string');
    expect(packageJson.scripts['test:ui-load:strict']).toBeTypeOf('string');
    expect(packageJson.scripts['test:e2e']).toBeTypeOf('string');
    expect(packageJson.scripts['test:ci:backend-fallback']).toBeTypeOf('string');
    expect(packageJson.scripts['test:ci:issues:policy']).toBeTypeOf('string');
    expect(packageJson.scripts['test:ci:required-backend-hard-fail']).toBeTypeOf('string');
  });

  it('pins workflow matrix to named ci scripts and strict smoke script', () => {
    const workflow = readRepoFile('.github/workflows/test-matrix.yml');

    expect(workflow).toContain('label: unit');
    expect(workflow).toContain('command: pnpm run test:unit');
    expect(workflow).toContain('label: integration');
    expect(workflow).toContain('command: pnpm run test:integration');
    expect(workflow).toContain('label: backend-fallback');
    expect(workflow).toContain('command: pnpm run test:ci:backend-fallback');
    expect(workflow).toContain('label: issues:policy');
    expect(workflow).toContain('command: pnpm run test:ci:issues:policy');
    expect(workflow).toContain('label: required-backend-hard-fail');
    expect(workflow).toContain('command: pnpm run test:ci:required-backend-hard-fail');
    expect(workflow).toContain('pnpm run test:ui-load:strict');
    expect(workflow).toContain('pnpm exec playwright test tests/side-panel/side-panel.playwright.spec.ts');
  });

  it('documents coverage gate with playwright spec excluded', () => {
    const implementationPlan = readRepoFile('docs/implementation-plan.md');
    const integrationPlan = readRepoFile('docs/roadmap/addon-feature-integration-plan.md');
    const expectedCoverageGate =
      'pnpm exec vitest --run --coverage --exclude tests/side-panel/side-panel.playwright.spec.ts';

    expect(implementationPlan).toContain(expectedCoverageGate);
    expect(integrationPlan).toContain(expectedCoverageGate);
  });

  it('pins minimum branch coverage threshold to 78 percent', () => {
    const vitestConfig = readRepoFile('vitest.config.ts');
    expect(vitestConfig).toContain('branches: 78');
  });
});
