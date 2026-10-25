import { describe, expect, it, vi } from "vitest";
import { createFrameScheduler } from "./frame-scheduler";

function setup() {
  const callback = vi.fn();
  const frames: FrameRequestCallback[] = [];
  const request = vi.fn((fn: FrameRequestCallback) => {
    frames.push(fn);
    return frames.length;
  });
  const cancel = vi.fn();
  return { callback, frames, request, cancel, task: createFrameScheduler(callback, request, cancel) };
}

describe("resize layout frame scheduling", () => {
  it("defers updates and coalesces repeated resize notifications", () => {
    const { task, callback, request, frames } = setup();
    task.schedule();
    task.schedule();
    expect(callback).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
    frames[0](0);
    expect(callback).toHaveBeenCalledTimes(1);
    task.schedule();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("cancels pending work and prevents updates after unmount", () => {
    const { task, callback, cancel, frames, request } = setup();
    task.schedule();
    task.dispose();
    expect(cancel).toHaveBeenCalledWith(1);
    frames[0](0);
    task.schedule();
    expect(callback).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("allows another frame to be scheduled during the update", () => {
    const { task, callback, frames, request } = setup();
    callback.mockImplementationOnce(() => task.schedule());
    task.schedule();
    frames[0](0);
    expect(request).toHaveBeenCalledTimes(2);
    frames[1](16);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
