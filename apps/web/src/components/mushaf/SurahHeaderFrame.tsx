import { useLayoutEffect, useRef, useState } from "react";
import { toArabicDigits } from "@/lib/mushaf/format";
import { fitMeasuredTitle, measureInk } from "@/lib/mushaf/title-fit";
import { createFrameScheduler } from "@/lib/mushaf/frame-scheduler";
import SurahHeaderOrnament from "./SurahHeaderOrnament";
import { vocalizedSurahTitle } from "@workspace/tabyan-domain/quran-surah-names";

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
export default function SurahHeaderFrame({ surahName, rowH, surahNumber, ayahCount, width = 0, variant = "standard" }: Props) {
  const showMeta = surahNumber !== undefined && ayahCount !== undefined;
  const bandH = variant === "opening" && width > 0
    ? width * 0.94 * (154 / 932)
    : rowH * (variant === "opening" ? 0.86 : 0.8);
  // The row provides a ceiling; actual Arabic ink determines the fitted size.
  const maxTitle = Math.min(34, Math.max(26, width * 0.09), bandH * 1.55);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ fontSize: number; dx: number; dy: number } | null>(null);
  const [failed, setFailed] = useState(false);
  // Vocalised like the printed header when the surah number is known.
  const text = surahNumber !== undefined ? vocalizedSurahTitle(surahNumber, surahName) : `سُورَةُ ${surahName}`;
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
      const r = fitMeasuredTitle(size => measureInk(text, family, 400, size), w * 0.92, h * 0.80, maxTitle);
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
  }, [text, maxTitle]);
  return (
    <div
      className="tby-surah-banner"
      data-surah-frame={surahName}
      data-variant={variant}
      data-compact={width < 360 ? "true" : "false"}
      data-page-width={width}
      dir="rtl"
      style={{ height: bandH, ["--band-h" as string]: `${bandH}px` }}
    >
      <SurahHeaderOrnament />
      <HeaderSide side="start" caption="ترتيبها" value={showMeta ? toArabicDigits(surahNumber!) : null} />
      <div className="tby-surah-cartouche">
        <div ref={bodyRef} className="tby-surah-cartouche-body">
          <span ref={titleRef} className="tby-surah-title" style={{ fontSize: fit?.fontSize ?? maxTitle * 0.6, fontWeight: 400, lineHeight: 1, visibility: fit || failed ? "visible" : "hidden", top: fit?.dy ?? 0, left: fit?.dx ?? 0, maxWidth: "none" }}>
            {text}
          </span>
        </div>
      </div>
      <HeaderSide side="end" caption="آياتها" value={showMeta ? toArabicDigits(ayahCount!) : null} />
    </div>
  );
}

/** A light page-edge finial and a quiet metadata label on each side of the title. */
function HeaderSide({ side, caption, value }: { side: "start" | "end"; caption: string; value: string | null }) {
  return (
    <span className="tby-surah-side" data-side={side} aria-label={value ? `${caption} ${value}` : undefined} aria-hidden={value ? undefined : true}>
      <svg className="tby-surah-finial" viewBox="0 0 12 12" aria-hidden focusable="false">
        <path d="M6 1.5 10.5 6 6 10.5 1.5 6z" className="tby-orn-line" fill="var(--mushaf-paper)" />
        <circle cx="6" cy="6" r="1" className="tby-orn-dot" />
      </svg>
      {value && (
        <span className="tby-surah-detail">
          <span className="tby-surah-detail-caption">{caption}</span>
          <span className="tby-surah-detail-value">{value}</span>
        </span>
      )}
    </span>
  );
}
