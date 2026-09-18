import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminInput, safeError } from "./_common";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { LibraryMediaPlayer } from "../../components/library-media-player";

const roles = [["", "الكل"], ["student", "الطلاب"], ["teacher", "المعلمون"]] as const;
export default function Users() {
  const { colors } = useTheme(); const utils = trpc.useUtils();
  const [query, setQuery] = useState(""); const [role, setRole] = useState("");
  const [target, setTarget] = useState<any>(null); const [action, setAction] = useState(""); const [text, setText] = useState(""); const [hours, setHours] = useState("24"); const [confirm, setConfirm] = useState(""); const [feedback, setFeedback] = useState("");
  const q = trpc.admin.usersList.useQuery({ query: query.trim() || undefined, role: (role || undefined) as any }, { retry: 1 });
  const fileQuery = trpc.admin.studentFile.useQuery({ studentId: target?.role === "student" ? target.id : "" }, { enabled: target?.role === "student" });
  const done = (s: string) => ({ onSuccess: () => { setFeedback(s); setTarget(null); setAction(""); setText(""); setConfirm(""); void utils.admin.usersList.invalidate(); }, onError: (e: unknown) => setFeedback(safeError(e, "تعذر تنفيذ العملية.")) });
  const msg = trpc.admin.userMessage.useMutation(done("أُرسلت الرسالة")); const warn = trpc.admin.userWarn.useMutation(done("تم تحذير المستخدم")); const ban = trpc.admin.userBan.useMutation(done("تم حظر المستخدم")); const del = trpc.admin.userDelete.useMutation(done("حُذف المستخدم")); const soft = trpc.admin.teacherSoftDelete.useMutation(done("تم تعطيل حساب المعلم"));
  const pending = msg.isPending || warn.isPending || ban.isPending || del.isPending || soft.isPending;
  if (q.isLoading) return <AdminFrame title="المستخدمون"><LoadingState /></AdminFrame>;
  if (q.error) return <AdminFrame title="المستخدمون"><ErrorState onRetry={() => void q.refetch()} /></AdminFrame>;
  const rows: any[] = Array.isArray(q.data) ? q.data : [];
  const exportCsv = async () => {
    const esc = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = ["الاسم", "الهاتف", "الدور", "الحالة", "تاريخ التسجيل"];
    const csv = "\uFEFF" + [header, ...rows.map((u) => [u.fullName ?? u.name, u.phone, u.role, u.isActive === false ? "موقوف" : "نشط", u.createdAt])].map((r) => r.map(esc).join(",")).join("\n");
    try { await Share.share({ title: "تصدير المستخدمين", message: csv }); } catch (e) { setFeedback(safeError(e, "تعذر مشاركة ملف CSV.")); }
  };
  const run = () => { if (!target) return; if (action === "message") msg.mutate({ userId: target.id, text: text.trim() }); else if (action === "warn") warn.mutate({ userId: target.id, text: text.trim() }); else if (action === "ban") ban.mutate({ userId: target.id, durationHours: Number(hours), reason: text.trim() }); else if (action === "delete") del.mutate({ userId: target.id, confirm: "حذف" }); else soft.mutate({ userId: target.id }); };
  return <AdminFrame title="المستخدمون">
    {!!feedback && <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text>}
    <AdminInput value={query} onChangeText={setQuery} placeholder="بحث بالاسم أو الهاتف" />
     <View style={styles.filters}>{roles.map(([k, label]) => <Button key={k} label={label} variant={role === k ? "primary" : "secondary"} onPress={() => setRole(k)} />)}<Button label="تصدير CSV" variant="secondary" icon="download-outline" onPress={() => void exportCsv()} /></View>
    {!rows.length ? <EmptyState title="لا نتائج" description="لا يوجد مستخدمون مطابقون للبحث." icon="people-outline" /> : rows.map((u) => <Card key={u.id}>
      <Text style={[styles.name, { color: colors.text }]}>{u.fullName ?? u.name ?? "مستخدم"}</Text><Text style={[styles.muted, { color: colors.muted }]}>{u.phone ?? "—"} · {u.role === "student" ? "طالب" : "معلم"} · {u.isActive === false ? "موقوف" : "نشط"}</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>{u.role === "student" ? `${u.levelName ?? "—"} · ${u.totalJuz ?? 0} جزء` : `التقييم ${u.avgRating ?? "—"}${u.isMufti ? " · مفتٍ" : ""}`}</Text>
      <View style={styles.actions}><Button label="التفاصيل" variant="secondary" onPress={() => { setTarget(u); setAction(""); }} /><Button label="رسالة" variant="secondary" onPress={() => { setTarget(u); setAction("message"); }} /><Button label="تحذير" variant="secondary" onPress={() => { setTarget(u); setAction("warn"); }} /><Button label="حظر" variant="danger" onPress={() => { setTarget(u); setAction("ban"); }} />{u.role === "teacher" ? <Button label="تعطيل" variant="danger" onPress={() => { setTarget(u); setAction("soft"); }} /> : <Button label="حذف" variant="danger" onPress={() => { setTarget(u); setAction("delete"); }} />}</View>
    </Card>)}
    {target ? <Card><Text style={[styles.name, { color: colors.text }]}>{target.fullName ?? target.name}</Text><Text style={[styles.muted, { color: colors.muted }]}>الهاتف: {target.phone ?? "—"} · التسجيل: {String(target.createdAt ?? "—")}</Text>
       {target.role === "student" ? fileQuery.isLoading ? <LoadingState /> : fileQuery.error ? <Text style={{ color: colors.danger, textAlign: "right" }}>تعذر تحميل ملف الطالب.</Text> : fileQuery.data ? <View><Text style={[styles.muted, { color: colors.text }]}>المستوى: {fileQuery.data.currentLevelName ?? "غير محدد"} · البرنامج: {fileQuery.data.currentLevelPath ?? "—"}</Text><Text style={[styles.muted, { color: colors.text }]}>التقدم: {fileQuery.data.progress?.length ?? 0} مستويات · الجلسات: {fileQuery.data.sessions?.length ?? 0}</Text><Text style={[styles.muted, { color: colors.text }]}>إجمالي الأجزاء: {fileQuery.data.student?.totalJuz ?? 0} · الحالة: {fileQuery.data.student?.placementTestStatus ?? "—"}</Text><Text style={[styles.muted, { color: colors.text }]}>المرحلة: {fileQuery.data.student?.schoolStage ?? "—"} · الصف: {fileQuery.data.student?.schoolGrade ?? "—"} · ولي الأمر: {fileQuery.data.student?.parentPhone ?? "—"}</Text>{typeof fileQuery.data.student?.placementTestVideoUrl === "string" && fileQuery.data.student.placementTestVideoUrl.trim() ? <LibraryMediaPlayer source={fileQuery.data.student.placementTestVideoUrl} contentType="video" /> : null}</View> : null : null}
      {action === "message" || action === "warn" || action === "ban" ? <><AdminInput value={text} onChangeText={setText} placeholder={action === "message" ? "نص الرسالة" : action === "warn" ? "نص التحذير" : "سبب الحظر"} multiline />{action === "ban" ? <AdminInput value={hours} onChangeText={setHours} placeholder="مدة الحظر بالساعات" /> : null}</> : null}
      {action === "delete" ? <><Text style={{ color: colors.danger, textAlign: "right" }}>اكتب «حذف» للتأكيد</Text><AdminInput value={confirm} onChangeText={setConfirm} placeholder="حذف" /></> : null}
      {action ? <Button label="تأكيد العملية" loading={pending} disabled={pending || (action === "delete" ? confirm !== "حذف" : action !== "soft" && text.trim().length < 3)} onPress={run} /> : null}<Button label="إغلاق" variant="quiet" onPress={() => { setTarget(null); setAction(""); }} />
    </Card> : null}
  </AdminFrame>;
}
const styles = StyleSheet.create({ name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" }, muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginVertical: 4 }, actions: { gap: 7 }, filters: { flexDirection: "row-reverse", gap: 6, marginBottom: 10 }, feedback: { textAlign: "right", marginBottom: 8 } });