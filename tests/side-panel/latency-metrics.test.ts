import { describe, expect, it } from 'vitest';
import {
  appendLatencySample,
  computeLatencyStats,
  formatLatencySloBadge,
  normalizeLatencySamples
} from '../../src/side-panel/latency-metrics';

describe('side-panel latency metrics', () => {
  it('normalizes and bounds sample lists', () => {
    expect(normalizeLatencySamples(undefined)).toEqual([]);
    expect(normalizeLatencySamples([10, -5, 'bad', 20.4] as unknown)).toEqual([10, 0, 20]);
  });

  it('appends a sample and enforces retention', () => {
    expect(appendLatencySample([100, 200], 300, 3)).toEqual([100, 200, 300]);
    expect(appendLatencySample([100, 200, 300], 400, 3)).toEqual([200, 300, 400]);
  });

  it('computes p95 and formats non-obtrusive status text', () => {
    const stats = computeLatencyStats([400, 800, 1000, 1200, 1600, 1800, 2000, 2100, 2200, 2400]);
    expect(stats.p95Ms).toBe(2400);
    expect(formatLatencySloBadge(stats, 2000)).toBe('p95 2400ms (slow)');
    expect(formatLatencySloBadge(computeLatencyStats([]), 2000)).toBe('p95 n/a');
  });
});
