import { useLayoutEffect, useRef, useState } from "react";
import { fitMeasuredTitle, measureInk } from "@/lib/mushaf/title-fit";
import { createFrameScheduler } from "@/lib/mushaf/frame-scheduler";
import SurahHeaderOrnament from "./SurahHeaderOrnament";
import { SURAH_NAME_FONT_FAMILY, SURAH_TITLE_STRETCH, surahBannerLayout, surahNameGlyph } from "@workspace/tabyan-domain/surah-banner";

export type SurahHeaderVariant = "standard" | "opening";

interface Props {
  surahName: string;
  rowH: number;
  surahNumber?: number;
  ayahCount?: number;
  width?: number;
  /** "opening": the Mushaf's opening spread, which has real margin around its header. */
  variant?: SurahHeaderVariant;
}

/**
 * ترويسة السورة — إطار مطبوع هادئ يحافظ على موضع سطر QCF المخصص للعنوان.
 * نسخة الزخرفة الأصلية بلا نص مطبوع؛ العنوان الحي يُقاس داخل صف الترويسة، دون مساس بأسطر QCF.
 */
export default function SurahHeaderFrame({ surahName, rowH, surahNumber, width = 0, variant = "standard" }: Props) {
  const bandH = variant === "opening" && width > 0
    ? width * 0.94 * (154 / 932)
    : rowH * (variant === "opening" ? 0.86 : 0.96);
  // The row provides a ceiling; actual Arabic ink determines the fitted size.
  // The calligraphic glyph is drawn short and wide, so it may use most of the band's height.
  const calligraphy = surahNumber !== undefined;
  const maxTitle = calligraphy ? bandH * 2.4 : Math.min(34, Math.max(26, width * 0.09), bandH * 1.55);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ fontSize: number; dx: number; dy: number } | null>(null);
  const [failed, setFailed] = useState(false);
  // The ornament is drawn for the banner's real proportions, so it measures itself.
  const bannerRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(() => (width > 0 ? (width * 0.94) / bandH : 7.1));
  useLayoutEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const update = () => { if (el.clientWidth > 0 && el.clientHeight > 0) setAspect(el.clientWidth / el.clientHeight); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const banner = surahBannerLayout(aspect);
  // With the number known, the title is the printed mushaf's calligraphy (one glyph per surah).
  const text = calligraphy ? surahNameGlyph(surahNumber) : `سُورَةُ ${surahName}`;
  useLayoutEffect(() => {
    const el = bodyRef.current;
    const title = titleRef.current;
    if (!el || !title) return;
    let cancelled = false;
    let fontReady = false;
    setFit(null);
    const measure = () => {
      if (cancelled || !fontReady) return;
      const family = getComputedStyle(title).fontFamily || "serif";
      const w = el.clientWidth, h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      // Real ink, including Arabic diacritics, stays inside the vector's ivory panel.
      // The calligraphy is drawn stretched, so its ink is measured at the stretched width.
      const stretch = calligraphy ? SURAH_TITLE_STRETCH : 1;
      const r = fitMeasuredTitle(size => { const m = measureInk(text, family, 400, size); return m && { ...m, left: m.left * stretch, right: m.right * stretch }; }, w * 0.92, h * (calligraphy ? 0.94 : 0.80), maxTitle);
      if (!r) { console.warn("[SurahHeaderFrame] canvas text measurement unavailable"); setFailed(true); return; }
      setFailed(false);
      setFit(previous => previous?.fontSize === r.fontSize && previous.dx === r.dx && previous.dy === r.dy ? previous : r);
    };
    const family = getComputedStyle(title).fontFamily || "serif";
    const ready = document.fonts.load(`400 100px ${family}`, text);
    const finish = () => { fontReady = true; measure(); };
    ready.then(finish, (err) => { console.warn("[SurahHeaderFrame] font load failed", err); finish(); });
    const frame = createFrameScheduler(measure);
    const ro = new ResizeObserver(frame.schedule);
    ro.observe(el);
    return () => { cancelled = true; ro.disconnect(); frame.dispose(); };
  }, [text, maxTitle, calligraphy]);
  return (
    <div
      ref={bannerRef}
      className="tby-surah-banner"
      data-surah-frame={surahName}
      data-variant={variant}
      data-compact={width < 360 ? "true" : "false"}
      data-page-width={width}
      dir="rtl"
      style={{
        height: bandH,
        ["--band-h" as string]: `${bandH}px`,
        // The title fills the cartouche.
        ["--sb-title-w" as string]: `${banner.title.width * 100}%`,
        ["--sb-title-h" as string]: `${banner.title.height * 100}%`,
      }}
    >
      <SurahHeaderOrnament aspect={aspect} />
      <div className="tby-surah-cartouche">
        <div ref={bodyRef} className="tby-surah-cartouche-body">
          <span ref={titleRef} className="tby-surah-title" aria-label={calligraphy ? `سورة ${surahName}` : undefined} style={{ fontFamily: calligraphy ? `"${SURAH_NAME_FONT_FAMILY}", serif` : undefined, fontSize: fit?.fontSize ?? maxTitle * 0.6, fontWeight: 400, lineHeight: 1, visibility: fit || failed ? "visible" : "hidden", top: fit?.dy ?? 0, left: fit?.dx ?? 0, maxWidth: "none", transform: calligraphy && SURAH_TITLE_STRETCH !== 1 ? `scaleX(${SURAH_TITLE_STRETCH})` : undefined }}>
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}

