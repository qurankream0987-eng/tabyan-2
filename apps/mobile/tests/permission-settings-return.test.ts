import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPermissionSettingsReturnWatcher,
  readPlacementPermissionStatus,
} from "../lib/platform/permission-settings-return";

type Permission = { granted: boolean; canAskAgain: boolean };

function makeWatcher(refresh: () => Promise<void>, initialState: string | null = "active") {
  let listener: ((state: string) => void) | null = null;
  let currentGeneration = 1;
  let subscriptions = 0;
  let removals = 0;
  const watcher = createPermissionSettingsReturnWatcher({
    subscribe: (callback) => {
      subscriptions += 1;
      listener = callback;
      return { remove: () => { removals += 1; } };
    },
    refresh,
    getGeneration: () => currentGeneration,
    isCurrentGeneration: (generation) => generation === currentGeneration,
    initialAppState: initialState,
  });
  return {
    watcher,
    emit: (state: string) => listener?.(state),
    changeAccount: () => { currentGeneration += 1; },
    subscriptionCounts: () => ({ subscriptions, removals }),
  };
}

async function flushRefresh() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("Native Placement permission return from Settings", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads camera and microphone again after opening Settings and returning active", async () => {
    let camera: Permission = { granted: false, canAskAgain: false };
    let microphone: Permission = { granted: false, canAskAgain: false };
    const getCamera = vi.fn(async () => camera);
    const getMicrophone = vi.fn(async () => microphone);
    const requestCamera = vi.fn(async () => camera);
    const requestMicrophone = vi.fn(async () => microphone);
    let refreshed: { camera: Permission; microphone: Permission } | undefined;
    const refresh = vi.fn(async () => {
      refreshed = await readPlacementPermissionStatus(getCamera, getMicrophone);
    });
    const watcher = makeWatcher(refresh);

    watcher.watcher.markSettingsOpened();
    camera = { granted: true, canAskAgain: true };
    microphone = { granted: false, canAskAgain: false };
    watcher.emit("background");
    watcher.emit("active");
    await flushRefresh();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getCamera).toHaveBeenCalledTimes(1);
    expect(getMicrophone).toHaveBeenCalledTimes(1);
    expect(refreshed).toEqual({ camera, microphone });
    expect(requestCamera).not.toHaveBeenCalled();
    expect(requestMicrophone).not.toHaveBeenCalled();
  });

  it("refreshes a newly granted microphone while camera remains granted", async () => {
    let camera: Permission = { granted: true, canAskAgain: true };
    let microphone: Permission = { granted: false, canAskAgain: false };
    const getCamera = vi.fn(async () => camera);
    const getMicrophone = vi.fn(async () => microphone);
    let refreshed: { camera: Permission; microphone: Permission } | undefined;
    const refresh = vi.fn(async () => { refreshed = await readPlacementPermissionStatus(getCamera, getMicrophone); });
    const watcher = makeWatcher(refresh);

    watcher.watcher.markSettingsOpened();
    microphone = { granted: true, canAskAgain: true };
    watcher.emit("inactive");
    watcher.emit("active");
    await flushRefresh();

    expect(getCamera).toHaveBeenCalledTimes(1);
    expect(getMicrophone).toHaveBeenCalledTimes(1);
    expect(refreshed).toEqual({ camera, microphone });
  });

  it("refreshes both permissions when both were denied", async () => {
    const camera = vi.fn(async () => ({ granted: true, canAskAgain: true }));
    const microphone = vi.fn(async () => ({ granted: true, canAskAgain: true }));
    let refreshed: { camera: Permission; microphone: Permission } | undefined;
    const refresh = vi.fn(async () => { refreshed = await readPlacementPermissionStatus(camera, microphone); });
    const watcher = makeWatcher(refresh);

    watcher.watcher.markSettingsOpened();
    watcher.emit("background");
    watcher.emit("active");
    await flushRefresh();

    expect(camera).toHaveBeenCalledTimes(1);
    expect(microphone).toHaveBeenCalledTimes(1);
    expect(refreshed).toEqual({
      camera: { granted: true, canAskAgain: true },
      microphone: { granted: true, canAskAgain: true },
    });
  });

  it("keeps the denied state available for safe guidance when permission stays denied", async () => {
    const camera = vi.fn(async (): Promise<Permission> => ({ granted: false, canAskAgain: false }));
    const microphone = vi.fn(async (): Promise<Permission> => ({ granted: false, canAskAgain: false }));
    let refreshed: { camera: Permission; microphone: Permission } | undefined;
    const refresh = vi.fn(async () => { refreshed = await readPlacementPermissionStatus(camera, microphone); });
    const watcher = makeWatcher(refresh);

    watcher.watcher.markSettingsOpened();
    watcher.emit("background");
    watcher.emit("active");
    await flushRefresh();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refreshed).toEqual({
      camera: { granted: false, canAskAgain: false },
      microphone: { granted: false, canAskAgain: false },
    });
  });

  it("does not re-read permissions for an ordinary background/foreground cycle", async () => {
    const refresh = vi.fn(async () => undefined);
    const watcher = makeWatcher(refresh);

    watcher.emit("background");
    watcher.emit("active");
    await flushRefresh();

    expect(refresh).not.toHaveBeenCalled();
  });

  it("uses screen focus as a fallback and coalesces duplicate return signals", async () => {
    const refresh = vi.fn(async () => undefined);
    const watcher = makeWatcher(refresh);

    watcher.watcher.markSettingsOpened();
    watcher.watcher.onScreenFocus();
    watcher.emit("background");
    watcher.emit("active");
    await flushRefresh();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh after the account changes while Settings is open", async () => {
    const refresh = vi.fn(async () => undefined);
    const watcher = makeWatcher(refresh);

    watcher.watcher.markSettingsOpened();
    watcher.changeAccount();
    watcher.emit("background");
    watcher.emit("active");
    await flushRefresh();

    expect(refresh).not.toHaveBeenCalled();
  });

  it("removes its single AppState subscription on unmount", () => {
    const watcher = makeWatcher(async () => undefined);
    watcher.watcher.dispose();
    watcher.watcher.dispose();

    expect(watcher.subscriptionCounts()).toEqual({ subscriptions: 1, removals: 1 });
  });
});
