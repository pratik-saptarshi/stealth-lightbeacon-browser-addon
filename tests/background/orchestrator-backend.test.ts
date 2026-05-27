import { describe, expect, it } from 'vitest';
import { ScanOrchestrator } from '../../src/background/orchestrator';
import { runRules } from '../../src/shared/rule-engine';
import { allRules } from '../../src/shared/rules';
import type { RuleContext } from '../../src/shared/rule-engine';
import type { ScanRequest, ScanSnapshot } from '../../src/shared/types';
import type { BackendAdapter } from '../../src/background/backend-bridge';
import type { EngineRecommendation } from '../../src/shared/types';

const context: RuleContext = {
  requestUrl: 'https://example.com/page',
  title: 'Example',
  metaDescription: 'desc',
  lang: 'en',
  canonical: 'https://example.com/page',
  headings: { h1: 1, h2: 0, h3: 0 },
  images: [],
  links: [],
  buttons: [],
  formInputs: []
};

const baseRequest: ScanRequest = {
  requestId: 'backend-1',
  url: 'https://example.com/page',
  engine: 'dom-lite'
};

function localSnapshotFor(requestId: string): ScanSnapshot {
  return {
    id: `local-${requestId}`,
    origin: 'https://example.com',
    url: requestId,
    timestamp: 10,
    engine: 'dom-lite',
    issues: [],
    summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, byDomain: { seo: 0, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, 'security-headers': 0, 'WCAG2.1AA': 0, 'WCAG2.2AA': 0 } }
  };
}

function makeBackendAdapter(snapshot: ScanSnapshot): BackendAdapter {
  return {
    async runScan() {
      return { snapshot };
    }
  };
}

describe('orchestrator backend integration', () => {
  it('uses backend result when backend returns successfully', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      backend: { endpoint: 'http://localhost:5000', enabled: true }
    };

    const backendResult = localSnapshotFor('https://example.com/backend');
    const orchestrator = new ScanOrchestrator({
      backendClient: makeBackendAdapter(backendResult)
    });

    const result = await orchestrator.runScan(request, context);
    expect(result.snapshot.id).toContain('scan-');
    expect(result.snapshot.url).toBe('https://example.com/page');
    expect(result.snapshot.summary.total).toBe(0);
  });

  it('backend-fallback: falls back to local engine when optional backend fails', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'backend-2',
      backend: { endpoint: 'http://localhost:5000', enabled: true, required: false }
    };

    const orchestrator = new ScanOrchestrator({
      backendClient: {
        async runScan() {
          throw new Error('backend-unavailable');
        }
      }
    });

    const result = await orchestrator.runScan(request, context);
    expect(result.snapshot.id).toContain('scan-');
    expect(result.snapshot.summary.total).toBeGreaterThanOrEqual(0);
    expect(result.recommendation?.engine).toBe('mcp');
    expect(result.recommendation?.confidence).toBe(0);
    expect(result.recommendation?.reason).toContain('MCP-assisted');
  });

  it('issues:policy backend-fallback: applies dom-only issue-source policy after backend failure fallback', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'backend-4',
      backend: { endpoint: 'http://localhost:5000', enabled: true, required: false }
    };

    const orchestrator = new ScanOrchestrator({
      backendClient: {
        async runScan() {
          throw new Error('backend-unavailable');
        }
      }
    });

    const result = await orchestrator.runScan(request, context);

    expect(result.snapshot.issues.length).toBeGreaterThan(0);
    expect(result.snapshot.issues.every((issue) => issue.source === 'dom-only')).toBe(true);

    const policy: EngineRecommendation = result.recommendation!;
    expect(policy.engine).toBe('mcp');
    expect(policy.reason.length).toBeGreaterThan(0);
    expect(policy.confidence).toBeGreaterThanOrEqual(0);
  });

  it('backend-fallback: keeps recommendation concrete when optional backend throws', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'backend-5',
      backend: { endpoint: 'http://localhost:5000', enabled: true, required: false }
    };

    const orchestrator = new ScanOrchestrator({
      backendClient: {
        async runScan() {
          throw new Error('temporarily unavailable');
        }
      }
    });

    const result = await orchestrator.runScan(request, context);

    expect(result.recommendation).toBeDefined();
    expect(result.recommendation?.engine).toMatch(/^(mcp|http|fast-obscura|stealth)$/);
    expect(typeof result.recommendation?.confidence).toBe('number');
    expect(result.recommendation?.confidence).toBeGreaterThanOrEqual(0);
    expect(result.recommendation?.confidence).toBeLessThanOrEqual(1);
    expect(result.recommendation?.reason).toBeTruthy();
  });

  it('required-backend-hard-fail: fails hard when backend is required but unavailable', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'backend-3',
      backend: { endpoint: 'http://localhost:5000', enabled: true, required: true }
    };

    const orchestrator = new ScanOrchestrator({
      backendClient: {
        async runScan() {
          throw new Error('backend-unavailable');
        }
      }
    });

    await expect(orchestrator.runScan(request, context)).rejects.toThrow('backend-unavailable');
  });

  it('backend-fallback: ignores invalid backend snapshots and uses the local engine when backend validation fails', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'backend-6',
      backend: { endpoint: 'http://localhost:5000', enabled: true, required: false }
    };

    const localResult = runRules(allRules, context);
    const orchestrator = new ScanOrchestrator({
      backendClient: {
        async runScan() {
          return {
            snapshot: {
              ...localSnapshotFor('https://example.com/backend'),
              origin: 'https://evil.example.com',
              summary: {
                ...localSnapshotFor('https://example.com/backend').summary,
                total: 99
              }
            } as ScanSnapshot
          };
        }
      }
    });

    const result = await orchestrator.runScan(request, context);

    expect(result.snapshot.origin).toBe(localResult.snapshot.origin);
    expect(result.snapshot.summary.total).toBe(localResult.snapshot.summary.total);
    expect(result.snapshot.issues.every((issue) => issue.source === 'dom-only')).toBe(true);
  });

  it('required-backend-hard-fail: rejects invalid backend snapshots when backend validation fails', async () => {
    const request: ScanRequest = {
      ...baseRequest,
      requestId: 'backend-7',
      backend: { endpoint: 'http://localhost:5000', enabled: true, required: true }
    };

    const orchestrator = new ScanOrchestrator({
      backendClient: {
        async runScan() {
          return {
            snapshot: {
              ...localSnapshotFor('https://example.com/backend'),
              summary: {
                ...localSnapshotFor('https://example.com/backend').summary,
                total: 99
              }
            } as ScanSnapshot
          };
        }
      }
    });

    await expect(orchestrator.runScan(request, context)).rejects.toThrow(/summary\.total/);
  });
});
