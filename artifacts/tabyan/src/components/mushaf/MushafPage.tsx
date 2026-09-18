/**
 * مصيّر صفحة المصحف — يرسم صفحة واحدة بخط QCF v2 الخاص بها:
 * الكلمات glyphs متجهة (vector) من بيانات مجمع الملك فهد، موزعة على أسطرها الحقيقية (line_v2)
 * كما في الطبعة المدنية — لا إعادة التفاف HTML ولا تغيير لأي حرف أو ترتيب.
 * حجم الخط يُعايَر لكل صفحة بقياس أعرض سطر (canvas) فيملأ العرض تماماً كما في المصحف المطبوع.
 *
 * recitation: يطبّق opacity على كلمات النطاق لأوضاع الإخفاء المختلفة (جلسة تسميع).
 * globalHideMode: إخفاء مستقل لجميع كلمات الصفحة (بدون جلسة، للقراءة مع حفظ).
 * audioVerseKey: يُسلّط خلفية خفيفة على آية التلاوة الصوتية الحالية.
 *
 * ممنوع display:none — الـ layout لا ينهار أبداً (opacity/visibility فقط).
 */
import { Fragment, memo, useLayoutEffect, useMemo, useState } from "react";
import SurahHeaderFrame from "./SurahHeaderFrame";
import { SURAHS } from "@/lib/quran-data";
import { PAGE_ASPECT } from "@/lib/mushaf/pages";
import { pageFontFamily } from "@/lib/mushaf/fonts";
import type { MushafPageData, LineWord } from "@/lib/mushaf/types";
import { getWordPresentationStyle } from "@/lib/mushaf/word-presentation";
import type { HideMode } from "@/lib/recitation-types";

const LINE_COUNT = 15;
const BASMALAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
/** حبر الصفحة — ثابت (القراءة أولاً — لا يتغير مع الثيم) */
const INK   = "#231710";
const PAPER = "#fdfaf1";

interface LineModel {
  line: number;
  kind: "words" | "surah-header" | "basmalah";
  words?: LineWord[];
  surahName?: string;
  centered?: boolean;
}

/** حالة التسميع الممرَّرة من MushafReader */
export interface RecitationPageProps {
  rangeKeys: Set<string>;
  hideMode: HideMode;
  currentVerseKey: string | null;
  currentWord: { verseKey: string; position: number } | null;
  revealedWords: Map<string, number>;
}

function buildLines(data: MushafPageData): LineModel[] {
  const wordLines = new Map<number, LineWord[]>();
  const models: LineModel[] = [];
  for (const v of data.v) {
    for (const w of v.w) {
      const lw: LineWord = {
        verseKey: v.k, chapter: v.c, verseNum: v.n,
        position: w[0], type: w[2], code: w[3],
      };
      const arr = wordLines.get(w[1]) ?? [];
      arr.push(lw);
      wordLines.set(w[1], arr);
    }
    if (v.n === 1 && v.w.length > 0) {
      const firstLine = v.w[0][1];
      const isFatiha  = v.c === 1;
      const isTawbah  = v.c === 9;
      const headerLine = firstLine - (isFatiha || isTawbah ? 1 : 2);
      if (headerLine >= 1) {
        models.push({ line: headerLine, kind: "surah-header", surahName: SURAHS[v.c - 1]?.name ?? "" });
        if (!isFatiha && !isTawbah) models.push({ line: headerLine + 1, kind: "basmalah" });
      }
    }
  }
  for (const [line, words] of wordLines) {
    const centered = words.some(
      (w) => w.type === 1 && SURAHS[w.chapter - 1] && w.verseNum === SURAHS[w.chapter - 1].ayahs
    );
    models.push({ line, kind: "words", words, centered });
  }
  return models.sort((a, b) => a.line - b.line);
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
  if (w.type !== 0) return 1; // خواتم + علامات وقف دائماً ظاهرة
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
  /** MOBILE FILL MODE (قرار معتمد): ارتفاع مساحة القراءة على الهاتف العمودي —
      الأسطر الـ15 تتوزع عليه (rowH يتنفس) بينما حجم الخط مشتق من العرض فقط.
      على المكتبي يُترك فارغاً فتُشتق النسبة المطبوعة 622/917. */
  height?: number;
  recitation?: RecitationPageProps | null;
  globalHideMode?: HideMode | null;
  revealedGlobalWords?: Map<string, number>;
  audioVerseKey?: string | null;
}) {
  const height = heightProp ?? width / PAGE_ASPECT;
  const rowH   = height / LINE_COUNT;
  const family = pageFontFamily(data.p);
  const lines  = useMemo(() => buildLines(data), [data]);
  const [fontSize, setFontSize] = useState(0);

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
      const spaceW = ctx.measureText(" ").width;
      let maxLine = 0;
      for (const m of lines) {
        if (m.kind !== "words" || !m.words?.length) continue;
        const w = m.words.reduce((s, word) => s + ctx.measureText(word.code).width, 0) + (m.words.length - 1) * spaceW;
        if (w > maxLine) maxLine = w;
      }
      const inner = width * 0.94;
      const fs = maxLine > 0 ? (inner * 100) / maxLine : rowH * 0.7;
      if (!cancelled) setFontSize(fs);
    })();
    return () => { cancelled = true; };
  }, [data, width, lines, family, rowH]);

  return (
    <div
      dir="rtl"
      className="relative mx-auto"
      style={{ width, height, background: PAPER, opacity: fontSize > 0 ? 1 : 0, transition: "opacity 120ms ease" }}
      data-mushaf-page={data.p}
    >
      {fontSize > 0 &&
        lines.map((m) => {
          const top = (m.line - 1) * rowH;

          if (m.kind === "surah-header") {
            // برواز زخرفي كامل بهوية تبيان (P0) — مكوّن مستقل، في سطر بداية
            // السورة الحقيقي، يبقى ضمن rowH دون كسر line geometry
            return (
              <div key={`h-${m.line}`} className="absolute inset-x-0 flex items-center justify-center" style={{ top, height: rowH }}>
                <SurahHeaderFrame surahName={m.surahName ?? ""} rowH={rowH} />
              </div>
            );
          }

          if (m.kind === "basmalah") {
            return (
              <div key={`b-${m.line}`} className="absolute inset-x-0 flex items-center justify-center" style={{ top, height: rowH }}>
                <span className="font-quran whitespace-nowrap" style={{ fontSize: rowH * 0.62, lineHeight: 1, color: INK }}>
                  {BASMALAH_TEXT}
                </span>
              </div>
            );
          }

          return (
            <div
              key={`l-${m.line}`}
              className="absolute inset-x-0 flex items-center justify-center"
              style={{ top, height: rowH }}
            >
              <span className="whitespace-nowrap" style={{ fontFamily: family, fontSize, lineHeight: 1, color: INK }}>
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

                  return (
                    <Fragment key={i}>
                      {i > 0 && " "}
                      <span
                        data-verse={w.verseKey}
                        data-pos={w.position}
                        data-type={w.type}
                        style={getWordPresentationStyle(opacity, isCurrentWord, isAudioAyah)}
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
    </div>
  );
}

export default memo(MushafPage);
