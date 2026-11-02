/**
 * مصيّر صفحة المصحف — يرسم صفحة واحدة بخط QCF v1 (طبعة المدينة 1405) الخاص بها:
 * الكلمات glyphs متجهة (vector) من بيانات مجمع الملك فهد، موزعة على أسطرها الحقيقية (line_number لطبعة 1405)
 * كما في الطبعة المدنية — لا إعادة التفاف HTML ولا تغيير لأي حرف أو ترتيب.
 * حجم الخط يُعايَر لكل صفحة بقياس أعرض سطر (canvas) فيملأ العرض تماماً كما في المصحف المطبوع.
 *
 * recitation: يطبّق opacity على كلمات النطاق لأوضاع الإخفاء المختلفة (جلسة تسميع).
 * globalHideMode: إخفاء مستقل لجميع كلمات الصفحة (بدون جلسة، للقراءة مع حفظ).
 * audioVerseKey: يُسلّط خلفية خفيفة على آية التلاوة الصوتية الحالية.
 *
 * ممنوع display:none — الـ layout لا ينهار أبداً (opacity/visibility فقط).
 */
import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import SurahHeaderFrame from "./SurahHeaderFrame";
import footerReference from "../../assets/mushaf/surah-footer-tabyan-burgundy.png";
import { PAGE_ASPECT, PAGE_FRAME_INSET } from "@/lib/mushaf/pages";
import { BASMALA_FONT_PAGE, BASMALA_GLYPHS, basmalaScale, computePageLayout, LINE_COUNT, maxFontSizeFor, QCF_WORD_GAP, type PageVariant } from "@/lib/mushaf/page-layout";
import { ensurePageFont, pageFontFamily } from "@/lib/mushaf/fonts";
import { toArabicDigits } from "@/lib/mushaf/format";
import { buildPageLines, type MushafPageData, type LineWord } from "@/lib/mushaf/types";
import { getWordPresentationStyle, type WordFeedbackState } from "@/lib/mushaf/word-presentation";
import { JUZ_LIST, SURAHS } from "@/lib/quran-data";
import { vocalizedSurahTitle } from "@workspace/tabyan-domain/quran-surah-names";
import type { HideMode } from "@/lib/recitation-types";

const BASMALAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
/** حبر أسود وورق عاجي ثابتان — لون فقط، دون تغيير هندسة الصفحة. */
const INK = "var(--mushaf-ink, #000)";

/**
 * هامش الورقة المطبوع: «الجزء السادس» يميناً، و«سُورَةُ …» يساراً باسم سورة آخر آية في
 * الصفحة (كما في الطبعة المدنية)، ورقم الصفحة أسفل الوسط. كله خارج شبكة أسطر QCF.
 */
function pageMarginLabels(data: MushafPageData): { juz: string; surah: string } {
  const last = data.v[data.v.length - 1];
  return {
    juz: JUZ_LIST[data.j - 1]?.name ?? "",
    surah: last ? vocalizedSurahTitle(last.c, SURAHS[last.c - 1]?.name ?? "") : "",
  };
}

/** حالة التسميع الممرَّرة من MushafReader */
export interface RecitationPageProps {
  rangeKeys: Set<string>;
  hideMode: HideMode;
  currentVerseKey: string | null;
  currentWord: { verseKey: string; position: number } | null;
  revealedWords: Map<string, number>;
  /** حالات تغذية AI الراجعة ("verseKey:position") — لون/خط سفلي فقط. */
  wordStates?: Map<string, WordFeedbackState>;
  /** وضع الحفظ/الاختبار فقط: إخفاء علامات الآيات (opacity) دون تغيير الهندسة. */
  hideAyahMarkers?: boolean;
  /** اختبار الحفظ: إخفاء ترويسات السور والبسملة (opacity) كي لا تكشف الموضع. */
  maskHeaders?: boolean;
}

/** حساب opacity كلمة في وضع تسميع (بنطاق) */
function getWordOpacity(
  w: LineWord,
  rec: RecitationPageProps,
  wordPositions: Map<string, number[]>,
): number {
  const inRange = rec.rangeKeys.has(w.verseKey);
  if (!inRange) return 0.25;
  if (rec.hideMode === "visible_review") return 1;
  // خواتم الآيات تبقى افتراضياً مرجعاً للحافظ؛ تُخفى فقط بطلب صريح في الحفظ/الاختبار.
  if (w.type === 1) return rec.hideAyahMarkers ? 0 : 1;
  if (w.type !== 0) return 1; // علامات الوقف ظاهرة
  const positions = wordPositions.get(w.verseKey);
  if (rec.hideMode === "full_hide") return 0;
  if (rec.hideMode === "first_word") {
    return w.position === (positions?.[0] ?? -1) ? 1 : 0;
  }
  if (rec.hideMode === "progressive_reveal") {
    const idx = positions ? positions.indexOf(w.position) : -1;
    return idx < (rec.revealedWords.get(w.verseKey) ?? 0) ? 1 : 0;
  }
  return 1;
}

/** حساب opacity كلمة في وضع إخفاء عام (بدون نطاق — يشمل كل الصفحة) */
function getGlobalWordOpacity(
  w: LineWord,
  mode: HideMode,
  wordPositions: Map<string, number[]>,
  revealedGlobalWords?: Map<string, number>,
): number {
  if (w.type !== 0) return 1; // علامات وقف + خواتم دائماً ظاهرة
  if (mode === "full_hide") return 0;
  if (mode === "first_word") {
    const positions = wordPositions.get(w.verseKey);
    return w.position === (positions?.[0] ?? -1) ? 1 : 0;
  }
  if (mode === "progressive_reveal") {
    const positions = wordPositions.get(w.verseKey);
    const idx = positions ? positions.indexOf(w.position) : -1;
    const revealed = revealedGlobalWords?.get(w.verseKey) ?? 0;
    return idx < revealed ? 1 : 0;
  }
  return 1;
}

function MushafPage({
  data,
  width,
  height: heightProp,
  recitation,
  globalHideMode,
  revealedGlobalWords,
  audioVerseKey,
}: {
  data: MushafPageData;
  width: number;
  /** Physical paper height supplied by the fitted reader layout. */
  height?: number;
  recitation?: RecitationPageProps | null;
  globalHideMode?: HideMode | null;
  revealedGlobalWords?: Map<string, number>;
  audioVerseKey?: string | null;
}) {
  // الورقة = كتلة الأسطر + هامشا الترويسة ورقم الصفحة؛ هندسة QCF تُحسب على كتلة الأسطر وحدها.
  const paperH = heightProp ?? width / PAGE_ASPECT + PAGE_FRAME_INSET * 2;
  const height = paperH - PAGE_FRAME_INSET * 2;
  const family = pageFontFamily(data.p);
  const lines = useMemo(() => buildPageLines(data), [data]);
  // The basmala is drawn with page 1's font; until it loads, Amiri stands in.
  const hasBasmala = lines.some((m) => m.kind === "basmalah");
  const [basmalaReady, setBasmalaReady] = useState(false);
  useEffect(() => {
    if (!hasBasmala) return;
    let live = true;
    ensurePageFont(BASMALA_FONT_PAGE).then(() => { if (live) setBasmalaReady(true); }, () => {});
    return () => { live = false; };
  }, [hasBasmala]);
  const rowCount = Math.max(1, ...lines.map((line) => line.line));
  const pageVariant: PageVariant = data.p === 1 || data.p === 2 ? "opening" : "standard";
  const titleRowH = height / LINE_COUNT;
  const [fontSize, setFontSize] = useState(0);
  const layout = useMemo(
    () => computePageLayout(lines, rowCount, height, pageVariant),
    [lines, rowCount, height, pageVariant],
  );
  const rowH = layout.wordRowH;
  const margin = useMemo(() => pageMarginLabels(data), [data]);

  const wordPositions = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const v of data.v) {
      const positions: number[] = [];
      for (const w of v.w) { if (w[2] === 0) positions.push(w[0]); }
      if (positions.length) map.set(v.k, positions);
    }
    return map;
  }, [data]);

  useLayoutEffect(() => {
    let cancelled = false;
    setFontSize(0);
    (async () => {
      try { await document.fonts.load(`100px "${family}"`); } catch { /* نتابع */ }
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      ctx.font = `100px "${family}"`;
      // Words sit closer than the font's space, as on the printed page (QCF_WORD_GAP).
      const spaceW = ctx.measureText(" ").width * QCF_WORD_GAP;
      let maxLine = 0;
      for (const m of lines) {
        if (m.kind !== "words" || !m.words?.length) continue;
        const w = m.words.reduce((s, word) => s + ctx.measureText(word.code).width, 0) + (m.words.length - 1) * spaceW;
        if (w > maxLine) maxLine = w;
      }
      const inner = width * 0.94;
      const fitted = maxLine > 0 ? (inner * 100) / maxLine : titleRowH * 0.5;
      // صفحتا الافتتاح: أسطر أقصر في المطبوع، بخط الصفحات الكاملة نفسه — لا تكبير ليملأ العرض.
      const fs = Math.min(fitted, maxFontSizeFor(layout.variant, height));
      if (!cancelled) setFontSize(fs);
    })();
    return () => { cancelled = true; };
  }, [data, width, lines, family, titleRowH, height, layout.variant]);

  return (
    <div
      dir="rtl"
      className="tby-mushaf-paper relative mx-auto"
      style={{ width, height: layout.paperH + PAGE_FRAME_INSET * 2, opacity: fontSize > 0 ? 1 : 0, transition: "opacity 120ms ease" }}
      data-mushaf-page={data.p}
      data-mushaf-variant={layout.variant}
    >
      {fontSize > 0 && (
        <>
        {/* هامش الترويسة: الجزء يميناً والسورة يساراً — يُخفى مع الترويسات في اختبار الحفظ */}
        <div
          className="tby-page-margin tby-page-margin--top"
          style={{ height: PAGE_FRAME_INSET, opacity: recitation?.maskHeaders ? 0 : 1 }}
          aria-hidden="true"
        >
          <span>{margin.juz}</span>
          <span>{margin.surah}</span>
        </div>
        {layout.variant !== "opening" && (
          <div className="tby-page-margin tby-page-margin--bottom" style={{ height: PAGE_FRAME_INSET }} aria-hidden="true">
            <span>{toArabicDigits(data.p)}</span>
          </div>
        )}
        {lines.map((m) => {
          const top = PAGE_FRAME_INSET + (layout.tops.get(m.line) ?? 0);

          if (m.kind === "surah-header") {
            // برواز زخرفي كامل بهوية تبيان (P0) — مكوّن مستقل، في سطر بداية
            // السورة الحقيقي، يبقى ضمن rowH دون كسر line geometry
            return (
              <div
                key={`h-${m.line}`}
                className="absolute inset-x-0 flex items-center justify-center"
                style={{ top, height: titleRowH, opacity: recitation?.maskHeaders ? 0 : 1, transition: "opacity 200ms ease" }}
                aria-hidden={recitation?.maskHeaders || undefined}
              >
                <SurahHeaderFrame
                  surahName={m.surahName ?? ""}
                  rowH={titleRowH}
                  width={width}
                  variant={layout.variant === "opening" ? "opening" : "standard"}
                  surahNumber={m.surahNumber}
                  ayahCount={m.ayahCount}
                />
              </div>
            );
          }

          if (m.kind === "basmalah") {
            return (
              <div
                key={`b-${m.line}`}
                className="tby-basmala-row absolute flex items-center justify-center"
                style={{ top, height: rowH, insetInline: "3%", opacity: recitation?.maskHeaders ? 0 : 1, transition: "opacity 200ms ease" }}
              >
                {basmalaReady ? (
                  // The printed basmala: 1:1 in the page-1 QCF font, at the size of the page's lines.
                  <span className="tby-ayah-line whitespace-nowrap shrink-0" style={{ fontFamily: pageFontFamily(BASMALA_FONT_PAGE), fontSize: fontSize * basmalaScale(layout.variant), lineHeight: 1, color: INK }}>
                    {BASMALA_GLYPHS.map((g, i) => <Fragment key={g}>{i > 0 && <span style={{ fontSize: `${QCF_WORD_GAP}em` }}> </span>}{g}</Fragment>)}
                  </span>
                ) : (
                  <span className="font-quran whitespace-nowrap shrink-0" style={{ fontSize: Math.min(fontSize * 1.1, titleRowH * 0.62), lineHeight: 1, color: INK, position: "relative", top: "-0.1em" }}>
                    {BASMALAH_TEXT}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={`l-${m.line}`}
              className="absolute inset-x-0 flex items-center justify-center"
              style={{ top, height: rowH }}
            >
              <span className="tby-ayah-line whitespace-nowrap" style={{ fontFamily: family, fontSize, lineHeight: 1, color: INK }}>
                {m.words!.map((w, i) => {
                  // حساب الـ opacity
                  const opacity = recitation
                    ? getWordOpacity(w, recitation, wordPositions)
                    : (globalHideMode && globalHideMode !== "visible_review")
                      ? getGlobalWordOpacity(w, globalHideMode, wordPositions, revealedGlobalWords)
                      : 1;

                  // خلفية تمييز الآية الصوتية — مستقلة عن تتبع كلمة AI
                  const isAudioAyah = !recitation && audioVerseKey === w.verseKey && w.type === 0;
                  // تتبع موضع التلاوة الحي: اللون فقط على span inline نفسه، فلا تتغير هندسة QCF.
                  const isCurrentWord = recitation?.currentWord?.verseKey === w.verseKey
                    && recitation.currentWord.position === w.position
                    && w.type === 0;
                  const feedback = w.type === 0 && opacity > 0
                    ? recitation?.wordStates?.get(`${w.verseKey}:${w.position}`)
                    : undefined;

                  return (
                    <Fragment key={i}>
                      {i > 0 && <span style={{ fontSize: `${QCF_WORD_GAP}em` }}> </span>}
                      <span
                        className={w.type === 1 ? "tby-ayah-marker" : undefined}
                        data-verse={w.verseKey}
                        data-pos={w.position}
                        data-type={w.type}
                        style={getWordPresentationStyle(opacity, isCurrentWord, isAudioAyah, feedback)}
                      >
                        {w.code}
                      </span>
                    </Fragment>
                  );
                })}
              </span>
            </div>
          );
        })}
        {layout.variant === "opening" && (
          <div className="tby-page-footer" aria-hidden="true">
            <img className="tby-page-footer-art" src={footerReference} alt="" draggable={false} />
            <span>{toArabicDigits(data.p)}</span>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export default memo(MushafPage);
