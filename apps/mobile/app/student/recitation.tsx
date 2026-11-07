import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@workspace/tabyan-trpc/types";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { Badge, Button, Card, Icon, LoadingState } from "../../components/ui";
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
import { MUSHAF_COLORS, type MushafHideMode } from "../../components/mushaf/mushaf-page";
import { trpc } from "../../lib/trpc";
import { StudentScreen } from "../../components/student/student-screen";
import { LiveRecitationScreen } from "../../components/recitation/live-recitation-screen";

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

export default function NativeRecitationScreen() {
  const { token, role } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  // Opened from the Mushaf toolbar: the page's first ayah, ten ayahs at most, with the range
  // open to change. Opened on a chosen ayah (toEnd): that ayah to the surah's end, no range to pick.
  const params = useLocalSearchParams<{ surah?: string; ayah?: string; toEnd?: string }>();
  const toSurahEnd = params.toEnd === "1";
  const initialSurah = SURAHS[Number(params.surah) - 1] ?? SURAHS[0];
  const initialAyah = Math.min(Math.max(1, Number(params.ayah) || 1), initialSurah.ayahs);
  const [surahInput, setSurahInput] = useState(String(initialSurah.n));
  const [startAyahInput, setStartAyahInput] = useState(String(initialAyah));
  const [endAyahInput, setEndAyahInput] = useState(String(toSurahEnd ? initialSurah.ayahs : Math.min(initialAyah + 9, initialSurah.ayahs)));
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
  if (phase === "preparing" || phase === "listening" || phase === "paused" || phase === "ending") {
    // The live session takes the whole screen from the moment it is being set up until it has
    // ended; the setup and summary stay in the usual layout.
    return (
      <LiveRecitationScreen
        phase={phase}
        match={match}
        page={pageQuery.data}
        pageError={!!pageQuery.error}
        hideMode={hideMode}
        rangeKeys={rangeKeys}
        revealedKeys={revealedKeys}
        plainOutside={toSurahEnd}
        errorText={errorText}
        onPause={() => void pauseSession()}
        onResume={() => void resumeSession()}
        onEnd={() => void endSession()}
        onCancel={() => void cancelSession()}
        onHint={showHint}
        pauseBusy={pauseMutation.isPending}
        resumeBusy={resumeMutation.isPending}
      />
    );
  }

  return (
    <StudentScreen
      title={toSurahEnd ? "تسميع" : "واجبات التسميع"}
      subtitle={toSurahEnd ? "جلسة تدريب عامة، لا تُرسل لمعلمك" : "سمّع ما حدده معلمك، وهو من يقيّم تسميعك"}
    >
      {!toSurahEnd && assignment ? (
        <Card style={styles.noticeCard}>
          <Badge label="واجب التسميع" tone="success" style={styles.badgeEnd} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{assignmentRange(assignment)}</Text>
          {assignment.note ? <Text style={[styles.bodyText, { color: colors.text }]}>{assignment.note}</Text> : null}
          <Text style={[styles.smallText, { color: colors.muted }]}>
            عند إنهاء التسميع يُرسل ملخصه وتسجيل صوتك لمعلمك ليستمع له ويقيّمه بنفسه. يمكنك إعادة التسميع والتسليم قبل أن يقيّمه.
          </Text>
          {phase === "setup" ? <Button label="العودة لكل الواجبات" variant="quiet" onPress={() => chooseAssignment(null)} /> : null}
        </Card>
      ) : null}

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
      {phase === "setup" && !assignment && !toSurahEnd ? (
        <AssignmentList
          rows={assignments.data ?? []}
          loading={assignments.isLoading}
          failed={!!assignments.error}
          onStart={(row) => chooseAssignment(row)}
          onHistory={() => router.push("/student/recitation/history" as never)}
          colors={colors}
        />
      ) : null}
      {phase === "setup" && !assignment && !toSurahEnd ? (
        <FreeRecitationCard
          onStart={(surah) => router.push({ pathname: "/student/recitation", params: { surah: String(surah), ayah: "1", toEnd: "1" } } as never)}
          colors={colors}
        />
      ) : null}

      {/* A general session starts from the Mushaf (from a chosen ayah to the surah's end); this screen otherwise starts the teacher's assignments. */}
      {phase === "setup" && (assignment || toSurahEnd) ? (
        <>
          <Card>
            {toSurahEnd ? (
              <>
                <Text style={[styles.cardTitle, { color: colors.text }]}>سورة {initialSurah.name}</Text>
                <Text style={[styles.smallText, { color: colors.muted }]}>من الآية {initialAyah} إلى آخر السورة</Text>
              </>
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

/** Practice outside the assignments: a whole surah, page by page, not sent to the teacher. */
function FreeRecitationCard({ onStart, colors }: { onStart: (surah: number) => void; colors: ReturnType<typeof useTheme>["colors"] }) {
  const [surah, setSurah] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <Card style={styles.noticeCard}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>تسميع حر</Text>
      <Text style={[styles.smallText, { color: colors.muted }]}>اختر السورة وسمّعها من أولها لآخرها. لا يُرسل لمعلمك.</Text>
      <SurahField selected={surah} onPress={() => setPickerOpen(true)} />
      <SurahPicker visible={pickerOpen} selected={surah} onPick={(n) => { setSurah(n); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
      <Button label="ابدأ التسميع" icon="mic" onPress={() => onStart(surah)} />
    </Card>
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

const styles = StyleSheet.create({
  noticeCard: { gap: 10 },
  badgeEnd: { alignSelf: "flex-end" },
  bodyText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 24, textAlign: "right" },
  smallText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 20, textAlign: "right" },
  cardTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, lineHeight: 25, textAlign: "right" },
  inputLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, textAlign: "right" },
  inlineError: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 21, textAlign: "right", marginVertical: 8 },
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
  summaryList: { gap: 2 },
  summaryRow: { minHeight: 36, flexDirection: "row-reverse", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  summaryLabel: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, lineHeight: 22, textAlign: "right" },
  summaryValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "left" },
});
