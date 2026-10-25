import { useState, type CSSProperties } from "react";
import "./_group.css";
import "./_refined.css";

type HeaderVariant = "standard" | "opening";

interface HeaderProps {
  surahName: string;
  rowH: number;
  surahNumber?: number;
  ayahCount?: number;
  width?: number;
  variant?: HeaderVariant;
}

const BASMALAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
const WIDTHS = [320, 360, 375, 390, 393, 414, 430];
const EXAMPLES = [
  { key: "fatihah", title: "الفاتحة", meta: "افتتاح المصحف", name: "الفَاتِحَة", number: 1, ayahs: 7, variant: "opening" as const, basmala: false, note: "البسملة ضمن الآية الأولى" },
  { key: "baqarah", title: "افتتاح البقرة", meta: "بداية سورة", name: "البَقَرَة", number: 2, ayahs: 286, variant: "opening" as const, basmala: true },
  { key: "middle", title: "سورة من وسط المصحف", meta: "افتتاح في صفحة كثيفة", name: "مَرْيَم", number: 19, ayahs: 98, variant: "standard" as const, basmala: true },
  { key: "short", title: "سورة قصيرة", meta: "أواخر المصحف", name: "الإِخْلَاص", number: 112, ayahs: 4, variant: "standard" as const, basmala: true },
  { key: "ordinary", title: "صفحة عادية", meta: "لا افتتاح سورة هنا", name: "", number: undefined, ayahs: undefined, variant: "standard" as const, basmala: false, ordinary: true },
];

function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

/** Open folio ornament, sized only from the existing computed header row. */
function RefinedSurahHeaderFrame({ surahName, rowH, surahNumber, ayahCount, width = 0, variant = "standard" }: HeaderProps) {
  const showMeta = surahNumber !== undefined && ayahCount !== undefined;
  const bandH = rowH * (variant === "opening" ? 0.86 : 0.8);

  return (
    <div
      className="tby-surah-banner tby-surah-banner--refined"
      data-surah-frame={surahName}
      data-variant={variant}
      data-compact={width < 360 ? "true" : "false"}
      data-page-width={width}
      dir="rtl"
      style={{ height: bandH, ["--band-h" as string]: `${bandH}px` }}
    >
      <HeaderSide side="start" label={showMeta ? `ترتيبها ${toArabicDigits(surahNumber!)}` : null} />
      <div className="tby-surah-cartouche tby-surah-cartouche--open">
        <div className="tby-surah-cartouche-body tby-surah-cartouche-body--open">
          <svg className="tby-surah-cartouche-rules tby-surah-cartouche-rules--open" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden focusable="false">
            <path d="M2 7H43M57 7H98M2 33H44M56 33H98" className="tby-orn-line-soft" />
            <path d="M3 10H18M82 10H97" className="tby-orn-line-soft" />
            <path d="m50 4.3 2.7 2.7L50 9.7 47.3 7z" className="tby-orn-line" fill="var(--mushaf-paper)" />
            <circle cx="2" cy="7" r="1.15" className="tby-orn-dot" />
            <circle cx="98" cy="7" r="1.15" className="tby-orn-dot" />
            <path d="m50 30.9 2.1 2.1-2.1 2.1-2.1-2.1z" className="tby-orn-dot" />
          </svg>
          <span className="tby-surah-title tby-surah-title--refined font-quran" style={{ fontSize: rowH * 0.44 }}>
            سُورَةُ {surahName}
          </span>
        </div>
      </div>
      <HeaderSide side="end" label={showMeta ? `آياتها ${toArabicDigits(ayahCount!)}` : null} />
    </div>
  );
}

function HeaderSide({ side, label }: { side: "start" | "end"; label: string | null }) {
  return (
    <span className="tby-surah-side tby-surah-side--refined" data-side={side} aria-hidden={label ? undefined : true}>
      <svg className="tby-surah-finial tby-surah-finial--refined" viewBox="0 0 12 12" aria-hidden focusable="false">
        <path d="M6 1.5 10.5 6 6 10.5 1.5 6z" className="tby-orn-line" fill="var(--mushaf-paper)" />
        <circle cx="6" cy="6" r="1.05" className="tby-orn-dot" />
      </svg>
      {label && <span className="tby-surah-detail tby-surah-detail--refined">{label}</span>}
    </span>
  );
}

function BasmalahFlourish({ flip }: { flip?: boolean }) {
  return (
    <span className="tby-header-case__basmala-flourish" aria-hidden>
      <svg viewBox="0 0 44 12" focusable="false" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
        <line x1="2" y1="6" x2="30" y2="6" stroke="var(--mushaf-orn-accent)" strokeWidth=".8" opacity=".45" />
        <path d="M31 6l3.5-3.5L38 6l-3.5 3.5z" fill="none" stroke="var(--mushaf-orn-accent)" strokeWidth=".8" opacity=".8" />
        <path d="M40 6l1.6-1.6L43.2 6l-1.6 1.6z" fill="var(--mushaf-orn-accent)" />
      </svg>
    </span>
  );
}

function getRequestedWidth() {
  const requested = Number(new URLSearchParams(window.location.search).get("width"));
  return WIDTHS.includes(requested) ? requested : 390;
}

export function Refined() {
  const [width, setWidth] = useState(getRequestedWidth);
  const pageH = width / (622 / 917);
  const rowH = pageH / 15;

  return (
    <main className="tby-header-preview tby-header-preview--refined">
      <header className="tby-header-preview__heading">
        <div>
          <p className="tby-header-preview__eyebrow">TABYAN · SURAH HEADER SYSTEM</p>
          <h1 className="tby-header-preview__title">ترويسة السورة — زخرفة مطبوعة مفتوحة</h1>
        </div>
        <p className="tby-header-preview__note">نظام زخرفي مفتوح ومتوازن لكل بدايات السور؛ يبقى اسم السورة في القلب، وتنساب البيانات على جانبيه بهدوء.</p>
      </header>
      <div className="tby-header-preview__controls" aria-label="عرض الصفحة">
        <span className="tby-header-preview__controls-label">عرض الصفحة</span>
        {WIDTHS.map((item) => (
          <button key={item} className="tby-width-choice" type="button" aria-pressed={item === width} onClick={() => setWidth(item)}>{item}</button>
        ))}
      </div>
      <section className="tby-header-preview__cases" aria-label="أمثلة بدايات السور والصفحة العادية">
        {EXAMPLES.map((example) => (
          <article className="tby-header-case" data-kind={example.ordinary ? "ordinary" : example.key} key={example.key}>
            <div className="tby-header-case__top">
              <h2 className="tby-header-case__title">{example.title}</h2>
              <span className="tby-header-case__meta">{example.meta} · {width}px</span>
            </div>
            <div className="tby-header-case__paper" style={{ "--sample-width": `${width}px`, "--row-h": `${rowH}px` } as CSSProperties}>
              {!example.ordinary && (
                <div className="tby-header-case__header-row" style={{ height: rowH }}>
                  <RefinedSurahHeaderFrame surahName={example.name} surahNumber={example.number} ayahCount={example.ayahs} rowH={rowH} width={width} variant={example.variant} />
                </div>
              )}
              {example.basmala && (
                <div className="tby-header-case__basmala" style={{ "--header-gap": example.variant === "opening" ? `${rowH * 0.2}px` : "0px" } as CSSProperties}>
                  <BasmalahFlourish />
                  <span className="tby-header-case__basmala-text font-quran">{BASMALAH_TEXT}</span>
                  <BasmalahFlourish flip />
                </div>
              )}
              {example.note && <div className="tby-header-case__first-verse">{example.note}</div>}
              {example.ordinary && <div className="tby-header-case__ordinary-lines" aria-hidden>{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}