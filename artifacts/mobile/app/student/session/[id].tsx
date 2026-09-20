import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../lib/auth";
import { resolveLibraryAsset } from "../../../lib/library-media";
import { trpc } from "../../../lib/trpc";
import { LibraryMediaPlayer } from "../../../components/library-media-player";
import { StudentScreen, LoadingState, ErrorState, EmptyState, Card, Badge } from "../_screen";
import { useTheme } from "../../../lib/theme";
import StudentSessionCall from "../../../components/student-session-call";

export default function Session() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const q = trpc.student.sessionRoom.useQuery({ id: String(id) }, { enabled: !!token && !!id, refetchInterval: 10000 });
  const recordings = trpc.student.myRecordings.useQuery(undefined, { enabled: !!token });
  if (q.isLoading) return <StudentScreen title="الجلسة"><LoadingState /></StudentScreen>;
  if (q.error) return <StudentScreen title="الجلسة"><ErrorState onRetry={() => void q.refetch()} /></StudentScreen>;
  if (!q.data) return <StudentScreen title="الجلسة"><EmptyState title="الجلسة غير موجودة" /></StudentScreen>;
  const d: any = q.data;
  const recording: any = (recordings.data ?? []).find((item: any) => item.sessionId === String(id));
  const recordingSource = recording?.videoUrl ? resolveLibraryAsset(recording.videoUrl, token) : "";
  return (
    <StudentScreen title="تفاصيل الحلقة">
      <Card>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{String(d.typeLabel ?? d.sessionType)}</Text>
          <Badge
            label={d.status === "cancelled" ? "ملغاة" : d.status === "completed" ? "مكتملة" : d.status === "in_progress" ? "جارية" : "قادمة"}
            tone={d.status === "completed" ? "success" : d.status === "cancelled" ? "danger" : "gold"}
          />
        </View>
        <Text style={[styles.meta, { color: colors.muted }]}>{String(d.scheduledAt)}</Text>
        {d.teacherName ? <Text style={[styles.meta, { color: colors.muted }]}>المعلم: {String(d.teacherName)}</Text> : null}
        <Text style={[styles.note, { color: colors.muted }]}>
          {d.status === "in_progress" ? "هذه الحلقة جارية. يمكنك الدخول بعد السماح بالكاميرا والميكروفون." : "يعرض هذا القسم تفاصيل الموعد والتسجيلات السابقة. سيظهر الدخول الحي عند بدء الحلقة."}
        </Text>
      </Card>
      {d.status === "in_progress" ? (
        <StudentSessionCall
          sessionId={String(id)}
          sessionStatus={String(d.status)}
          displayName={String(d.studentName ?? "")}
          onLeave={() => router.replace("/student/schedule" as never)}
        />
      ) : null}
      {recordings.isLoading ? <LoadingState label="جارٍ التحقق من التسجيل…" /> : recordingSource ? <LibraryMediaPlayer source={recordingSource} contentType="video" /> : null}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12.5, textAlign: "right", marginTop: 8 },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 12 },
});