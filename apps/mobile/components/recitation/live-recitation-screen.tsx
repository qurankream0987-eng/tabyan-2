import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import type { MushafPageData } from "@workspace/tabyan-domain/mushaf-page-data";
import { Icon, LoadingState } from "../ui";
import MushafPage, { MUSHAF_COLORS, PAGE_ASPECT, type MushafHideMode } from "../mushaf/mushaf-page";
import type { NativeRecitationMatch } from "../../lib/recitation/native-recitation";
import { formatDuration } from "../../lib/format";
import { palette } from "../../lib/theme";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (value: number) => String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);

/**
 * The live session fills the screen like a printed page: a thin strip above with the
 * reciter's place, the Mushaf page edge to edge, and a thin bar below with the clock,
 * the session controls and the running counts. Brand colours only.
 */
export function LiveRecitationScreen({
  phase,
  match,
  page,
  pageError,
  surahId,
  hideMode,
  rangeKeys,
  revealedKeys,
  errorText,
  onPause,
  onResume,
  onEnd,
  onCancel,
  onHint,
  pauseBusy,
  resumeBusy,
}: {
  phase: "listening" | "paused";
  match: NativeRecitationMatch | null;
  page: MushafPageData | undefined;
  pageError: boolean;
  surahId: number | null;
  hideMode: MushafHideMode;
  rangeKeys: ReadonlySet<string>;
  revealedKeys: ReadonlySet<string>;
  errorText: string | null;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onCancel: () => void;
  onHint: () => void;
  pauseBusy: boolean;
  resumeBusy: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const elapsed = useElapsedSeconds(phase === "listening");
  const counts = feedbackCounts(match);
  const surahName = SURAHS[(match?.reading?.surah ?? surahId ?? 1) - 1]?.name ?? "";
  const place = [
    `سورة ${surahName}`,
    page ? `صفحة ${toArabicDigits(page.p)}` : null,
    match?.reading ? `آية ${toArabicDigits(match.reading.ayah)}` : null,
  ].filter(Boolean).join(" · ");
  // Edge to edge on a phone; on a wide screen the paper stays no squatter than 1.3× the print.
  const paperWidth = Math.min(size.width, size.height * PAGE_ASPECT * 1.3);
  const listening = phase === "listening";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* The navigator already keeps the strip below the status bar. */}
      <View style={styles.topStrip}>
        <View style={[styles.liveBadge, { backgroundColor: listening ? `${palette.gold}33` : "rgba(255,255,255,0.14)" }]}>
          <View style={[styles.liveDot, { backgroundColor: listening ? palette.gold : palette.cream }]} />
          <Text style={styles.liveBadgeText}>{listening ? "يستمع الآن" : "متوقف مؤقتاً"}</Text>
        </View>
        <Text style={styles.placeText} numberOfLines={1}>{place}</Text>
      </View>

      <View style={styles.pageHost} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
        {page && size.width > 0 ? (
          <MushafPage
            data={page}
            width={paperWidth}
            height={size.height}
            fillWidth
            recitation={{
              rangeKeys,
              currentWord: match?.reading ?? null,
              wordFeedback: match?.wordFeedback ?? new Map(),
              hideMode,
              revealedKeys,
            }}
          />
        ) : pageError ? (
          <View style={styles.pageMessage}>
            <Text style={styles.pageMessageText}>تعذر تحميل صفحة المصحف؛ التسميع مستمر.</Text>
            {match?.reading ? <Text style={styles.currentWord}>{match.reading.displayText}</Text> : null}
          </View>
        ) : (
          <View style={styles.pageMessage}><LoadingState label="جارٍ تحميل صفحة المصحف…" /></View>
        )}
      </View>

      {errorText ? <Text style={styles.inlineError}>{errorText}</Text> : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.countsRow}>
          <Text style={styles.clock}>{formatDuration(elapsed)}</Text>
          <Text style={styles.countsText} numberOfLines={1}>
            الأخطاء {toArabicDigits(counts.mistakes)} · تخطٍّ {toArabicDigits(counts.skipped)} · صُحّحت {toArabicDigits(counts.corrected)}
          </Text>
        </View>
        <View style={styles.controlsRow}>
          <BarButton label="إلغاء" icon="x" onPress={onCancel} />
          {hideMode !== "visible_review" ? <BarButton label="تلميح" icon="eye" onPress={onHint} disabled={!listening} /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="إنهاء الجلسة" onPress={onEnd} style={({ pressed }) => [styles.stopButton, pressed ? styles.pressed : null]}>
            <Icon name="stop" size={26} color={palette.maroonDeep} />
          </Pressable>
          {listening
            ? <BarButton label="إيقاف" icon="pause" onPress={onPause} disabled={pauseBusy} />
            : <BarButton label="استئناف" icon="play" onPress={onResume} disabled={resumeBusy} />}
        </View>
        <Text style={styles.stopLabel}>إنهاء</Text>
      </View>
    </View>
  );
}

function BarButton({ label, icon, onPress, disabled = false }: { label: string; icon: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.barButton, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      <Icon name={icon} size={20} color={palette.cream} />
      <Text style={styles.barButtonLabel}>{label}</Text>
    </Pressable>
  );
}

/** Seconds counted while `running`; a pause holds the clock. */
function useElapsedSeconds(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);
  useEffect(() => {
    if (!running) {
      if (startedAt.current !== null) base.current += (Date.now() - startedAt.current) / 1000;
      startedAt.current = null;
      return;
    }
    startedAt.current = Date.now();
    const timer = setInterval(() => {
      if (startedAt.current !== null) setElapsed(Math.floor(base.current + (Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);
  return elapsed;
}

function feedbackCounts(match: NativeRecitationMatch | null) {
  const counts = { mistakes: 0, skipped: 0, corrected: 0 };
  for (const feedback of match?.wordFeedback.values() ?? []) {
    if (feedback === "mistake") counts.mistakes += 1;
    else if (feedback === "skipped") counts.skipped += 1;
    else if (feedback === "corrected") counts.corrected += 1;
  }
  return counts;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MUSHAF_COLORS.paper },
  topStrip: {
    backgroundColor: palette.burgundy,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  placeText: { flex: 1, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, lineHeight: 20, color: palette.cream, textAlign: "right" },
  liveBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveBadgeText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, lineHeight: 16, color: palette.cream },
  pageHost: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageMessage: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  pageMessageText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "center", color: palette.burgundy },
  currentWord: { fontFamily: "Amiri_700Bold", fontSize: 30, textAlign: "center", lineHeight: 45, color: MUSHAF_COLORS.ink },
  inlineError: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 20, textAlign: "center", color: MUSHAF_COLORS.mistake, paddingHorizontal: 16, paddingVertical: 6 },
  bottomBar: { backgroundColor: palette.burgundy, paddingTop: 8, paddingHorizontal: 14, gap: 6 },
  countsRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  clock: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 18, color: palette.goldLight },
  countsText: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, lineHeight: 18, color: palette.cream, textAlign: "left" },
  controlsRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-around", gap: 8 },
  barButton: { minWidth: 64, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 6 },
  barButtonLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, lineHeight: 16, color: palette.cream },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: palette.goldLight,
  },
  stopLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, lineHeight: 16, color: palette.goldLight, textAlign: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
