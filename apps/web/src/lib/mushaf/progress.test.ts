import { describe, expect, it } from "vitest";
import { surahPageProgress } from "./progress";

describe("surahPageProgress", () => {
  it("is null for a surah on a single page", () => {
    expect(surahPageProgress(112, 604)).toBeNull();
    expect(surahPageProgress(null, 10)).toBeNull();
  });

  it("tracks the page position inside a multi-page surah", () => {
    // البقرة: الصفحات 2..49
    expect(surahPageProgress(2, 2)).toBeCloseTo(1 / 48);
    expect(surahPageProgress(2, 49)).toBe(1);
  });
});
