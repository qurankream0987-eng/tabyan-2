import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let rejectUpload: ((cause: Error) => void) | undefined;
  const uploadTask = {
    uploadAsync: vi.fn(() => new Promise<any>((_resolve, reject) => { rejectUpload = reject; })),
    cancelAsync: vi.fn(async () => { rejectUpload?.(new Error("cancelled")); }),
  };
  return {
    uploadTask,
    getRejectUpload: () => rejectUpload,
    setRejectUpload: (reject: ((cause: Error) => void) | undefined) => { rejectUpload = reject; },
    fetch: vi.fn(),
    getToken: vi.fn(async () => "token-A"),
  };
});

vi.mock("expo-file-system", () => ({
  File: class {
    exists = true;
    info() { return { size: 1024 }; }
  },
}));
vi.mock("expo-file-system/legacy", () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  createUploadTask: vi.fn(() => mocks.uploadTask),
}));
vi.mock("../lib/trpc", () => ({ apiOrigin: () => "https://api.example" }));
vi.mock("../lib/storage", () => ({ storage: { getToken: mocks.getToken } }));

import { beginAccountTransition } from "../lib/account-transition";
import { uploadNativeFile } from "../lib/media/mobile-upload";

describe("Native uploads during account transitions", () => {
  beforeEach(() => {
    mocks.uploadTask.uploadAsync.mockClear();
    mocks.uploadTask.cancelAsync.mockClear();
    mocks.setRejectUpload(undefined);
    mocks.getToken.mockResolvedValue("token-A");
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        uploadURL: "https://storage.example/upload",
        objectPath: "/objects/account-a/file.pdf",
        uploadProof: "test-proof",
      }),
    });
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    beginAccountTransition();
  });

  it("cancels an active upload and skips server finalization after the account changes", async () => {
    const progress = vi.fn();
    const upload = uploadNativeFile("/cache/account-a.pdf", {
      name: "account-a.pdf",
      contentType: "application/pdf",
      onProgress: progress,
    });

    await vi.waitFor(() => expect(mocks.uploadTask.uploadAsync).toHaveBeenCalledOnce());
    expect(mocks.getRejectUpload()).toBeTypeOf("function");

    beginAccountTransition();

    await expect(upload).rejects.toThrow("تغيّر الحساب");
    expect(mocks.uploadTask.cancelAsync).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(progress).not.toHaveBeenCalledWith(100);
  });
});
