import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, EmptyState, Icon } from "../../components/ui";
import { LibraryMediaPlayer } from "../../components/library-media-player";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "./_components";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { resolveLibraryAsset } from "../../lib/library-media";

type Recording = {
  id: string; sessionId: string; videoUrl: string | null; durationSeconds: number;
  createdAt: string | Date; studentName?: string; topic?: string | null;
  typeLabel?: string; hasEvaluation: boolean;
};

function RecordingPlayer({ recording, token }: { recording: Recording; token: string | null }) {
  const source = recording.videoUrl ? resolveLibraryAsset(recording.videoUrl, token) : "";
  return <LibraryMediaPlayer source={source} contentType="video" />;
}

export default function Recordings() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useAuth();
  const query = trpc.teacher.myRecordings.useQuery(undefined, { retry: false });
  const rows = (query.data ?? []) as Recording[];
  const [selected, setSelected] = useState<Recording | null>(null);

  return (
    <TeacherScreen title="حلقاتي المُسجَّلة" loading={query.isLoading} error={!!query.error} retry={() => void query.refetch()}>
      {rows.length ? rows.map((recording) => (
        <Card key={recording.id}>
          <Pressable onPress={() => setSelected(recording)} style={styles.row}>
            <View style={[styles.playIcon, { backgroundColor: colors.primary }]}><Icon name="play" size={20} color={colors.primaryText} /></View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>{recording.typeLabel ?? "تسجيل حصة"}{recording.topic ? ` — ${recording.topic}` : ""}</Text>
              <Text style={[styles.detail, { color: colors.muted }]}>{recording.studentName ?? "—"} · {Math.round(recording.durationSeconds / 60)} د · {String(recording.createdAt)}</Text>
            </View>
          </Pressable>
          <View style={styles.bottomRow}>
            {recording.hasEvaluation ? <Text style={[styles.evaluated, { color: colors.success }]}><Icon name="checkmark-circle-outline" size={14} color={colors.success} /> مُقيّمة</Text> : <Button label="قيّم" icon="create-outline" variant="secondary" onPress={() => router.push(`/teacher/evaluate/${recording.sessionId}` as never)} />}
            <Text style={[styles.mediaHint, { color: colors.muted }]}>مشاهدة فقط</Text>
          </View>
        </Card>
      )) : <EmptyState title="لا توجد تسجيلات" description="ستظهر تسجيلات الحصص هنا بعد توفرها." icon="videocam-outline" />}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selected ? <><Text style={[styles.modalTitle, { color: colors.text }]}>{selected.typeLabel ?? "تسجيل حصة"}{selected.topic ? ` — ${selected.topic}` : ""}</Text><RecordingPlayer recording={selected} token={token} /><Text style={[styles.detail, { color: colors.muted }]}>المدة المسجلة: {selected.durationSeconds} ثانية</Text><Button label="إغلاق" variant="secondary" onPress={() => setSelected(null)} /></> : null}
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  playIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  detail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 5 },
  bottomRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D4AF3744" },
  evaluated: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 },
  mediaHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" },
  modal: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18 },
  modalTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, textAlign: "right", marginBottom: 12 },
});