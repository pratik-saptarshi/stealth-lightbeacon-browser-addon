import { describe, expect, it, vi } from 'vitest';
import { ChromeHistoryStorage, createChromeHistoryStorage, type ChromeLikeStorageArea } from '../../src/background/storage';
import type { ScanSnapshot } from '../../src/shared/types';

describe('chrome history storage adapter', () => {
  it('loads and saves snapshots using a normalized origin key', async () => {
    const snapshots: ScanSnapshot[] = [{ id: 's1', origin: 'https://example.com', url: 'https://example.com/page' } as ScanSnapshot];
    const get = vi.fn(async (keys: string[]) => ({ [keys[0]]: snapshots }));
    const set = vi.fn(async () => undefined);
    const storage = new ChromeHistoryStorage({
      get: get as unknown as ChromeLikeStorageArea['get'],
      set
    });

    await expect(storage.loadSnapshots('HTTPS://Example.com')).resolves.toEqual(snapshots);
    expect(get).toHaveBeenCalledWith(['scan_history_https://example.com']);

    await storage.saveSnapshots('HTTPS://Example.com', snapshots);
    expect(set).toHaveBeenCalledWith({ 'scan_history_https://example.com': snapshots });
  });

  it('returns undefined without a complete chrome storage area', () => {
    expect(createChromeHistoryStorage({ storage: { local: { get: vi.fn() as never } } } as never)).toBeUndefined();
    expect(createChromeHistoryStorage({ storage: { local: { set: vi.fn() as never } } } as never)).toBeUndefined();
  });
});
