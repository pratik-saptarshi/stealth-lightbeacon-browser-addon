import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScanSnapshot } from '../../src/shared/types';
import {
  applyToolbarState,
  formatIssueCounter,
  resolveToolbarState
} from '../../src/background/toolbar-state';

describe('toolbar state derivation', () => {
  const snapshotBase = {
    id: 's-1',
    origin: 'https://example.com',
    url: 'https://example.com/page',
    timestamp: 0,
    engine: 'dom-lite' as const,
    issues: [],
    summary: {
      total: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byDomain: {}
    }
  } as ScanSnapshot;

  it('maps issue severities to toolbar states', () => {
    expect(resolveToolbarState(undefined)).toBe('normal');
    expect(resolveToolbarState(snapshotBase)).toBe('normal');

    const critical = {
      ...snapshotBase,
      summary: {
        ...snapshotBase.summary,
        total: 1,
        bySeverity: { ...snapshotBase.summary.bySeverity, critical: 1 }
      }
    };

    const medium = {
      ...snapshotBase,
      summary: {
        ...snapshotBase.summary,
        total: 1,
        bySeverity: { ...snapshotBase.summary.bySeverity, medium: 1 }
      }
    };

    expect(resolveToolbarState(critical)).toBe('fail');
    expect(resolveToolbarState(medium)).toBe('alert');
  });

  it('formats badge counters with clipping at 999+', () => {
    expect(formatIssueCounter(0)).toBe('');
    expect(formatIssueCounter(999)).toBe('999');
    expect(formatIssueCounter(1200)).toBe('999+');
  });
});

describe('toolbar state application', () => {
  const failSnapshot: ScanSnapshot = {
    id: 's-2',
    origin: 'https://example.com',
    url: 'https://example.com/page',
    timestamp: 0,
    engine: 'dom-lite',
    issues: [],
    summary: {
      total: 4,
      bySeverity: {
        critical: 0,
        high: 1,
        medium: 0,
        low: 0
      },
      byDomain: {}
    }
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates toolbar state using animated and badge APIs', async () => {
    const action = {
      setIcon: vi.fn().mockResolvedValue(undefined),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeTextColor: vi.fn().mockResolvedValue(undefined)
    };

    await applyToolbarState({ chrome: { action } }, 11, failSnapshot);

    expect(action.setIcon).toHaveBeenCalledTimes(1);
    expect(action.setBadgeText).toHaveBeenCalledWith({
      tabId: 11,
      text: '4'
    });
    expect(action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 11,
      color: '#990000'
    });
  });

  it('falls back to static icon paths when animated icon update fails', async () => {
    const failingAction = {
      setIcon: vi
        .fn()
        .mockRejectedValueOnce(new Error('animated icon error'))
        .mockResolvedValueOnce(undefined),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeTextColor: vi.fn().mockResolvedValue(undefined)
    };

    await applyToolbarState({ browser: { action: failingAction } }, undefined, failSnapshot);

    expect(failingAction.setIcon).toHaveBeenCalledTimes(2);
  });
});
