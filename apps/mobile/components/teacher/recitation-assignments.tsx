import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@workspace/tabyan-trpc/types";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";
import { Button, Card } from "../ui";
import { trpc } from "../../lib/trpc";
import { confirmAr } from "../../lib/confirm";
import { loadRangeWords } from "../../lib/mushaf/mushaf-assets";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { RecordingPlaybackError, RecordingPlayer } from "../../lib/recitation/recording-player";

type Assignment = inferRouterOutputs<AppRouter>["recitationAssignments"]["forStudent"][number];
type Colors = ReturnType<typeof useTheme>["colors"];
type HideMode = Assignment["hideMode"];

const HIDE_MODES: { value: HideMode; label: string }[] = [
  { value: "progressive_reveal", label: "تسميع" },
  { value: "first_word", label: "أول كلمة" },
  { value: "visible_review", label: "مراجعة بالنظر" },
];

const STATUS_LABELS: Record<Assignment["status"], string> = {
  assigned: "لم يُسلَّم",
  submitted: "سُلِّم — بانتظار تقييمك",
  reviewed: "قيّمته",
  cancelled: "أُلغي",
};

const FLAG_LABELS = { mistake: "خطأ", skipped: "متروكة", corrected: "صحّحها", peeked: "تلميح" } as const;

export function assignmentRange(assignment: { surahId: number; startAyah: number; endAyah: number }) {
  const name = SURAHS[assignment.surahId - 1]?.name ?? "";
  return assignment.startAyah === assignment.endAyah
    ? `سورة ${name} — الآية ${assignment.startAyah}`
    : `سورة ${name} — الآيات ${assignment.startAyah}–${assignment.endAyah}`;
}

function positiveInteger(value: string) {
  const digits = normalizeDigits(value.trim());
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

/**
 * واجبات التسميع لطالب واحد: يحدد المعلم السورة والآيات، ويراجع ما سلّمه
 * الطالب (محسوباً آلياً على جهازه) ويضع تقييمه بنفسه.
 */
export function RecitationAssignmentsSection({ studentId }: { studentId: string }) {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const list = trpc.recitationAssignments.forStudent.useQuery({ studentId }, { enabled: !!studentId });
  const refetchList = list.refetch;
  useFocusEffect(useCallback(() => { if (studentId) void refetchList(); }, [studentId, refetchList]));
  const [creating, setCreating] = useState(false);
  const refresh = () => void utils.recitationAssignments.forStudent.invalidate({ studentId });

  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>واجبات التسميع</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>
        حدّد للطالب سورة وآيات يسمّعها من التطبيق أو الموقع، ثم راجع ما سلّمه وقيّمه بنفسك.
      </Text>
      {creating ? (
        <CreateForm studentId={studentId} colors={colors} onDone={() => { setCreating(false); refresh(); }} onCancel={() => setCreating(false)} />
      ) : (
        <Button label="واجب تسميع جديد" icon="add-circle-outline" variant="secondary" onPress={() => setCreating(true)} />
      )}
      {list.isLoading ? <Text style={[styles.muted, { color: colors.muted }]}>جارٍ تحميل الواجبات…</Text> : null}
      {list.isError ? <Text style={[styles.error, { color: colors.danger }]}>تعذر تحميل الواجبات.</Text> : null}
      {list.data && list.data.length === 0 ? <Text style={[styles.muted, { color: colors.muted }]}>لا واجبات تسميع بعد</Text> : null}
      {list.data?.map((assignment) => (
        <AssignmentCard key={assignment.id} assignment={assignment} colors={colors} onChanged={refresh} />
      ))}
    </Card>
  );
}

function CreateForm({ studentId, colors, onDone, onCancel }: { studentId: string; colors: Colors; onDone: () => void; onCancel: () => void }) {
  const [surah, setSurah] = useState("1");
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("7");
  const [hideMode, setHideMode] = useState<HideMode>("progressive_reveal");
  const [note, setNote] = useState("");
  const [dueDays, setDueDays] = useState("");
  const [error, setError] = useState("");
  const create = trpc.recitationAssignments.create.useMutation({
    onSuccess: onDone,
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إنشاء الواجب.")),
  });

  const surahId = positiveInteger(surah);
  const meta = surahId ? SURAHS[surahId - 1] : undefined;
  const startAyah = positiveInteger(start);
  const endAyah = positiveInteger(end);
  const days = dueDays ? positiveInteger(dueDays) : null;
  const valid = !!meta && !!startAyah && !!endAyah && startAyah >= 1 && endAyah >= startAyah && endAyah <= meta.ayahs
    && (!dueDays || (days !== null && days >= 1 && days <= 60));

  return (
    <View style={[styles.form, { borderColor: colors.border }]}>
      <View style={styles.fieldsRow}>
        <Field label="رقم السورة" value={surah} onChange={setSurah} colors={colors} />
        <Field label="من آية" value={start} onChange={setStart} colors={colors} />
        <Field label="إلى آية" value={end} onChange={setEnd} colors={colors} />
      </View>
      <Text style={[styles.small, { color: meta ? colors.muted : colors.danger }]}>
        {meta ? `سورة ${meta.name} — ${meta.ayahs} آية` : "رقم السورة من 1 إلى 114"}
      </Text>
      <Text style={[styles.label, { color: colors.muted }]}>طريقة العرض للطالب</Text>
      <View style={styles.fieldsRow}>
        {HIDE_MODES.map((mode) => {
          const selected = mode.value === hideMode;
          return (
            <Pressable
              key={mode.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setHideMode(mode.value)}
              style={[styles.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.selected : colors.input }]}
            >
              <Text numberOfLines={1} style={[styles.choiceLabel, { color: selected ? colors.primary : colors.text }]}>{mode.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
        placeholder="ملاحظة للطالب (اختياري)"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
        textAlign="right"
      />
      <Field label="مهلة التسليم بالأيام (اختياري)" value={dueDays} onChange={setDueDays} colors={colors} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.fieldsRow}>
        <View style={styles.flex}>
          <Button
            label="إرسال الواجب"
            icon="send-outline"
            loading={create.isPending}
            disabled={!valid || create.isPending}
            onPress={() => {
              setError("");
              create.mutate({
                studentId,
                surahId: surahId!,
                startAyah: startAyah!,
                endAyah: endAyah!,
                hideMode,
                note: note.trim() || undefined,
                dueAt: days ? new Date(Date.now() + days * 86_400_000) : undefined,
              });
            }}
          />
        </View>
        <View style={styles.flex}><Button label="إلغاء" variant="quiet" onPress={onCancel} /></View>
      </View>
    </View>
  );
}

function clock(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const RECORDING_ERRORS = {
  missing: "لا يوجد تسجيل صوتي لهذا التسميع.",
  forbidden: "غير مسموح لك بسماع هذا التسجيل.",
  network: "تعذر تشغيل التسجيل. تحقق من الاتصال وأعد المحاولة.",
} as const;

/** Lets the teacher listen to the student's recitation before grading it. */
function RecordingPlayback({ objectPath, colors }: { objectPath: string; colors: Colors }) {
  const { token } = useAuth();
  const [state, setState] = useState({ playing: false, position: 0, duration: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const playerRef = useRef<RecordingPlayer | null>(null);
  useEffect(() => () => playerRef.current?.dispose(), []);

  async function toggle() {
    const player = playerRef.current ??= new RecordingPlayer(objectPath, { onState: setState });
    if (state.playing) {
      player.pause();
      return;
    }
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      await player.play(token);
    } catch (cause) {
      setError(RECORDING_ERRORS[cause instanceof RecordingPlaybackError ? cause.failure : "network"]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.recording}>
      <Button
        label={loading ? "جارٍ تحميل التسجيل…" : state.playing ? "إيقاف مؤقت" : state.position > 0 ? "متابعة الاستماع" : "استمع للتسميع"}
        variant="secondary"
        icon={state.playing ? "pause-outline" : "play-outline"}
        loading={loading}
        disabled={loading}
        onPress={() => void toggle()}
      />
      {state.duration > 0 ? (
        <Text style={[styles.small, { color: colors.muted }]}>{clock(state.position)} / {clock(state.duration)}</Text>
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function AssignmentCard({ assignment, colors, onChanged }: { assignment: Assignment; colors: Colors; onChanged: () => void }) {
  const [score, setScore] = useState(assignment.teacherScore != null ? String(assignment.teacherScore) : "");
  const [feedback, setFeedback] = useState(assignment.teacherFeedback ?? "");
  const [error, setError] = useState("");
  const review = trpc.recitationAssignments.review.useMutation({
    onSuccess: onChanged,
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر حفظ التقييم.")),
  });
  const cancel = trpc.recitationAssignments.cancel.useMutation({
    onSuccess: onChanged,
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إلغاء الواجب.")),
  });
  const result = assignment.result;
  const scoreValue = positiveInteger(score);
  const canReview = (assignment.status === "submitted" || assignment.status === "reviewed") && !!result;

  return (
    <View style={[styles.assignment, { backgroundColor: `${colors.primary}0c` }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.title, { color: colors.text }]}>{assignmentRange(assignment)}</Text>
        <Text style={[styles.status, { color: assignment.status === "submitted" ? colors.primary : colors.muted }]}>{STATUS_LABELS[assignment.status]}</Text>
      </View>
      <Text style={[styles.small, { color: colors.muted }]}>
        {[
          HIDE_MODES.find((mode) => mode.value === assignment.hideMode)?.label,
          assignment.dueAt ? `التسليم قبل ${formatDate(assignment.dueAt)}` : null,
          assignment.submittedAt ? `سُلِّم ${formatDate(assignment.submittedAt)}` : null,
        ].filter(Boolean).join(" · ")}
      </Text>
      {assignment.note ? <Text style={[styles.body, { color: colors.text }]}>{assignment.note}</Text> : null}

      {result ? (
        <>
          <Text style={[styles.body, { color: colors.text }]}>
            قرأ {result.wordsRecited} من {result.totalWords} كلمة · أخطاء {result.confirmedMistakes} · متروكة {result.skippedWords} · صحّحها {result.correctedWords} · تلميحات {result.peekedWords} · المدة {clock(result.durationSeconds)}
          </Text>
          <FlaggedWords assignment={assignment} colors={colors} />
          {assignment.audioPath ? <RecordingPlayback key={assignment.audioPath} objectPath={assignment.audioPath} colors={colors} /> : null}
          <Text style={[styles.small, { color: colors.muted }]}>الأرقام محسوبة آلياً على جهاز الطالب؛ التقييم لك.</Text>
        </>
      ) : null}

      {canReview ? (
        <View style={styles.reviewBox}>
          <Field label="التقييم من 100" value={score} onChange={setScore} colors={colors} />
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            maxLength={1000}
            multiline
            placeholder="ملاحظاتك للطالب (اختياري)"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            textAlign="right"
          />
          <Button
            label={assignment.status === "reviewed" ? "تعديل التقييم" : "حفظ التقييم"}
            icon="checkmark-done-outline"
            loading={review.isPending}
            disabled={scoreValue === null || scoreValue > 100 || review.isPending}
            onPress={() => { setError(""); review.mutate({ assignmentId: assignment.id, score: scoreValue!, feedback: feedback.trim() || undefined }); }}
          />
        </View>
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {assignment.status === "assigned" || assignment.status === "submitted" ? (
        <Button
          label="إلغاء الواجب"
          variant="quiet"
          disabled={cancel.isPending}
          onPress={() => void confirmAr("إلغاء الواجب", "هل تريد إلغاء هذا الواجب؟").then((ok) => { if (ok) cancel.mutate({ assignmentId: assignment.id }); })}
        />
      ) : null}
    </View>
  );
}

/** Words the engine flagged, grouped by ayah, with their Mushaf text. */
function FlaggedWords({ assignment, colors }: { assignment: Assignment; colors: Colors }) {
  const flagged = assignment.result?.flaggedWords ?? [];
  const words = useQuery({
    queryKey: ["mushaf-range-words", assignment.surahId, assignment.startAyah, assignment.endAyah],
    queryFn: () => loadRangeWords(assignment.surahId, assignment.startAyah, assignment.endAyah),
    enabled: flagged.length > 0,
    staleTime: Infinity,
  });
  if (!flagged.length) return null;
  const textByKey = new Map(words.data?.map((word) => [`${word.verseKey}:${word.position}`, word.displayText]) ?? []);
  const byAyah = new Map<number, typeof flagged>();
  for (const word of flagged) {
    const ayah = Number(word.key.split(":")[1]);
    byAyah.set(ayah, [...(byAyah.get(ayah) ?? []), word]);
  }
  return (
    <View style={styles.flagged}>
      {[...byAyah.entries()].sort(([a], [b]) => a - b).map(([ayah, list]) => (
        <Text key={ayah} style={[styles.body, { color: colors.text }]}>
          الآية {ayah}: {list.map((word) => `${textByKey.get(word.key) ?? `كلمة ${word.key.split(":")[2]}`} (${FLAG_LABELS[word.kind]})`).join("، ")}
        </Text>
      ))}
    </View>
  );
}

function Field({ label, value, onChange, colors }: { label: string; value: string; onChange: (value: string) => void; colors: Colors }) {
  return (
    <View style={styles.flex}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
        keyboardType="number-pad"
        maxLength={3}
        style={[styles.input, styles.numberInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
      />
    </View>
  );
}

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ar-SA-u-nu-latn");
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginBottom: 8 },
  title: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 22, textAlign: "right" },
  status: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21, marginBottom: 8 },
  small: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", lineHeight: 18 },
  label: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, textAlign: "right", marginBottom: 4 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginVertical: 6 },
  flex: { flex: 1, minWidth: 0 },
  form: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 10, gap: 8, marginBottom: 8 },
  fieldsRow: { flexDirection: "row-reverse", gap: 8 },
  input: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  numberInput: { minHeight: 44, textAlign: "center" },
  noteInput: { minHeight: 70, paddingTop: 10, textAlignVertical: "top" },
  choice: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  choiceLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  assignment: { borderRadius: 12, padding: 10, marginTop: 8, gap: 6 },
  rowBetween: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  reviewBox: { gap: 6, marginTop: 4 },
  recording: { gap: 4, marginTop: 4 },
  flagged: { gap: 2 },
});
