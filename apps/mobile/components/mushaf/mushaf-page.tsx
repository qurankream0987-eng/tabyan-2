import { memo, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View, type NativeSyntheticEvent, type TextLayoutEventData } from "react-native";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { vocalizedSurahTitle } from "@workspace/tabyan-domain/quran-surah-names";
import { buildPageLines, type LineWord, type MushafPageData } from "@workspace/tabyan-domain/mushaf-page-data";
import { computePageLayout, LINE_COUNT, maxFontSizeFor, type PageVariant } from "@workspace/tabyan-domain/mushaf-page-layout";
import { pageFontFamily } from "../../lib/mushaf/mushaf-assets";
import { JUZ_LIST } from "../../lib/mushaf/juz";
import type { NativeWordFeedback } from "../../lib/recitation/native-recitation";

/** Width/height of a printed Madinah Mushaf page. */
export const PAGE_ASPECT = 622 / 917;
/** Glyph size used to measure the widest line before fitting it to the page. */
const MEASURE_SIZE = 100;
const BASMALAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
/** The web surah ornament (932×154): an empty cartouche between two medallions. */
const SURAH_ORNAMENT = require("../../assets/mushaf/surah-header-tabyan.png");
const ORNAMENT_ASPECT = 154 / 932;
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (value: number) => String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);

/** The page keeps its printed ink and paper in both app themes, as on the web. */
export const MUSHAF_COLORS = {
  paper: "#F6F1E3",
  frame: "#D9C9A3",
  ink: "#1B1410",
  /** Medallion captions on the surah ornament (web --hdr-green). */
  ornament: "#788567",
  outOfRange: "rgba(27, 20, 16, 0.25)",
  current: "#7A1F35",
  correct: "#2F4A3A",
  pending: "#6B5B4B",
  mistake: "#B3261E",
  skipped: "rgba(179, 38, 30, 0.5)",
  corrected: "#2F6B4A",
  peeked: "#8A6A1C",
  /** Reading mode: the ayah being played or picked. */
  highlight: "#7A1F35",
  highlightBackground: "rgba(184, 150, 50, 0.18)",
} as const;

export interface MushafRecitationState {
  /** Verse keys of the session range; words outside it are faded. */
  rangeKeys: ReadonlySet<string>;
  currentWord: { verseKey: string; position: number } | null;
  /** Feedback per `verseKey:position` from the shared mistake engine. */
  wordFeedback: ReadonlyMap<string, NativeWordFeedback>;
  hideMode: MushafHideMode;
  /** `verseKey:position` of the range words the reciter has reached. */
  revealedKeys: ReadonlySet<string>;
}

/** Same modes as the web reader; the server stores the chosen one with the session. */
export type MushafHideMode = "progressive_reveal" | "first_word" | "full_hide" | "visible_review";

// Paper-coloured ink: Android drops a fully transparent colour on nested text.
const HIDDEN = { color: MUSHAF_COLORS.paper } as const;

function wordStyle(word: LineWord, recitation: MushafRecitationState | undefined, highlightVerseKey: string | null | undefined) {
  if (!recitation) return word.verseKey === highlightVerseKey ? styles.highlighted : null;
  if (!recitation.rangeKeys.has(word.verseKey)) return { color: MUSHAF_COLORS.outOfRange };
  // Ayah markers and pause marks stay visible as the reciter's reference.
  if (word.type !== 0) return null;
  const key = `${word.verseKey}:${word.position}`;
  const feedback = recitation.wordFeedback.get(key);
  // Hidden words keep their glyphs (drawn in the paper colour), so the page never reflows as they appear.
  // A word the engine judged is always shown, so a skipped word is seen where it was missed.
  // full_hide keeps the whole range blank, as on the web.
  if (recitation.hideMode === "full_hide") return HIDDEN;
  if (!feedback && !recitation.revealedKeys.has(key)) {
    if (recitation.hideMode === "progressive_reveal") return HIDDEN;
    if (recitation.hideMode === "first_word" && word.position !== 1) return HIDDEN;
  }
  const current = recitation.currentWord?.verseKey === word.verseKey
    && recitation.currentWord.position === word.position;
  // Mistakes stay visible on the current word; only a plain or correct word turns maroon.
  if (current && (!feedback || feedback === "correct")) return { color: MUSHAF_COLORS.current };
  switch (feedback) {
    case "correct":
      return { color: MUSHAF_COLORS.correct };
    case "pending":
      return { color: MUSHAF_COLORS.pending };
    case "mistake":
      return styles.mistake;
    case "skipped":
      return styles.skipped;
    case "corrected":
      return styles.corrected;
    case "peeked":
      return styles.peeked;
    default:
      return null;
  }
}

/**
 * One Mushaf page drawn with its own QCF v2 font on the printed 15-line grid,
 * like the web reader. During recitation each word is coloured by the shared
 * mistake engine; colour and underline only, so the page geometry never moves.
 * The caller loads the page font (ensurePageFont) before rendering.
 * With `height` the paper fills that box edge to edge like a printed page: the juz and
 * the surah of the last ayah in the top margin, the page number in the bottom one, and
 * the 15 line boxes spread over the height between them.
 */
function MushafPage({
  data,
  width,
  height: fillHeight,
  recitation,
  highlightVerseKey,
  onPressVerse,
}: {
  data: MushafPageData;
  width: number;
  /** Full-bleed paper height; omitted, the paper keeps the printed aspect as a framed card. */
  height?: number;
  recitation?: MushafRecitationState;
  /** Reading mode: the ayah to highlight (playing audio or picked). */
  highlightVerseKey?: string | null;
  /** Reading mode: a word was tapped. */
  onPressVerse?: (verseKey: string) => void;
}) {
  const paperH = fillHeight ?? width / PAGE_ASPECT;
  // Printed margins carry the labels; the line grid takes the height between them.
  const marginH = fillHeight ? Math.min(40, Math.max(26, paperH * 0.04)) : 0;
  const height = paperH - marginH * 2;
  const family = pageFontFamily(data.p);
  const lines = useMemo(() => buildPageLines(data), [data]);
  const wordLines = lines.filter((line) => line.kind === "words");
  const rowCount = Math.max(1, ...lines.map((line) => line.line));
  const variant: PageVariant = data.p === 1 || data.p === 2 ? "opening" : "standard";
  const layout = useMemo(() => computePageLayout(lines, rowCount, height, variant), [lines, rowCount, height, variant]);
  const titleRowH = height / LINE_COUNT;
  const lastVerse = data.v[data.v.length - 1];
  const marginFont = Math.min(16, marginH * 0.48);
  // Widths are per page; a new page starts unmeasured.
  const [measuredPage, setMeasuredPage] = useState({ page: data.p, widths: new Map<number, number>() });
  const lineWidths = measuredPage.page === data.p ? measuredPage.widths : new Map<number, number>();

  const measured = wordLines.length > 0 && wordLines.every((line) => lineWidths.has(line.line));
  // The widest line fills the page width, as in the printed Mushaf (web: canvas measureText).
  const widest = Math.max(0, ...lineWidths.values());
  const fontSize = measured && widest > 0
    ? Math.min((width * 0.94 * MEASURE_SIZE) / widest, maxFontSizeFor(layout.variant, height))
    : 0;

  function onMeasure(line: number, event: NativeSyntheticEvent<TextLayoutEventData>) {
    const lineWidth = Math.max(0, ...event.nativeEvent.lines.map((textLine) => textLine.width));
    setMeasuredPage((previous) => {
      const widths = previous.page === data.p ? previous.widths : new Map<number, number>();
      if (previous.page === data.p && widths.get(line) === lineWidth) return previous;
      return { page: data.p, widths: new Map(widths).set(line, lineWidth) };
    });
  }

  return (
    <View style={[styles.paper, fillHeight ? null : styles.paperCard, { width, height: paperH }]}>
      {marginH > 0 && fontSize > 0 ? (
        <>
          <View style={[styles.marginRow, { top: 0, height: marginH }]} pointerEvents="none">
            <Text allowFontScaling={false} style={[styles.marginText, { fontSize: marginFont }]} numberOfLines={1}>{JUZ_LIST[data.j - 1]?.name ?? ""}</Text>
            <Text allowFontScaling={false} style={[styles.marginText, { fontSize: marginFont }]} numberOfLines={1}>
              {lastVerse ? vocalizedSurahTitle(lastVerse.c, SURAHS[lastVerse.c - 1]?.name ?? "") : ""}
            </Text>
          </View>
          <View style={[styles.marginRow, styles.marginFooter, { bottom: 0, height: marginH }]} pointerEvents="none">
            <Text allowFontScaling={false} style={[styles.marginText, { fontSize: marginFont }]}>{toArabicDigits(data.p)}</Text>
          </View>
        </>
      ) : null}
      {!measured ? (
        <View style={styles.measureBox} pointerEvents="none">
          {wordLines.map((line) => (
            <Text
              key={line.line}
              allowFontScaling={false}
              style={[styles.measureText, { fontFamily: family, fontSize: MEASURE_SIZE }]}
              onTextLayout={(event) => onMeasure(line.line, event)}
            >
              {line.words!.map((word) => word.code).join(" ")}
            </Text>
          ))}
        </View>
      ) : null}
      {fontSize > 0 ? lines.map((line) => {
        const top = marginH + (layout.tops.get(line.line) ?? 0);
        if (line.kind === "surah-header") {
          return (
            <View key={`h-${line.line}`} style={[styles.row, { top, height: titleRowH }]}>
              <SurahBanner name={line.surahName ?? ""} number={line.surahNumber} ayahs={line.ayahCount} width={width * 0.94} rowH={titleRowH} />
            </View>
          );
        }
        if (line.kind === "basmalah") {
          return (
            <View key={`b-${line.line}`} style={[styles.row, { top, height: layout.wordRowH }]}>
              <Text allowFontScaling={false} style={[styles.basmalah, { fontSize: Math.min(fontSize * 1.1, titleRowH * 0.62) }]} numberOfLines={1}>
                {BASMALAH_TEXT}
              </Text>
            </View>
          );
        }
        return (
          <View key={`l-${line.line}`} style={[styles.row, { top, height: layout.wordRowH }]}>
            <Text allowFontScaling={false} style={[styles.wordLine, { fontFamily: family, fontSize }]}>
              {line.words!.map((word, index) => (
                <Text
                  key={`${word.verseKey}:${word.position}`}
                  style={wordStyle(word, recitation, highlightVerseKey)}
                  onPress={onPressVerse ? () => onPressVerse(word.verseKey) : undefined}
                >
                  {index > 0 ? " " : ""}{word.code}
                </Text>
              ))}
            </Text>
          </View>
        );
      }) : null}
    </View>
  );
}

export default memo(MushafPage);

/**
 * The web SurahHeaderFrame: the ornament stretched over the title row, the surah name
 * in the cartouche and its order / ayah count in the two medallions (right / left).
 */
function SurahBanner({ name, number, ayahs, width, rowH }: { name: string; number?: number; ayahs?: number; width: number; rowH: number }) {
  const bandH = Math.min(rowH * 0.92, width * ORNAMENT_ASPECT);
  const medallionW = width * 0.12;
  const medallion = (value: number | undefined, caption: string, centerX: number) => value === undefined ? null : (
    <View style={[styles.medallion, { left: width * centerX - medallionW / 2, width: medallionW }]}>
      {/* Explicit line boxes keep the caption and the number stacked on the medallion's centre. */}
      <Text allowFontScaling={false} style={[styles.medallionCaption, { fontSize: bandH * 0.2, lineHeight: bandH * 0.3 }]} numberOfLines={1}>{caption}</Text>
      <Text allowFontScaling={false} style={[styles.medallionValue, { fontSize: bandH * 0.36, lineHeight: bandH * 0.44 }]} numberOfLines={1}>{toArabicDigits(value)}</Text>
    </View>
  );
  return (
    <View style={[styles.surahBand, { width, height: bandH }]}>
      <Image source={SURAH_ORNAMENT} resizeMode="stretch" style={{ position: "absolute", top: 0, left: 0, width, height: bandH }} accessible={false} />
      {/* The line box spans the band so Amiri diacritics are not clipped above the letters. */}
      <Text allowFontScaling={false} style={[styles.surahTitle, { fontSize: bandH * 0.42, lineHeight: bandH, width: width * 0.48 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {number !== undefined ? vocalizedSurahTitle(number, name) : `سُورَةُ ${name}`}
      </Text>
      {medallion(number, "ترتيبها", 812 / 932)}
      {medallion(ayahs, "آياتها", 120 / 932)}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { alignSelf: "center", backgroundColor: MUSHAF_COLORS.paper, overflow: "hidden" },
  paperCard: { borderColor: MUSHAF_COLORS.frame, borderWidth: 1, borderRadius: 6 },
  marginRow: { position: "absolute", left: 0, right: 0, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: "4%" },
  marginFooter: { justifyContent: "center" },
  marginText: { fontFamily: "Amiri_400Regular", color: MUSHAF_COLORS.ink, includeFontPadding: false },
  // Lines are laid out unconstrained so onTextLayout reports their natural width.
  measureBox: { position: "absolute", top: 0, left: 0, width: 100_000, opacity: 0 },
  measureText: { alignSelf: "flex-start", includeFontPadding: false },
  row: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  wordLine: { color: MUSHAF_COLORS.ink, includeFontPadding: false, textAlign: "center" },
  surahBand: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  surahTitle: { fontFamily: "Amiri_400Regular", color: MUSHAF_COLORS.ink, includeFontPadding: false, textAlign: "center", textAlignVertical: "center" },
  medallion: { position: "absolute", top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  medallionCaption: { fontFamily: "Amiri_400Regular", color: MUSHAF_COLORS.ink, includeFontPadding: false, textAlign: "center" },
  medallionValue: { fontFamily: "Amiri_700Bold", color: MUSHAF_COLORS.ink, includeFontPadding: false, textAlign: "center" },
  basmalah: { fontFamily: "Amiri_400Regular", color: MUSHAF_COLORS.ink, includeFontPadding: false },
  mistake: { color: MUSHAF_COLORS.mistake, textDecorationLine: "underline" },
  skipped: { color: MUSHAF_COLORS.skipped, textDecorationLine: "underline" },
  corrected: { color: MUSHAF_COLORS.corrected, textDecorationLine: "underline" },
  peeked: { color: MUSHAF_COLORS.peeked, textDecorationLine: "underline" },
  highlighted: { color: MUSHAF_COLORS.highlight, backgroundColor: MUSHAF_COLORS.highlightBackground },
});
