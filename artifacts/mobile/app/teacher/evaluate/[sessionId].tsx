import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card } from "../../../components/ui";
import { trpc } from "../../../lib/trpc";
import { TeacherScreen } from "../_components";
import { useTheme } from "../../../lib/theme";
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
  const { colors } = useTheme();
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
      void utils.teacher.pendingEvaluations.invalidate();
      void utils.teacher.dashboard.invalidate();
      router.replace("/teacher/evaluations");
    },
  });
  const session = q.data as { studentName?: string; typeLabel?: string; sessionType?: string; topic?: string; scheduledAt?: string | Date } | undefined;
  const total = hifz + revision + tajweed + commitment;
  const canSubmit = !!sessionId && notes.length <= 500 && !evaluate.isPending;

  return (
    <TeacherScreen title="تقييم الحصة" loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {session ? (
        <View>
          <Card accent>
            <Text style={[styles.heading, { color: colors.text }]}>تقييم الحصة</Text>
            <Text style={[styles.sessionText, { color: colors.muted }]}>{session.studentName ?? "الطالب"} — {session.typeLabel ?? session.sessionType ?? "حصة"}</Text>
            {session.topic ? <Text style={[styles.sessionText, { color: colors.muted }]}>{session.topic}</Text> : null}
            <View style={[styles.total, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.totalValue, { color: colors.primary }]}>{total}</Text><Text style={[styles.totalLabel, { color: colors.muted }]}>/100 المجموع</Text></View>
          </Card>
          <Card>
            <ScoreSlider label="الحفظ الجديد" max={50} value={hifz} onChange={setHifz} />
            <ScoreSlider label="المراجعة" max={20} value={revision} onChange={setRevision} />
            <ScoreSlider label="التجويد" max={20} value={tajweed} onChange={setTajweed} />
            <ScoreSlider label="الأداء والالتزام" max={10} value={commitment} onChange={setCommitment} />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>التوصية</Text>
            <View style={styles.recommendations}>
              {([["promote", "ترشيح للترقية"], ["keep", "الاستمرار"], ["review", "يحتاج مراجعة"]] as const).map(([key, label]) => (
                <Pressable key={key} onPress={() => setRecommendation(key)} style={[styles.recommendation, { backgroundColor: recommendation === key ? colors.primary : colors.input, borderColor: recommendation === key ? colors.primary : colors.border }]}>
                  <Text style={{ color: recommendation === key ? colors.primaryText : colors.text, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 }}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>ملاحظات للطالب</Text>
            <TextInput value={notes} onChangeText={setNotes} maxLength={500} multiline placeholder="نقاط القوة وما يحتاج تحسينًا…" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
            <Text style={[styles.counter, { color: colors.muted }]}>{notes.length}/500</Text>
            <TextInput value={audioNotesUrl} onChangeText={setAudioNotesUrl} placeholder="رابط ملاحظات صوتية (اختياري)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="left" autoCapitalize="none" />
             {evaluate.error ? <Text style={[styles.error, { color: colors.danger }]}>{userFacingErrorMessage(evaluate.error, "تعذر حفظ التقييم. حاول مرة أخرى.")}</Text> : null}
            <Button label={`حفظ التقييم (${total}/100)`} loading={evaluate.isPending} disabled={!canSubmit} onPress={() => evaluate.mutate({ sessionId: String(sessionId), hifzScore: hifz, revisionScore: revision, tajweedScore: tajweed, commitmentScore: commitment, notes: notes.trim() || undefined, audioNotesUrl: audioNotesUrl.trim() || undefined, recommendation })} />
          </Card>
        </View>
      ) : null}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: "Amiri_700Bold", fontSize: 22, textAlign: "center" },
  sessionText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "center", marginTop: 4 },
  total: { flexDirection: "row-reverse", alignItems: "baseline", justifyContent: "center", gap: 6, borderRadius: 16, paddingVertical: 10, marginTop: 14 },
  totalValue: { fontFamily: "Amiri_700Bold", fontSize: 30 },
  totalLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12 },
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
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginBottom: 8 },
});