export interface EventLoopTraceClock {
  now(): number;
  mark?(name: string): void;
  measure?(name: string, startMark: string, endMark: string): void;
}

export interface EventLoopTraceSink {
  debug?(message: string): void;
  warn?(message: string): void;
}

export interface EventLoopTraceHandle {
  end(details?: string): void;
}

const DEFAULT_WARN_THRESHOLD_MS = 16;

export function startEventLoopTrace(
  label: string,
  sink: EventLoopTraceSink = console,
  clock: EventLoopTraceClock = globalThis.performance ?? { now: () => Date.now() }
): EventLoopTraceHandle {
  const startMark = `${label}:start`;
  const endMark = `${label}:end`;
  const startedAt = clock.now();
  clock.mark?.(startMark);

  return {
    end(details?: string) {
      const durationMs = clock.now() - startedAt;
      clock.mark?.(endMark);
      clock.measure?.(label, startMark, endMark);

      const suffix = details ? ` ${details}` : '';
      const message = `[perf] ${label} ${durationMs.toFixed(2)}ms${suffix}`;
      sink.debug?.(message);

      if (durationMs >= DEFAULT_WARN_THRESHOLD_MS) {
        sink.warn?.(message);
      }
    }
  };
}

export async function withEventLoopTrace<T>(
  label: string,
  task: () => Promise<T> | T,
  sink: EventLoopTraceSink = console,
  clock: EventLoopTraceClock = globalThis.performance ?? { now: () => Date.now() }
): Promise<T> {
  const trace = startEventLoopTrace(label, sink, clock);
  try {
    return await Promise.resolve(task());
  } finally {
    trace.end();
  }
}
