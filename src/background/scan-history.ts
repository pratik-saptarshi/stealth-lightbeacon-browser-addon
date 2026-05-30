import { diffSnapshots } from '../shared/rule-engine';
import type { DiffResult, ScanSnapshot } from '../shared/types';

export interface HistoryStoragePort {
  loadSnapshots(origin: string): Promise<ScanSnapshot[]>;
  saveSnapshots(origin: string, snapshots: ScanSnapshot[]): Promise<void>;
}

export interface HistoryManagerConfig {
  maxSnapshotsPerOrigin: number;
}

export interface ScanHistoryResult {
  snapshot: ScanSnapshot;
  previousSnapshot?: ScanSnapshot;
  diff: DiffResult;
  totalStored: number;
}

const DEFAULT_MAX_SNAPSHOTS_PER_ORIGIN = 20;

export class ScanHistoryManager {
  constructor(
    private readonly storage: HistoryStoragePort,
    private readonly config: Partial<HistoryManagerConfig> = {}
  ) {}

  async saveSnapshot(snapshot: ScanSnapshot): Promise<ScanHistoryResult> {
    if (!snapshot.id || !snapshot.origin) {
      throw new Error('Snapshot must include id and origin');
    }

    const stored = await this.storage.loadSnapshots(snapshot.origin);
    const previousSnapshot = getLatestSnapshot(stored);

    const filtered = stored.filter((item) => item.id !== snapshot.id);
    const ranked = [snapshot, ...filtered]
      .sort((left, right) => right.timestamp - left.timestamp);

    const maxPerOrigin = this.config.maxSnapshotsPerOrigin ?? DEFAULT_MAX_SNAPSHOTS_PER_ORIGIN;
    const trimmed = ranked.slice(0, Math.max(1, maxPerOrigin));

    await this.storage.saveSnapshots(snapshot.origin, trimmed);

    return {
      snapshot,
      previousSnapshot,
      diff: diffSnapshots(snapshot, previousSnapshot),
      totalStored: trimmed.length
    };
  }

  async listSnapshots(origin: string, limit?: number): Promise<ScanSnapshot[]> {
    const snapshots = await this.storage.loadSnapshots(origin);
    const normalized = isNewestFirstByTimestamp(snapshots)
      ? snapshots
      : [...snapshots].sort((left, right) => right.timestamp - left.timestamp);
    const max = typeof limit === 'number' ? Math.max(1, limit) : normalized.length;
    return normalized.slice(0, max);
  }

  async getLatest(origin: string): Promise<ScanSnapshot | undefined> {
    const snapshots = await this.listSnapshots(origin, 1);
    return snapshots[0];
  }

  async compareLatest(origin: string): Promise<{ latest?: ScanSnapshot; previous?: ScanSnapshot; diff: DiffResult }> {
    const [latest, previous] = await this.getTwoLatest(origin);

    if (!latest) {
      return { latest: undefined, previous: undefined, diff: { newIssues: [], resolvedIssues: [], regressions: [], improvements: [] } };
    }

    return {
      latest,
      previous,
      diff: diffSnapshots(latest, previous)
    };
  }

  private async getTwoLatest(origin: string): Promise<[ScanSnapshot | undefined, ScanSnapshot | undefined]> {
    const snapshots = await this.listSnapshots(origin, 2);
    const latest = snapshots[0];
    return [latest, snapshots[1]];
  }
}

function getLatestSnapshot(snapshots: ScanSnapshot[]): ScanSnapshot | undefined {
  if (!snapshots.length) {
    return undefined;
  }

  let latest = snapshots[0];
  for (let index = 1; index < snapshots.length; index += 1) {
    if (snapshots[index].timestamp > latest.timestamp) {
      latest = snapshots[index];
    }
  }

  return latest;
}

function isNewestFirstByTimestamp(snapshots: ScanSnapshot[]): boolean {
  for (let index = 1; index < snapshots.length; index += 1) {
    if (snapshots[index - 1].timestamp < snapshots[index].timestamp) {
      return false;
    }
  }

  return true;
}

export class MemoryHistoryStorage implements HistoryStoragePort {
  private readonly buckets = new Map<string, ScanSnapshot[]>();

  async loadSnapshots(origin: string): Promise<ScanSnapshot[]> {
    return this.buckets.get(origin) ? [...(this.buckets.get(origin) as ScanSnapshot[])] : [];
  }

  async saveSnapshots(origin: string, snapshots: ScanSnapshot[]): Promise<void> {
    this.buckets.set(origin, [...snapshots]);
  }
}

export const historyManagerDefaults = {
  maxSnapshotsPerOrigin: DEFAULT_MAX_SNAPSHOTS_PER_ORIGIN
};
