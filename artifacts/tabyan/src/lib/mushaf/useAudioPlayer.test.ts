import { describe, expect, it } from "vitest";
import { getAudioUrl, nextAudioTrack } from "./useAudioPlayer";

describe("مجرى آيات مشغّل المصحف", () => {
  it("ينتقل إلى الآية التالية في السورة نفسها", () => {
    expect(nextAudioTrack({ surahId: 1, ayahNum: 1 })).toEqual({
      surahId: 1,
      ayahNum: 2,
    });
  });

  it("ينتقل من آخر آية في السورة إلى أول آية من السورة التالية", () => {
    expect(nextAudioTrack({ surahId: 1, ayahNum: 7 })).toEqual({
      surahId: 2,
      ayahNum: 1,
    });
  });

  it("يتوقف بأمان عند نهاية المصحف", () => {
    expect(nextAudioTrack({ surahId: 114, ayahNum: 6 })).toBeNull();
  });

  it("ينشئ رابط EveryAyah مضبوط الترقيم للآية", () => {
    expect(getAudioUrl("Alafasy_128kbps", { surahId: 2, ayahNum: 1 })).toBe(
      "https://everyayah.com/data/Alafasy_128kbps/002001.mp3",
    );
  });
});