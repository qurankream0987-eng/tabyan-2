import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const storage = new Map<string, string>();
  const files = new Set<string>();
  const cacheDirectory = "file:///app/cache/";
  const asyncStorage = {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
  };
  const fileSystem = {
    cacheDirectory,
    deleteAsync: vi.fn(async (uri: string) => { files.delete(uri); }),
  };
  return { storage, files, asyncStorage, fileSystem };
});

vi.mock("@react-native-async-storage/async-storage", () => ({ default: mocks.asyncStorage }));
vi.mock("expo-file-system/legacy", () => mocks.fileSystem);

import { beginAccountTransition, getAccountGeneration } from "../lib/account-transition";
import {
  clearPrivateTemporaryFiles,
  removePrivateTemporaryFile,
  trackPrivateTemporaryFile,
} from "../lib/media/private-temporary-files";

describe("private temporary file cleanup", () => {
  beforeEach(() => {
    mocks.storage.clear();
    mocks.files.clear();
    mocks.fileSystem.deleteAsync.mockClear();
  });

  it("clears app-owned recording copies and rejects a stale account's late file", async () => {
    const accountAGeneration = getAccountGeneration();
    const recordingUri = `${mocks.fileSystem.cacheDirectory}placement-a.mp4`;
    mocks.files.add(recordingUri);
    expect(await trackPrivateTemporaryFile(recordingUri, accountAGeneration)).toBe(true);

    beginAccountTransition();
    await clearPrivateTemporaryFiles();

    expect(mocks.files.has(recordingUri)).toBe(false);
    expect(mocks.storage.size).toBe(0);

    const lateUri = `${mocks.fileSystem.cacheDirectory}late-a.mp4`;
    mocks.files.add(lateUri);
    expect(await trackPrivateTemporaryFile(lateUri, accountAGeneration)).toBe(false);
    expect(mocks.files.has(lateUri)).toBe(false);
    expect(mocks.storage.size).toBe(0);
  });

  it("does not delete a user-selected source outside the app cache", async () => {
    const sourceUri = "content://provider/user-video.mp4";
    expect(await trackPrivateTemporaryFile(sourceUri)).toBe(true);
    await removePrivateTemporaryFile(sourceUri);
    await clearPrivateTemporaryFiles();

    expect(mocks.fileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(mocks.storage.size).toBe(0);
  });
});
