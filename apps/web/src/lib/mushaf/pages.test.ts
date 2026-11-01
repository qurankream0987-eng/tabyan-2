import { describe, it, expect } from "vitest";
import {
  computeMushafPageFit,
  DESKTOP_MAX_PAGE_W,
  PAGE_ASPECT,
  PAGE_FRAME_INSET,
  PAGE_SIDE_MARGIN,
  PAGE_VERTICAL_MARGIN,
  SHORT_LANDSCAPE_MAX_H,
  SHORT_LANDSCAPE_MAX_W,
} from "./pages";

/** Height of the QCF line block inside a paper of the given height. */
const linesH = (h: number) => h - PAGE_FRAME_INSET * 2;

describe("Mushaf default page fitting", () => {
  it.each([320, 360, 375, 390, 393, 414, 430])("fills the whole portrait phone viewport at %ipx", (width) => {
    const fit = computeMushafPageFit(width, 900);
    expect(fit.mode).toBe("fill");
    expect(fit.w).toBe(width);
    expect(fit.h).toBe(900);
    // The stretched line block is never denser than the printed page.
    expect(fit.w / linesH(fit.h)).toBeLessThanOrEqual(PAGE_ASPECT);
  });
  it("keeps the printed line density when a short viewport needs vertical scrolling", () => {
    const width = 390;
    const height = 550;
    const fit = computeMushafPageFit(width, height);
    expect(fit.mode).toBe("fill");
    expect(fit.w).toBe(width);
    expect(fit.h).toBeGreaterThan(height);
    expect(fit.w / linesH(fit.h)).toBeCloseTo(PAGE_ASPECT);
  });
  it.each([
    [524, 450],
    [651, 311],
    [SHORT_LANDSCAPE_MAX_W - 172, SHORT_LANDSCAPE_MAX_H - 100],
  ])("keeps phone width at %i×%ipx and allows vertical scrolling", (width, height) => {
    const fit = computeMushafPageFit(width, height);
    expect(fit.mode).toBe("fill");
    expect(fit.w).toBe(width);
    expect(fit.h).toBeGreaterThan(height);
    expect(fit.w / linesH(fit.h)).toBeCloseTo(PAGE_ASPECT);
  });
  it("fits the full page between desktop controls at 1440×900", () => {
    const viewportHeight = 900 - 68 - 104;
    const fit = computeMushafPageFit(1440, viewportHeight);
    expect(fit.mode).toBe("aspect");
    expect(fit.h + PAGE_VERTICAL_MARGIN * 2).toBeLessThanOrEqual(viewportHeight + 0.001);
    expect(fit.h).toBeGreaterThanOrEqual(700);
    expect(fit.w).toBeLessThan(600);
    expect(fit.w / linesH(fit.h)).toBeCloseTo(PAGE_ASPECT);
  });
  it.each([[768, 852], [1024, 500], [1440, 728], [2560, 1200]])("fits both dimensions of %i×%i", (width, height) => {
    const fit = computeMushafPageFit(width, height);
    expect(fit.w).toBeLessThanOrEqual(width - PAGE_SIDE_MARGIN * 2);
    expect(fit.w).toBeLessThanOrEqual(DESKTOP_MAX_PAGE_W);
    expect(fit.h).toBeLessThanOrEqual(height - PAGE_VERTICAL_MARGIN * 2 + 0.001);
    expect(fit.w / linesH(fit.h)).toBeCloseTo(PAGE_ASPECT);
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
