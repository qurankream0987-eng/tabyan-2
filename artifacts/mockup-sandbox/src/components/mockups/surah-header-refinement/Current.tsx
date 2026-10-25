import { useState } from "react";
import "./_group.css";

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

/**
 * Extracted from artifacts/tabyan/src/components/mushaf/SurahHeaderFrame.tsx.
 * Keep this baseline exact so the refined version can be compared against the real component.
 */
function ExtractedSurahHeaderFrame({ surahName, rowH, surahNumber, ayahCount, width = 0, variant = "standard" }: HeaderProps) {
  const showMeta = width >= 340 && surahNumber !== undefined && ayahCount !== undefined;
  const bandH = rowH * (variant === "opening" ? 0.86 : 0.8);
  return (
    <div className="tby-surah-banner" data-surah-frame={surahName} data-variant={variant} dir="rtl" style={{ height: bandH, ["--band-h" as string]: `${bandH}px` }}>
      <HeaderSide side="start" label={showMeta ? `ترتيبها ${toArabicDigits(surahNumber!)}` : null} />
      <div className="tby-surah-cartouche">
        <CartoucheCap />
        <div className="tby-surah-cartouche-body">
          <svg className="tby-surah-cartouche-rules" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden focusable="false">
            <rect x="0" y="2" width="100" height="36" className="tby-orn-fill" />
            <line x1="0" y1="2" x2="100" y2="2" className="tby-orn-line" />
            <line x1="0" y1="38" x2="100" y2="38" className="tby-orn-line" />
            <line x1="0" y1="6" x2="100" y2="6" className="tby-orn-line-soft" />
            <line x1="0" y1="34" x2="100" y2="34" className="tby-orn-line-soft" />
          </svg>
          <span className="tby-surah-title font-quran" style={{ fontSize: rowH * 0.46 }}>
            سُورَةُ {surahName}
          </span>
        </div>
        <CartoucheCap flip />
      </div>
      <HeaderSide side="end" label={showMeta ? `آياتها ${toArabicDigits(ayahCount!)}` : null} />
    </div>
  );
}

function HeaderSide({ side, label }: { side: "start" | "end"; label: string | null }) {
  return (
    <span className="tby-surah-side" data-side={side} aria-hidden={label ? undefined : true}>
      <svg className="tby-surah-finial" viewBox="0 0 12 12" aria-hidden focusable="false">
        <path d="M6 1.2 10.8 6 6 10.8 1.2 6z" className="tby-orn-line" fill="none" />
        <path d="M6 3.9 8.1 6 6 8.1 3.9 6z" className="tby-orn-dot" />
      </svg>
      {label && <span className="tby-surah-detail">{label}</span>}
    </span>
  );
}

function CartoucheCap({ flip }: { flip?: boolean }) {
  return (
    <svg className="tby-surah-cap" viewBox="0 0 26 40" preserveAspectRatio="none" aria-hidden focusable="false" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M0 2C10 2 12 8 16 13C18 16 20 18 22.5 20C20 22 18 24 16 27C12 32 10 38 0 38Z" className="tby-orn-fill" />
      <path d="M0 2C10 2 12 8 16 13C18 16 20 18 22.5 20C20 22 18 24 16 27C12 32 10 38 0 38" className="tby-orn-line" fill="none" />
      <path d="M0 6C8 6 10 11 13 15C14.5 17 16 18.5 17.5 20C16 21.5 14.5 23 13 25C10 29 8 34 0 34" className="tby-orn-line-soft" fill="none" />
      <circle cx="24.6" cy="20" r="1.2" className="tby-orn-dot" />
    </svg>
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

export function Current() {
  const [width, setWidth] = useState(getRequestedWidth);
  const pageH = width / (622 / 917);
  const rowH = pageH / 15;

  return (
    <main className="tby-header-preview">
      <header className="tby-header-preview__heading">
        <div>
          <p className="tby-header-preview__eyebrow">TABYAN · SURAH HEADER SYSTEM</p>
          <h1 className="tby-header-preview__title">الترويسة الحالية — مستخرجة من قارئ الويب</h1>
        </div>
        <p className="tby-header-preview__note">معاينة معزولة للمكوّن الحقيقي. يتغير عرض الصفحة افتراضياً بين قياسات الهاتف، وتبقى أسطر القرآن خارج نطاق هذه الزخرفة.</p>
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
            <div className="tby-header-case__paper" style={{ "--sample-width": `${width}px`, "--row-h": `${rowH}px` } as React.CSSProperties}>
              {!example.ordinary && (
                <div className="tby-header-case__header-row" style={{ height: rowH }}>
                  <ExtractedSurahHeaderFrame surahName={example.name} surahNumber={example.number} ayahCount={example.ayahs} rowH={rowH} width={width} variant={example.variant} />
                </div>
              )}
              {example.basmala && (
                <div className="tby-header-case__basmala" style={{ "--header-gap": example.variant === "opening" ? `${rowH * 0.2}px` : "0px" } as React.CSSProperties}>
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