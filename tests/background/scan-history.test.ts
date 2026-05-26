import { describe, expect, it } from 'vitest';
import { MemoryHistoryStorage, ScanHistoryManager } from '../../src/background/scan-history';
import type { ScanSnapshot } from '../../src/shared/types';

const base: ScanSnapshot = {
  id: 's1',
  origin: 'https://example.com',
  url: 'https://example.com/page',
  timestamp: 1,
  engine: 'dom-lite',
  issues: [],
  summary: {
    total: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    byDomain: { seo: 0, performance: 0, accessibility: 0, aeo: 0, ux: 0, drupal: 0, geo: 0, "security-headers": 0, "WCAG2.1AA": 0, "WCAG2.2AA": 0 }
  }
};

function mkSnapshot(step: number): ScanSnapshot {
  return {
    ...base,
    id: `s-${step}`,
    timestamp: step,
    summary: {
      ...base.summary,
      total: step
    }
  };
}

describe('scan history manager', () => {
  it('keeps newest snapshots only up to retention cap', async () => {
    const storage = new MemoryHistoryStorage();
    const history = new ScanHistoryManager(storage, { maxSnapshotsPerOrigin: 2 });

    await history.saveSnapshot(mkSnapshot(1));
    await history.saveSnapshot(mkSnapshot(2));
    await history.saveSnapshot(mkSnapshot(3));

    const list = await history.listSnapshots('https://example.com');
    expect(list).toHaveLength(2);
    expect(list.map((item) => item.id)).toEqual(['s-3', 's-2']);
  });

  it('computes compare diff from latest pair', async () => {
    const storage = new MemoryHistoryStorage();
    const history = new ScanHistoryManager(storage, { maxSnapshotsPerOrigin: 20 });

    await history.saveSnapshot(mkSnapshot(1));
    const saved = await history.saveSnapshot(mkSnapshot(2));

    expect(saved.previousSnapshot?.id).toBe('s-1');
    expect(saved.diff.newIssues).toHaveLength(0);

    const compare = await history.compareLatest('https://example.com');
    expect(compare.previous?.id).toBe('s-1');
    expect(compare.latest?.id).toBe('s-2');
  });

  it('returns undefined latest for new origin', async () => {
    const storage = new MemoryHistoryStorage();
    const history = new ScanHistoryManager(storage);
    expect(await history.getLatest('https://unknown.example')).toBeUndefined();
  });
});
