import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { TeacherScreen } from "./_components";

// فلاتر المدة مطابقة للموقع (TeacherSchedule): اليوم، غداً، الأسبوع، الشهر
const RANGES: { key: "today" | "tomorrow" | "week" | "month"; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "tomorrow", label: "غداً" },
  { key: "week", label: "الأسبوع" },
  { key: "month", label: "الشهر" },
];

export default function Schedule() {
  const [range, setRange] = useState<"today" | "tomorrow" | "week" | "month">("week");
  const { colors } = useTheme();
  const router = useRouter();
  const q = trpc.teacher.schedule.useQuery({ range });
  const d = q.data as any;
  const rows = d?.sessions ?? [];
  const changeRequests = d?.changeRequests ?? [];
  const respond = trpc.teacher.respondChangeRequest.useMutation({
    onSuccess: () => void q.refetch(),
  });
  return (
    <TeacherScreen title="جدولي" loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      <View style={styles.filters}>
        {RANGES.map((r) => {
          const active = r.key === range;
          return (
            <Pressable
              key={r.key}
              accessibilityRole="button"
              onPress={() => setRange(r.key)}
              style={({ pressed }) => ({
                flex: 1, borderRadius: 999, paddingVertical: 10, opacity: pressed ? 0.85 : 1,
                backgroundColor: active ? colors.primary : `${colors.primary}0f`,
              })}
            >
              <Text style={[styles.filterText, { color: active ? colors.primaryText : colors.primary }]}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {changeRequests.length > 0 ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>طلبات تغيير الموعد</Text>
          {changeRequests.map((request: any) => (
            <View key={request.id} style={[styles.request, { backgroundColor: `${colors.primary}08` }]}>
              <Text style={[styles.title, { color: colors.text }]}>{request.studentName}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>يطلب موعداً جديداً: {formatDateTime(request.requestedNewTime)}</Text>
              {request.reason ? <Text style={[styles.meta, { color: colors.muted }]}>السبب: {request.reason}</Text> : null}
              <View style={styles.requestActions}>
                <Button label="قبول" variant="primary" onPress={() => respond.mutate({ id: request.id, approve: true })} disabled={respond.isPending} />
                <Button label="اعتذار" variant="secondary" onPress={() => respond.mutate({ id: request.id, approve: false })} disabled={respond.isPending} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      {rows.length ? rows.map((s: any) => (
        <Card key={s.id}>
          <View style={styles.cardHeader}>
            <View style={styles.cardBody}>
              <Text style={[styles.title, { color: colors.text }]}>{s.typeLabel ?? s.sessionType}{s.topic ? ` — ${s.topic}` : ""}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {s.studentName} · {formatDateTime(s.scheduledAt)} · {s.durationMinutes} د{s.type === "group" ? " · جماعية" : ""}
              </Text>
            </View>
            <Badge label={statusLabel(s.status)} tone={statusTone(s.status)} />
          </View>
          {["scheduled", "confirmed", "in_progress"].includes(s.status) && s.id ? (
            <Button label={s.status === "in_progress" ? "دخول الحلقة" : "الغرفة ←"} icon={s.status === "in_progress" ? "videocam-outline" : undefined} variant="secondary" onPress={() => router.push(`/teacher/session/${s.id}`)} />
          ) : null}
        </Card>
      )) : <EmptyState title="لا حصص في هذه الفترة" />}
    </TeacherScreen>
  );
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "مؤكد",
  scheduled: "قيد التأكيد",
  pending: "قيد المراجعة",
  completed: "مكتملة",
  cancelled: "ملغاة",
  no_show: "لم يحضر",
  in_progress: "جارية",
};

function statusLabel(status: unknown) {
  return STATUS_LABELS[String(status)] ?? String(status ?? "");
}

function statusTone(status: unknown): "gold" | "success" | "danger" | "muted" {
  if (status === "completed" || status === "confirmed") return "success";
  if (status === "cancelled" || status === "no_show") return "danger";
  return "gold";
}

function formatDateTime(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return `${date.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "long" })} — ${date.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}`;
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "center" },
  sectionTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", marginBottom: 10 },
  request: { borderRadius: 16, padding: 12, marginBottom: 8 },
  requestActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  cardBody: { flex: 1, alignItems: "flex-end" },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
});
