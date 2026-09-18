import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Text } from "react-native";
import { useState } from "react";
import { Badge, Button, Card, EmptyState } from "../../../components/ui";
import { trpc } from "../../../lib/trpc";
import { TeacherScreen } from "../_components";
import { useTheme } from "../../../lib/theme";
import TeacherSessionCall from "../../../components/teacher-session-call";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "قيد التأكيد",
  confirmed: "مؤكد",
  pending: "قيد المراجعة",
  in_progress: "جارية",
  completed: "مكتملة",
  cancelled: "ملغاة",
  no_show: "لم يحضر",
};

export default function SessionRoom() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const q = trpc.teacher.sessionRoom.useQuery(
    { id: String(id) },
    { enabled: !!id, refetchInterval: 10000 },
  );
  const start = trpc.teacher.startSession.useMutation({
    onSuccess: () => {
      setActionError("");
      void q.refetch();
    },
    onError: () => setActionError("تعذر بدء الحلقة. تحقق من الموعد وحاول مرة أخرى."),
  });
  const end = trpc.teacher.endSession.useMutation({
    onSuccess: () => {
      setActionError("");
      router.replace(`/teacher/evaluate/${id}`);
    },
    onError: () => setActionError("تعذر إنهاء الحلقة. حاول مرة أخرى."),
  });
  const s = q.data as any;
  const canStart = !!s && !["in_progress", "completed", "cancelled"].includes(String(s.status));

  const finish = () => {
    Alert.alert("إنهاء الحلقة", "هل تريد إنهاء الحلقة لجميع المشاركين؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "إنهاء الحلقة", style: "destructive", onPress: () => end.mutate({ id: String(id) }) },
    ]);
  };

  return (
    <TeacherScreen title="غرفة الحصة" loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {s ? (
        <>
          <Card accent>
            <Badge label={STATUS_LABELS[String(s.status)] ?? String(s.status)} tone={s.status === "completed" ? "success" : s.status === "cancelled" ? "danger" : s.status === "in_progress" ? "success" : "gold"} />
            <Text style={{ textAlign: "right", fontWeight: "bold", fontSize: 18, marginTop: 12, color: colors.text }}>{s.typeLabel ?? s.sessionType}</Text>
            {s.topic ? <Text style={{ textAlign: "right", color: colors.text, marginTop: 5 }}>{s.topic}</Text> : null}
            <Text style={{ textAlign: "right", color: colors.text, marginTop: 5 }}>الطالب: {s.studentName}</Text>
            <Text style={{ textAlign: "right", color: colors.muted, marginTop: 5 }}>{String(s.scheduledAt)} · {s.durationMinutes} دقيقة</Text>
            <Text style={{ textAlign: "right", color: colors.muted, marginTop: 10 }}>
              {s.status === "in_progress" ? "الحلقة جارية. استخدم غرفة الاتصال أدناه." : s.status === "completed" ? "انتهت الحلقة ويمكنك حفظ تقييم الطالب." : s.status === "cancelled" ? "أُلغيت هذه الحلقة." : "ابدأ الحلقة عندما يحين الموعد ليتمكن الطالب من الدخول."}
            </Text>
          </Card>
          {actionError ? <Text style={{ color: colors.danger, textAlign: "right", marginBottom: 10 }}>{actionError}</Text> : null}
          {s.status === "in_progress" ? (
            <>
              <TeacherSessionCall sessionId={String(id)} sessionStatus={String(s.status)} displayName="المعلم" onLeave={() => router.replace("/teacher")} />
              <Button label={end.isPending ? "جارٍ إنهاء الحلقة…" : "إنهاء الحلقة وتقييم الطالب"} icon="stop-circle-outline" variant="danger" loading={end.isPending} disabled={end.isPending} onPress={finish} />
            </>
          ) : canStart ? (
            <Button label={start.isPending ? "جارٍ بدء الحلقة…" : "بدء الحلقة"} icon="play-circle-outline" loading={start.isPending} disabled={start.isPending} onPress={() => start.mutate({ id: String(id) })} />
          ) : s.status === "completed" ? (
            <Button label="تقييم الطالب" icon="create-outline" variant="secondary" onPress={() => router.push(`/teacher/evaluate/${id}`)} />
          ) : null}
        </>
      ) : <EmptyState title="لم تُعثر على الحصة" />}
    </TeacherScreen>
  );
}