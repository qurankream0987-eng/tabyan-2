import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SURAHS } from "@/lib/quran-data";
import SurahHeaderFrame from "./SurahHeaderFrame";

describe("Surah title-only ornament", () => {
  it("keeps every canonical name in full, without raster art or QCF font classes", () => {
    expect(SURAHS).toHaveLength(114);
    for (const surah of SURAHS) {
      const html = renderToStaticMarkup(<SurahHeaderFrame surahName={surah.name} width={304} rowH={30} />);
      expect(html).toContain(`سُورَةُ ${surah.name}`);
      expect(html).not.toContain("<img");
      expect(html).not.toContain("font-quran");
      expect(html).toContain("scale(-1 1)");
      expect(html).toContain("var(--hdr-ivory)");
      expect(html).toContain("var(--hdr-green)");
    }
  });
  it("preserves the existing header band geometry for both page variants", () => {
    expect(renderToStaticMarkup(<SurahHeaderFrame surahName="الكهف" width={304} rowH={30} />)).toContain("height:24px");
    const opening = renderToStaticMarkup(<SurahHeaderFrame surahName="الفاتحة" width={304} rowH={30} variant="opening" />);
    expect(opening).toContain(`height:${304 * .94 * (154 / 932)}px`);
  });
});
