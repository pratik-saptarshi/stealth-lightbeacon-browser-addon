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
    expect(workflow).toContain('PW_REQUIRE_EXTENSION_ORIGIN: "1"');
    expect(workflow).toContain('pnpm run test:side-panel:connected');
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

  it('requires publish automation scripts and workflow fanout contracts', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const publishAllWorkflow = readRepoFile('.github/workflows/publish-all.yml');
    const releasePackageWorkflow = readRepoFile('.github/workflows/release-package.yml');
    const publishFirefoxWorkflow = readRepoFile('.github/workflows/publish-firefox.yml');
    const publishChromeWorkflow = readRepoFile('.github/workflows/publish-chrome.yml');
    const publishEdgeWorkflow = readRepoFile('.github/workflows/publish-edge.yml');

    expect(packageJson.scripts['package:store']).toBe('node scripts/package-store-artifacts.mjs');
    expect(packageJson.scripts['publish:chrome']).toBe('node scripts/publish-chrome.mjs');
    expect(packageJson.scripts['publish:edge']).toBe('node scripts/publish-edge.mjs');

    expect(publishAllWorkflow).toContain("uses: ./.github/workflows/release-package.yml");
    expect(publishAllWorkflow).toContain("uses: ./.github/workflows/publish-firefox.yml");
    expect(publishAllWorkflow).toContain("uses: ./.github/workflows/publish-chrome.yml");
    expect(publishAllWorkflow).toContain("uses: ./.github/workflows/publish-edge.yml");
    expect(publishAllWorkflow).toContain("tags:");
    expect(publishAllWorkflow).toContain("- \"v*\"");

    expect(releasePackageWorkflow).toContain('pnpm run package:store');
    expect(releasePackageWorkflow).toContain('dist-release-payload');
    expect(releasePackageWorkflow).toContain('release-artifacts');

    expect(publishFirefoxWorkflow).toContain('WEB_EXT_API_KEY');
    expect(publishFirefoxWorkflow).toContain('WEB_EXT_API_SECRET');
    expect(publishFirefoxWorkflow).toContain('npx web-ext sign');

    expect(publishChromeWorkflow).toContain('CWS_CLIENT_ID');
    expect(publishChromeWorkflow).toContain('CWS_CLIENT_SECRET');
    expect(publishChromeWorkflow).toContain('CWS_REFRESH_TOKEN');
    expect(publishChromeWorkflow).toContain('CWS_PUBLISHER_ID');
    expect(publishChromeWorkflow).toContain('CWS_EXTENSION_ID');

    expect(publishEdgeWorkflow).toContain('EDGE_CLIENT_ID');
    expect(publishEdgeWorkflow).toContain('EDGE_CLIENT_SECRET');
    expect(publishEdgeWorkflow).toContain('EDGE_PRODUCT_ID');
  });
});
