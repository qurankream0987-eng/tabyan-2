import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@workspace/tabyan-trpc/types";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";
import { Badge, Button, Card, Icon, type BadgeTone } from "../ui";
import { SurahPicker } from "../ui/surah-picker";
import { trpc } from "../../lib/trpc";
import { confirmAr } from "../../lib/confirm";
import { toast } from "../../lib/toast";
import { formatDate, formatDateTime, formatDuration } from "../../lib/format";
import { loadRangeWords } from "../../lib/mushaf/mushaf-assets";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { palette, useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { RecordingPlaybackError, RecordingPlayer } from "../../lib/recitation/recording-player";

type Assignment = inferRouterOutputs<AppRouter>["recitationAssignments"]["forStudent"][number];
type Colors = ReturnType<typeof useTheme>["colors"];
type HideMode = Assignment["hideMode"];

/** Web ASSIGNMENT_HIDE_MODES: the modes a teacher picks from, with the hint under the picker. */
const HIDE_MODES: { value: HideMode; label: string; hint: string }[] = [
  { value: "progressive_reveal", label: "تسميع", hint: "النص مخفي ويظهر كلما سمّع الطالب" },
  { value: "first_word", label: "أول كلمة", hint: "تظهر أول كلمة من كل آية فقط" },
  { value: "visible_review", label: "مراجعة بالنظر", hint: "النص ظاهر — يقرأ الطالب من المصحف" },
];

export function assignmentHideModeLabel(mode: HideMode | string | null | undefined) {
  return HIDE_MODES.find((m) => m.value === mode)?.label ?? (mode === "full_hide" ? "إخفاء كامل" : String(mode ?? ""));
}

const STATUS_LABELS: Record<Assignment["status"], string> = {
  assigned: "لم يُسلَّم",
  submitted: "سُلِّم — بانتظار تقييمك",
  reviewed: "قيّمته",
  cancelled: "أُلغي",
};
const STATUS_TONE: Record<Assignment["status"], BadgeTone> = { assigned: "gold", submitted: "live", reviewed: "success", cancelled: "muted" };

const FLAG_LABELS = { mistake: "خطأ", skipped: "متروكة", corrected: "صحّحها", peeked: "تلميح" } as const;
const AUTO_RESULT_NOTE = "هذه الأرقام يحسبها التطبيق آلياً على جهاز الطالب أثناء التسميع، وقد تخطئ. التقييم قرارك أنت.";

export function assignmentRange(assignment: { surahId: number; startAyah: number; endAyah: number }) {
  const name = SURAHS[assignment.surahId - 1]?.name ?? `#${assignment.surahId}`;
  return assignment.startAyah === assignment.endAyah
    ? `سورة ${name} — الآية ${assignment.startAyah}`
    : `سورة ${name} — الآيات ${assignment.startAyah}–${assignment.endAyah}`;
}

/** Number from a field that accepts Arabic-Indic digits; null when empty. */
function parseNumber(value: string) {
  const digits = normalizeDigits(value).replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** Like the web date field: the chosen day ends at 23:59:59 local time. */
function endOfDay(date: Date) {
  const due = new Date(date);
  due.setHours(23, 59, 59, 0);
  return due;
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
  const refresh = () => {
    void utils.recitationAssignments.forStudent.invalidate({ studentId });
    void utils.recitationAssignments.reviewQueue.invalidate();
  };
  const visible = (list.data ?? []).filter((a) => a.status !== "cancelled");

  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}><Icon name="mic" size={16} color={colors.primary} /> واجبات التسميع</Text>
        {!creating ? (
          <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={[styles.addPill, { backgroundColor: `${colors.primary}0f` }]}>
            <Icon name="plus" size={14} color={colors.primary} />
            <Text style={[styles.addPillText, { color: colors.primary }]}>واجب جديد</Text>
          </Pressable>
        ) : null}
      </View>
      {creating ? (
        <CreateForm studentId={studentId} colors={colors} onDone={() => { setCreating(false); refresh(); }} onCancel={() => setCreating(false)} />
      ) : null}
      {list.isLoading ? <Text style={[styles.muted, { color: colors.muted }]}>جارٍ تحميل الواجبات…</Text> : null}
      {list.isError ? <Text style={[styles.error, { color: colors.danger }]}>تعذر تحميل الواجبات.</Text> : null}
      {list.data && visible.length === 0 && !creating ? <Text style={[styles.muted, { color: colors.muted }]}>لا واجبات تسميع لهذا الطالب بعد</Text> : null}
      {visible.map((assignment) => (
        <AssignmentCard key={assignment.id} assignment={assignment} colors={colors} onChanged={refresh} />
      ))}
    </Card>
  );
}

function CreateForm({ studentId, colors, onDone, onCancel }: { studentId: string; colors: Colors; onDone: () => void; onCancel: () => void }) {
  const [surahId, setSurahId] = useState(67);
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("10");
  const [hideMode, setHideMode] = useState<HideMode>("progressive_reveal");
  const [note, setNote] = useState("");
  const [due, setDue] = useState<Date | null>(null);
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [error, setError] = useState("");
  const create = trpc.recitationAssignments.create.useMutation({
    onSuccess: () => { toast("أُرسل الواجب للطالب", "success"); onDone(); },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إنشاء الواجب.")),
  });

  const surah = SURAHS[surahId - 1] ?? SURAHS[0];
  const startAyah = parseNumber(start);
  const endAyah = parseNumber(end);
  const rangeError = !startAyah || !endAyah
    ? "أدخل رقم أول آية وآخر آية"
    : startAyah < 1 || endAyah > surah.ayahs
      ? `السورة ${surah.ayahs} آية فقط`
      : endAyah < startAyah
        ? "آخر آية يجب أن تكون بعد أول آية"
        : null;

  const pickSurah = (n: number) => {
    const next = SURAHS[n - 1] ?? SURAHS[0];
    setSurahId(next.n);
    setStart("1");
    setEnd(String(Math.min(10, next.ayahs)));
    setSurahPickerOpen(false);
  };
  const onDatePicked = (event: DateTimePickerEvent, picked?: Date) => {
    // Android closes its dialog itself; the iOS spinner stays until a date is chosen.
    setDatePickerOpen(false);
    if (event.type === "dismissed" || !picked) return;
    setDue(endOfDay(picked));
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fieldStyle = [styles.input, styles.pickerField, { borderColor: colors.border, backgroundColor: colors.input }];

  return (
    <View style={[styles.form, { backgroundColor: `${colors.primary}0c` }]}>
      <Text style={[styles.label, { color: colors.muted }]}>السورة</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="اختيار السورة" onPress={() => setSurahPickerOpen(true)} style={fieldStyle}>
        <Text style={[styles.pickerText, { color: colors.text }]}>{surah.n}. {surah.name} — {surah.ayahs} آية</Text>
        <Icon name="chevron-down" size={16} color={colors.muted} />
      </Pressable>

      <View style={styles.fieldsRow}>
        <Field label="من آية" value={start} onChange={setStart} colors={colors} />
        <Field label={`إلى آية (حتى ${surah.ayahs})`} value={end} onChange={setEnd} colors={colors} />
      </View>
      {rangeError ? <Text style={[styles.small, { color: colors.danger }]}>{rangeError}</Text> : null}

      <Text style={[styles.label, { color: colors.muted }]}>وضع العرض للطالب</Text>
      <View style={styles.fieldsRow}>
        {HIDE_MODES.map((mode) => {
          const selected = mode.value === hideMode;
          return (
            <Pressable
              key={mode.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setHideMode(mode.value)}
              style={[styles.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.choiceLabel, { color: selected ? colors.primaryText : colors.muted }]}>{mode.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.small, { color: colors.muted }]}>{HIDE_MODES.find((m) => m.value === hideMode)?.hint}</Text>

      <Text style={[styles.label, { color: colors.muted }]}>ملاحظة للطالب (اختياري)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
        placeholder="مثال: ركّز على أحكام المد"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
        textAlign="right"
      />

      <Text style={[styles.label, { color: colors.muted }]}>موعد التسليم (اختياري)</Text>
      <View style={styles.fieldsRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="اختيار موعد التسليم" onPress={() => setDatePickerOpen(true)} style={[...fieldStyle, styles.flex]}>
          <Text style={[styles.pickerText, { color: due ? colors.text : colors.muted }]}>{due ? formatDate(due) : "بدون موعد"}</Text>
          <Icon name="calendar" size={16} color={colors.muted} />
        </Pressable>
        {due ? (
          <Pressable accessibilityRole="button" accessibilityLabel="إزالة الموعد" onPress={() => setDue(null)} style={[styles.clearDate, { borderColor: colors.border }]}>
            <Icon name="x" size={16} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {datePickerOpen ? (
        <DateTimePicker value={due ?? today} mode="date" minimumDate={today} display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onDatePicked} />
      ) : null}

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.fieldsRow}>
        <View style={styles.flex}>
          <Button
            label="إرسال الواجب"
            icon="send"
            loading={create.isPending}
            disabled={!!rangeError || create.isPending}
            onPress={() => {
              if (rangeError || !startAyah || !endAyah) return;
              setError("");
              create.mutate({ studentId, surahId, startAyah, endAyah, hideMode, note: note.trim() || undefined, dueAt: due ?? undefined });
            }}
          />
        </View>
        <View style={styles.flex}><Button label="إلغاء" variant="secondary" onPress={onCancel} /></View>
      </View>

      <SurahPicker visible={surahPickerOpen} selected={surahId} onPick={pickSurah} onClose={() => setSurahPickerOpen(false)} />
    </View>
  );
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
      <Text style={[styles.subheading, { color: colors.text }]}>تسجيل التسميع</Text>
      <Button
        label={loading ? "جارٍ تحميل التسجيل…" : state.playing ? "إيقاف مؤقت" : state.position > 0 ? "متابعة الاستماع" : "استمع للتسميع"}
        variant="secondary"
        icon={state.playing ? "pause" : "play"}
        loading={loading}
        disabled={loading}
        onPress={() => void toggle()}
      />
      {state.duration > 0 ? (
        <Text style={[styles.small, { color: colors.muted }]}>{formatDuration(state.position)} / {formatDuration(state.duration)}</Text>
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function AssignmentCard({ assignment, colors, onChanged }: { assignment: Assignment; colors: Colors; onChanged: () => void }) {
  const [open, setOpen] = useState(assignment.status === "submitted");
  const [error, setError] = useState("");
  const cancel = trpc.recitationAssignments.cancel.useMutation({
    onSuccess: () => { toast("أُلغي الواجب", "success"); onChanged(); },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إلغاء الواجب.")),
  });
  const reviewable = assignment.status === "submitted" || assignment.status === "reviewed";

  return (
    <View style={[styles.assignment, { backgroundColor: `${colors.primary}0c` }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: colors.primary }]}>{assignmentRange(assignment)}</Text>
          <Badge
            tone={STATUS_TONE[assignment.status]}
            label={`${STATUS_LABELS[assignment.status]}${assignment.status === "reviewed" && assignment.teacherScore != null ? ` · ${assignment.teacherScore}/100` : ""}`}
          />
        </View>
        <Text style={[styles.small, { color: colors.muted }]}>
          {[
            assignmentHideModeLabel(assignment.hideMode),
            assignment.dueAt ? `التسليم قبل ${formatDate(assignment.dueAt)}` : null,
            assignment.submittedAt ? `سُلِّم ${formatDateTime(assignment.submittedAt)}` : null,
          ].filter(Boolean).join(" · ")}
        </Text>
      </Pressable>

      {open ? (
        <View style={styles.details}>
          {assignment.note ? (
            <View style={styles.noteRow}>
              <Icon name="edit" size={12} color={colors.muted} />
              <Text style={[styles.body, styles.flex, { color: colors.text }]}>{assignment.note}</Text>
            </View>
          ) : null}

          {assignment.result ? (
            <ResultView assignment={assignment} colors={colors} />
          ) : (
            <Text style={[styles.small, { color: colors.muted }]}>لم يسلّم الطالب هذا الواجب بعد</Text>
          )}

          {reviewable ? <ReviewForm assignment={assignment} colors={colors} onReviewed={onChanged} /> : null}
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          {assignment.status !== "reviewed" ? (
            <Pressable
              accessibilityRole="button"
              disabled={cancel.isPending}
              onPress={() => void confirmAr("إلغاء الواجب", "إلغاء هذا الواجب؟").then((ok) => { if (ok) { setError(""); cancel.mutate({ assignmentId: assignment.id }); } })}
              style={styles.cancelLink}
            >
              <Icon name="x-circle" size={13} color={colors.muted} />
              <Text style={[styles.small, { color: colors.muted }]}>{cancel.isPending ? "جارٍ الإلغاء…" : "إلغاء الواجب"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** The web six-tile result grid, the auto-count note, flagged words and the recording. */
function ResultView({ assignment, colors }: { assignment: Assignment; colors: Colors }) {
  const result = assignment.result!;
  const tiles: { label: string; value: string; error?: boolean }[] = [
    { label: "الكلمات المسمَّعة", value: `${result.wordsRecited}/${result.totalWords}` },
    { label: "أخطاء", value: String(result.confirmedMistakes), error: result.confirmedMistakes > 0 },
    // Results submitted before nothing could be skipped may still carry skipped words.
    ...(result.skippedWords > 0 ? [{ label: "تخطٍّ", value: String(result.skippedWords), error: true }] : []),
    { label: "صحّحها بنفسه", value: String(result.correctedWords) },
    { label: "تلميحات", value: String(result.peekedWords) },
    { label: "المدة", value: formatDuration(result.durationSeconds) },
  ];
  return (
    <View style={styles.result}>
      <View style={styles.tileGrid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tileValue, { color: tile.error ? colors.danger : colors.text }]}>{tile.value}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.tileLabel, { color: colors.muted }]}>{tile.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.noteRow}>
        <Icon name="info" size={12} color={colors.muted} />
        <Text style={[styles.small, styles.flex, { color: colors.muted }]}>{AUTO_RESULT_NOTE}</Text>
      </View>
      <FlaggedWords assignment={assignment} colors={colors} />
      {assignment.audioPath ? <RecordingPlayback key={assignment.audioPath} objectPath={assignment.audioPath} colors={colors} /> : null}
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
  if (!flagged.length) return <Text style={[styles.small, { color: colors.muted }]}>لم يعلّم التطبيق أي كلمة في هذا التسليم</Text>;
  const textByKey = new Map(words.data?.map((word) => [`${word.verseKey}:${word.position}`, word.displayText]) ?? []);
  const byAyah = new Map<number, typeof flagged>();
  for (const word of flagged) {
    const ayah = Number(word.key.split(":")[1]);
    byAyah.set(ayah, [...(byAyah.get(ayah) ?? []), word]);
  }
  return (
    <View style={styles.flagged}>
      <Text style={[styles.subheading, { color: colors.text }]}>مواضع علّمها التطبيق</Text>
      {[...byAyah.entries()].sort(([a], [b]) => a - b).map(([ayah, list]) => (
        <View key={ayah} style={[styles.tile, styles.ayahBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.small, { color: colors.muted, fontFamily: "IBMPlexSansArabic_700Bold" }]}>الآية {ayah}</Text>
          <View style={styles.chips}>
            {list.map((word) => {
              const position = word.key.split(":")[2];
              const text = textByKey.get(word.key);
              return (
                <View key={word.key} style={[styles.chip, { backgroundColor: word.kind === "mistake" ? `${colors.danger}1a` : word.kind === "skipped" ? "rgba(249,115,22,0.14)" : word.kind === "corrected" ? `${palette.gold}26` : colors.input }]}>
                  {text ? <Text style={[styles.chipWord, { color: colors.text }]}>{text}</Text> : null}
                  <Text style={[styles.chipLabel, { color: word.kind === "mistake" ? colors.danger : colors.muted }]}>{FLAG_LABELS[word.kind]} · الكلمة {position}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Web ReviewForm: a read-only summary once reviewed, with "تعديل التقييم" to reopen the fields. */
function ReviewForm({ assignment, colors, onReviewed }: { assignment: Assignment; colors: Colors; onReviewed: () => void }) {
  const [editing, setEditing] = useState(assignment.status === "submitted");
  const [score, setScore] = useState(assignment.teacherScore != null ? String(assignment.teacherScore) : "");
  const [feedback, setFeedback] = useState(assignment.teacherFeedback ?? "");
  const [error, setError] = useState("");
  const review = trpc.recitationAssignments.review.useMutation({
    onSuccess: () => { toast("أُرسل تقييمك للطالب", "success"); setEditing(false); onReviewed(); },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر حفظ التقييم.")),
  });
  const value = parseNumber(score);
  const valid = value !== null && value >= 0 && value <= 100;

  if (!editing) {
    return (
      <View style={[styles.reviewBox, { borderColor: `${colors.success}40`, backgroundColor: `${colors.success}0d` }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.subheading, { color: colors.text }]}>تقييمك</Text>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>{assignment.teacherScore ?? "—"}/100</Text>
        </View>
        {assignment.teacherFeedback ? <Text style={[styles.body, { color: colors.text }]}>{assignment.teacherFeedback}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.editLink}>
          <Text style={[styles.linkText, { color: colors.primary }]}>تعديل التقييم</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.reviewBox, { borderColor: `${palette.gold}4d`, backgroundColor: `${palette.gold}0d` }]}>
      <Text style={[styles.subheading, { color: colors.text }]}>تقييمك للتسميع</Text>
      <View style={styles.scoreRow}>
        <TextInput
          accessibilityLabel="الدرجة من 100"
          value={score}
          onChangeText={setScore}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="0–100"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.numberInput, styles.scoreInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
        />
        <Text style={[styles.small, { color: colors.muted }]}>/ 100</Text>
      </View>
      {score && !valid ? <Text style={[styles.small, { color: colors.danger }]}>الدرجة من 0 إلى 100</Text> : null}
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
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.fieldsRow}>
        <View style={styles.flex}>
          <Button
            label="حفظ التقييم"
            icon="check"
            loading={review.isPending}
            disabled={!valid || review.isPending}
            onPress={() => { if (!valid) return; setError(""); review.mutate({ assignmentId: assignment.id, score: value!, feedback: feedback.trim() || undefined }); }}
          />
        </View>
        {assignment.status === "reviewed" ? <View style={styles.flex}><Button label="إلغاء" variant="secondary" onPress={() => setEditing(false)} /></View> : null}
      </View>
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
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={3}
        style={[styles.input, styles.numberInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, lineHeight: 30, textAlign: "right" },
  addPill: { flexDirection: "row-reverse", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  addPillText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18 },
  title: { flex: 1, fontFamily: "Amiri_700Bold", fontSize: 15, lineHeight: 24, textAlign: "right" },
  subheading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 20, textAlign: "right" },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21, marginTop: 8 },
  small: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10.5, textAlign: "right", lineHeight: 17 },
  label: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, lineHeight: 17, textAlign: "right", marginBottom: 4 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginVertical: 4 },
  linkText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, lineHeight: 18 },
  flex: { flex: 1, minWidth: 0 },
  form: { borderRadius: 16, padding: 12, gap: 8, marginTop: 10 },
  fieldsRow: { flexDirection: "row-reverse", gap: 8, alignItems: "flex-end" },
  input: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  numberInput: { minHeight: 44, textAlign: "center" },
  scoreRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  scoreInput: { width: 96, flex: 0 },
  scoreValue: { fontFamily: "Amiri_700Bold", fontSize: 19, lineHeight: 28 },
  noteInput: { minHeight: 70, paddingTop: 10, textAlignVertical: "top" },
  pickerField: { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pickerText: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 20, textAlign: "right" },
  clearDate: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  choice: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  choiceLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18 },
  assignment: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, gap: 4 },
  rowBetween: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  details: { gap: 10, marginTop: 8 },
  noteRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 6 },
  result: { gap: 8 },
  tileGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  tile: { width: "31.5%", flexGrow: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6, paddingVertical: 8, alignItems: "center" },
  tileValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 22 },
  tileLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 15, textAlign: "center" },
  ayahBox: { width: "100%", alignItems: "stretch", gap: 6, paddingHorizontal: 10 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipWord: { fontFamily: "Amiri_700Bold", fontSize: 14, lineHeight: 20 },
  chipLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 15 },
  reviewBox: { gap: 8, borderRadius: 12, borderWidth: 1, padding: 10 },
  editLink: { alignSelf: "flex-end", minHeight: 32, justifyContent: "center" },
  cancelLink: { flexDirection: "row-reverse", alignItems: "center", gap: 4, alignSelf: "flex-end", minHeight: 32 },
  recording: { gap: 4, marginTop: 4 },
  flagged: { gap: 6 },
});
