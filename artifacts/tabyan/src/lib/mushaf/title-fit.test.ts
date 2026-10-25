import { describe, expect, it } from "vitest";
import { fitMeasuredTitle, fitTitle } from "./title-fit";

const m = { left: 100, right: 100, ascent: 90, descent: 40, fontAscent: 100, fontDescent: 50, refSize: 100 };
describe("fitTitle", () => {
  it("fits width", () => { const r = fitTitle(m, 100, 1000, 1000); expect(r.fontSize).toBeCloseTo(50); });
  it("fits height", () => { const r = fitTitle(m, 1000, 65, 1000); expect(r.fontSize).toBeCloseTo(50); });
  it("caps size", () => { expect(fitTitle(m, 1e4, 1e4, 30).fontSize).toBeCloseTo(30); });
  it("centers ink vertically", () => {
    const r = fitTitle(m, 1000, 1000, 100);
    expect(r.dy).toBeCloseTo(100 / 2 - (((100 - 150) / 2 + 100) - 25));
  });
  it("centers asymmetric ink horizontally", () => {
    const r = fitTitle({ ...m, left: 150, right: 50 }, 1000, 1000, 100);
    expect(r.dx).toBeCloseTo(50);
    const q = fitTitle({ ...m, left: 50, right: 150 }, 1000, 1000, 100);
    expect(q.dx).toBeCloseTo(-50);
  });
  it("scales offsets with the fit", () => {
    const r = fitTitle({ ...m, left: 150, right: 50 }, 100, 1000, 1000);
    expect(r.fontSize).toBeCloseTo(50);
    expect(r.dx).toBeCloseTo(25);
  });
  it("is safe for zero-size areas", () => {
    expect(fitTitle(m, 0, 10, 10)).toEqual({ fontSize: 0, dx: 0, dy: 0 });
    expect(fitTitle(m, 10, 0, 10).fontSize).toBe(0);
  });
});

describe("fitMeasuredTitle", () => {
  it("accounts for real-size hinting rather than scaling reference ink", () => {
    const measure = (size: number) => ({
      left: size, right: size,
      ascent: size * 0.9 + (size < 20 ? 2 : 0), descent: size * 0.4,
      fontAscent: size, fontDescent: size * 0.5, refSize: size,
    });
    const result = fitMeasuredTitle(measure, 100, 16, 30)!;
    const actual = measure(result.fontSize);
    expect(actual.ascent + actual.descent).toBeLessThanOrEqual(16);
    expect(result.fontSize).toBeCloseTo((16 - 2) / 1.3, 1);
    expect(result.dy).toBeCloseTo(fitTitle(actual, 100, 16, result.fontSize).dy);
  });
  it("reports unavailable measurement explicitly", () => {
    expect(fitMeasuredTitle(() => null, 100, 20, 30)).toBeNull();
  });
});
