import { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, type NativeSyntheticEvent, type TextLayoutEventData } from "react-native";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { vocalizedSurahTitle } from "@workspace/tabyan-domain/quran-surah-names";
import { buildPageLines, type LineWord, type MushafPageData } from "@workspace/tabyan-domain/mushaf-page-data";
import { BASMALA_FONT_PAGE, BASMALA_GLYPHS, computePageLayout, LINE_COUNT, maxFontSizeFor, QCF_WORD_GAP, type PageVariant } from "@workspace/tabyan-domain/mushaf-page-layout";
import { ensurePageFont, pageFontFamily } from "../../lib/mushaf/mushaf-assets";
import { JUZ_LIST } from "../../lib/mushaf/juz";
import { SURAH_NAME_FONT_FAMILY, SURAH_TITLE_STRETCH, surahBannerLayout, surahNameGlyph } from "@workspace/tabyan-domain/surah-banner";
import { useFonts } from "expo-font";
import { SurahBannerArt } from "./surah-banner-art";
import type { NativeWordFeedback } from "../../lib/recitation/native-recitation";

/** Width/height of a printed Madinah Mushaf page. */
export const PAGE_ASPECT = 622 / 917;
/** Glyph size used to measure the widest line before fitting it to the page. */
const MEASURE_SIZE = 100;
const BASMALAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
/** The web surah ornament (932×154): an empty cartouche between two medallions. */
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (value: number) => String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);

/** Printed black ink on the brand cream paper in both app themes, as on the web. */
export const MUSHAF_COLORS = {
  paper: "#F5EFE0",
  frame: "#E6D5B8",
  ink: "#000000",
  /** Surah ornament captions and the page margins (brand burgundy). */
  ornament: "#800020",
  outOfRange: "rgba(0, 0, 0, 0.25)",
  current: "#800020",
  correct: "#2F4A3A",
  pending: "#6B5B4B",
  mistake: "#B3261E",
  skipped: "rgba(179, 38, 30, 0.5)",
  corrected: "#2F6B4A",
  peeked: "#8A6A1C",
  /** Reading mode: the ayah being played or picked. */
  highlight: "#800020",
  highlightBackground: "rgba(212, 175, 55, 0.22)",
  /** Hidden recitation: the ayah markers that stay on the page, and the rule under each line. */
  marker: "#B8860B",
  rule: "rgba(212, 175, 55, 0.35)",
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
  /** Draw the range alone: lines outside it are left out and the paper closes up around the rest. */
  onlyRange?: boolean;
  /** The top of the line being read, measured from the top of the paper. */
  onCurrentLine?: (page: number, top: number) => void;
}

/** Same modes as the web reader; the server stores the chosen one with the session. */
export type MushafHideMode = "progressive_reveal" | "first_word" | "full_hide" | "visible_review";

// Paper-coloured ink: Android drops a fully transparent colour on nested text.
const HIDDEN = { color: MUSHAF_COLORS.paper } as const;

/**
 * During recitation each word keeps the page's heavier ink in its own colour, so coloured
 * feedback reads as clearly as the printed text (a black halo would darken it, and on a
 * hidden word would give it away).
 */
function recitedInk(style: ReturnType<typeof wordStyle>) {
  const color = (style && "color" in style ? style.color : undefined) ?? MUSHAF_COLORS.ink;
  return [style, { textShadowColor: color, textShadowRadius: 0.4, textShadowOffset: { width: 0, height: 0 } }];
}

function wordStyle(word: LineWord, recitation: MushafRecitationState | undefined, highlightVerseKey: string | null | undefined) {
  if (!recitation) return word.verseKey === highlightVerseKey ? styles.highlighted : null;
  if (!recitation.rangeKeys.has(word.verseKey)) return recitation.onlyRange ? HIDDEN : { color: MUSHAF_COLORS.outOfRange };
  // Ayah markers and pause marks stay visible as the reciter's reference; on a hidden page
  // the markers are gold, so the blank lines still read as a page of ayahs.
  if (word.type !== 0) return word.type === 1 && recitation.hideMode !== "visible_review" ? { color: MUSHAF_COLORS.marker } : null;
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
  fillWidth = false,
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
  /** The widest line fills the width on every page, the short opening lines too (recitation, where reading size matters most). */
  fillWidth?: boolean;
}) {
  const paperH = fillHeight ?? width / PAGE_ASPECT;
  // Printed margins carry the labels; the line grid takes the height between them.
  const marginH = fillHeight ? Math.min(40, Math.max(26, paperH * 0.04)) : 0;
  const height = paperH - marginH * 2;
  const family = pageFontFamily(data.p);
  const lines = useMemo(() => buildPageLines(data), [data]);
  // The basmala is drawn with page 1's font; until it loads, Amiri stands in.
  const hasBasmala = lines.some((line) => line.kind === "basmalah");
  const [basmalaReady, setBasmalaReady] = useState(false);
  useEffect(() => {
    if (!hasBasmala) return;
    let live = true;
    ensurePageFont(BASMALA_FONT_PAGE).then(() => { if (live) setBasmalaReady(true); }, () => {});
    return () => { live = false; };
  }, [hasBasmala]);
  const wordLines = lines.filter((line) => line.kind === "words");
  const rowCount = Math.max(1, ...lines.map((line) => line.line));
  const variant: PageVariant = data.p === 1 || data.p === 2 ? "opening" : "standard";
  const layout = useMemo(() => computePageLayout(lines, rowCount, height, variant), [lines, rowCount, height, variant]);
  const titleRowH = height / LINE_COUNT;
  const lastVerse = data.v[data.v.length - 1];
  const marginFont = Math.min(16, marginH * 0.48);
  // A range that ends mid-page names its own surah, not the next one on the paper.
  const titleSurah = recitation?.onlyRange
    ? Number([...recitation.rangeKeys][0]?.split(":")[0]) || lastVerse?.c
    : lastVerse?.c;
  // Widths are per page; a new page starts unmeasured.
  const [measuredPage, setMeasuredPage] = useState({ page: data.p, widths: new Map<number, number>() });
  const lineWidths = measuredPage.page === data.p ? measuredPage.widths : new Map<number, number>();

  const measured = wordLines.length > 0 && wordLines.every((line) => lineWidths.has(line.line));
  // The widest line fills the page width, as in the printed Mushaf (web: canvas measureText).
  const widest = Math.max(0, ...lineWidths.values());
  const fontSize = measured && widest > 0
    ? Math.min((width * 0.94 * MEASURE_SIZE) / widest, fillWidth ? Infinity : maxFontSizeFor(layout.variant, height))
    : 0;

  // fillWidth sets an opening page's short lines larger than its printed grid allows, so its rows
  // are spaced for that size, and the paper ends below them instead of keeping the printed height.
  const spread = fillWidth && layout.variant === "opening" && fontSize > 0
    ? Math.max(1, (fontSize * 1.6) / layout.wordRowH)
    : 1;
  // A full-screen recitation page centres the short opening pages between its margins.
  const blockH = (layout.blockBottom - layout.blockTop) * spread;
  const onlyRange = !!recitation?.onlyRange;
  const centredTop = fillWidth && fillHeight && !onlyRange && layout.variant === "opening" ? Math.max(layout.blockTop, (height - blockH) / 2) : layout.blockTop;
  const wordRowH = layout.wordRowH * spread;
  const rangeKeys = recitation?.rangeKeys;
  // A surah title or basmala belongs to the line after it, kept only if that line opens in the range.
  const shownLines = useMemo(() => {
    if (!onlyRange || !rangeKeys) return lines;
    return lines.filter((line, index) => {
      if (line.kind === "words") return line.words!.some((word) => rangeKeys.has(word.verseKey));
      const first = lines.slice(index).find((next) => next.kind === "words")?.words?.[0];
      return !!first && rangeKeys.has(first.verseKey);
    });
  }, [lines, onlyRange, rangeKeys]);
  const uncutTop = (line: number) => centredTop + ((layout.tops.get(line) ?? 0) - layout.blockTop) * spread;
  const firstShown = shownLines[0];
  const lastShown = shownLines[shownLines.length - 1];
  const cutTop = onlyRange && firstShown ? uncutTop(firstShown.line) : 0;
  const rowTop = (line: number) => uncutTop(line) - cutTop;
  const rangeBottom = lastShown ? rowTop(lastShown.line) + (lastShown.kind === "surah-header" ? titleRowH : wordRowH) : 0;
  // A faint rule under every word line while words are hidden: the reciter sees the page grid.
  const ruled = !!recitation && recitation.hideMode !== "visible_review";
  // A full-bleed paper keeps its height, so the page number stays in the bottom margin.
  const shownPaperH = onlyRange && fontSize > 0
    ? marginH * 2 + rangeBottom
    : spread > 1 && !fillHeight ? layout.blockTop * 2 + (layout.blockBottom - layout.blockTop) * spread : paperH;

  const reading = recitation?.currentWord;
  const readingLine = reading
    ? shownLines.find((line) => line.words?.some((word) => word.verseKey === reading.verseKey && word.position === reading.position))?.line
    : undefined;
  const readingTop = fontSize > 0 && readingLine !== undefined ? marginH + rowTop(readingLine) : null;
  const onCurrentLine = recitation?.onCurrentLine;
  useEffect(() => {
    if (readingTop !== null) onCurrentLine?.(data.p, readingTop);
  }, [data.p, onCurrentLine, readingTop]);

  function onMeasure(line: number, event: NativeSyntheticEvent<TextLayoutEventData>) {
    const lineWidth = Math.max(0, ...event.nativeEvent.lines.map((textLine) => textLine.width));
    setMeasuredPage((previous) => {
      const widths = previous.page === data.p ? previous.widths : new Map<number, number>();
      if (previous.page === data.p && widths.get(line) === lineWidth) return previous;
      return { page: data.p, widths: new Map(widths).set(line, lineWidth) };
    });
  }

  return (
    <View style={[styles.paper, fillHeight ? null : styles.paperCard, { width, height: shownPaperH }]}>
      {marginH > 0 && fontSize > 0 ? (
        <>
          <View style={[styles.marginRow, { top: 0, height: marginH }]} pointerEvents="none">
            <Text allowFontScaling={false} style={[styles.marginText, { fontSize: marginFont }]} numberOfLines={1}>{JUZ_LIST[data.j - 1]?.name ?? ""}</Text>
            <Text allowFontScaling={false} style={[styles.marginText, { fontSize: marginFont }]} numberOfLines={1}>
              {titleSurah ? vocalizedSurahTitle(titleSurah, SURAHS[titleSurah - 1]?.name ?? "") : ""}
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
              {line.words!.map((word, index) => (
                <Text key={index}>{index > 0 ? <Text style={{ fontSize: MEASURE_SIZE * QCF_WORD_GAP }}> </Text> : null}{word.code}</Text>
              ))}
            </Text>
          ))}
        </View>
      ) : null}
      {fontSize > 0 ? shownLines.map((line) => {
        const top = marginH + rowTop(line.line);
        if (line.kind === "surah-header") {
          return (
            <View key={`h-${line.line}`} style={[styles.row, { top, height: titleRowH }]}>
              <SurahBanner name={line.surahName ?? ""} number={line.surahNumber} width={width * 0.94} rowH={titleRowH} />
            </View>
          );
        }
        if (line.kind === "basmalah") {
          return (
            <View key={`b-${line.line}`} style={[styles.row, { top, height: wordRowH }]}>
              {basmalaReady ? (
                // The printed basmala: 1:1 in the page-1 QCF font, at the size of the page's lines.
                <Text allowFontScaling={false} style={[styles.wordLine, styles.basmalaLine, { fontFamily: pageFontFamily(BASMALA_FONT_PAGE), fontSize }, styles.boldInk]}>
                  {BASMALA_GLYPHS.map((glyph, index) => [
                    index > 0 ? <Text key={`g${index}`} style={{ fontSize: fontSize * QCF_WORD_GAP }}> </Text> : null,
                    <Text key={glyph}>{glyph}</Text>,
                  ])}
                </Text>
              ) : (
                <Text allowFontScaling={false} style={[styles.basmalah, { fontSize: Math.min(fontSize * 1.1, titleRowH * 0.62) }]} numberOfLines={1}>
                  {BASMALAH_TEXT}
                </Text>
              )}
            </View>
          );
        }
        return (
          <View key={`l-${line.line}`} style={[styles.row, { top, height: wordRowH }]}>
            <Text allowFontScaling={false} style={[styles.wordLine, { fontFamily: family, fontSize }, recitation ? null : styles.boldInk]}>
              {line.words!.map((word, index) => [
                // A narrower gap than the font's space, as on the printed page (QCF_WORD_GAP).
                index > 0 ? <Text key={`g${index}`} style={{ fontSize: fontSize * QCF_WORD_GAP }}> </Text> : null,
                <Text
                  key={`${word.verseKey}:${word.position}`}
                  style={recitation ? recitedInk(wordStyle(word, recitation, highlightVerseKey)) : wordStyle(word, recitation, highlightVerseKey)}
                  onPress={onPressVerse ? () => onPressVerse(word.verseKey) : undefined}
                >
                  {word.code}
                </Text>,
              ])}
            </Text>
            {/* Drawn over the words: hidden glyphs are paper-coloured and would cut gaps in a rule beneath them. */}
            {ruled ? <View pointerEvents="none" style={[styles.rule, { bottom: wordRowH * 0.14 }]} /> : null}
          </View>
        );
      }) : null}
    </View>
  );
}

export default memo(MushafPage);

/**
 * The web SurahHeaderFrame: the ornament stretched over the title row, the surah name
 * in the cartouche; the two medallions stay plain ornaments.
 */
function SurahBanner({ name, number, width, rowH }: { name: string; number?: number; width: number; rowH: number }) {
  const bandH = Math.min(rowH * 0.96, width * 0.165);
  const layout = surahBannerLayout(width / bandH);
  // The printed mushaf's header calligraphy: one glyph per surah. Amiri stands in until it loads.
  const [fontReady] = useFonts({ [SURAH_NAME_FONT_FAMILY]: require("../../assets/fonts/sura-names.ttf") });
  const calligraphy = fontReady && number !== undefined;
  // The glyphs draw about 0.75 em tall and up to 2.5 em wide (surah 83), then are stretched; fit both ways inside the cartouche.
  const box = { left: width * layout.title.left, width: width * layout.title.width, top: bandH * layout.title.top, height: bandH * layout.title.height };
  const glyphSize = Math.min((box.height * 0.92) / 0.75, (box.width * 0.96) / (2.5 * SURAH_TITLE_STRETCH));
  return (
    <View style={[styles.surahBand, { width, height: bandH }]}>
      <SurahBannerArt width={width} height={bandH} />
      <View style={[styles.titleBox, box]}>
        {calligraphy ? (
          <Text allowFontScaling={false} accessibilityLabel={`سورة ${name}`} style={[styles.surahGlyph, { fontSize: glyphSize, lineHeight: box.height, transform: [{ scaleX: SURAH_TITLE_STRETCH }] }]} numberOfLines={1}>
            {surahNameGlyph(number)}
          </Text>
        ) : (
          // The line box spans the band so Amiri diacritics are not clipped above the letters.
          <Text allowFontScaling={false} style={[styles.surahTitle, { fontSize: bandH * 0.42, lineHeight: bandH }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {number !== undefined ? vocalizedSurahTitle(number, name) : `سُورَةُ ${name}`}
          </Text>
        )}
      </View>
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
  rule: { position: "absolute", left: "4%", right: "4%", height: StyleSheet.hairlineWidth, backgroundColor: MUSHAF_COLORS.rule },
  // Spanning the row keeps the overhang of a line's first and last glyphs inside the text box (Android clips it).
  wordLine: { color: MUSHAF_COLORS.ink, includeFontPadding: false, textAlign: "center", alignSelf: "stretch", paddingHorizontal: 8 },
  // The page-1 basmala glyphs overhang their advance; padding keeps the first stroke in view.
  basmalaLine: { alignSelf: "stretch", paddingHorizontal: 12 },
  surahBand: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  titleBox: { position: "absolute", alignItems: "center", justifyContent: "center" },
  surahGlyph: { fontFamily: SURAH_NAME_FONT_FAMILY, color: MUSHAF_COLORS.ink, includeFontPadding: false, textAlign: "center", alignSelf: "stretch" },
  surahTitle: { fontFamily: "Amiri_400Regular", color: MUSHAF_COLORS.ink, includeFontPadding: false, textAlign: "center", textAlignVertical: "center" },
  basmalah: { fontFamily: "Amiri_400Regular", color: MUSHAF_COLORS.ink, includeFontPadding: false },
  mistake: { color: MUSHAF_COLORS.mistake, textDecorationLine: "underline" },
  skipped: { color: MUSHAF_COLORS.skipped, textDecorationLine: "underline" },
  corrected: { color: MUSHAF_COLORS.corrected, textDecorationLine: "underline" },
  peeked: { color: MUSHAF_COLORS.peeked, textDecorationLine: "underline" },
  // No shadow on a highlighted word: Android paints the shadow behind its background as a dark box.
  highlighted: { color: MUSHAF_COLORS.highlight, backgroundColor: MUSHAF_COLORS.highlightBackground, textShadowColor: "transparent", textShadowRadius: 0 },
  // A same-colour halo thickens the thin QCF strokes toward the printed page; reading mode only,
  // since recitation draws hidden words in the paper colour and a black halo would reveal them.
  boldInk: { textShadowColor: MUSHAF_COLORS.ink, textShadowRadius: 0.4, textShadowOffset: { width: 0, height: 0 } },
});
