import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@workspace/tabyan-trpc/types";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { Badge, Button, Card, Icon, LoadingState, ProgressBar } from "../../components/ui";
import { SurahField, SurahPicker } from "../../components/ui/surah-picker";
import { useAuth } from "../../lib/auth";
import { formatDate, formatDuration } from "../../lib/format";
import { useTheme } from "../../lib/theme";
import {
  NativeQuranLiveMatcher,
  NativeRecitationController,
  type NativeRecitationMatch,
  type NativeRecitationState,
  type NativeRecitationSummary,
} from "../../lib/recitation/native-recitation";
import { ensurePageFont, loadMushafPage, loadRangeWords } from "../../lib/mushaf/mushaf-assets";
import MushafPage, { MUSHAF_COLORS, type MushafHideMode } from "../../components/mushaf/mushaf-page";
import { trpc } from "../../lib/trpc";
import { StudentScreen } from "../../components/student/student-screen";

type AssignmentRow = inferRouterOutputs<AppRouter>["recitationAssignments"]["mine"][number];
type SubmitState = "idle" | "sending" | "sent" | "failed";

const ASSIGNMENT_STATUS: Record<string, string> = {
  assigned: "لم يُسلَّم",
  submitted: "سُلِّم — بانتظار المعلم",
  reviewed: "قيّمه المعلم",
  cancelled: "أُلغي",
};
const ASSIGNMENT_TONE: Record<string, "gold" | "muted" | "success"> = { assigned: "gold", submitted: "muted", reviewed: "success", cancelled: "muted" };

function assignmentRange(assignment: { surahId: number; startAyah: number; endAyah: number }) {
  const name = SURAHS[assignment.surahId - 1]?.name ?? "";
  return assignment.startAyah === assignment.endAyah
    ? `سورة ${name} — الآية ${assignment.startAyah}`
    : `سورة ${name} — الآيات ${assignment.startAyah}–${assignment.endAyah}`;
}

type ScreenPhase = "setup" | "preparing" | "listening" | "paused" | "ending" | "user-ended" | "cancelled" | "error";

function positiveInteger(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// Names and descriptions as on the web (HIDE_MODE_LABELS / HIDE_MODE_DESC).
const HIDE_MODES: { value: MushafHideMode; label: string; hint: string }[] = [
  { value: "full_hide", label: "إخفاء كامل", hint: "يظهر سطر فارغ — سمّع من الذاكرة تماماً" },
  { value: "first_word", label: "الكلمة الأولى فقط", hint: "تظهر الكلمة الأولى من كل آية كمؤشر" },
  { value: "progressive_reveal", label: "كشف تدريجي", hint: "اكشف كلمة واحدة في كل مرة بالضغط" },
  { value: "visible_review", label: "مراجعة بالنص", hint: "يظهر النص كاملاً — للمراجعة بالقراءة" },
];

function ayahProgressLabel(match: NativeRecitationMatch, startAyah: number | null, endAyah: number | null) {
  if (!match.reading || startAyah === null || endAyah === null) return `0 من ${match.totalWords} كلمة`;
  return `الآية ${match.reading.ayah - startAyah + 1} من ${endAyah - startAyah + 1} · الكلمة ${match.readingWords} من ${match.totalWords}`;
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

function displayPosition(match: NativeRecitationMatch | null) {
  if (!match?.reading) return "لم يُثبت موضع بعد";
  return `السورة ${match.reading.surah} · الآية ${match.reading.ayah} · الكلمة ${match.reading.position}`;
}

export default function NativeRecitationScreen() {
  const { token, role } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  // Opened from the Mushaf reader: start at the chosen ayah, ten ayahs at most.
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const initialSurah = SURAHS[Number(params.surah) - 1] ?? SURAHS[0];
  const initialAyah = Math.min(Math.max(1, Number(params.ayah) || 1), initialSurah.ayahs);
  const [surahInput, setSurahInput] = useState(String(initialSurah.n));
  const [startAyahInput, setStartAyahInput] = useState(String(initialAyah));
  const [endAyahInput, setEndAyahInput] = useState(String(Math.min(initialAyah + 9, initialSurah.ayahs)));
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  // A new surah starts at its first verse with up to ten verses shown, like the teacher's form.
  const pickSurah = (n: number) => {
    const next = SURAHS[n - 1] ?? SURAHS[0];
    setSurahInput(String(next.n));
    setStartAyahInput("1");
    setEndAyahInput(String(Math.min(10, next.ayahs)));
    setSurahPickerOpen(false);
  };
  const [phase, setPhase] = useState<ScreenPhase>("setup");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [match, setMatch] = useState<NativeRecitationMatch | null>(null);
  const [endedDuration, setEndedDuration] = useState<number | null>(null);
  const [summary, setSummary] = useState<NativeRecitationSummary | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [hideMode, setHideMode] = useState<MushafHideMode>("progressive_reveal");
  // Educational session: the teacher's assignment fixes the range and display mode.
  const [assignment, setAssignment] = useState<AssignmentRow["assignment"] | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [, setSessionStateVersion] = useState(0);
  const controllerRef = useRef<NativeRecitationController | null>(null);
  const matcherRef = useRef<NativeQuranLiveMatcher | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const finishingRef = useRef(false);
  const controllerStartingRef = useRef(false);
  const startFlightRef = useRef(false);
  const cancelInFlightRef = useRef(new Map<string, Promise<void>>());
  const mountedRef = useRef(false);
  const hintLevelRef = useRef<{ level: 1 | 2 | 3; at: number } | null>(null);
  const cancelMutation = trpc.recitation.cancel.useMutation();
  const cancelMutationRef = useRef(cancelMutation);
  cancelMutationRef.current = cancelMutation;

  function releaseSessionId(sessionId: string) {
    if (sessionIdRef.current !== sessionId) return;
    sessionIdRef.current = null;
    if (mountedRef.current) setSessionStateVersion((version) => version + 1);
  }

  function cancelServerSession(sessionId: string) {
    const existing = cancelInFlightRef.current.get(sessionId);
    if (existing) return existing;
    const cancellation = cancelMutationRef.current.mutateAsync({ sessionId }).then(() => {
      releaseSessionId(sessionId);
    });
    cancelInFlightRef.current.set(sessionId, cancellation);
    void cancellation.finally(() => {
      if (cancelInFlightRef.current.get(sessionId) === cancellation) {
        cancelInFlightRef.current.delete(sessionId);
      }
    }).catch(() => undefined);
    return cancellation;
  }

  const status = trpc.recitation.status.useQuery(undefined, { retry: false, staleTime: 15_000 });
  const startMutation = trpc.recitation.start.useMutation();
  const submitMutation = trpc.recitationAssignments.submit.useMutation();
  const pendingSubmitRef = useRef<Parameters<typeof submitMutation.mutateAsync>[0] | null>(null);
  const assignments = trpc.recitationAssignments.mine.useQuery(undefined, { enabled: !!token && role === "student" });
  // The teacher may assign or review while this screen is in the background.
  const refetchAssignments = assignments.refetch;
  useFocusEffect(useCallback(() => { if (token && role === "student") void refetchAssignments(); }, [token, role, refetchAssignments]));
  const pauseMutation = trpc.recitation.pause.useMutation();
  const resumeMutation = trpc.recitation.resume.useMutation();
  const endMutation = trpc.recitation.end.useMutation();

  const surahId = positiveInteger(surahInput);
  const startAyah = positiveInteger(startAyahInput);
  const endAyah = positiveInteger(endAyahInput);
  const validRange = surahId !== null
    && surahId <= 114
    && startAyah !== null
    && endAyah !== null
    && endAyah >= startAyah;

  // The same word data as the web Mushaf, so feedback keys match the page glyphs.
  const wordsQuery = useQuery({
    queryKey: ["mushaf-range-words", surahId, startAyah, endAyah],
    queryFn: () => loadRangeWords(surahId!, startAyah!, endAyah!),
    enabled: validRange && status.data?.enabled === true && !!token && role === "student",
    retry: false,
    staleTime: Infinity,
  });
  const canonicalWords = useMemo(() => wordsQuery.data ?? [], [wordsQuery.data]);
  const rangeHasCoverage = validRange
    && canonicalWords.some((word) => word.ayah === startAyah)
    && canonicalWords.some((word) => word.ayah === endAyah);
  const rangeKeys = useMemo(() => new Set(canonicalWords.map((word) => word.verseKey)), [canonicalWords]);
  const lastRangePage = canonicalWords[canonicalWords.length - 1]?.page;

  // The page shows the word the reciter reads next, so it turns as soon as the last
  // word of a page is read; before the first match it shows the start verse.
  const currentPage = useMemo(
    () => (canonicalWords[match?.readingWords ?? 0] ?? canonicalWords[canonicalWords.length - 1])?.page,
    [canonicalWords, match?.readingWords],
  );
  const pageQuery = useQuery({
    queryKey: ["mushaf-page", currentPage],
    queryFn: async () => {
      const [data] = await Promise.all([loadMushafPage(currentPage!), ensurePageFont(currentPage!)]);
      return data;
    },
    enabled: currentPage !== undefined && rangeHasCoverage,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
  const [pageWidth, setPageWidth] = useState(0);
  // Words up to the reading pointer are revealed; the matcher's words start at the range start.
  const revealedKeys = useMemo(
    () => new Set(canonicalWords.slice(0, match?.readingWords ?? 0).map((word) => `${word.verseKey}:${word.position}`)),
    [canonicalWords, match?.readingWords],
  );

  useEffect(() => {
    // Load the next page of the range ahead so turning the page does not flash.
    if (currentPage === undefined || lastRangePage === undefined || currentPage >= lastRangePage) return;
    void Promise.all([loadMushafPage(currentPage + 1), ensurePageFont(currentPage + 1)]).catch(() => undefined);
  }, [currentPage, lastRangePage]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      const controller = controllerRef.current;
      controllerRef.current = null;
      if (controller) void controller.dispose();
      if (sessionId) {
        void cancelServerSession(sessionId).catch(() => undefined);
      }
    };
  }, []);

  function handleControllerState(state: NativeRecitationState) {
    if (!mountedRef.current) return;
    if (state === "connecting") setPhase("preparing");
    if (state === "recording") setPhase("listening");
    if (state === "paused") setPhase("paused");
    if (state === "error") {
      // endSession reports its own outcome and must not race an automatic cancel.
      if (finishingRef.current) return;
      setSummary(matcherRef.current?.finish() ?? null);
      setPhase("error");
      setErrorText("انقطع الاتصال أو تعذر استخدام الميكروفون. لم تُسجّل نتيجة أو إكمال.");
      if (controllerStartingRef.current) return;
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        void cancelServerSession(sessionId).catch(() => undefined);
      }
    }
  }

  async function beginSession() {
    if (startFlightRef.current) return;
    startFlightRef.current = true;
    try {
      await beginSessionOnce();
    } finally {
      startFlightRef.current = false;
    }
  }

  async function beginSessionOnce() {
    if (
      !token
      || role !== "student"
      || !validRange
      || !rangeHasCoverage
      || !status.data?.liveTrackingEnabled
      || sessionIdRef.current !== null
      || Platform.OS === "web"
    ) return;

    setErrorText(null);
    setMatch(null);
    setEndedDuration(null);
    setSummary(null);
    matcherRef.current = null;
    setPhase("preparing");
    let sessionId: string | null = null;
    try {
      const session = await startMutation.mutateAsync(assignment
        ? {
            mode: "educational",
            assignmentId: assignment.id,
            expectedRange: {
              start: { surahId: assignment.surahId, ayah: assignment.startAyah },
              end: { surahId: assignment.surahId, ayah: assignment.endAyah },
            },
            hideMode,
          }
        : {
            mode: "general",
            startContext: { startVerseKey: `${surahId}:${startAyah}` },
            hideMode,
          });
      sessionId = session.sessionId;
      // The server applies the display mode the teacher chose.
      if (session.hideMode) setHideMode(session.hideMode);
      if (!mountedRef.current) {
        await cancelMutationRef.current.mutateAsync({ sessionId }).catch(() => undefined);
        return;
      }
      sessionIdRef.current = sessionId;
      const matcher = new NativeQuranLiveMatcher(canonicalWords);
      if (!matcher.setStartPosition({ verseKey: `${surahId}:${startAyah}` })) {
        throw new Error("Selected start position is not present in the loaded Quran text");
      }
      matcherRef.current = matcher;
      const controller = new NativeRecitationController(matcher, {
        onState: (state) => handleControllerState(state),
        onMatch: (nextMatch) => {
          // Mistake/correction cues follow engine-confirmed states only.
          for (const change of nextMatch.changedWordStates) {
            controllerRef.current?.observeWordState(change.key, change.state, true);
          }
          if (mountedRef.current) setMatch(nextMatch);
        },
      });
      controllerRef.current = controller;
      controller.setSoundsEnabled(soundsEnabled);
      controllerStartingRef.current = true;
      try {
        await controller.start(token, sessionId);
      } finally {
        controllerStartingRef.current = false;
      }
      if (mountedRef.current) setPhase("listening");
    } catch {
      if (sessionId) {
        try {
          await cancelServerSession(sessionId);
        } catch {
          // The UI still reports no result; the server session may need later cleanup if offline.
        }
      }
      if (controllerRef.current) await controllerRef.current.dispose();
      controllerRef.current = null;
      if (mountedRef.current) {
        setPhase("error");
        setErrorText("تعذر بدء التسميع. تحقّق من الإذن والاتصال ثم أعد المحاولة.");
      }
    }
  }

  /** Each tap within 4 s reveals more: the next word, then three words, then the rest of the ayah. */
  function showHint() {
    const matcher = matcherRef.current;
    if (!matcher) return;
    const now = Date.now();
    const previous = hintLevelRef.current;
    const level = (previous && now - previous.at < 4_000 ? Math.min(3, previous.level + 1) : 1) as 1 | 2 | 3;
    hintLevelRef.current = { level, at: now };
    const next = matcher.peek(level);
    if (next) setMatch(next);
  }

  async function pauseSession() {
    const sessionId = sessionIdRef.current;
    const controller = controllerRef.current;
    if (!sessionId || !controller) return;
    if (!controller.pause()) {
      setPhase("error");
      setErrorText("تعذر إيقاف التسجيل مؤقتاً؛ أُوقفت الجلسة دون احتساب إكمال.");
      void cancelServerSession(sessionId).catch(() => undefined);
      return;
    }
    try {
      await pauseMutation.mutateAsync({ sessionId });
      if (mountedRef.current) setPhase("paused");
    } catch {
      if (mountedRef.current) {
        setPhase("paused");
        setErrorText("تعذر حفظ الإيقاف المؤقت. الميكروفون متوقف؛ أنهِ الجلسة أو أعد المحاولة.");
      }
    }
  }

  async function resumeSession() {
    const sessionId = sessionIdRef.current;
    const controller = controllerRef.current;
    if (!sessionId || !controller) return;
    try {
      await resumeMutation.mutateAsync({ sessionId });
      if (!controller.resume()) {
        if (mountedRef.current) {
          setPhase("error");
          setErrorText("تعذر استئناف الاتصال؛ أُوقفت الجلسة دون احتساب إكمال.");
        }
        void cancelServerSession(sessionId).catch(() => undefined);
        return;
      }
      if (mountedRef.current) {
        setPhase("listening");
        setErrorText(null);
      }
    } catch {
      if (mountedRef.current) setErrorText("تعذر استئناف الجلسة. يمكنك إنهاؤها دون احتساب إكمال.");
    }
  }

  async function endSession() {
    const sessionId = sessionIdRef.current;
    if (!sessionId || finishingRef.current) return;
    finishingRef.current = true;
    setPhase("ending");
    const controller = controllerRef.current;
    try {
      // A lost connection (for example after a long silence) only loses the
      // unprocessed audio tail; the server session can still be ended.
      const drained = !!controller && await controller.stop();
      if (!drained) await controller?.dispose();
      const result = await endMutation.mutateAsync({ sessionId });
      releaseSessionId(sessionId);
      if (drained && result.completionState === "user_ended" && mountedRef.current) await controller?.completeSuccessfully();
      if (mountedRef.current) {
        setEndedDuration(result.durationSeconds);
        const finished = matcherRef.current?.finish() ?? null;
        setSummary(finished);
        setPhase(result.completionState === "user_ended" ? "user-ended" : "error");
        if (assignment && finished && result.completionState === "user_ended") {
          pendingSubmitRef.current = {
            sessionId,
            result: { ...finished, flaggedWords: (matcherRef.current?.flaggedWords() ?? []).slice(0, 500) },
          };
          void submitAssignment();
        }
        setErrorText(result.completionState !== "user_ended"
          ? "لم يؤكد الخادم إنهاء الجلسة."
          : drained ? null : "انقطع اتصال التسميع قبل معالجة آخر ما قُرئ، وحُفظت نهاية الجلسة.");
      }
    } catch {
      await controller?.dispose();
      try {
        await cancelServerSession(sessionId);
      } catch {
        // No client-side result is produced if the server cannot confirm the end.
      }
      finishingRef.current = false;
      if (mountedRef.current) {
        setPhase("error");
        setErrorText("أُوقف الميكروفون، لكن تعذر حفظ نهاية الجلسة. لم تُسجّل نتيجة أو إكمال.");
      }
    }
  }

  /** Sends the finished session to the teacher; retried from the end card if it fails. */
  async function submitAssignment() {
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    setSubmitState("sending");
    try {
      await submitMutation.mutateAsync(pending);
      pendingSubmitRef.current = null;
      if (mountedRef.current) setSubmitState("sent");
      void assignments.refetch();
    } catch {
      if (mountedRef.current) setSubmitState("failed");
    }
  }

  function chooseAssignment(row: AssignmentRow["assignment"] | null) {
    setAssignment(row);
    setErrorText(null);
    if (!row) return;
    setSurahInput(String(row.surahId));
    setStartAyahInput(String(row.startAyah));
    setEndAyahInput(String(row.endAyah));
    setHideMode(row.hideMode);
  }

  async function cancelSession() {
    const sessionId = sessionIdRef.current;
    if (!sessionId || finishingRef.current) return;
    finishingRef.current = true;
    setPhase("ending");
    await controllerRef.current?.dispose();
    controllerRef.current = null;
    try {
      await cancelServerSession(sessionId);
      if (mountedRef.current) setPhase("cancelled");
    } catch {
      finishingRef.current = false;
      if (mountedRef.current) {
        setPhase("error");
        setErrorText("أُوقف الميكروفون، لكن تعذر تأكيد إلغاء الجلسة من الخادم.");
      }
    }
  }

  async function retrySessionCleanup() {
    const sessionId = sessionIdRef.current;
    if (!sessionId || finishingRef.current) return;
    finishingRef.current = true;
    try {
      await cancelServerSession(sessionId);
      if (mountedRef.current) {
        setPhase("cancelled");
        setErrorText(null);
      }
    } catch {
      finishingRef.current = false;
      if (mountedRef.current) setErrorText("تعذر تأكيد إلغاء الجلسة. تحقق من الاتصال وحاول مرة أخرى.");
    }
  }

  const featureEnabled = status.data?.liveTrackingEnabled === true;
  const canStart = Platform.OS !== "web"
    && role === "student"
    && !!token
    && featureEnabled
    && rangeHasCoverage
    && canonicalWords.length > 0
    && phase === "setup";
  // Progress is where the reciter is in the range; mistakes are counted separately.
  const progressPercent = match && match.totalWords > 0
    ? (match.readingWords / match.totalWords) * 100
    : 0;
  const liveCounts = feedbackCounts(match);

  return (
    <StudentScreen title="واجبات التسميع" subtitle="سمّع ما حدده معلمك، وهو من يقيّم تسميعك">
      {assignment ? (
        <Card style={styles.noticeCard}>
          <Badge label="واجب التسميع" tone="success" style={styles.badgeEnd} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{assignmentRange(assignment)}</Text>
          {assignment.note ? <Text style={[styles.bodyText, { color: colors.text }]}>{assignment.note}</Text> : null}
          <Text style={[styles.smallText, { color: colors.muted }]}>
            عند إنهاء التسميع يُرسل ملخصه وتسجيل صوتك لمعلمك ليستمع له ويقيّمه بنفسه. يمكنك إعادة التسميع والتسليم قبل أن يقيّمه.
          </Text>
          {phase === "setup" ? <Button label="تسميع عام بدلاً من الواجب" variant="quiet" onPress={() => chooseAssignment(null)} /> : null}
        </Card>
      ) : (
        <Card style={styles.noticeCard}>
          <Badge label="تسميع" style={styles.badgeEnd} />
          <Text style={[styles.bodyText, { color: colors.text }]}>
            جلسة تدريب عامة: اختيار السورة والآيات للعرض فقط، ولا تُرسل لمعلمك. واجبات معلمك تجدها في «واجبات التسميع».
          </Text>
          <Text style={[styles.smallText, { color: colors.muted }]}>
            الإيقاف اليدوي ينهي الجلسة فقط؛ لا يعني إكمال النطاق ولا ينشئ تقييماً.
          </Text>
        </Card>
      )}

      {status.isLoading ? <Card><LoadingState label="جارٍ التحقق من إتاحة التسميع…" /></Card> : null}
      {status.error ? (
        <Card>
          <Text style={[styles.bodyText, { color: colors.danger }]}>تعذر التحقق من إعدادات التسميع. حاول لاحقاً.</Text>
        </Card>
      ) : null}
      {status.data && !status.data.liveTrackingEnabled ? (
        <Card>
          <Badge label="غير متاح الآن" tone="muted" />
          <Text style={[styles.bodyText, { color: colors.muted, marginTop: 10 }]}>
            التتبع الحي مغلق في إعدادات الخادم. لم يتم بدء جلسة أو تشغيل الميكروفون.
          </Text>
        </Card>
      ) : null}
      {phase === "setup" && !assignment ? (
        <AssignmentList
          rows={assignments.data ?? []}
          loading={assignments.isLoading}
          failed={!!assignments.error}
          onStart={(row) => chooseAssignment(row)}
          onHistory={() => router.push("/student/recitation/history" as never)}
          colors={colors}
        />
      ) : null}

      {phase === "setup" ? (
        <>
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>نطاق التسميع</Text>
            <Text style={[styles.smallText, { color: colors.muted }]}>اختر السورة والآيات</Text>
            <Text style={[styles.surahLabel, { color: colors.muted }]}>السورة</Text>
            <SurahField selected={Number(surahInput) || 1} onPress={() => setSurahPickerOpen(true)} disabled={!!assignment} />
            <SurahPicker visible={surahPickerOpen} selected={Number(surahInput) || 1} onPick={pickSurah} onClose={() => setSurahPickerOpen(false)} />
            <View style={styles.inputRow}>
              <NumberField label="من آية" value={startAyahInput} onChange={setStartAyahInput} maximum={3} editable={!assignment} colors={colors} />
              <NumberField label="إلى آية" value={endAyahInput} onChange={setEndAyahInput} maximum={3} editable={!assignment} colors={colors} />
            </View>
            {!validRange ? (
              <Text style={[styles.inlineError, { color: colors.danger }]}>تحقق من أرقام الآيات.</Text>
            ) : null}
            {validRange && status.data?.enabled ? (
              wordsQuery.isLoading ? (
                <Text style={[styles.smallText, { color: colors.muted }]}>جارٍ تحميل نص الآيات من خدمة المحتوى…</Text>
              ) : wordsQuery.error ? (
                <Text style={[styles.inlineError, { color: colors.danger }]}>تعذر تحميل نص الآيات؛ لم يبدأ التسجيل.</Text>
              ) : wordsQuery.data && !rangeHasCoverage ? (
                <Text style={[styles.inlineError, { color: colors.danger }]}>النطاق غير موجود كاملاً في السورة المختارة.</Text>
              ) : null
            ) : null}
            {Platform.OS === "web" ? (
              <Text style={[styles.inlineError, { color: colors.muted }]}>التسجيل الحي يحتاج تطبيق Native على جهاز، ولا يعمل في Expo Web.</Text>
            ) : null}
            <Text style={[styles.inputLabel, { color: colors.muted }]}>وضع الإخفاء</Text>
            <View style={styles.modeRow}>
              {HIDE_MODES.map((mode) => {
                const selected = mode.value === hideMode;
                return (
                  <Pressable
                    key={mode.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    disabled={!!assignment}
                    onPress={() => setHideMode(mode.value)}
                    style={[styles.modeChoice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.selected : colors.input }]}
                  >
                    <Text numberOfLines={1} style={[styles.modeLabel, { color: selected ? colors.primary : colors.text }]}>{mode.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.smallText, styles.modeHint, { color: colors.muted }]}>{HIDE_MODES.find((mode) => mode.value === hideMode)?.hint}</Text>
            {errorText ? <Text style={[styles.inlineError, { color: colors.danger }]}>{errorText}</Text> : null}
            <Button
              label="ابدأ التسميع"
              icon="mic"
              disabled={!canStart}
              loading={startMutation.isPending}
              onPress={() => void beginSession()}
            />
          </Card>
        </>
      ) : null}

      <Button
        label={soundsEnabled ? "أصوات التسميع: مفعّلة" : "أصوات التسميع: مكتومة"}
        variant="quiet"
        onPress={() => {
          const enabled = !soundsEnabled;
          setSoundsEnabled(enabled);
          controllerRef.current?.setSoundsEnabled(enabled);
        }}
      />
      {phase === "preparing" || phase === "ending" ? (
        <Card><LoadingState label={phase === "preparing" ? "جارٍ إنشاء الجلسة وتهيئة الميكروفون…" : "جارٍ إنهاء الجلسة بأمان…"} /></Card>
      ) : null}

      {phase === "listening" || phase === "paused" ? (
        <>
          <Card style={styles.liveCard}>
            <View style={styles.statusRow}>
              <Badge label={phase === "listening" ? "يستمع الآن" : "متوقف مؤقتاً"} tone={phase === "listening" ? "success" : "muted"} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>موضع القراءة الحالي</Text>
            </View>
            <Text style={[styles.positionText, { color: colors.primary }]}>{displayPosition(match)}</Text>
            <View style={styles.pageBleed} onLayout={(event) => setPageWidth(Math.floor(event.nativeEvent.layout.width))}>
              {pageQuery.data && pageWidth > 0 ? (
                <MushafPage
                  data={pageQuery.data}
                  width={pageWidth}
                  fillWidth
                  recitation={{
                    rangeKeys,
                    currentWord: match?.reading ?? null,
                    wordFeedback: match?.wordFeedback ?? new Map(),
                    hideMode,
                    revealedKeys,
                  }}
                />
              ) : pageQuery.error ? (
                <>
                  <Text style={[styles.inlineError, { color: colors.danger }]}>تعذر تحميل صفحة المصحف؛ التسميع مستمر.</Text>
                  {match?.reading ? (
                    <Text style={[styles.currentWord, { color: colors.text }]}>{match.reading.displayText}</Text>
                  ) : null}
                </>
              ) : (
                <LoadingState label="جارٍ تحميل صفحة المصحف…" />
              )}
            </View>
            <FeedbackLegend />
            {match ? (
              <>
                <ProgressBar
                  value={progressPercent}
                  label={ayahProgressLabel(match, startAyah, endAyah)}
                />
                <Text style={[styles.smallText, { color: colors.text }]}>
                  الأخطاء: {liveCounts.mistakes} · تخطٍّ: {liveCounts.skipped} · صُحّحت: {liveCounts.corrected}
                </Text>
                <Text style={[styles.smallText, { color: colors.muted }]}>
                  لا يُعلَّم الخطأ إلا بعد تأكده من متابعة قراءتك. تقدم العرض المحلي لا يثبت إكمال واجب أو نطاق تعليمي.
                </Text>
              </>
            ) : (
              <Text style={[styles.smallText, { color: colors.muted }]}>
                لم تصل مطابقة موضع مؤكدة بعد. لا يظهر هنا تفريغ صوتي خام أو درجة تقييم.
              </Text>
            )}
          </Card>
          {errorText ? <Text style={[styles.inlineError, { color: colors.danger }]}>{errorText}</Text> : null}
          <View style={styles.controls}>
            <View style={styles.controlRow}>
              {phase === "listening" ? (
                <Button label="إيقاف مؤقت" variant="secondary" icon="pause" loading={pauseMutation.isPending} onPress={() => void pauseSession()} />
              ) : (
                <Button label="استئناف" variant="secondary" icon="play" loading={resumeMutation.isPending} onPress={() => void resumeSession()} />
              )}
              <Button label="إنهاء الجلسة" variant="primary" icon="stop" onPress={() => void endSession()} />
            </View>
            {hideMode !== "visible_review" ? (
              <Button label="تلميح: أظهر الكلمة التالية" variant="secondary" icon="eye" disabled={phase !== "listening"} onPress={showHint} />
            ) : null}
            <Button label="إلغاء الجلسة" variant="quiet" onPress={() => void cancelSession()} />
          </View>
        </>
      ) : null}

      {phase === "user-ended" ? (
        <Card style={styles.finishedCard}>
          <Badge label="انتهت الجلسة" tone="success" style={styles.badgeEnd} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>ملخص الجلسة</Text>
          <SessionSummary summary={summary} durationSeconds={endedDuration ?? 0} colors={colors} />
          {assignment ? (
            <>
              <Text style={[styles.bodyText, { color: submitState === "failed" ? colors.danger : colors.text }]}>
                {submitState === "sending" ? "جارٍ إرسال النتيجة لمعلمك…"
                  : submitState === "sent" ? "سُلِّم الواجب لمعلمك. سيراجع معلمك تسميعك ويقيّمه بنفسه. يمكنك إعادة التسميع قبل تقييمه، وآخر تسليم يحل محل السابق."
                  : submitState === "failed" ? "لم يُسلَّم الواجب — أعد المحاولة، فالجلسة محفوظة."
                  : ""}
              </Text>
              {submitState === "failed" ? (
                <Button label="إعادة الإرسال" variant="secondary" icon="refresh" onPress={() => void submitAssignment()} />
              ) : null}
              <Text style={[styles.smallText, { color: colors.muted }]}>
                الأرقام محسوبة على جهازك آلياً، والتقييم لمعلمك.
              </Text>
            </>
          ) : (
            <Text style={[styles.smallText, { color: colors.muted }]}>
              جلسة عامة للتدريب — لا تُحتسب كواجب أو تقييم. الملخص محسوب على جهازك فقط.
            </Text>
          )}
          {errorText ? <Text style={[styles.smallText, { color: colors.muted }]}>{errorText}</Text> : null}
          <Button label="جلسة جديدة" icon="refresh" disabled={submitState === "sending"} onPress={() => resetScreen()} />
        </Card>
      ) : null}
      {phase === "cancelled" ? (
        <Card style={styles.finishedCard}>
          <Badge label="أُلغيت" tone="muted" />
          <Text style={[styles.bodyText, { color: colors.text }]}>أُغلقت الجلسة دون تسجيلها كإكمال.</Text>
          <Button label="العودة للإعداد" variant="secondary" onPress={() => resetScreen()} />
        </Card>
      ) : null}
      {phase === "error" ? (
        <Card style={styles.finishedCard}>
          <Badge label="لم تُسجّل نتيجة" tone="danger" style={styles.badgeEnd} />
          <Text style={[styles.bodyText, { color: colors.text }]}>{errorText ?? "تعذر إكمال الاتصال."}</Text>
          {summary && summary.wordsRecited > 0 ? (
            <>
              <Text style={[styles.cardTitle, { color: colors.text }]}>ما سُمع قبل التوقف</Text>
              <SessionSummary summary={summary} colors={colors} />
            </>
          ) : null}
          {sessionIdRef.current ? (
            <Button label="إعادة محاولة إغلاق الجلسة" variant="secondary" icon="refresh" onPress={() => void retrySessionCleanup()} />
          ) : (
            <Button label="إعداد جلسة جديدة" variant="secondary" icon="refresh" onPress={() => resetScreen()} />
          )}
        </Card>
      ) : null}
    </StudentScreen>
  );

  function resetScreen() {
    if (sessionIdRef.current !== null) return;
    setSubmitState("idle");
    pendingSubmitRef.current = null;
    finishingRef.current = false;
    setPhase("setup");
    setErrorText(null);
    setMatch(null);
    setEndedDuration(null);
    setSummary(null);
    matcherRef.current = null;
  }
}

function NumberField({
  label,
  value,
  onChange,
  maximum,
  editable = true,
  colors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximum: number;
  editable?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.inputColumn}>
      <Text style={[styles.inputLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        maxLength={maximum}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
        selectTextOnFocus
        editable={editable}
        style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
      />
    </View>
  );
}

/** The teacher's assignments for this student, with their review once given. */
function AssignmentList({
  rows,
  loading,
  failed,
  onStart,
  onHistory,
  colors,
}: {
  rows: AssignmentRow[];
  loading: boolean;
  failed: boolean;
  onStart: (assignment: AssignmentRow["assignment"]) => void;
  onHistory: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const [now] = useState(() => Date.now());
  return (
    <Card style={styles.noticeCard}>
      <View style={styles.assignmentHeader}>
        <Text style={[styles.cardTitle, styles.grow, { color: colors.text }]}>واجبات التسميع</Text>
        <Pressable accessibilityRole="button" onPress={onHistory} hitSlop={8} style={styles.historyLink}>
          <Icon name="clock" size={16} color={colors.primary} />
          <Text style={[styles.historyLinkText, { color: colors.primary }]}>سجل التسميع</Text>
        </Pressable>
      </View>
      {loading ? <LoadingState label="جارٍ تحميل واجباتك…" /> : null}
      {failed ? <Text style={[styles.inlineError, { color: colors.danger }]}>تعذر تحميل الواجبات.</Text> : null}
      {!loading && !failed && rows.length === 0 ? (
        <Text style={[styles.smallText, { color: colors.muted }]}>لا واجبات تسميع بعد — حين يحدد لك معلمك سورة للتسميع ستظهر هنا.</Text>
      ) : null}
      {rows.map(({ assignment, teacherName }) => {
        const overdue = assignment.status === "assigned" && !!assignment.dueAt && new Date(assignment.dueAt).getTime() < now;
        const result = assignment.result;
        const canRecite = assignment.status === "assigned" || assignment.status === "submitted";
        return (
          <View key={assignment.id} style={[styles.assignmentRow, { borderTopColor: colors.border }]}>
            <View style={styles.assignmentHeader}>
              <Text style={[styles.assignmentTitle, { color: colors.text }]}>{assignmentRange(assignment)}</Text>
              {overdue ? <Badge label="متأخر" tone="danger" /> : null}
              <Badge label={ASSIGNMENT_STATUS[assignment.status] ?? assignment.status} tone={ASSIGNMENT_TONE[assignment.status] ?? "gold"} />
            </View>
            <Text style={[styles.smallText, { color: overdue ? colors.danger : colors.muted }]}>
              {[
                teacherName ? `المعلم: ${teacherName}` : null,
                assignment.dueAt ? `${overdue ? "فات موعده: " : "التسليم قبل "}${formatDate(assignment.dueAt)}` : null,
              ].filter(Boolean).join(" · ")}
            </Text>
            {assignment.note ? <Text style={[styles.smallText, { color: colors.text }]}>{assignment.note}</Text> : null}
            {assignment.status === "reviewed" ? (
              <Text style={[styles.bodyText, { color: colors.success }]}>
                تقييم المعلم: {assignment.teacherScore ?? "—"}/100{assignment.teacherFeedback ? ` — ${assignment.teacherFeedback}` : ""}
              </Text>
            ) : null}
            {result && assignment.status !== "reviewed" ? (
              <Text style={[styles.smallText, { color: colors.muted }]}>
                آخر تسليم{assignment.submittedAt ? ` (${formatDate(assignment.submittedAt)})` : ""}: {result.wordsRecited} من {result.totalWords} كلمة
                {" · "}{result.confirmedMistakes} خطأ · {result.skippedWords} تخطٍّ · {formatDuration(result.durationSeconds)}
              </Text>
            ) : null}
            {canRecite ? (
              <Button
                label={assignment.status === "submitted" ? "أعد التسميع" : "ابدأ التسميع"}
                variant={assignment.status === "submitted" ? "secondary" : "primary"}
                icon="mic"
                onPress={() => onStart(assignment)}
              />
            ) : null}
            {assignment.status === "submitted" ? (
              <Text style={[styles.smallText, styles.centered, { color: colors.muted }]}>إعادة التسميع تستبدل التسليم السابق ما دام معلمك لم يقيّمه</Text>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

/** Local session summary computed on the device by the shared state engine. */
function SessionSummary({
  summary,
  durationSeconds,
  colors,
}: {
  summary: NativeRecitationSummary | null;
  durationSeconds?: number;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const rows: { label: string; value: string; color: string }[] = [
    { label: "الكلمات", value: `${summary?.wordsRecited ?? 0} من ${summary?.totalWords ?? 0}`, color: colors.primary },
    { label: "الأخطاء", value: `${summary?.confirmedMistakes ?? 0}`, color: colors.danger },
    { label: "تخطٍّ", value: `${summary?.skippedWords ?? 0}`, color: colors.danger },
    { label: "صُحّحت", value: `${summary?.correctedWords ?? 0}`, color: colors.success },
    { label: "التلميحات", value: `${summary?.peekedWords ?? 0}`, color: MUSHAF_COLORS.peeked },
  ];
  if (durationSeconds !== undefined) {
    rows.push({ label: "المدة", value: formatDuration(durationSeconds), color: colors.text });
  }
  return (
    <View style={styles.summaryList}>
      {rows.map((row) => (
        <View key={row.label} style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>{row.label}</Text>
          <Text style={[styles.summaryValue, { color: row.color }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Matches the word colours on the Mushaf page. */
function FeedbackLegend() {
  const items = [
    { label: "موضعك الآن", color: MUSHAF_COLORS.current, underline: false },
    { label: "صحيحة", color: MUSHAF_COLORS.correct, underline: false },
    { label: "خطأ مؤكد", color: MUSHAF_COLORS.mistake, underline: true },
    { label: "متروكة", color: MUSHAF_COLORS.skipped, underline: true },
    { label: "صُحّحت", color: MUSHAF_COLORS.corrected, underline: true },
    { label: "تلميح", color: MUSHAF_COLORS.peeked, underline: true },
  ];
  return (
    <View style={styles.legendRow}>
      {items.map((item) => (
        <Text
          key={item.label}
          style={[styles.legendItem, { color: item.color }, item.underline ? styles.underlined : null]}
        >
          {item.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  noticeCard: { gap: 10 },
  badgeEnd: { alignSelf: "flex-end" },
  bodyText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 24, textAlign: "right" },
  smallText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 20, textAlign: "right" },
  cardTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, lineHeight: 25, textAlign: "right" },
  inputRow: { flexDirection: "row-reverse", gap: 8, marginTop: 12, marginBottom: 16 },
  surahLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, textAlign: "right", marginTop: 14, marginBottom: 6 },
  inputColumn: { flex: 1, minWidth: 0, gap: 6 },
  inputLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, textAlign: "right" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, textAlign: "center", fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 16 },
  inlineError: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 21, textAlign: "right", marginVertical: 8 },
  liveCard: { gap: 12 },
  // The page spans the card edge to edge, so the Mushaf is as large as the screen allows.
  pageBleed: { marginHorizontal: -12 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  positionText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 18, lineHeight: 30, textAlign: "right" },
  currentWord: { fontFamily: "Amiri_700Bold", fontSize: 30, textAlign: "center", lineHeight: 45, marginVertical: 4 },
  controls: { gap: 10 },
  controlRow: { flexDirection: "row", gap: 10 },
  finishedCard: { alignItems: "stretch", gap: 12 },
  underlined: { textDecorationLine: "underline" },
  // Two per row, like the web setup sheet, so the full mode names fit.
  modeRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 6 },
  modeChoice: { flexBasis: "47%", flexGrow: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  modeHint: { marginTop: 6, marginBottom: 14 },
  modeLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  assignmentRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 6 },
  assignmentHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexWrap: "wrap" },
  grow: { flex: 1, minWidth: 0 },
  centered: { textAlign: "center" },
  historyLink: { minHeight: 36, flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  historyLinkText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, lineHeight: 18 },
  assignmentTitle: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right" },
  legendRow: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  legendItem: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, lineHeight: 18 },
  summaryList: { gap: 2 },
  summaryRow: { minHeight: 36, flexDirection: "row-reverse", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  summaryLabel: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, lineHeight: 22, textAlign: "right" },
  summaryValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "left" },
});
