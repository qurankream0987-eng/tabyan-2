import { describe, expect, it } from "vitest";
import { resolvePlacementPlaybackUrl } from "./placement-playback";

const token = "a.b.c.d";
const origin = "https://tibyanquran.com";

describe("resolvePlacementPlaybackUrl", () => {
  it("accepts same-origin opaque capability URLs with an optional diagnostic id", () => {
    expect(resolvePlacementPlaybackUrl(`/api/storage/placement-playback/${token}`, origin))
      .toBe(`${origin}/api/storage/placement-playback/${token}`);
    expect(resolvePlacementPlaybackUrl(`/api/storage/placement-playback/${token}?diag=diagnostic-123`, origin))
      .toBe(`${origin}/api/storage/placement-playback/${token}?diag=diagnostic-123`);
  });

  it("rejects cross-origin, bearer-query, and unexpected playback URLs", () => {
    expect(() => resolvePlacementPlaybackUrl(`https://evil.example/api/storage/placement-playback/${token}`, origin)).toThrow();
    expect(() => resolvePlacementPlaybackUrl(`/api/storage/placement-playback/${token}?token=secret`, origin)).toThrow();
    expect(() => resolvePlacementPlaybackUrl(`/api/storage/objects/uploads/video`, origin)).toThrow();
    expect(() => resolvePlacementPlaybackUrl(`/api/storage/placement-playback/${token}?extra=1`, origin)).toThrow();
  });
});