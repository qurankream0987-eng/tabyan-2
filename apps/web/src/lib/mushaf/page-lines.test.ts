import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPageLines, type MushafPageData } from "@workspace/tabyan-domain/mushaf-page-data";

const PAGES = join(__dirname, "../../../public/mushaf/pages");
const page = (n: number): MushafPageData => JSON.parse(readFileSync(join(PAGES, `${n}.json`), "utf8"));

describe("buildPageLines on the 1421 print", () => {
  // Every full page fills its 15 lines once: a surah title that falls at the foot of a page,
  // or a basmala carried over to the next page, must not leave a blank line.
  it("fills lines 1–15 exactly once on pages 3–604", () => {
    const problems: string[] = [];
    for (let p = 3; p <= 604; p++) {
      const lines = buildPageLines(page(p)).map((m) => m.line);
      const missing = Array.from({ length: 15 }, (_, i) => i + 1).filter((l) => !lines.includes(l));
      if (missing.length || new Set(lines).size !== lines.length) problems.push(`${p}: missing ${missing.join(",") || "-"}, rows ${lines.length}`);
    }
    expect(problems).toEqual([]);
  });
});
