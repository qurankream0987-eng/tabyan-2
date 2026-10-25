/** Deterministic clock for timeline-driven tests. */
export interface ManualClock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  /** Advances time, firing due timers in order (timers may schedule more timers). */
  advance(ms: number): void;
  pending(): number;
}

export function createManualClock(start = 0): ManualClock {
  let current = start;
  let nextId = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    now: () => current,
    setTimeout: (callback, ms) => {
      const id = nextId++;
      timers.set(id, { at: current + Math.max(0, ms), callback });
      return id;
    },
    clearTimeout: (handle) => {
      timers.delete(handle as number);
    },
    advance: (ms) => {
      const end = current + ms;
      for (;;) {
        let dueId = -1;
        let dueAt = Number.POSITIVE_INFINITY;
        for (const [id, timer] of timers) {
          if (timer.at <= end && timer.at < dueAt) {
            dueAt = timer.at;
            dueId = id;
          }
        }
        if (dueId < 0) break;
        const timer = timers.get(dueId)!;
        timers.delete(dueId);
        current = Math.max(current, timer.at);
        timer.callback();
      }
      current = end;
    },
    pending: () => timers.size,
  };
}
