import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminInput, safeError } from "../../components/admin/admin-common";
import { AdminSheet, SheetFooter, useAdminFeedback } from "../../components/admin/admin-ui";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { LibraryMediaPlayer } from "../../components/library/library-media-player";

type UserRow = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  role: "student" | "teacher" | string;
  isActive?: boolean;
  createdAt?: string | Date | null;
  totalJuz?: number;
  levelName?: string | null;
  avgRating?: string | null;
  isMufti?: boolean;
  bannedUntil?: string | Date | null;
  banReason?: string | null;
  kycStatus?: string | null;
};

type Feedback = { message: string; tone: "success" | "error" | "info" };
type Action = "" | "message" | "warn" | "ban" | "delete" | "soft";

const roles = [["", "الكل"], ["student", "الطلاب"], ["teacher", "المعلمون"]] as const;
const actionTitles: Record<Exclude<Action, "">, string> = {
  message: "إرسال رسالة",
  warn: "تحذير رسمي",
  ban: "حظر مؤقت",
  delete: "حذف نهائي",
  soft: "إيقاف المعلم",
};

export default function Users() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const notify = useAdminFeedback();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [target, setTarget] = useState<UserRow | null>(null);
  const [action, setAction] = useState<Action>("");
  const [text, setText] = useState("");
  const [hours, setHours] = useState("24");
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const q = trpc.admin.usersList.useQuery(
    { query: query.trim() || undefined, role: (role || undefined) as "student" | "teacher" | undefined },
    { retry: 1 },
  );
  const fileQuery = trpc.admin.studentFile.useQuery(
    { studentId: target?.role === "student" ? target.id : "" },
    { enabled: target?.role === "student" },
  );

  const resetAction = () => {
    setTarget(null);
    setAction("");
    setText("");
    setConfirm("");
  };
  const complete = (message: string) => {
    notify(message);
    setFeedback({ message, tone: "success" });
    resetAction();
    void utils.admin.usersList.invalidate();
  };
  const fail = (error: unknown, fallback: string) => {
    setFeedback({ message: safeError(error, fallback), tone: "error" });
  };
  const mutationOptions = (success: string, fallback: string) => ({
    onSuccess: () => complete(success),
    onError: (error: unknown) => fail(error, fallback),
  });

  const msg = trpc.admin.userMessage.useMutation(mutationOptions("تم إرسال الرسالة للمستخدم", "تعذر إرسال الرسالة، حاول مرة أخرى."));
  const warn = trpc.admin.userWarn.useMutation(mutationOptions("تم تسجيل التحذير وإرساله للمستخدم", "تعذر إرسال التحذير، حاول مرة أخرى."));
  const ban = trpc.admin.userBan.useMutation(mutationOptions("تم حظر المستخدم وإنهاء صلاحية دخوله", "تعذر حظر المستخدم، حاول مرة أخرى."));
  const del = trpc.admin.userDelete.useMutation(mutationOptions("تم حذف المستخدم وبياناته المرتبطة", "تعذر حذف المستخدم، لم تُحذف بياناته."));
  const soft = trpc.admin.teacherSoftDelete.useMutation(mutationOptions("تم إيقاف حساب المعلم مع الاحتفاظ ببياناته", "تعذر إيقاف حساب المعلم، حاول مرة أخرى."));
  const pending = msg.isPending || warn.isPending || ban.isPending || del.isPending || soft.isPending;

  const openAction = (user: UserRow, next: Action) => {
    if (pending) return;
    setFeedback(null);
    setTarget(user);
    setAction(next);
    setText("");
    setConfirm("");
  };
  const hoursNumber = Number(hours);
  const validHours = Number.isInteger(hoursNumber) && hoursNumber >= 1;
  const canSubmit = Boolean(target) && !pending && (
    action === "delete" ? confirm === "حذف"
      : action === "soft" ? true
      : text.trim().length >= 3 && text.trim().length <= (action === "ban" ? 500 : 1000) && (action !== "ban" || validHours)
  );
  const run = () => {
    if (!target || !canSubmit) return;
    if (action === "message") msg.mutate({ userId: target.id, text: text.trim() });
    else if (action === "warn") warn.mutate({ userId: target.id, text: text.trim() });
    else if (action === "ban") ban.mutate({ userId: target.id, durationHours: hoursNumber, reason: text.trim() });
    else if (action === "delete") del.mutate({ userId: target.id, confirm: "حذف" });
    else if (action === "soft") soft.mutate({ userId: target.id });
  };

  const rows = (Array.isArray(q.data) ? q.data : []) as UserRow[];
  const statusLabel = (user: UserRow) => user.isActive === false ? "موقوف" : user.bannedUntil && new Date(user.bannedUntil) > new Date() ? "محظور" : "نشط";
  const dateLabel = (value: string | Date | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  };
  const programLabel = (path?: string | null) => ({ quran: "القرآن الكريم", qiraat: "القرآن الكريم", tajweed: "دروس التجويد", tajweed_correction: "دروس التجويد", sharia: "الدروس الشرعية" }[path ?? ""] ?? path ?? "—");
  const stateLabel = (status: string) => ({ in_progress: "جارٍ", completed: "مكتمل", locked: "مقفل", scheduled: "مجدولة", confirmed: "مؤكدة", cancelled: "ملغاة", pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض", live: "جارية", no_show: "غياب", active: "نشط" }[status] ?? "غير محدد");
  const exportCsv = async () => {
    if (!rows.length) { notify("لا توجد نتائج للتصدير", "info"); return; }
    const esc = (value: unknown) => {
      const text = String(value ?? "");
      return `"${(/^[=+\-@]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
    };
    const header = ["الاسم", "الهاتف", "الدور", "الحالة", "تاريخ التسجيل"];
    const csv = "\uFEFF" + [header, ...rows.map((u) => [
      u.fullName, u.phone, u.role === "student" ? "طالب" : "معلم",
      u.isActive === false ? "موقوف" : "نشط", dateLabel(u.createdAt),
    ])].map((row) => row.map(esc).join(",")).join("\n");
    try {
      await Share.share({ title: "تصدير المستخدمين", message: csv });
      setFeedback({ message: `تم تجهيز تصدير ${rows.length} سجلاً`, tone: "success" });
    } catch (error) {
      setFeedback({ message: safeError(error, "تعذر مشاركة ملف CSV."), tone: "error" });
    }
  };

  return <AdminFrame title="المستخدمون">
    {feedback ? <Text style={[styles.feedback, { color: feedback.tone === "error" ? colors.danger : feedback.tone === "success" ? colors.success : colors.primary }]}>{feedback.message}</Text> : null}
    <AdminInput value={query} onChangeText={setQuery} placeholder="بحث بالاسم أو الهاتف" />
    <View style={styles.filters}>
      {roles.map(([key, label]) => <Button key={key} label={label} variant={role === key ? "primary" : "secondary"} disabled={pending} onPress={() => setRole(key)} />)}
      <Button label="تصدير CSV" variant="secondary" icon="download-outline" disabled={pending} onPress={() => void exportCsv()} />
    </View>

    {q.isLoading ? <LoadingState label="جارٍ تحميل المستخدمين…" /> : q.error ? <ErrorState message={safeError(q.error, "تعذر تحميل المستخدمين. حاول مرة أخرى.")} onRetry={() => void q.refetch()} /> : !rows.length ? <EmptyState title="لا نتائج" description="لا يوجد مستخدمون مطابقون للبحث." icon="people-outline" /> : rows.map((user) => (
      <Card key={user.id}>
        <Text style={[styles.name, { color: colors.text }]}>{user.fullName ?? "مستخدم"}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>{user.phone ?? "—"} · {user.role === "student" ? "طالب" : "معلم"} · {statusLabel(user)}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          {user.role === "student" ? `${user.levelName ?? "—"} · ${user.totalJuz ?? 0} جزء` : `التقييم ${user.avgRating ?? "—"}${user.isMufti ? " · مفتٍ" : ""} · ${user.kycStatus === "approved" ? "موثّق" : user.kycStatus ? stateLabel(user.kycStatus) : "—"}`}
        </Text>
        <View style={styles.actions}>
          <Button label="التفاصيل" variant="secondary" disabled={pending} onPress={() => openAction(user, "")} />
          <Button label="رسالة" variant="secondary" disabled={pending} onPress={() => openAction(user, "message")} />
          <Button label="تحذير" variant="secondary" disabled={pending} onPress={() => openAction(user, "warn")} />
          <Button label="حظر" variant="danger" disabled={pending} onPress={() => openAction(user, "ban")} />
          {user.role === "teacher"
            ? <Button label="تعطيل" variant="danger" disabled={pending} onPress={() => openAction(user, "soft")} />
            : <Button label="حذف" variant="danger" disabled={pending} onPress={() => openAction(user, "delete")} />}
        </View>
      </Card>
    ))}

    <AdminSheet visible={!!target} title={target?.fullName ?? "مستخدم"} subtitle={target && action ? actionTitles[action] : "تفاصيل المستخدم"}
      onClose={resetAction} busy={pending} dirty={!!action && (text.trim().length > 0 || confirm.length > 0)}
      footer={action ? (requestClose) => <SheetFooter onSecondary={requestClose} danger={action === "delete" || action === "ban" || action === "soft"} loading={pending} disabled={!canSubmit} onPrimary={run}
        primaryLabel={action === "delete" ? "حذف المستخدم" : action === "soft" ? "إيقاف المعلم" : action === "ban" ? "حظر المستخدم" : action === "warn" ? "إرسال التحذير" : "إرسال الرسالة"} /> : undefined}>
              {feedback ? (
                <Text style={[styles.feedback, { color: feedback.tone === "error" ? colors.danger : feedback.tone === "success" ? colors.success : colors.primary }]}>
                  {feedback.message}
                </Text>
              ) : null}

              <Text style={[styles.muted, { color: colors.muted }]}>
                الهاتف: {target?.phone ?? "—"} · التسجيل: {String(target?.createdAt ?? "—")}
              </Text>

              {target?.role === "student" ? fileQuery.isLoading ? <LoadingState label="جارٍ تحميل ملف الطالب…" />
                : fileQuery.error ? <ErrorState message="تعذر تحميل ملف الطالب." onRetry={() => void fileQuery.refetch()} />
                : fileQuery.data ? <View>
                  <Text style={[styles.muted, { color: colors.text }]}>المستوى: {fileQuery.data.currentLevelName ?? "غير محدد"} · البرنامج: {programLabel(fileQuery.data.currentLevelPath)}</Text>
                  <Text style={[styles.muted, { color: colors.text }]}>التقدم: {fileQuery.data.progress?.length ?? 0} مستويات · الجلسات: {fileQuery.data.sessions?.length ?? 0}</Text>
                  <Text style={[styles.muted, { color: colors.text }]}>إجمالي الأجزاء: {fileQuery.data.student?.totalJuz ?? 0} · الحالة: {stateLabel(fileQuery.data.student?.placementTestStatus ?? "")}</Text>
                  <Text style={[styles.muted, { color: colors.text }]}>تاريخ الميلاد: {fileQuery.data.student?.birthDate ?? "—"}</Text>
                  <Text style={[styles.muted, { color: colors.text }]}>المرحلة: {({ primary: "ابتدائي", middle: "متوسط", high: "ثانوي" } as Record<string, string>)[fileQuery.data.student?.schoolStage ?? ""] ?? "—"} · الصف: {fileQuery.data.student?.schoolGrade ?? "—"} · ولي الأمر: {fileQuery.data.student?.parentPhone ?? "—"}</Text>
                  <Text style={[styles.name, { color: colors.primary }]}>تقدم الطالب</Text>
                  {!fileQuery.data.progress?.length ? <Text style={[styles.muted, { color: colors.muted }]}>لا تقدم مسجل بعد</Text> : fileQuery.data.progress.map((progress) => (
                    <View key={progress.id} style={[styles.detailRow, { borderColor: colors.border }]}>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>{progress.levelName}</Text>
                      <Text style={[styles.muted, { color: colors.muted }]}>{stateLabel(progress.status)} · {progress.completedJuz} جزء · {progress.completedSessions} حصة</Text>
                      <Text style={[styles.muted, { color: colors.muted }]}>{dateLabel(progress.startedAt)}</Text>
                    </View>
                  ))}
                  <Text style={[styles.name, { color: colors.primary }]}>الجدول المرتبط</Text>
                  {!fileQuery.data.sessions?.length ? <Text style={[styles.muted, { color: colors.muted }]}>لا حصص مسجلة بعد</Text> : fileQuery.data.sessions.map((session) => (
                    <View key={session.id} style={[styles.detailRow, { borderColor: colors.border }]}>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>{session.typeLabel} · {stateLabel(session.status)}</Text>
                      <Text style={[styles.muted, { color: colors.muted }]}>{session.teacherName} · {dateLabel(session.scheduledAt)} · {session.durationMinutes} دقيقة</Text>
                    </View>
                  ))}
                  <Text style={[styles.name, { color: colors.primary }]}>ملفات الطالب</Text>
                  {typeof fileQuery.data.student?.placementTestVideoUrl === "string" && fileQuery.data.student.placementTestVideoUrl.trim()
                    ? <LibraryMediaPlayer source={fileQuery.data.student.placementTestVideoUrl} contentType="video" /> : null}
                </View> : <Text style={[styles.muted, { color: colors.muted }]}>لا توجد تفاصيل إضافية لهذا الطالب.</Text>
                : <Text style={[styles.muted, { color: colors.muted }]}>يمكنك تنفيذ إجراء على هذا المستخدم من الخيارات أدناه.</Text>}

              {action === "message" || action === "warn" || action === "ban" ? <>
                <AdminInput value={text} onChangeText={(value) => setText(value.slice(0, action === "ban" ? 500 : 1000))} placeholder={action === "message" ? "نص الرسالة" : action === "warn" ? "نص التحذير" : "سبب الحظر"} multiline />
                {action === "ban" ? <AdminInput value={hours} onChangeText={setHours} placeholder="مدة الحظر بالساعات" keyboardType="number-pad" /> : null}
              </> : null}
              {action === "delete" ? <>
                <Text style={[styles.warning, { color: colors.danger }]}>سيُحذف حساب «{target?.fullName ?? "الطالب"}» وبياناته المرتبطة نهائياً ولا يمكن التراجع عن ذلك. اكتب «حذف» للتأكيد.</Text>
                <AdminInput value={confirm} onChangeText={setConfirm} placeholder="حذف" />
              </> : null}
              {action === "soft" ? <Text style={[styles.warning, { color: colors.muted }]}>سيتم إيقاف حساب المعلم مع الاحتفاظ ببياناته وتسجيلاته.</Text> : null}
              {!action ? <Text style={[styles.modalHint, { color: colors.muted }]}>اختر التفاصيل أو أحد الإجراءات من بطاقة المستخدم.</Text> : null}
    </AdminSheet>
  </AdminFrame>;
}

const styles = StyleSheet.create({
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginVertical: 4 },
  actions: { gap: 7 },
  filters: { flexDirection: "row-reverse", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  detailHeader: { gap: 4 },
  detailRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  actionTitle: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, textAlign: "right" },
  warning: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right", marginVertical: 8 },
  feedback: { textAlign: "right", marginBottom: 8, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.48)" },
  modalSheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalKeyboard: { flex: 1 },
  modalContent: { padding: 18, gap: 10, paddingBottom: 28 },
  modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 6 },
  modalHeaderCopy: { flex: 1, gap: 3 },
  closeButton: { minHeight: 38, paddingHorizontal: 13, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  closeButtonText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  modalHint: { textAlign: "right", fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, marginTop: 2 },
});