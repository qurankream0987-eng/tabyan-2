import { useLocalSearchParams, useRouter } from "expo-router";
import { formatDateTime } from "../../../lib/format";
import { Alert, Text } from "react-native";
import { useCallback, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState } from "../../../components/ui";
import { trpc } from "../../../lib/trpc";
import { useAuth } from "../../../lib/auth";
import { TeacherScreen } from "../../../components/teacher/teacher-screen";
import { useTheme } from "../../../lib/theme";
import TeacherSessionCall, { type TeacherSessionCallHandle } from "../../../components/call/teacher-session-call";
import { finalizeLiveSessionRecording, uploadNativeLiveSessionRecording } from "../../../lib/media/mobile-upload";

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
  const { name } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [actionError, setActionError] = useState("");
  const callRef = useRef<TeacherSessionCallHandle>(null);
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
  const canStart = !!s && ["scheduled", "confirmed"].includes(String(s.status));

  const saveRecording = useCallback(async (recording: {
    uri: string;
    durationSeconds: number;
    accountGeneration: number;
  }) => {
    const finalizedRecording = await uploadNativeLiveSessionRecording(recording.uri, {
      name: `live-session-${String(id)}.mp4`,
      contentType: "video/mp4",
    }, recording.accountGeneration);
    await finalizeLiveSessionRecording(String(id), finalizedRecording, recording.durationSeconds);
    // The recordings list is likely already mounted behind this screen; show the new one without a manual refresh.
    void utils.teacher.myRecordings.invalidate();
  }, [id, utils]);

  const finish = () => {
    Alert.alert("إنهاء الحلقة", "هل تريد إنهاء الحلقة لجميع المشاركين؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "إنهاء الحلقة",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await callRef.current?.stopRecording();
            end.mutate({ id: String(id) });
          })();
        },
      },
    ]);
  };

  return (
    <TeacherScreen title="غرفة الحصة" back loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {s ? (
        <>
          <Card accent>
            <Badge label={STATUS_LABELS[String(s.status)] ?? String(s.status)} tone={s.status === "completed" ? "success" : s.status === "cancelled" ? "danger" : s.status === "in_progress" ? "success" : "gold"} />
            <Text style={{ textAlign: "right", fontWeight: "bold", fontSize: 18, marginTop: 12, color: colors.text }}>{s.typeLabel ?? s.sessionType}</Text>
            {s.topic ? <Text style={{ textAlign: "right", color: colors.text, marginTop: 5 }}>{s.topic}</Text> : null}
            <Text style={{ textAlign: "right", color: colors.text, marginTop: 5 }}>الطالب: {s.studentName}</Text>
            <Text style={{ textAlign: "right", color: colors.muted, marginTop: 5 }}>{formatDateTime(s.scheduledAt) || "موعد غير محدد"} · {s.durationMinutes} دقيقة</Text>
            <Text style={{ textAlign: "right", color: colors.muted, marginTop: 10 }}>
              {s.status === "in_progress" ? "الحلقة جارية. استخدم غرفة الاتصال أدناه." : s.status === "completed" ? "انتهت الحلقة ويمكنك حفظ تقييم الطالب." : s.status === "cancelled" ? "أُلغيت هذه الحلقة." : "ابدأ الحلقة عندما يحين الموعد ليتمكن الطالب من الدخول."}
            </Text>
          </Card>
          {actionError ? <Text style={{ color: colors.danger, textAlign: "right", marginBottom: 10 }}>{actionError}</Text> : null}
          {s.status === "in_progress" ? (
            <>
              <TeacherSessionCall
                ref={callRef}
                sessionId={String(id)}
                sessionStatus={String(s.status)}
                displayName={name ?? "المعلم"}
                recordingEnabled={s.recordingEnabled === true}
                isTeacher
                onRecordingReady={saveRecording}
                onLeave={() => router.replace("/teacher")}
              />
              <Button label={end.isPending ? "جارٍ إنهاء الحلقة…" : "إنهاء الحلقة وتقييم الطالب"} icon="stop" variant="danger" loading={end.isPending} disabled={end.isPending} onPress={finish} />
            </>
          ) : canStart ? (
            <Button label={start.isPending ? "جارٍ بدء الحلقة…" : "بدء الحلقة"} icon="play" loading={start.isPending} disabled={start.isPending} onPress={() => start.mutate({ id: String(id) })} />
          ) : s.status === "completed" ? (
            <Button label="تقييم الطالب" icon="edit" variant="secondary" onPress={() => router.push(`/teacher/evaluate/${id}`)} />
          ) : null}
        </>
      ) : <EmptyState title="لم تُعثر على الحصة" />}
    </TeacherScreen>
  );
}