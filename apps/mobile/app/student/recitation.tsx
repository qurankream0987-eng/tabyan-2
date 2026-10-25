import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, LoadingState, ProgressBar } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import {
  NativeQuranLiveMatcher,
  NativeRecitationController,
  type NativeRecitationMatch,
  type NativeRecitationState,
} from "../../lib/recitation/native-recitation";
import { normalizeQuranText } from "../../lib/recitation/quran-normalizer";
import { trpc } from "../../lib/trpc";
import { StudentScreen } from "../../components/student/student-screen";

type ScreenPhase = "setup" | "preparing" | "listening" | "paused" | "ending" | "user-ended" | "cancelled" | "error";

function positiveInteger(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function displayPosition(match: NativeRecitationMatch | null) {
  if (!match?.current) return "لم يُثبت موضع بعد";
  return `السورة ${match.current.surah} · الآية ${match.current.ayah} · الكلمة ${match.current.position}`;
}

export default function NativeRecitationScreen() {
  const { token, role } = useAuth();
  const { colors } = useTheme();
  const [surahInput, setSurahInput] = useState("1");
  const [startAyahInput, setStartAyahInput] = useState("1");
  const [endAyahInput, setEndAyahInput] = useState("7");
  const [phase, setPhase] = useState<ScreenPhase>("setup");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [match, setMatch] = useState<NativeRecitationMatch | null>(null);
  const [endedDuration, setEndedDuration] = useState<number | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [, setSessionStateVersion] = useState(0);
  const controllerRef = useRef<NativeRecitationController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const finishingRef = useRef(false);
  const controllerStartingRef = useRef(false);
  const startFlightRef = useRef(false);
  const cancelInFlightRef = useRef(new Map<string, Promise<void>>());
  const mountedRef = useRef(false);
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

  const ayahRequest = {
    surahId: validRange ? surahId : 1,
    startAyah: validRange ? startAyah : 1,
    endAyah: validRange ? endAyah : 1,
  };
  const ayahsQuery = trpc.recitation.getAyahs.useQuery(ayahRequest, {
    enabled: validRange && status.data?.enabled === true && !!token && role === "student",
    retry: false,
    staleTime: 5 * 60_000,
  });
  const ayahs = ayahsQuery.data ?? [];
  const rangeHasCoverage = validRange
    && ayahs.length === endAyah - startAyah + 1
    && ayahs[0]?.numberInSurah === startAyah
    && ayahs[ayahs.length - 1]?.numberInSurah === endAyah;

  const canonicalWords = useMemo(() => {
    if (!validRange || !rangeHasCoverage || surahId === null) return [];
    return ayahs.flatMap((ayah) =>
      ayah.words.map((displayText, index) => ({
        surah: surahId,
        ayah: ayah.numberInSurah,
        verseKey: `${surahId}:${ayah.numberInSurah}`,
        position: index + 1,
        displayText,
        normalizedText: normalizeQuranText(displayText),
      })),
    );
  }, [ayahs, rangeHasCoverage, surahId, validRange]);

  const currentAyahText = match?.current
    ? ayahs.find((ayah) => ayah.numberInSurah === match.current?.ayah)?.text
    : undefined;

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
    setPhase("preparing");
    let sessionId: string | null = null;
    try {
      const session = await startMutation.mutateAsync({
        mode: "general",
        startContext: { startVerseKey: `${surahId}:${startAyah}` },
        hideMode: "visible_review",
      });
      sessionId = session.sessionId;
      if (!mountedRef.current) {
        await cancelMutationRef.current.mutateAsync({ sessionId }).catch(() => undefined);
        return;
      }
      sessionIdRef.current = sessionId;
      const matcher = new NativeQuranLiveMatcher(canonicalWords);
      if (!matcher.setStartPosition({ verseKey: `${surahId}:${startAyah}` })) {
        throw new Error("Selected start position is not present in the loaded Quran text");
      }
      const controller = new NativeRecitationController(matcher, {
        onState: (state) => handleControllerState(state),
        onMatch: (nextMatch) => {
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
      if (!controller || !await controller.stop()) throw new Error("Final audio not acknowledged");
      const result = await endMutation.mutateAsync({ sessionId });
      releaseSessionId(sessionId);
      if (result.completionState === "user_ended" && mountedRef.current) await controller.completeSuccessfully();
      if (mountedRef.current) {
        setEndedDuration(result.durationSeconds);
        setPhase(result.completionState === "user_ended" ? "user-ended" : "error");
        setErrorText(result.completionState === "user_ended" ? null : "لم يؤكد الخادم إنهاء الجلسة.");
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
  const progressPercent = match && match.totalWords > 0
    ? (match.progressionWords / match.totalWords) * 100
    : 0;
  const sessionFinished = phase === "user-ended" || phase === "cancelled";

  return (
    <StudentScreen title="التسميع الحي" subtitle="تتبّع موضع القراءة — جلسة عامة">
      <Card style={styles.noticeCard}>
        <Badge label="عام فقط" />
        <Text style={[styles.bodyText, { color: colors.text }]}>
          لا يوجد هنا واجب تعليمي معتمد. اختيار السورة والآيات للعرض المحلي فقط، ولا يُرسل كنطاق واجب إلى الخادم.
        </Text>
        <Text style={[styles.smallText, { color: colors.muted }]}>
          الإيقاف اليدوي ينهي الجلسة فقط؛ لا يعني إكمال النطاق ولا ينشئ تقييماً.
        </Text>
      </Card>

      {status.isLoading ? <Card><LoadingState label="جارٍ التحقق من إتاحة التسميع…" /></Card> : null}
      {status.error ? (
        <Card>
          <Text style={[styles.bodyText, { color: colors.danger }]}>تعذر التحقق من إعدادات التسميع. حاول لاحقاً.</Text>
        </Card>
      ) : null}
      {status.data && !status.data.liveTrackingEnabled ? (
        <Card>
          <Badge label="غير متاح حالياً" tone="muted" />
          <Text style={[styles.bodyText, { color: colors.muted, marginTop: 10 }]}>
            التتبع الحي مغلق في إعدادات الخادم. لم يتم بدء جلسة أو تشغيل الميكروفون.
          </Text>
        </Card>
      ) : null}
      {status.data?.educationalAssignmentSource === "missing" ? (
        <Card>
          <Text style={[styles.smallText, { color: colors.muted }]}>
            التسميع التعليمي مقفل إلى أن يتوفر واجب معتمد ومحدد من الخادم.
          </Text>
        </Card>
      ) : null}

      {phase === "setup" ? (
        <>
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>موضع القراءة</Text>
            <Text style={[styles.smallText, { color: colors.muted }]}>
              أدخل رقم السورة من 1 إلى 114 وحدد أول وآخر آية للعرض. هذه الحدود لا تتحول إلى واجب أو شرط إكمال.
            </Text>
            <View style={styles.inputRow}>
              <NumberField label="رقم السورة" value={surahInput} onChange={setSurahInput} maximum={3} colors={colors} />
              <NumberField label="من آية" value={startAyahInput} onChange={setStartAyahInput} maximum={3} colors={colors} />
              <NumberField label="إلى آية" value={endAyahInput} onChange={setEndAyahInput} maximum={3} colors={colors} />
            </View>
            {!validRange ? (
              <Text style={[styles.inlineError, { color: colors.danger }]}>تحقق من أرقام السورة والآيات.</Text>
            ) : null}
            {validRange && status.data?.enabled ? (
              ayahsQuery.isLoading ? (
                <Text style={[styles.smallText, { color: colors.muted }]}>جارٍ تحميل نص الآيات من خدمة المحتوى…</Text>
              ) : ayahsQuery.error ? (
                <Text style={[styles.inlineError, { color: colors.danger }]}>تعذر تحميل نص الآيات؛ لم يبدأ التسجيل.</Text>
              ) : ayahsQuery.data && !rangeHasCoverage ? (
                <Text style={[styles.inlineError, { color: colors.danger }]}>النطاق غير موجود كاملاً في السورة المختارة.</Text>
              ) : null
            ) : null}
            {Platform.OS === "web" ? (
              <Text style={[styles.inlineError, { color: colors.muted }]}>التسجيل الحي يحتاج تطبيق Native على جهاز، ولا يعمل في Expo Web.</Text>
            ) : null}
            {errorText ? <Text style={[styles.inlineError, { color: colors.danger }]}>{errorText}</Text> : null}
            <Button
              label="بدء جلسة عامة"
              icon="mic-outline"
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
            {match?.current ? (
              <Text style={[styles.currentWord, { color: colors.text }]}>{match.current.displayText}</Text>
            ) : null}
            {currentAyahText ? (
              <Text style={[styles.ayahText, { color: colors.text }]}>{currentAyahText}</Text>
            ) : null}
            {match ? (
              <>
                <ProgressBar
                  value={progressPercent}
                  label={`موضع مثبت محلياً: ${match.progressionWords} من ${match.totalWords} كلمة`}
                />
                <Text style={[styles.smallText, { color: colors.muted }]}>
                  تقدم العرض المحلي لا يثبت إكمال واجب أو نطاق تعليمي.
                </Text>
                <View style={[styles.diagnostics, { borderTopColor: colors.border }]}>
                  <Text style={[styles.diagnosticTitle, { color: colors.text }]}>تفاصيل التتبع</Text>
                  <DiagnosticRow label="حالة المطابقة" value={match.diagnostics.unmatched ? "لم يثبت موضع جديد" : match.stable ? "موضع مستقر" : "موضع أولي"} colors={colors} />
                  <DiagnosticRow label="عودة خلف الموضع" value={`${match.diagnostics.underRunWords} كلمة`} colors={colors} />
                  <DiagnosticRow label="تجاوز أمامي" value={`${match.diagnostics.overRunWords} كلمة`} colors={colors} />
                  <DiagnosticRow label="موضع مكرر" value={match.diagnostics.repeatedPosition ? "نعم" : "لا"} colors={colors} />
                  <DiagnosticRow label="منطقة لم تُثبت" value={`${match.diagnostics.skippedRegionWords} كلمة`} colors={colors} />
                  <DiagnosticRow label="كلمات غير محاذاة" value={`${match.diagnostics.unmatchedTokenCount}`} colors={colors} />
                  <DiagnosticRow label="وضع المحرك" value={match.diagnostics.mode === "recovery" ? "استعادة السياق" : "تتبع"} colors={colors} />
                </View>
              </>
            ) : (
              <Text style={[styles.smallText, { color: colors.muted }]}>
                لم تصل مطابقة موضع مؤكدة بعد. لا يظهر هنا تفريغ صوتي خام أو درجة تقييم.
              </Text>
            )}
          </Card>
          {errorText ? <Text style={[styles.inlineError, { color: colors.danger }]}>{errorText}</Text> : null}
          <View style={styles.controlRow}>
            {phase === "listening" ? (
              <Button label="إيقاف مؤقت" variant="secondary" icon="pause-outline" loading={pauseMutation.isPending} onPress={() => void pauseSession()} />
            ) : (
              <Button label="استئناف" variant="secondary" icon="play-outline" loading={resumeMutation.isPending} onPress={() => void resumeSession()} />
            )}
            <Button label="إنهاء التسميع" variant="primary" icon="stop-outline" onPress={() => void endSession()} />
          </View>
          <Button label="إلغاء دون احتساب إكمال" variant="quiet" onPress={() => void cancelSession()} />
        </>
      ) : null}

      {phase === "user-ended" ? (
        <Card style={styles.finishedCard}>
          <Badge label="انتهت بطلبك" tone="success" />
          <Text style={[styles.cardTitle, { color: colors.text }]}>تم إنهاء الجلسة يدوياً</Text>
          <Text style={[styles.bodyText, { color: colors.muted }]}>
            لم تُسجّل نتيجة تقييم أو إكمال نطاق. مدة الاستماع النشط: {endedDuration ?? 0} ثانية.
          </Text>
          <Button label="جلسة جديدة" icon="refresh-outline" onPress={() => resetScreen()} />
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
          <Badge label="لم تُسجّل نتيجة" tone="danger" />
          <Text style={[styles.bodyText, { color: colors.text }]}>{errorText ?? "تعذر إكمال الاتصال."}</Text>
          {sessionIdRef.current ? (
            <Button label="إعادة محاولة إغلاق الجلسة" variant="secondary" icon="refresh-outline" onPress={() => void retrySessionCleanup()} />
          ) : (
            <Button label="إعداد جلسة جديدة" variant="secondary" icon="refresh-outline" onPress={() => resetScreen()} />
          )}
        </Card>
      ) : null}
    </StudentScreen>
  );

  function resetScreen() {
    if (sessionIdRef.current !== null) return;
    finishingRef.current = false;
    setPhase("setup");
    setErrorText(null);
    setMatch(null);
    setEndedDuration(null);
  }
}

function NumberField({
  label,
  value,
  onChange,
  maximum,
  colors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximum: number;
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
        style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
      />
    </View>
  );
}

function DiagnosticRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.diagnosticRow}>
      <Text style={[styles.smallText, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.smallText, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeCard: { gap: 10 },
  bodyText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 24, textAlign: "right" },
  smallText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 20, textAlign: "right" },
  cardTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, lineHeight: 25, textAlign: "right" },
  inputRow: { flexDirection: "row", gap: 8, marginVertical: 16 },
  inputColumn: { flex: 1, minWidth: 0, gap: 6 },
  inputLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, textAlign: "right" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, textAlign: "center", fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 16 },
  inlineError: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 21, textAlign: "right", marginVertical: 8 },
  liveCard: { gap: 12 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  positionText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 18, lineHeight: 30, textAlign: "right" },
  currentWord: { fontFamily: "Amiri_700Bold", fontSize: 30, textAlign: "center", lineHeight: 45, marginVertical: 4 },
  ayahText: { fontFamily: "Amiri_400Regular", fontSize: 24, lineHeight: 45, textAlign: "center" },
  diagnostics: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
  diagnosticTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right", marginBottom: 4 },
  diagnosticRow: { minHeight: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  controlRow: { flexDirection: "row", gap: 10 },
  finishedCard: { alignItems: "stretch", gap: 12 },
});
