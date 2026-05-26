import type { ScanSnapshot } from '../shared/types';
import type { HistoryStoragePort } from './scan-history';

export type StorageGet = <T>(keys: string[]) => Promise<Record<string, T>>;
export type StorageSet = (items: Record<string, unknown>) => Promise<void>;

export interface ChromeLikeStorageArea {
  get: StorageGet;
  set: StorageSet;
}

export interface ChromeLike {
  storage?: {
    local: ChromeLikeStorageArea;
  };
}

export class ChromeHistoryStorage implements HistoryStoragePort {
  constructor(private readonly storage: ChromeLikeStorageArea) {}

  async loadSnapshots(origin: string): Promise<ScanSnapshot[]> {
    const key = keyForOrigin(origin);
    const payload = await this.storage.get<ScanSnapshot[]>([key]);
    return payload[key] ?? [];
  }

  async saveSnapshots(origin: string, snapshots: ScanSnapshot[]): Promise<void> {
    const key = keyForOrigin(origin);
    await this.storage.set({ [key]: snapshots });
  }
}

export function createChromeHistoryStorage(candidate?: ChromeLike): ChromeHistoryStorage | undefined {
  const chromeStorage = candidate?.storage?.local;
  if (!chromeStorage?.get || !chromeStorage?.set) {
    return undefined;
  }

  return new ChromeHistoryStorage(chromeStorage);
}

function keyForOrigin(origin: string): string {
  return `scan_history_${origin.toLowerCase()}`;
}
