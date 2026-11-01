import { useState } from "react";
import { formatDateTime } from "../../lib/format";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Button, Card, EmptyState, Icon, PageHero } from "../../components/ui";
import { LibraryMediaPlayer } from "../../components/library/library-media-player";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "../../components/teacher/teacher-screen";
import { palette, useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { resolveLibraryAsset } from "../../lib/media/library-media";

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
  const { colors, isDark } = useTheme();
  const { token } = useAuth();
  const query = trpc.teacher.myRecordings.useQuery(undefined, { retry: false });
  const rows = (query.data ?? []) as Recording[];
  const [selected, setSelected] = useState<Recording | null>(null);
  const titleOf = (recording: Recording) => `${recording.typeLabel ?? "تسجيل حصة"}${recording.topic ? ` — ${recording.topic}` : ""}`;

  return (
    <TeacherScreen title="تسجيلات حصصي" loading={query.isLoading} error={!!query.error} retry={() => void query.refetch()}>
      <PageHero icon="videocam-outline" title="تسجيلات حصصي" subtitle="مشاهدة فقط — الحذف صلاحية الإدارة حصراً" />
      {rows.length ? rows.map((recording) => (
        <Card key={recording.id}>
          <Pressable accessibilityRole="button" onPress={() => setSelected(recording)} style={styles.row}>
            <View style={[styles.playIcon, { backgroundColor: isDark ? palette.gold : palette.burgundy }]}><Icon name="play" size={20} color={isDark ? palette.night : "#FFFFFF"} /></View>
            <View style={styles.copy}>
              <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{titleOf(recording)}</Text>
              <Text style={[styles.detail, { color: colors.muted }]}>{recording.studentName ?? "—"} · {formatDateTime(recording.createdAt)} · {Math.round(recording.durationSeconds / 60)} د</Text>
            </View>
            {recording.hasEvaluation
              ? <Badge label="مُقيَّمة" tone="success" />
              : <Pressable accessibilityRole="button" hitSlop={6} onPress={() => router.push(`/teacher/evaluate/${recording.sessionId}` as never)}><Badge label="قيّم" tone="gold" /></Pressable>}
          </Pressable>
        </Card>
      )) : <EmptyState title="لا تسجيلات بعد" description="تظهر التسجيلات بعد إنهاء الحصص" />}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selected ? <>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{titleOf(selected)}</Text>
              <RecordingPlayer recording={selected} token={token} />
              <Text style={[styles.note, { color: colors.muted }]}>بث مباشر فقط — لا يُحذف تلقائياً ما دام الحساب نشطاً</Text>
              <Button label="إغلاق" variant="secondary" onPress={() => setSelected(null)} />
            </> : null}
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  playIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  detail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" },
  modal: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, gap: 10 },
  modalTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, lineHeight: 30, textAlign: "right" },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center" },
});
