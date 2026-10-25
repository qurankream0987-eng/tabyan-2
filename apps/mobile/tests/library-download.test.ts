import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const storage = new Map<string, string>();
  const files = new Map<string, number>();
  const documentDirectory = "file:///documents/";
  let finishDownload: (() => void) | undefined;
  const downloadAsync = vi.fn(async (_source: string, destination: string) => {
    files.set(destination, 1024);
    return { status: 200, uri: destination };
  });
  const fileSystem = {
    documentDirectory,
    downloadAsync,
    getInfoAsync: vi.fn(async (uri: string) => {
      const size = files.get(uri);
      return size === undefined ? { exists: false } : { exists: true, size };
    }),
    deleteAsync: vi.fn(async (uri: string) => { files.delete(uri); }),
    readDirectoryAsync: vi.fn(async (directory: string) =>
      [...files.keys()]
        .filter((uri) => uri.startsWith(directory))
        .map((uri) => uri.slice(directory.length)),
    ),
  };
  const asyncStorage = {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
    getAllKeys: vi.fn(async () => [...storage.keys()]),
    multiGet: vi.fn(async (keys: string[]) => keys.map((key) => [key, storage.get(key) ?? null] as [string, string | null])),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach((key) => storage.delete(key)); }),
  };
  return { storage, files, fileSystem, asyncStorage, getFinish: () => finishDownload, setFinish: (finish: () => void) => { finishDownload = finish; } };
});

vi.mock("@react-native-async-storage/async-storage", () => ({ default: mocks.asyncStorage }));
vi.mock("expo-file-system/legacy", () => mocks.fileSystem);

import { clearLibraryDownloads, downloadLibraryPdf } from "../lib/media/library-download";

describe("offline library account isolation", () => {
  beforeEach(() => {
    mocks.storage.clear();
    mocks.files.clear();
    mocks.setFinish(undefined as unknown as () => void);
    mocks.fileSystem.downloadAsync.mockReset();
    mocks.fileSystem.downloadAsync.mockImplementation(async (_source: string, destination: string) => {
      mocks.files.set(destination, 1024);
      return { status: 200, uri: destination };
    });
  });

  it("clears local PDF copies and their index without touching unrelated app files or server records", async () => {
    const libraryUri = "file:///documents/tabyan-library-book-a.pdf";
    const unrelatedUri = "file:///documents/user-selected-original.pdf";
    mocks.storage.set("tabyan.library.download.book-a", libraryUri);
    mocks.storage.set("tabyan.native.theme", "dark");
    mocks.files.set(libraryUri, 1024);
    mocks.files.set(unrelatedUri, 2048);

    await clearLibraryDownloads();

    expect(mocks.storage.has("tabyan.library.download.book-a")).toBe(false);
    expect(mocks.storage.get("tabyan.native.theme")).toBe("dark");
    expect(mocks.files.has(libraryUri)).toBe(false);
    expect(mocks.files.has(unrelatedUri)).toBe(true);
  });

  it("deletes a download that finishes after an account transition instead of indexing it", async () => {
    mocks.fileSystem.downloadAsync.mockImplementationOnce((_source: string, destination: string) => new Promise((resolve) => {
      mocks.setFinish(() => {
        mocks.files.set(destination, 1024);
        resolve({ status: 200, uri: destination });
      });
    }));

    const download = downloadLibraryPdf("book-b", "https://example.invalid/book.pdf");
    await vi.waitFor(() => expect(mocks.getFinish()).toBeTypeOf("function"));
    await clearLibraryDownloads();
    mocks.getFinish()?.();

    await expect(download).rejects.toThrow("تغيّر الحساب");
    expect([...mocks.storage.keys()].some((key) => key.startsWith("tabyan.library.download."))).toBe(false);
    expect([...mocks.files.keys()].some((uri) => uri.includes("tabyan-library-book-b"))).toBe(false);
  });
});
