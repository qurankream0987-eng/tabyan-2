import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFs = vi.hoisted(() => {
  const files = new Map<string, number>();
  const cacheDirectory = "file:///cache/";
  const downloadAsync = vi.fn(async (_uri: string, destination: string) => {
    files.set(destination, 1024);
    return {
      status: 200,
      uri: destination,
      headers: { "Content-Type": "video/mp4" },
      mimeType: "video/mp4",
    };
  });
  const getInfoAsync = vi.fn(async (uri: string) => {
    const size = files.get(uri);
    return size === undefined ? { exists: false } : { exists: true, size };
  });
  const moveAsync = vi.fn(async ({ from, to }: { from: string; to: string }) => {
    const size = files.get(from);
    files.delete(from);
    if (size !== undefined) files.set(to, size);
  });
  const deleteAsync = vi.fn(async (uri: string) => {
    files.delete(uri);
  });
  const readDirectoryAsync = vi.fn(async (directory: string) =>
    [...files.keys()]
      .filter((uri) => uri.startsWith(directory))
      .map((uri) => uri.slice(directory.length)),
  );
  return {
    files,
    cacheDirectory,
    downloadAsync,
    getInfoAsync,
    moveAsync,
    deleteAsync,
    readDirectoryAsync,
  };
});

vi.mock("expo-file-system/legacy", () => ({
  cacheDirectory: mockFs.cacheDirectory,
  FileSystemSessionType: { FOREGROUND: 1 },
  downloadAsync: mockFs.downloadAsync,
  getInfoAsync: mockFs.getInfoAsync,
  moveAsync: mockFs.moveAsync,
  deleteAsync: mockFs.deleteAsync,
  readDirectoryAsync: mockFs.readDirectoryAsync,
}));

import { clearPrivateMediaCache, downloadPrivateMediaToCache } from "../lib/private-media-cache";

describe("private media cache account cleanup", () => {
  beforeEach(() => {
    mockFs.files.clear();
    mockFs.downloadAsync.mockReset();
    mockFs.downloadAsync.mockImplementation(async (_uri, destination) => {
      mockFs.files.set(destination, 1024);
      return {
        status: 200,
        uri: destination,
        headers: { "Content-Type": "video/mp4" },
        mimeType: "video/mp4",
      };
    });
  });

  it("removes private playback files without touching shared library downloads", async () => {
    const privateUri = `${mockFs.cacheDirectory}tabyan-private-media-old.mp4`;
    const sharedUri = `${mockFs.cacheDirectory}tabyan-library-book.pdf`;
    mockFs.files.set(privateUri, 200);
    mockFs.files.set(sharedUri, 500);

    await clearPrivateMediaCache();

    expect(mockFs.files.has(privateUri)).toBe(false);
    expect(mockFs.files.has(sharedUri)).toBe(true);
  });

  it("discards a download that finishes after the account cache was cleared", async () => {
    let finishDownload!: () => void;
    mockFs.downloadAsync.mockImplementationOnce((_uri, destination) => new Promise((resolve) => {
      finishDownload = () => {
        mockFs.files.set(destination, 1024);
        resolve({
          status: 200,
          uri: destination,
          headers: { "Content-Type": "video/mp4" },
          mimeType: "video/mp4",
        });
      };
    }));

    const download = downloadPrivateMediaToCache("https://private.example/video", {
      Authorization: "Bearer test",
    });
    await vi.waitFor(() => expect(finishDownload).toBeTypeOf("function"));
    const cleanup = clearPrivateMediaCache();
    finishDownload();

    await expect(download).rejects.toThrow("Private media cache was cleared during download");
    await cleanup;
    expect([...mockFs.files.keys()].filter((path) => path.includes("tabyan-private-media-"))).toEqual([]);
  });
});
