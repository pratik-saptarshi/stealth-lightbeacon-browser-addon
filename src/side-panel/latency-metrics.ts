export const LATENCY_SAMPLES_STORAGE_KEY = 'addon_scan_latency_samples';
export const DEFAULT_SCAN_P95_TARGET_MS = 2000;

export interface LatencyStats {
  p95Ms: number;
  sampleCount: number;
}

export function normalizeLatencySamples(input: unknown, maxSamples = 100): number[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .map((value) => Math.max(0, Math.round(value)))
    .slice(-maxSamples);

  return normalized;
}

export function appendLatencySample(samples: number[], durationMs: number, maxSamples = 100): number[] {
  const normalized = normalizeLatencySamples(samples, maxSamples);
  const next = [...normalized, Math.max(0, Math.round(durationMs))];
  return next.slice(-maxSamples);
}

export function computeLatencyStats(samples: number[]): LatencyStats {
  const normalized = normalizeLatencySamples(samples);
  if (!normalized.length) {
    return { p95Ms: 0, sampleCount: 0 };
  }

  const sorted = [...normalized].sort((a, b) => a - b);
  const percentileIndex = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return {
    p95Ms: sorted[percentileIndex],
    sampleCount: sorted.length
  };
}

export function formatLatencySloBadge(stats: LatencyStats, targetMs = DEFAULT_SCAN_P95_TARGET_MS): string {
  if (!stats.sampleCount) {
    return 'p95 n/a';
  }

  const status = stats.p95Ms <= targetMs ? 'ok' : 'slow';
  return `p95 ${stats.p95Ms}ms (${status})`;
}
