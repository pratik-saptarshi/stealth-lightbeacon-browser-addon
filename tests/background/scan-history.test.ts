import { describe, expect, it } from 'vitest';
import { MemoryHistoryStorage, ScanHistoryManager, type HistoryStoragePort } from '../../src/background/scan-history';
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

class StaticHistoryStorage implements HistoryStoragePort {
  constructor(private readonly snapshots: ScanSnapshot[]) {}
  async loadSnapshots(_origin: string): Promise<ScanSnapshot[]> {
    return [...this.snapshots];
  }
  async saveSnapshots(_origin: string, _snapshots: ScanSnapshot[]): Promise<void> {}
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

  it('replaces duplicate snapshot ids and keeps newest-first ordering', async () => {
    const storage = new MemoryHistoryStorage();
    const history = new ScanHistoryManager(storage, { maxSnapshotsPerOrigin: 10 });

    await history.saveSnapshot(mkSnapshot(1));
    await history.saveSnapshot(mkSnapshot(2));
    await history.saveSnapshot({
      ...mkSnapshot(1),
      timestamp: 3
    });

    const list = await history.listSnapshots('https://example.com');
    expect(list.map((item) => item.id)).toEqual(['s-1', 's-2']);
    expect(list[0]?.timestamp).toBe(3);
  });

  it('returns latest and previous from storage order without mutation', async () => {
    const storage = new MemoryHistoryStorage();
    const history = new ScanHistoryManager(storage, { maxSnapshotsPerOrigin: 10 });

    await history.saveSnapshot(mkSnapshot(5));
    await history.saveSnapshot(mkSnapshot(4));
    await history.saveSnapshot(mkSnapshot(3));

    const latest = await history.getLatest('https://example.com');
    expect(latest?.id).toBe('s-5');

    const compare = await history.compareLatest('https://example.com');
    expect(compare.latest?.id).toBe('s-5');
    expect(compare.previous?.id).toBe('s-4');
  });

  it('preserves read order when storage is already newest-first', async () => {
    const newestFirst = [mkSnapshot(3), mkSnapshot(2), mkSnapshot(1)];
    const history = new ScanHistoryManager(new StaticHistoryStorage(newestFirst), { maxSnapshotsPerOrigin: 10 });

    const list = await history.listSnapshots('https://example.com');
    expect(list.map((item) => item.id)).toEqual(['s-3', 's-2', 's-1']);
  });

  it('normalizes read order when storage rows are out-of-order', async () => {
    const unsorted = [mkSnapshot(2), mkSnapshot(1), mkSnapshot(3)];
    const history = new ScanHistoryManager(new StaticHistoryStorage(unsorted), { maxSnapshotsPerOrigin: 10 });

    const list = await history.listSnapshots('https://example.com');
    expect(list.map((item) => item.id)).toEqual(['s-3', 's-2', 's-1']);
    const compare = await history.compareLatest('https://example.com');
    expect(compare.latest?.id).toBe('s-3');
    expect(compare.previous?.id).toBe('s-2');
  });
});
