import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { computePageLayout, DENSE_INK_RATIO, LINE_COUNT, maxFontSizeFor, standardRowHeight, type LayoutRow } from "./page-layout";

const words = (from: number, to: number): LayoutRow[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ line: from + i, kind: "words" as const }));
const fatiha: LayoutRow[] = [{ line: 1, kind: "surah-header" }, ...words(2, 8)];
const baqarahOpening: LayoutRow[] = [
  { line: 1, kind: "surah-header" }, { line: 2, kind: "basmalah" }, ...words(3, 8),
];
const fullH = 551;

describe("Mushaf page composition", () => {
  it("keeps page 207's canonical 14 text rows on the ordinary 15-slot pitch without inventing a basmala", () => {
    const page = JSON.parse(readFileSync(new URL("../../../public/mushaf/v1/pages/207.json", import.meta.url), "utf8"));
    const rowNumbers = [...new Set<number>(page.v.flatMap((verse: { w: [number, number, number, string][] }) => verse.w.map(word => word[1])))].sort((a, b) => a - b);
    expect(rowNumbers).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    const layout = computePageLayout(rowNumbers.map(line => ({ line, kind: "words" })), 14, fullH, "standard");
    expect(layout.variant).toBe("standard");
    expect(layout.wordRowH).toBeCloseTo((fullH * 0.97) / 15);
    expect(layout.tops.get(14)! + layout.wordRowH).toBeLessThan(layout.blockBottom);
  });

  it("keeps full 15-line pages on the printed grid", () => {
    const layout = computePageLayout(words(1, 15), 15, fullH, "standard");
    expect(layout.variant).toBe("standard");
    expect(layout.paperH).toBe(fullH);
    const inset = fullH * 0.015;
    expect(layout.wordRowH).toBeCloseTo((fullH - inset * 2) / LINE_COUNT);
    expect(layout.tops.get(15)! + layout.wordRowH).toBeCloseTo(fullH - inset);
  });

  it.each([["Al-Fatiha", fatiha], ["Al-Baqarah opening", baqarahOpening]] as const)(
    "composes %s on the full printed leaf, top-aligned, at the standard line pitch",
    (_, rows) => {
      const layout = computePageLayout(rows, 8, fullH, "opening");
      expect(layout.variant).toBe("opening");
      // Same leaf as every other page: no shrunken paper leaving a void around it.
      expect(layout.paperH).toBe(fullH);
      // Same pitch as dense pages: rows are not stretched over the page.
      expect(layout.wordRowH).toBeCloseTo(standardRowHeight(fullH));
      expect(layout.tops.get(1)).toBeCloseTo(layout.blockTop);
      expect(layout.tops.get(8)! + layout.wordRowH).toBeCloseTo(layout.blockBottom);
      // Opening titles follow the toolbar without a vertically centred gap.
      expect(layout.blockTop).toBeCloseTo(fullH * 0.015);
      expect(layout.tops.get(1)).toBeCloseTo(fullH * 0.015);
    },
  );

  it("keeps every row in order and never overlaps", () => {
    const layout = computePageLayout(baqarahOpening, 8, fullH, "opening");
    for (let line = 2; line <= 8; line++) {
      expect(layout.tops.get(line)! - layout.tops.get(line - 1)!).toBeGreaterThanOrEqual(layout.wordRowH - 0.001);
    }
  });

  it("keeps the opening block inside the paper at every size", () => {
    for (const h of [300, 470, 551, 700, 900]) {
      const layout = computePageLayout(fatiha, 8, h, "opening");
      expect(layout.blockTop).toBeGreaterThan(0);
      expect(layout.blockBottom).toBeLessThanOrEqual(h);
    }
  });

  it("keeps ordinary 14-line pages on the standard grid without shrinking their text", () => {
    const layout = computePageLayout(words(1, 14), 14, fullH, "standard");
    const inset = fullH * 0.015;
    expect(layout.variant).toBe("standard");
    expect(layout.wordRowH).toBeCloseTo(standardRowHeight(fullH));
    expect(layout.tops.get(1)).toBeCloseTo(inset);
    expect(layout.tops.get(14)).toBeCloseTo(inset + 13 * standardRowHeight(fullH));
    expect(maxFontSizeFor(layout.variant, fullH)).toBe(Infinity);
  });

  it("caps opening-page glyphs at the dense-page type size; dense pages fit by width only", () => {
    expect(maxFontSizeFor("opening", fullH)).toBeCloseTo(standardRowHeight(fullH) * DENSE_INK_RATIO);
    expect(maxFontSizeFor("standard", fullH)).toBe(Infinity);
  });
});
