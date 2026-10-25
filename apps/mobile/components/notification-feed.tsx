import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState } from "./ui";
import { palette, useTheme } from "../lib/theme";
import { trpc } from "../lib/trpc";
import { userFacingErrorMessage } from "../lib/user-facing-error";

type Period = "all" | "today" | "week" | "month";
type ReadStatus = "all" | "read" | "unread";

const PERIODS: Array<[Period, string]> = [
  ["all", "الكل"], ["today", "اليوم"], ["week", "أسبوع"], ["month", "شهر"],
];
const READ_STATUSES: Array<[ReadStatus, string]> = [
  ["all", "الكل"], ["unread", "غير مقروءة"], ["read", "مقروءة"],
];
const TYPES: Array<[string, string, string]> = [
  ["session_reminder", "تذكير جلسة", "time-outline"],
  ["session_change", "تغيير موعد", "calendar-outline"],
  ["evaluation", "تقييم", "star-outline"],
  ["achievement", "إنجاز", "ribbon-outline"],
  ["announcement", "إعلان", "megaphone-outline"],
  ["ayah", "آية اليوم", "book-outline"],
  ["payment", "مدفوعات", "card-outline"],
  ["placement", "تحديد المستوى", "videocam-outline"],
  ["promotion", "ترقية", "trending-up-outline"],
];

type NotificationRow = {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  priority?: string | null;
  isRead: boolean;
  isPinned: boolean;
  createdAt?: Date | string | null;
  payload?: unknown;
};

function meetingUrl(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const url = (value as { meetingUrl?: unknown }).meetingUrl;
  if (typeof url !== "string" || !url.trim()) return undefined;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function relativeTime(value: NotificationRow["createdAt"]) {
  if (!value) return "—";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "—";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "الآن";
  const ar = (n: number) => String(n).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
  if (minutes < 60) return `منذ ${ar(minutes)} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${ar(hours)} س`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${ar(days)} أيام`;
  return new Date(time).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
}

function typeMeta(type: string) {
  const found = TYPES.find(([key]) => key === type);
  return found ?? ["general", "عام", "notifications-outline"];
}

export function NotificationFeed({ listPath, settingsPath }: { listPath: string; settingsPath: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const [types, setTypes] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("all");
  const [readStatus, setReadStatus] = useState<ReadStatus>("all");
  const [draftTypes, setDraftTypes] = useState<string[]>([]);
  const [draftPeriod, setDraftPeriod] = useState<Period>("all");
  const [draftReadStatus, setDraftReadStatus] = useState<ReadStatus>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = trpc.notifications.list.useQuery({
    types: types.length ? types : undefined,
    period,
    readStatus,
    limit: 60,
  }, { retry: false });

  const invalidate = () => {
    void utils.notifications.list.invalidate();
    void utils.notifications.unreadCount.invalidate();
  };
  const handleMutationError = (cause: unknown) => setActionError(userFacingErrorMessage(cause, "تعذر تنفيذ الإجراء. حاول مرة أخرى."));
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { setActionError(null); invalidate(); }, onError: handleMutationError });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => { setActionError(null); invalidate(); }, onError: handleMutationError });
  const togglePin = trpc.notifications.togglePin.useMutation({ onSuccess: () => { setActionError(null); invalidate(); }, onError: handleMutationError });
  const remove = trpc.notifications.remove.useMutation({ onSuccess: () => { setActionError(null); invalidate(); }, onError: handleMutationError });
  const actionPending = markAll.isPending || markRead.isPending || togglePin.isPending || remove.isPending;

  const openFilter = () => {
    setDraftTypes(types);
    setDraftPeriod(period);
    setDraftReadStatus(readStatus);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setTypes(draftTypes);
    setPeriod(draftPeriod);
    setReadStatus(draftReadStatus);
    setFilterOpen(false);
  };

  const data = query.data;
  const sections: Array<[string, string, NotificationRow[]]> = [
    ["اليوم", "today", (data?.today ?? []) as NotificationRow[]],
    ["مثبتة", "pin", (data?.pinned ?? []) as NotificationRow[]],
    ["سابقًا", "history", (data?.earlier ?? []) as NotificationRow[]],
  ];

  const openMeeting = async (notification: NotificationRow, url: string) => {
    try {
      setActionError(null);
      if (!(await Linking.canOpenURL(url))) throw new Error("الرابط غير متاح.");
      await Linking.openURL(url);
      if (!notification.isRead) markRead.mutate({ id: notification.id });
    } catch (cause) {
      setActionError(userFacingErrorMessage(cause, "تعذر فتح رابط الجلسة. حاول مرة أخرى."));
    }
  };

  return (
    <>
      <View style={styles.toolbar}>
        <View style={styles.toolbarActions}>
          <Pressable accessibilityLabel="تصفية الإشعارات" onPress={openFilter} style={[styles.iconButton, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Icon name="filter-outline" size={19} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityLabel="إعدادات الإشعارات" onPress={() => router.push(settingsPath as never)} style={[styles.iconButton, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Icon name="settings-outline" size={19} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]}>الإشعارات</Text>
          {(data?.unreadCount ?? 0) > 0 ? <Badge label={String(data?.unreadCount)} /> : null}
        </View>
      </View>

      {(data?.unreadCount ?? 0) > 0 ? (
        <Pressable disabled={actionPending} onPress={() => markAll.mutate()} style={[styles.markAll, actionPending && { opacity: 0.5 }]}>
          <Icon name="checkmark-done-outline" size={15} color={palette.gold} />
          <Text style={[styles.markAllText, { color: colors.primary }]}>تعليم الكل كمقروء</Text>
        </Pressable>
      ) : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState onRetry={() => void query.refetch()} /> : (
        sections.every(([, , rows]) => rows.length === 0)
           ? <EmptyState title={types.length || period !== "all" || readStatus !== "all" ? "لا نتائج مطابقة للفلاتر" : "لا توجد إشعارات حالياً"} description="ستظهر هنا تحديثاتك وتنبيهات المنصة." action="تحديث" onAction={() => void query.refetch()} icon="notifications-outline" />
          : sections.map(([label, icon, rows]) => rows.length ? (
            <View key={label}>
              <View style={styles.sectionHeader}>
                <Icon name={icon === "pin" ? "pin-outline" : icon === "today" ? "time-outline" : "hourglass-outline"} size={16} color={palette.gold} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{label}</Text>
              </View>
              {rows.map((notification) => {
                const [, typeLabel, typeIcon] = typeMeta(notification.type);
                const joinUrl = notification.type === "session_reminder" ? meetingUrl(notification.payload) : undefined;
                return (
                  <Card key={notification.id} style={[styles.card, !notification.isRead && { borderColor: `${palette.gold}99`, borderWidth: 1.5 }, notification.priority === "high" && !notification.isRead && { borderRightWidth: 4, borderRightColor: palette.gold }]}>
                    <Pressable onPress={() => router.push(`${listPath}/${notification.id}` as never)} style={styles.cardBody}>
                      <View style={[styles.typeIcon, { backgroundColor: `${palette.gold}22` }]}><Icon name={typeIcon} size={20} color={palette.gold} /></View>
                      <View style={styles.cardCopy}>
                        <View style={styles.cardTitleRow}>
                          <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.text }]}>{notification.title}</Text>
                          {!notification.isRead ? <View style={styles.unreadDot} /> : null}
                        </View>
                        {notification.body ? <Text numberOfLines={2} style={[styles.cardBodyText, { color: colors.muted }]}>{notification.body}</Text> : null}
                        <View style={styles.metaRow}>
                          <Text style={[styles.meta, { color: colors.primary }]}>{typeLabel}</Text>
                          <Text style={[styles.meta, { color: colors.muted }]}>{relativeTime(notification.createdAt)}</Text>
                        </View>
                      </View>
                    </Pressable>
                    {joinUrl ? <Button label="انضم الآن" icon="videocam-outline" onPress={() => void openMeeting(notification, joinUrl)} style={styles.joinButton} /> : null}
                    <View style={styles.cardActions}>
                      {!notification.isRead ? <Pressable disabled={actionPending} accessibilityLabel="تعليم كمقروء" onPress={() => markRead.mutate({ id: notification.id })}><Icon name="checkmark-circle-outline" size={19} color={colors.primary} /></Pressable> : null}
                      <Pressable disabled={actionPending} accessibilityLabel={notification.isPinned ? "إلغاء التثبيت" : "تثبيت"} onPress={() => togglePin.mutate({ id: notification.id })}><Icon name={notification.isPinned ? "pin" : "pin-outline"} size={19} color={notification.isPinned ? palette.gold : colors.muted} /></Pressable>
                      <Pressable disabled={actionPending} accessibilityLabel="حذف الإشعار" onPress={() => remove.mutate({ id: notification.id })}><Icon name="trash-outline" size={19} color={colors.danger} /></Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : null)
      )}

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setFilterOpen(false)}><Icon name="close" size={22} color={colors.muted} /></Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>تصفية الإشعارات</Text>
              <Pressable onPress={() => { setDraftTypes([]); setDraftPeriod("all"); setDraftReadStatus("all"); }}><Text style={[styles.reset, { color: colors.primary }]}>إعادة</Text></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>حسب النوع</Text>
              <View style={styles.chips}>{TYPES.map(([key, label]) => {
                const active = draftTypes.includes(key);
                return <Pressable key={key} onPress={() => setDraftTypes((current) => active ? current.filter((item) => item !== key) : [...current, key])} style={[styles.chip, { borderColor: active ? palette.gold : colors.border, backgroundColor: active ? `${palette.gold}25` : colors.input }]}><Text style={[styles.chipText, { color: active ? colors.primary : colors.muted }]}>{label}</Text></Pressable>;
              })}</View>
              <Text style={[styles.filterLabel, { color: colors.text }]}>حسب الفترة</Text>
              <View style={styles.chips}>{PERIODS.map(([key, label]) => <Pressable key={key} onPress={() => setDraftPeriod(key)} style={[styles.chip, { borderColor: draftPeriod === key ? palette.gold : colors.border, backgroundColor: draftPeriod === key ? `${palette.gold}25` : colors.input }]}><Text style={[styles.chipText, { color: draftPeriod === key ? colors.primary : colors.muted }]}>{label}</Text></Pressable>)}</View>
              <Text style={[styles.filterLabel, { color: colors.text }]}>حسب الحالة</Text>
              <View style={styles.chips}>{READ_STATUSES.map(([key, label]) => <Pressable key={key} onPress={() => setDraftReadStatus(key)} style={[styles.chip, { borderColor: draftReadStatus === key ? palette.gold : colors.border, backgroundColor: draftReadStatus === key ? `${palette.gold}25` : colors.input }]}><Text style={[styles.chipText, { color: draftReadStatus === key ? colors.primary : colors.muted }]}>{label}</Text></Pressable>)}</View>
            </ScrollView>
            <Button label="تطبيق التصفية" onPress={applyFilter} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  toolbarActions: { flexDirection: "row", gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heading: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  title: { fontFamily: "Amiri_700Bold", fontSize: 24 },
  markAll: { flexDirection: "row-reverse", alignItems: "center", gap: 5, alignSelf: "flex-end", paddingVertical: 6, marginBottom: 5 },
  markAllText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 7, marginTop: 13, marginBottom: 7 },
  sectionTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15 },
  card: { padding: 12, marginBottom: 9 },
  cardBody: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 },
  typeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, alignItems: "stretch" },
  cardTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  cardTitle: { flex: 1, textAlign: "right", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.gold },
  cardBodyText: { textAlign: "right", fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, marginTop: 3 },
  metaRow: { flexDirection: "row-reverse", gap: 10, marginTop: 5 },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10 },
  joinButton: { minHeight: 38, marginTop: 9, alignSelf: "flex-end", paddingHorizontal: 14 },
  cardActions: { flexDirection: "row-reverse", gap: 15, justifyContent: "flex-start", marginTop: 9, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${palette.gold}33` },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" },
  modal: { maxHeight: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, gap: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: "Amiri_700Bold", fontSize: 20 },
  reset: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  filterLabel: { textAlign: "right", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, marginTop: 12, marginBottom: 7 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11 },
});