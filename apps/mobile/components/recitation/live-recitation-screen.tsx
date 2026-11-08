import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MushafPageData } from "@workspace/tabyan-domain/mushaf-page-data";
import { Icon } from "../ui";
import MushafPage, { MUSHAF_COLORS, PAGE_ASPECT, type MushafHideMode } from "../mushaf/mushaf-page";
import type { NativeRecitationMatch } from "../../lib/recitation/native-recitation";
import { formatDuration } from "../../lib/format";
import { palette } from "../../lib/theme";

const NO_FEEDBACK: NativeRecitationMatch["wordFeedback"] = new Map();
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicDigits = (value: number) => String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
const PAGE_LINES = 15;

export type LiveRecitationPhase = "preparing" | "listening" | "paused" | "ending";

/**
 * The live session is the Mushaf page itself, edge to edge and one page at a time: the
 * printed margins already name the juz, the surah and the page, so nothing sits above
 * it, and one slim paper-coloured bar below holds the clock and the session controls.
 * The page turns by itself once its last word is read.
 */
export function LiveRecitationScreen({
  phase,
  match,
  page,
  pageError,
  hideMode,
  rangeKeys,
  revealedKeys,
  plainOutside = false,
  errorText,
  onPause,
  onResume,
  onEnd,
  onCancel,
  onHint,
  pauseBusy,
  resumeBusy,
}: {
  phase: LiveRecitationPhase;
  match: NativeRecitationMatch | null;
  page: MushafPageData | undefined;
  pageError: boolean;
  hideMode: MushafHideMode;
  rangeKeys: ReadonlySet<string>;
  revealedKeys: ReadonlySet<string>;
  /** The whole page in its own ink, the ayahs before the start too (a session from a chosen ayah). */
  plainOutside?: boolean;
  errorText: string | null;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onCancel: () => void;
  onHint: () => void;
  pauseBusy: boolean;
  resumeBusy: boolean;
}) {
  // The reciter reads from memory without touching the phone; the session must not go dark.
  useKeepAwake("live-recitation");
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const listening = phase === "listening";
  const live = phase === "listening" || phase === "paused";
  const elapsed = useElapsedSeconds(listening);
  const counts = feedbackCounts(match);
  // Edge to edge on a phone; on a wide screen the paper stays no squatter than 1.3× the print.
  const paperWidth = Math.min(size.width, size.height * PAGE_ASPECT * 1.3);
  const reading = match?.reading ?? null;
  const wordFeedback = match?.wordFeedback ?? NO_FEEDBACK;
  const recitation = useMemo(
    () => ({ rangeKeys, currentWord: reading, wordFeedback, hideMode, revealedKeys, plainOutside }),
    [rangeKeys, reading, wordFeedback, hideMode, revealedKeys, plainOutside],
  );
  // A page is drawn unseen until it is measured; the page before stays up meanwhile, so a turn never flashes blank paper.
  const [shown, setShown] = useState<MushafPageData | undefined>(undefined);
  const incoming = page && page.p !== shown?.p ? page : undefined;
  const onReady = useCallback((ready: number) => {
    if (page?.p === ready) setShown(page);
  }, [page]);
  const turn = usePageTurn(shown?.p, size.width);
  // A mistake on the page is where the reader is stopped: nothing counts until it is read right.
  const stopped = counts.mistakes > 0;
  const status = phase === "preparing" ? "تجهيز الميكروفون…"
    : phase === "ending" ? "جارٍ إنهاء الجلسة…"
    : phase === "paused" ? "متوقف مؤقتاً"
    : "يستمع";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.pageHost} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
        {/* Keyed by page in one list: the measured incoming page becomes the shown one without being drawn again. */}
        {size.width > 0 ? [shown, incoming].filter((data): data is MushafPageData => !!data).map((data) => (
          <Animated.View key={data.p} style={data.p === shown?.p ? turn : styles.offstage} pointerEvents={data.p === shown?.p ? "auto" : "none"}>
            <MushafPage data={data} width={paperWidth} height={size.height} fillWidth recitation={recitation} onReady={data.p === shown?.p ? undefined : onReady} />
          </Animated.View>
        )) : null}
        {shown ? null : pageError ? (
          <View style={styles.pageMessage}>
            <Text style={styles.pageMessageText}>تعذر تحميل صفحة المصحف؛ التسميع مستمر.</Text>
            {reading ? <Text style={styles.currentWord}>{reading.displayText}</Text> : null}
          </View>
        ) : size.width > 0 ? (
          <PaperSkeleton width={paperWidth} height={size.height} />
        ) : null}
      </View>

      {errorText ? <Text style={styles.inlineError}>{errorText}</Text> : null}

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
        <View style={styles.statusBox}>
          <View style={styles.statusRow}>
            {live ? <View style={[styles.liveDot, { backgroundColor: listening ? palette.maroon : MUSHAF_COLORS.muted }]} /> : <ActivityIndicator size="small" color={palette.maroon} />}
            <Text style={styles.clock}>{live ? formatDuration(elapsed) : ""}</Text>
          </View>
          <Text style={[styles.statusText, stopped && live ? { color: MUSHAF_COLORS.mistake } : null]} numberOfLines={1}>
            {stopped && live ? "توقّف: صحّح الكلمة الحمراء" : status}
          </Text>
        </View>
        <BarButton label={listening || !live ? "إيقاف" : "استئناف"} icon={listening || !live ? "pause" : "play"} onPress={listening ? onPause : onResume} disabled={!live || (listening ? pauseBusy : resumeBusy)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إنهاء الجلسة"
          accessibilityState={{ disabled: !live }}
          disabled={!live}
          onPress={onEnd}
          style={({ pressed }) => [styles.stopButton, !live ? styles.disabled : null, pressed ? styles.pressed : null]}
        >
          <Icon name="stop" size={20} color={palette.cream} />
        </Pressable>
        {hideMode !== "visible_review"
          ? <BarButton label="تلميح" icon="eye" onPress={onHint} disabled={!listening} />
          : <View style={styles.barButton} />}
        <BarButton label="إلغاء" icon="x" onPress={onCancel} disabled={!live} />
      </View>
    </View>
  );
}

/**
 * The next page slides in from the left, as a printed Mushaf turns, over a quarter second.
 * Going back a page (a re-read before the turn) slides it in from the right.
 */
function usePageTurn(pageNumber: number | undefined, width: number) {
  const progress = useRef(new Animated.Value(1)).current;
  const previous = useRef(pageNumber);
  const [direction, setDirection] = useState(1);
  useEffect(() => {
    const from = previous.current;
    previous.current = pageNumber;
    if (from === undefined || pageNumber === undefined || from === pageNumber) return;
    setDirection(pageNumber > from ? 1 : -1);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [pageNumber, progress]);
  return {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
    transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-direction * width * 0.35, 0] }) }],
  };
}

/** The empty paper and its fifteen line rules, breathing, while a page and its font load. */
function PaperSkeleton({ width, height }: { width: number; height: number }) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const margin = Math.min(40, Math.max(26, height * 0.04));
  const rowH = (height - margin * 2) / PAGE_LINES;
  return (
    <View accessibilityLabel="جارٍ تحميل صفحة المصحف" style={[styles.skeleton, { width, height }]}>
      <Animated.View style={{ opacity: pulse }}>
        {Array.from({ length: PAGE_LINES }, (_, index) => (
          <View key={index} style={{ height: rowH, justifyContent: "center", paddingHorizontal: width * 0.05 }}>
            <View style={[styles.skeletonLine, index % 4 === 3 ? { marginLeft: width * 0.3 } : null]} />
          </View>
        ))}
      </Animated.View>
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
      hitSlop={6}
      style={({ pressed }) => [styles.barButton, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      <Icon name={icon} size={20} color={palette.maroon} />
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
  const counts = { mistakes: 0, corrected: 0 };
  for (const feedback of match?.wordFeedback.values() ?? []) {
    if (feedback === "mistake") counts.mistakes += 1;
    else if (feedback === "corrected") counts.corrected += 1;
  }
  return counts;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MUSHAF_COLORS.paper },
  pageHost: { flex: 1, alignItems: "center", justifyContent: "flex-start", overflow: "hidden" },
  pageMessage: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  pageMessageText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "center", color: palette.burgundy },
  currentWord: { fontFamily: "Amiri_700Bold", fontSize: 30, textAlign: "center", lineHeight: 45, color: MUSHAF_COLORS.ink },
  offstage: { position: "absolute", top: 0, opacity: 0 },
  skeleton: { backgroundColor: MUSHAF_COLORS.paper, paddingVertical: 32 },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: MUSHAF_COLORS.frame },
  inlineError: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 20, textAlign: "center", color: MUSHAF_COLORS.mistake, paddingHorizontal: 16, paddingVertical: 4 },
  bar: {
    backgroundColor: MUSHAF_COLORS.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MUSHAF_COLORS.frame,
    paddingTop: 6,
    paddingHorizontal: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBox: { width: 100, alignItems: "center", gap: 1 },
  statusRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, minHeight: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  clock: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 20, color: palette.maroon },
  statusText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 10, lineHeight: 15, color: MUSHAF_COLORS.muted, textAlign: "center" },
  barButton: { width: 56, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 1 },
  barButtonLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 10, lineHeight: 15, color: palette.maroon },
  stopButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.maroon, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
