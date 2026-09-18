import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ensureQcfFont, qcfFontFamily } from "../lib/mushaf-native";
import type { MushafPageData } from "../lib/mushaf-types";
import { SURAHS } from "../lib/quran";

const LINE_COUNT = 15;
const PAGE_ASPECT = 622 / 917;
const PAPER = "#FDF9EE";
const INK = "#231710";
const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";

type Line =
  | { line: number; kind: "words"; words: Array<{ key: string; position: number; type: 0 | 1 | 2; code: string }> }
  | { line: number; kind: "surah-header"; name: string }
  | { line: number; kind: "basmalah" };
type NativeWord = Extract<Line, { kind: "words" }>["words"][number];

export interface NativeRecitationPresentation {
  rangeKeys?: Set<string>;
  hideMode?: "full_hide" | "first_word" | "progressive_reveal" | "visible_review";
  currentWord?: { verseKey: string; position: number } | null;
  revealedWords?: Map<string, number>;
}

function buildLines(data: MushafPageData): Line[] {
  const byLine = new Map<number, Array<{ key: string; position: number; type: 0 | 1 | 2; code: string }>>();
  const lines: Line[] = [];
  for (const verse of data.v) {
    for (const [position, line, type, code] of verse.w) {
      const words = byLine.get(line) ?? [];
      words.push({ key: verse.k, position, type, code });
      byLine.set(line, words);
    }
    if (verse.n === 1 && verse.w.length > 0) {
      const firstLine = verse.w[0][1];
      const isFatiha = verse.c === 1;
      const isTawbah = verse.c === 9;
      const headerLine = firstLine - (isFatiha || isTawbah ? 1 : 2);
      if (headerLine >= 1) {
        lines.push({ line: headerLine, kind: "surah-header", name: SURAHS[verse.c - 1] ?? "" });
        if (!isFatiha && !isTawbah) lines.push({ line: headerLine + 1, kind: "basmalah" });
      }
    }
  }
  for (const [line, words] of byLine) lines.push({ line, kind: "words", words });
  return lines.sort((a, b) => a.line - b.line);
}

function opacityFor(
  word: NativeWord,
  presentation: NativeRecitationPresentation | undefined,
  positions: Map<string, number[]>,
) {
  if (!presentation) return 1;
  if (!presentation.rangeKeys?.has(word.key)) return 0.25;
  if (presentation.hideMode === "visible_review") return 1;
  if (word.type !== 0) return 1;
  if (presentation.hideMode === "full_hide") return 0;
  const versePositions = positions.get(word.key) ?? [];
  if (presentation.hideMode === "first_word") return word.position === versePositions[0] ? 1 : 0;
  if (presentation.hideMode === "progressive_reveal") {
    return versePositions.indexOf(word.position) < (presentation.revealedWords?.get(word.key) ?? 0) ? 1 : 0;
  }
  return 1;
}

export function NativeMushafPage({
  data,
  width,
  presentation,
}: {
  data: MushafPageData;
  width: number;
  presentation?: NativeRecitationPresentation;
}) {
  const [fontReady, setFontReady] = useState(false);
  const [measuredMaxWidth, setMeasuredMaxWidth] = useState(0);
  const family = qcfFontFamily(data.p);
  const height = width / PAGE_ASPECT;
  const rowHeight = height / LINE_COUNT;
  const baseFontSize = Math.max(13, width * 0.063);
  const fontSize = measuredMaxWidth > 0
    ? baseFontSize * (width * 0.94 / measuredMaxWidth)
    : baseFontSize;
  const lines = useMemo(() => buildLines(data), [data]);
  const positions = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const verse of data.v) map.set(verse.k, verse.w.filter((word) => word[2] === 0).map((word) => word[0]));
    return map;
  }, [data]);

  useEffect(() => {
    let active = true;
    setFontReady(false);
    setMeasuredMaxWidth(0);
    void ensureQcfFont(data.p).then(() => { if (active) setFontReady(true); }).catch(() => { if (active) setFontReady(false); });
    return () => { active = false; };
  }, [data.p]);

  if (!fontReady) {
    return <View style={[styles.page, { width, height, backgroundColor: PAPER }]}><ActivityIndicator color="#7A1028" /></View>;
  }

  return (
    <View accessibilityLabel={`صفحة ${data.p}`} style={[styles.page, { width, height, backgroundColor: PAPER }]}>
      {lines.map((line) => {
        const top = (line.line - 1) * rowHeight;
        if (line.kind === "surah-header") {
          return <View key={`header-${line.line}`} style={[styles.line, { top, height: rowHeight }]}><View style={styles.headerFrame}><Text style={styles.headerText}>{line.name}</Text></View></View>;
        }
        if (line.kind === "basmalah") {
          return <View key={`basmalah-${line.line}`} style={[styles.line, { top, height: rowHeight }]}><Text style={[styles.basmala, { fontFamily: family, fontSize: rowHeight * 0.58 }]}>{BASMALAH}</Text></View>;
        }
        return (
          <View key={`line-${line.line}`} style={[styles.line, { top, height: rowHeight }]}>
            <Text
              numberOfLines={1}
              onTextLayout={({ nativeEvent }) => {
                const lineWidth = Math.max(...nativeEvent.lines.map((item) => item.width), 0);
                if (lineWidth > 0) {
                  setMeasuredMaxWidth((current) => Math.abs(current - lineWidth) > 0.5 ? Math.max(current, lineWidth) : current);
                }
              }}
              style={[styles.quranLine, { fontFamily: family, fontSize }]}
            >
              {line.words.map((word, index) => {
                const opacity = opacityFor(word, presentation, positions);
                const current = presentation?.currentWord?.verseKey === word.key && presentation.currentWord.position === word.position;
                return <Text key={`${word.key}-${word.position}-${index}`} style={{ opacity, color: current ? "#9A6A12" : INK }}>{index ? " " : ""}{word.code}</Text>;
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  line: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  quranLine: { color: INK, lineHeight: 1.05, textAlign: "center", writingDirection: "rtl", includeFontPadding: false },
  headerFrame: { minWidth: "42%", paddingHorizontal: 18, paddingVertical: 4, borderWidth: 1, borderColor: "#B49339", borderRadius: 18, alignItems: "center" },
  headerText: { fontFamily: "Amiri_700Bold", color: "#7A1028", fontSize: 17 },
  basmala: { color: INK, includeFontPadding: false },
});