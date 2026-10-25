import { beforeAll, describe, expect, it } from "vitest";

const origin = "https://tibyanquran.com";
let mod: typeof import("./private-media");

beforeAll(async () => {
  // node test environment: provide the one window field the helpers read.
  (globalThis as { window?: unknown }).window = { location: { origin } };
  mod = await import("./private-media");
});

describe("resolveMediaPlaybackUrl", () => {
  it("accepts only same-origin opaque media capability URLs", () => {
    expect(mod.resolveMediaPlaybackUrl("/api/storage/media-playback/a.b.c.d", origin))
      .toBe(`${origin}/api/storage/media-playback/a.b.c.d`);
    expect(() => mod.resolveMediaPlaybackUrl("https://evil.example/api/storage/media-playback/a.b.c.d", origin)).toThrow();
    expect(() => mod.resolveMediaPlaybackUrl("/api/storage/media-playback/a.b.c.d?token=secret", origin)).toThrow();
    expect(() => mod.resolveMediaPlaybackUrl("/api/storage/objects/uploads/x", origin)).toThrow();
    expect(() => mod.resolveMediaPlaybackUrl("/api/storage/placement-playback/a.b.c.d", origin)).toThrow();
  });
});

describe("privateObjectPath", () => {
  it("maps stored keys and legacy tokenised URLs to the durable object key", () => {
    expect(mod.privateObjectPath("/objects/uploads/abc")).toBe("/objects/uploads/abc");
    expect(mod.privateObjectPath("/objects/uploads/abc?token=old")).toBe("/objects/uploads/abc");
    expect(mod.privateObjectPath(`${origin}/api/storage/objects/uploads/abc?token=expired`)).toBe("/objects/uploads/abc");
    expect(mod.privateObjectPath("/api/storage/objects/uploads/live-session-recordings/r1")).toBe("/objects/uploads/live-session-recordings/r1");
  });
  it("leaves external links and placeholders alone", () => {
    expect(mod.privateObjectPath("https://youtu.be/abcdefghijk")).toBeNull();
    expect(mod.privateObjectPath("teacher_request_123")).toBeNull();
    expect(mod.privateObjectPath("")).toBeNull();
    expect(mod.privateObjectPath(null)).toBeNull();
  });
});
