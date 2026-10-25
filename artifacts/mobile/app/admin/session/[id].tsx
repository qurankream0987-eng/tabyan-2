import { useLocalSearchParams } from "expo-router";
import { AdminFrame, safeError } from "../_common";
import { Badge, Card, ErrorState, LoadingState } from "../../../components/ui";
import { useTheme } from "../../../lib/theme";
import { Text } from "react-native";
import { trpc } from "../../../lib/trpc";
import { AdminSessionMonitor } from "../../../components/admin-session-monitor";
export default function SessionDetails() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { colors } = useTheme();
  const q = trpc.admin.sessionRoom.useQuery({ id: String(id ?? "") }, { enabled: !!id, refetchInterval: 10000 });
  if (q.isLoading) return <AdminFrame title="تفاصيل الجلسة"><LoadingState label="جارٍ الدخول إلى الحلقة…" /></AdminFrame>;
  if (q.error) return <AdminFrame title="تفاصيل الجلسة"><ErrorState message={safeError(q.error, "الجلسة غير موجودة")} onRetry={() => void q.refetch()} /></AdminFrame>;
  const s: any = q.data;
  const statusLabel = s?.status === "in_progress" ? "جارية" : s?.status === "completed" ? "منتهية" : s?.status === "cancelled" ? "ملغاة" : "مجدولة";
   return <AdminFrame title="تفاصيل الجلسة"><Card accent><Badge label={statusLabel} tone={s?.status === "in_progress" ? "success" : s?.status === "cancelled" ? "danger" : "gold"} /><Text style={{ color: colors.text, textAlign: "right", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 18, marginTop: 10 }}>{s?.typeLabel ?? s?.sessionType}</Text>{s?.topic ? <Text style={{ color: colors.text, textAlign: "right" }}>{s.topic}</Text> : null}<Text style={{ color: colors.text, textAlign: "right" }}>المعلم: {s?.teacherName ?? "—"} · الطالب: {s?.studentName ?? "—"}</Text><Text style={{ color: colors.muted, textAlign: "right", marginTop: 8 }}>{s?.scheduledAt ? String(s.scheduledAt) : "موعد غير محدد"}{s?.durationMinutes ? ` · ${s.durationMinutes} دقيقة` : ""}</Text><Text style={{ color: colors.muted, textAlign: "right", marginTop: 8 }}>وضع المراقبة — الميكروفون والكاميرا معطّلان للمشرف.</Text></Card>{s?.status === "in_progress" ? <AdminSessionMonitor sessionId={String(id ?? "")} sessionStatus={String(s.status)} /> : null}</AdminFrame>;
}