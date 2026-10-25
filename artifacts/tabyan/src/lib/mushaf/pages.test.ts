import { describe, it, expect } from "vitest";
import {
  computeMushafPageFit,
  DESKTOP_MAX_PAGE_W,
  NARROW_STAGE_PADDING,
  PAGE_ASPECT,
  PAGE_SIDE_MARGIN,
  PAGE_VERTICAL_MARGIN,
  SHORT_LANDSCAPE_MAX_H,
  SHORT_LANDSCAPE_MAX_W,
} from "./pages";

describe("Mushaf default page fitting", () => {
  it.each([320, 360, 375, 390, 393, 414, 430])("uses nearly all portrait phone width at %ipx", (width) => {
    const fit = computeMushafPageFit(width, 900);
    expect(fit.w).toBe(width - PAGE_SIDE_MARGIN * 2);
    expect(width - fit.w).toBeGreaterThanOrEqual(PAGE_SIDE_MARGIN * 2);
    expect(fit.h + NARROW_STAGE_PADDING * 2).toBeLessThan(900);
    expect(fit.w / fit.h).toBeCloseTo(PAGE_ASPECT);
  });
  it("keeps portrait phone page width stable when a short viewport needs vertical scrolling", () => {
    const width = 390;
    const height = 550;
    const fit = computeMushafPageFit(width, height);
    expect(fit.w).toBe(width - PAGE_SIDE_MARGIN * 2);
    expect(fit.h + NARROW_STAGE_PADDING * 2).toBeGreaterThan(height);
    expect(fit.w / fit.h).toBeCloseTo(PAGE_ASPECT);
  });
  it.each([
    [524, 450],
    [651, 311],
    [SHORT_LANDSCAPE_MAX_W - 172, SHORT_LANDSCAPE_MAX_H - 100],
  ])("keeps phone width at %i×%ipx and allows vertical scrolling", (width, height) => {
    const fit = computeMushafPageFit(width, height);
    expect(fit.w).toBe(width - PAGE_SIDE_MARGIN * 2);
    expect(width - fit.w).toBeGreaterThanOrEqual(PAGE_SIDE_MARGIN * 2);
    expect(fit.h + NARROW_STAGE_PADDING * 2).toBeGreaterThan(height);
    expect(fit.w / fit.h).toBeCloseTo(PAGE_ASPECT);
  });
  it("fits the full page between desktop controls at 1440×900", () => {
    const viewportHeight = 900 - 68 - 104;
    const fit = computeMushafPageFit(1440, viewportHeight);
    expect(fit.h + PAGE_VERTICAL_MARGIN * 2).toBeLessThanOrEqual(viewportHeight + 0.001);
    expect(fit.h).toBeGreaterThanOrEqual(700);
    expect(fit.w).toBeLessThan(600);
    expect(fit.w / fit.h).toBeCloseTo(PAGE_ASPECT);
  });
  it.each([[768, 852], [1024, 500], [1440, 728], [2560, 1200]])("fits both dimensions of %i×%i", (width, height) => {
    const fit = computeMushafPageFit(width, height);
    expect(fit.w).toBeLessThanOrEqual(width - PAGE_SIDE_MARGIN * 2);
    expect(fit.w).toBeLessThanOrEqual(DESKTOP_MAX_PAGE_W);
    expect(fit.h).toBeLessThanOrEqual(height - PAGE_VERTICAL_MARGIN * 2 + 0.001);
    expect(fit.w / fit.h).toBeCloseTo(PAGE_ASPECT);
  });
  it("shrinks when controls reduce the reading viewport", () => {
    expect(computeMushafPageFit(1440, 624).w).toBeLessThan(computeMushafPageFit(1440, 728).w);
  });
  it("handles unmeasured containers safely", () => {
    for (const [w, h] of [[0, 800], [390, 0], [-10, -10], [12, 800], [1440, 8]]) {
      expect(computeMushafPageFit(w, h).w).toBe(0);
    }
  });
});
