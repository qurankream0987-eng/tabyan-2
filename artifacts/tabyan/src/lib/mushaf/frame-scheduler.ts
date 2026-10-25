/**
 * ResizeObserver runs during layout. Defer layout-affecting work to the next
 * frame so it cannot resize an observed element within the same delivery loop.
 */
export function createFrameScheduler(
  callback: () => void,
  requestFrame: typeof requestAnimationFrame = requestAnimationFrame,
  cancelFrame: typeof cancelAnimationFrame = cancelAnimationFrame,
) {
  let pending: number | null = null;
  let disposed = false;
  return {
    schedule: () => {
      if (disposed || pending !== null) return;
      pending = requestFrame(() => {
        pending = null;
        if (!disposed) callback();
      });
    },
    dispose: () => {
      disposed = true;
      if (pending !== null) cancelFrame(pending);
      pending = null;
    },
  };
}
