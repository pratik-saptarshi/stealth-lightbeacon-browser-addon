import { describe, expect, it, vi } from 'vitest';
import { startEventLoopTrace, withEventLoopTrace } from '../../src/shared/performance-trace';

describe('event loop trace', () => {
  it('logs debug output and warns on long phases', () => {
    const sink = {
      debug: vi.fn(),
      warn: vi.fn()
    };
    const clock = {
      times: [0, 21],
      now() {
        return this.times.shift() ?? 21;
      },
      mark: vi.fn(),
      measure: vi.fn()
    };

    const trace = startEventLoopTrace('popup.render', sink, clock);
    trace.end('slow path');

    expect(sink.debug).toHaveBeenCalledWith('[perf] popup.render 21.00ms slow path');
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(clock.mark).toHaveBeenCalledWith('popup.render:start');
    expect(clock.mark).toHaveBeenCalledWith('popup.render:end');
  });

  it('uses the runtime performance clock when no clock is supplied', () => {
    const sink = {
      debug: vi.fn(),
      warn: vi.fn()
    };

    const trace = startEventLoopTrace('default.clock', sink);
    trace.end();

    expect(sink.debug).toHaveBeenCalledTimes(1);
    expect(sink.debug.mock.calls[0][0]).toMatch(/^\[perf\] default\.clock \d+\.\d{2}ms$/);
  });

  it('wraps async work with the runtime performance clock when no clock is supplied', async () => {
    const sink = {
      debug: vi.fn(),
      warn: vi.fn()
    };

    await expect(withEventLoopTrace('default.clock.async', () => 'ok', sink)).resolves.toBe('ok');
    expect(sink.debug).toHaveBeenCalledTimes(1);
  });

  it('wraps async work and returns the task result', async () => {
    const sink = {
      debug: vi.fn(),
      warn: vi.fn()
    };
    const clock = {
      times: [0, 5],
      now() {
        return this.times.shift() ?? 5;
      }
    };

    const result = await withEventLoopTrace('service-worker.scan', async () => 'ok', sink, clock);

    expect(result).toBe('ok');
    expect(sink.debug).toHaveBeenCalledWith('[perf] service-worker.scan 5.00ms');
    expect(sink.warn).not.toHaveBeenCalled();
  });
});
