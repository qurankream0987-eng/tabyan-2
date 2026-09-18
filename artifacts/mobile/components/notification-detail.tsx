import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, ErrorState, Header, Icon, LoadingState, Screen } from "./ui";
import { palette, useTheme } from "../lib/theme";
import { trpc } from "../lib/trpc";
import { userFacingErrorMessage } from "../lib/user-facing-error";
import { useAuth } from "../lib/auth";
import { resolveLibraryAsset } from "../lib/library-media";

type RolePrefix = "/student" | "/teacher" | "/admin";

type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  createdAt?: Date | string | null;
  priority?: string | null;
  isRead?: boolean;
  isPinned?: boolean | null;
  payload?: unknown;
  attachments?: unknown;
  primaryActionUrl?: string | null;
  primaryActionLabel?: string | null;
  secondaryActionUrl?: string | null;
  secondaryActionLabel?: string | null;
};

const TYPE_META: Record<string, { label: string; icon: string }> = {
  session_reminder: { label: "تذكير جلسة", icon: "time-outline" },
  session_change: { label: "تغيير موعد", icon: "calendar-outline" },
  evaluation: { label: "تقييم", icon: "star-outline" },
  achievement: { label: "إنجاز", icon: "ribbon-outline" },
  announcement: { label: "إعلان", icon: "megaphone-outline" },
  ayah: { label: "آية اليوم", icon: "book-outline" },
  payment: { label: "مدفوعات", icon: "card-outline" },
  placement: { label: "تحديد المستوى", icon: "videocam-outline" },
  promotion: { label: "ترقية", icon: "trending-up-outline" },
  session: { label: "جلسات", icon: "calendar-outline" },
  activity: { label: "نشاط", icon: "stats-chart-outline" },
  general: { label: "عام", icon: "notifications-outline" },
};

type Payload = {
  date?: string;
  time?: string;
  durationMinutes?: number;
  sessionKind?: string;
  teacherName?: string;
  subject?: string;
  meetingUrl?: string;
};

type Attachment = { name: string; kind: "pdf" | "audio" | "file"; url?: string };

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function readPayload(value: unknown): Payload | null {
  const raw = objectValue(value);
  if (!raw) return null;
  return {
    date: typeof raw.date === "string" ? raw.date : undefined,
    time: typeof raw.time === "string" ? raw.time : undefined,
    durationMinutes: typeof raw.durationMinutes === "number" ? raw.durationMinutes : undefined,
    sessionKind: typeof raw.sessionKind === "string" ? raw.sessionKind : undefined,
    teacherName: typeof raw.teacherName === "string" ? raw.teacherName : undefined,
    subject: typeof raw.subject === "string" ? raw.subject : undefined,
    meetingUrl: typeof raw.meetingUrl === "string" ? raw.meetingUrl : undefined,
  };
}

function readAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const raw = objectValue(item);
    if (!raw || typeof raw.name !== "string") return [];
    const kind = raw.kind === "audio" || raw.kind === "pdf" || raw.kind === "file" ? raw.kind : "file";
    return [{ name: raw.name, kind, url: typeof raw.url === "string" ? raw.url : undefined }];
  });
}

function safeMeetingUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function fullTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — ${date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;
}

function resolveInternalUrl(url: string, base: RolePrefix) {
  const clean = url.startsWith("/") ? url : `/${url}`;
  if (/^\/(login|register|teacher-register)(\/|$)/.test(clean)) return clean;
  if (/^\/(student|teacher|admin)(\/|$)/.test(clean)) return clean;
  return `${base}${clean}`;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { colors } = useTheme();
  const [actionError, setActionError] = useState<string | null>(null);
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: `${palette.burgundy}0D` }]}><Icon name={icon} size={15} color={palette.burgundy} /></View>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function NotificationDetail({ listPath, base }: { listPath: string; base: RolePrefix }) {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuth();
  const { colors } = useTheme();
  const [actionError, setActionError] = useState<string | null>(null);
  const query = trpc.notifications.byId.useQuery({ id: id ?? "" }, { enabled: !!id, retry: false });
  const utils = trpc.useUtils();
  const invalidate = () => {
    void utils.notifications.list.invalidate();
    void utils.notifications.unreadCount.invalidate();
  };
  const togglePin = trpc.notifications.togglePin.useMutation({
    onSuccess: invalidate,
    onError: (cause) => setActionError(userFacingErrorMessage(cause, "تعذر تحديث تثبيت الإشعار. حاول مرة أخرى.")),
  });
  const remove = trpc.notifications.remove.useMutation({
    onSuccess: () => {
      invalidate();
      router.replace(listPath as never);
    },
    onError: (cause) => setActionError(userFacingErrorMessage(cause, "تعذر حذف الإشعار. حاول مرة أخرى.")),
  });
  const notification = query.data as NotificationRecord | undefined;
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: invalidate });
  useEffect(() => {
    if (notification && !notification.isRead) markRead.mutate({ id: notification.id });
  }, [notification?.id, notification?.isRead]);

  if (query.isLoading || !id) return <><Header title="تفاصيل الإشعار" back /><Screen><LoadingState /></Screen></>;
  if (query.error || !notification) {
    return <><Header title="تفاصيل الإشعار" back /><Screen><ErrorState message="الإشعار غير موجود أو تم حذفه." onRetry={() => void query.refetch()} /><Button label="العودة للإشعارات" icon="arrow-forward" variant="secondary" onPress={() => router.replace(listPath as never)} /></Screen></>;
  }

  const meta = TYPE_META[notification.type] ?? TYPE_META.general;
  const payload = readPayload(notification.payload);
  const attachments = readAttachments(notification.attachments);
  const meetingUrl = notification.type === "session_reminder" ? safeMeetingUrl(payload?.meetingUrl) : undefined;

  const openAction = async (url: string) => {
    try {
      setActionError(null);
        if (/^https?:\/\//.test(url) || /^\/objects(?:\/|$)/.test(url)) {
          const target = /^\/objects\//.test(url) ? resolveLibraryAsset(url, token) : url;
          if (!(await Linking.canOpenURL(target))) throw new Error("الرابط غير متاح.");
          await Linking.openURL(target);
        return;
      }
        if (/^(javascript|data|file):/i.test(url)) throw new Error("هذا الإجراء غير متاح من التطبيق.");
        router.push(resolveInternalUrl(url, base) as never);
    } catch (cause) {
      setActionError(userFacingErrorMessage(cause, "تعذر فتح الإجراء. حاول مرة أخرى."));
    }
  };

  return (
    <>
      <Header title="تفاصيل الإشعار" back />
      <Screen>
        <Pressable onPress={() => router.replace(listPath as never)} style={styles.backLink}><Text style={[styles.backText, { color: colors.primary }]}>الإشعارات</Text></Pressable>
        <Card style={styles.mainCard}>
          <View style={[styles.typeIcon, { backgroundColor: colors.primary }]}><Icon name={meta.icon} size={36} color={palette.gold} /></View>
          <View style={styles.badges}>
            <Badge label={meta.label} />
            {notification.priority === "high" ? <Badge label="هام" tone="danger" /> : null}
            {notification.isPinned ? <Badge label="مثبت" tone="gold" /> : null}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{fullTime(notification.createdAt)}</Text>
          {notification.body ? <Text style={[styles.body, { color: colors.text }]}>{notification.body}</Text> : null}

          {payload && (payload.teacherName || payload.subject || payload.date || payload.time || payload.durationMinutes != null || payload.sessionKind) ? (
            <View style={[styles.details, { borderTopColor: `${palette.gold}66` }]}>
              {payload.teacherName ? <InfoRow icon="user" label="المعلم" value={payload.teacherName} /> : null}
              {payload.subject ? <InfoRow icon="book" label="المادة" value={payload.subject} /> : null}
              {payload.date ? <InfoRow icon="calendar" label="الموعد" value={payload.date} /> : null}
              {payload.time ? <InfoRow icon="clock" label="الساعة" value={payload.time} /> : null}
              {payload.durationMinutes != null ? <InfoRow icon="timer" label="المدة" value={`${payload.durationMinutes} دقيقة`} /> : null}
              {payload.sessionKind ? <InfoRow icon="location" label="نوع الحلقة" value={payload.sessionKind} /> : null}
            </View>
          ) : null}

          {meetingUrl ? <Button label="انضم الآن" icon="videocam-outline" onPress={() => void openAction(meetingUrl)} /> : null}
          {notification.primaryActionUrl ? <Button label={notification.primaryActionLabel ?? "الإجراء الأساسي"} icon="arrow-back" variant={meetingUrl ? "secondary" : "primary"} onPress={() => void openAction(notification.primaryActionUrl!)} /> : null}
          {notification.secondaryActionUrl ? <Button label={notification.secondaryActionLabel ?? "إجراء إضافي"} icon="arrow-back" variant="secondary" onPress={() => void openAction(notification.secondaryActionUrl!)} /> : null}
           {actionError ? <Text style={[styles.actionError, { color: colors.danger }]}>{actionError}</Text> : null}
          <View style={styles.managementActions}>
             <Button label={notification.isPinned ? "إلغاء التثبيت" : "تثبيت"} icon={notification.isPinned ? "pin" : "pin-outline"} variant="secondary" loading={togglePin.isPending} disabled={togglePin.isPending || remove.isPending} onPress={() => togglePin.mutate({ id: notification.id })} />
             <Button label={remove.isPending ? "جارٍ حذف الإشعار…" : "حذف الإشعار"} icon="trash-outline" variant="danger" loading={remove.isPending} disabled={togglePin.isPending || remove.isPending} onPress={() => remove.mutate({ id: notification.id })} />
          </View>
        </Card>

        {attachments.length ? (
          <Card>
            <Text style={[styles.attachmentsTitle, { color: colors.text }]}>مرفقات</Text>
            {attachments.map((attachment) => (
              <Pressable key={`${attachment.name}-${attachment.kind}`} disabled={!attachment.url || !!remove.isPending} onPress={() => attachment.url ? void openAction(attachment.url) : undefined} style={[styles.attachment, { borderBottomColor: colors.border, opacity: attachment.url ? 1 : 0.55 }]}>
                <Text style={[styles.attachmentName, { color: colors.text }]}>{attachment.name}</Text>
                <Text style={[styles.attachmentType, { color: colors.muted }]}>{attachment.kind === "audio" ? "صوت" : attachment.kind === "pdf" ? "PDF" : "ملف"}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  backLink: { alignSelf: "flex-end", paddingVertical: 4, marginBottom: 8 },
  backText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
  mainCard: { alignItems: "center", paddingVertical: 22 },
  typeIcon: { width: 80, height: 80, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  typeGlyph: { color: palette.gold, fontSize: 38, lineHeight: 42 },
  badges: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 6 },
  title: { fontFamily: "Amiri_700Bold", fontSize: 25, lineHeight: 35, textAlign: "center", marginTop: 3 },
  date: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center", marginTop: 4 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, lineHeight: 28, textAlign: "center", marginTop: 16, width: "100%" },
  details: { width: "100%", borderTopWidth: 1, marginTop: 18, paddingTop: 15, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 9, width: "100%" },
  infoIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  infoLabel: { width: 62, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right" },
  infoValue: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  attachmentsTitle: { fontFamily: "Amiri_700Bold", fontSize: 18, textAlign: "right", marginBottom: 8 },
  attachment: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  attachmentName: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  attachmentType: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginLeft: 10 },
  managementActions: { width: "100%", gap: 8, marginTop: 12 },
  actionError: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 20, marginTop: 8 },
});