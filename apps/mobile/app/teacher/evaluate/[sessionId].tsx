import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, EmptyState } from "../../../components/ui";
import { trpc } from "../../../lib/trpc";
import { TeacherScreen } from "../../../components/teacher/teacher-screen";
import { formatDateTime } from "../../../lib/format";
import { palette, useTheme } from "../../../lib/theme";
import { toast } from "../../../lib/toast";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

type ScoreSliderProps = { label: string; max: number; value: number; onChange: (value: number) => void };

function ScoreSlider({ label, max, value, onChange }: ScoreSliderProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(1);
  const setFromX = (x: number) => onChange(Math.max(0, Math.min(max, Math.round((x / Math.max(width, 1)) * max))));
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => setFromX(event.nativeEvent.locationX),
    onPanResponderMove: (event) => setFromX(event.nativeEvent.locationX),
  }), [max, width]);
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderLabelRow}>
        <Text style={[styles.sliderValue, { color: colors.primary }]}>{value}/{max}</Text>
        <Text style={[styles.sliderLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} {...responder.panHandlers} style={[styles.track, { backgroundColor: colors.input }]}>
        <View style={[styles.fill, { width: `${(value / max) * 100}%`, backgroundColor: colors.primary }]} />
        <View style={[styles.thumb, { left: `${(value / max) * 100}%`, backgroundColor: colors.primaryText, borderColor: colors.primary }]} />
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={[styles.stepButton, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>−</Text></Pressable>
        <Text style={[styles.stepHint, { color: colors.muted }]}>اسحب لاختيار الدرجة</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={[styles.stepButton, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>+</Text></Pressable>
      </View>
    </View>
  );
}

export default function Evaluate() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const q = trpc.teacher.sessionRoom.useQuery({ id: String(sessionId) }, { enabled: !!sessionId, retry: false });
  const utils = trpc.useUtils();
  const [hifz, setHifz] = useState(40);
  const [revision, setRevision] = useState(16);
  const [tajweed, setTajweed] = useState(16);
  const [commitment, setCommitment] = useState(8);
  const [notes, setNotes] = useState("");
  const [audioNotesUrl, setAudioNotesUrl] = useState("");
  const [recommendation, setRecommendation] = useState<"promote" | "keep" | "review">("keep");
  const evaluate = trpc.teacher.evaluate.useMutation({
    onSuccess: () => {
      toast("حُفظ التقييم وأُشعر الطالب", "success");
      void utils.teacher.pendingEvaluations.invalidate();
      void utils.teacher.dashboard.invalidate();
      router.replace("/teacher/evaluations");
    },
    onError: (cause) => toast(userFacingErrorMessage(cause, "تعذر حفظ التقييم. حاول مرة أخرى."), "error"),
  });
  const session = q.data as { studentName?: string; typeLabel?: string; sessionType?: string; topic?: string; scheduledAt?: string | Date } | undefined;
  const total = hifz + revision + tajweed + commitment;
  // Web thresholds: green from 85, gold from 60, red below.
  const totalColor = total >= 85 ? colors.success : total >= 60 ? (isDark ? palette.gold : palette.goldDark) : colors.danger;
  const canSubmit = !!sessionId && notes.length <= 500 && !evaluate.isPending;
  const when = formatDateTime(session?.scheduledAt);

  return (
    <TeacherScreen title="تقييم الحصة" back loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {session ? (
        <View>
          <Card accent>
            <Text style={[styles.heading, { color: colors.text }]}>تقييم الحصة</Text>
            <Text style={[styles.sessionText, { color: colors.muted }]}>الطالب: <Text style={[styles.sessionStrong, { color: colors.text }]}>{session.studentName ?? "الطالب"}</Text> · {session.typeLabel ?? session.sessionType ?? "حصة"}{session.topic ? ` — ${session.topic}` : ""}</Text>
            {when ? <Text style={[styles.sessionText, { color: colors.muted }]}>{when}</Text> : null}
            <View style={[styles.total, { backgroundColor: `${palette.gold}26` }]}><Text style={[styles.totalLabel, { color: colors.text }]}>المجموع:</Text><Text style={[styles.totalValue, { color: totalColor }]}>{total}</Text><Text style={[styles.totalLabel, { color: colors.muted }]}>/100</Text></View>
          </Card>
          <Card>
            <ScoreSlider label="الحفظ الجديد" max={50} value={hifz} onChange={setHifz} />
            <ScoreSlider label="المراجعة" max={20} value={revision} onChange={setRevision} />
            <ScoreSlider label="التجويد" max={20} value={tajweed} onChange={setTajweed} />
            <ScoreSlider label="الأداء" max={10} value={commitment} onChange={setCommitment} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>التوصية</Text>
            <View style={styles.recommendations}>
              {([["promote", "ترشيح للترقية"], ["keep", "الاستمرار"], ["review", "يحتاج مراجعة"]] as const).map(([key, label]) => (
                <Pressable key={key} onPress={() => setRecommendation(key)} style={[styles.recommendation, { backgroundColor: recommendation === key ? colors.primary : colors.input, borderColor: recommendation === key ? colors.primary : colors.border }]}>
                  <Text style={{ color: recommendation === key ? colors.primaryText : colors.text, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 }}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.recommendationHint, { color: colors.muted }]}>التوصية لا تُرقّي الطالب — القرار النهائي للإدارة</Text>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>ملاحظات للطالب</Text>
            <TextInput value={notes} onChangeText={setNotes} maxLength={500} multiline placeholder="نقاط القوة وما يحتاج تحسينًا…" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
            <Text style={[styles.counter, { color: colors.muted }]}>{notes.length}/500</Text>
            <TextInput value={audioNotesUrl} onChangeText={setAudioNotesUrl} placeholder="رابط ملاحظات صوتية (اختياري)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="left" autoCapitalize="none" />
            <Button label={evaluate.isPending ? "جارٍ حفظ التقييم…" : `حفظ التقييم (${total}/100)`} loading={evaluate.isPending} disabled={!canSubmit} onPress={() => evaluate.mutate({ sessionId: String(sessionId), hifzScore: hifz, revisionScore: revision, tajweedScore: tajweed, commitmentScore: commitment, notes: notes.trim() || undefined, audioNotesUrl: audioNotesUrl.trim() || undefined, recommendation })} />
          </Card>
        </View>
      ) : <EmptyState title="الحصة غير موجودة" />}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: "Amiri_700Bold", fontSize: 22, textAlign: "center" },
  sessionText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "center", marginTop: 4 },
  sessionStrong: { fontFamily: "IBMPlexSansArabic_700Bold" },
  total: { flexDirection: "row-reverse", alignItems: "baseline", alignSelf: "center", gap: 6, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 20, marginTop: 14 },
  totalValue: { fontFamily: "Amiri_700Bold", fontSize: 30, lineHeight: 40 },
  totalLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12 },
  recommendationHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: -4, marginBottom: 10 },
  sliderBlock: { marginBottom: 19 },
  sliderLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sliderLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  sliderValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  track: { height: 9, borderRadius: 9, overflow: "visible", justifyContent: "center" },
  fill: { height: 9, borderRadius: 9 },
  thumb: { position: "absolute", width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginLeft: -10 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  stepButton: { width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10 },
  sectionLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right", marginTop: 5, marginBottom: 8 },
  recommendations: { flexDirection: "row-reverse", gap: 7, marginBottom: 10 },
  recommendation: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, marginBottom: 5 },
  textarea: { minHeight: 95, paddingTop: 12 },
  counter: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "left", marginBottom: 10 },
});