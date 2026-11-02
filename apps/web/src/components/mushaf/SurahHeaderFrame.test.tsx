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
      // Shared vector ornament: patterned band, two medallions and the cartouche.
      expect(html).toContain("<pattern");
      expect(html.match(/<circle cx="[\d.]+" cy="70"/g)?.length).toBe(4);
    }
  });
  it("preserves the existing header band geometry for both page variants", () => {
    expect(renderToStaticMarkup(<SurahHeaderFrame surahName="الكهف" width={304} rowH={30} />)).toContain("height:24px");
    const opening = renderToStaticMarkup(<SurahHeaderFrame surahName="الفاتحة" width={304} rowH={30} variant="opening" />);
    expect(opening).toContain(`height:${304 * .94 * (154 / 932)}px`);
  });
});
