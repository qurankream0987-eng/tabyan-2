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
      // Shared vector ornament: one side panel, drawn again mirrored, around the cartouche.
      expect(html.match(/<use /g)?.length).toBe(2);
      expect(html).toContain("scale(-1 1)");
      expect(html).not.toContain("ترتيبها");
    }
  });
  it("draws the title with the surah-name calligraphy when the number is known", () => {
    const html = renderToStaticMarkup(<SurahHeaderFrame surahName="المائدة" surahNumber={5} width={304} rowH={30} />);
    expect(html).toContain(">005<");
    expect(html).toContain("TabyanSurahNames");
    expect(html).toContain('aria-label="سورة المائدة"');
  });
  it("preserves the existing header band geometry for both page variants", () => {
    expect(renderToStaticMarkup(<SurahHeaderFrame surahName="الكهف" width={304} rowH={30} />)).toContain(`height:${30 * 0.96}px`);
    const opening = renderToStaticMarkup(<SurahHeaderFrame surahName="الفاتحة" width={304} rowH={30} variant="opening" />);
    expect(opening).toContain(`height:${304 * .94 * (154 / 932)}px`);
  });
});
