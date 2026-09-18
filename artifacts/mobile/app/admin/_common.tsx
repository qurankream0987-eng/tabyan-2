import { Linking, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Badge, Button, Card, EmptyState, ErrorState, Header, Icon, LoadingState, Screen, SectionTitle } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { LibraryMediaPlayer } from "../../components/library-media-player";
import { useAuth } from "../../lib/auth";
import { resolveLibraryAsset } from "../../lib/library-media";
import { confirmAr } from "../../lib/confirm";
import { normalizeDigits } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";
import {
  isPlacementVideoAbOriginal,
  PlacementVideoAbHarness,
  PLACEMENT_VIDEO_AB_DIAGNOSTIC_ENABLED,
} from "../../components/placement-video-ab-harness";

export const adminRoutes = [
  ["users", "المستخدمون", "people-outline"], ["accounts", "الحسابات", "key-outline"],
  ["schedules", "الجداول", "calendar-outline"], ["sessions-monitoring", "مراقبة الجلسات", "videocam-outline"],
  ["library", "المكتبة", "library-outline"], ["qiraat", "القراءات", "musical-notes-outline"],
  ["promotions", "طلبات الترقية", "trending-up-outline"], ["levels", "المستويات", "layers-outline"],
  ["sharia", "العلوم الشرعية", "scale-outline"], ["teachers-review", "مراجعة المعلمين", "school-outline"],
  ["students-review", "مراجعة الطلاب", "person-outline"], ["fatwas", "الفتاوى", "chatbubble-ellipses-outline"],
  ["muftis", "المفتون", "shield-checkmark-outline"], ["assessments", "التقييمات", "clipboard-outline"],
  ["analytics", "التحليلات", "bar-chart-outline"], ["notifications", "الإشعارات", "notifications-outline"],
  ["inbox", "صندوق الوارد", "mail-outline"], ["audit-log", "سجل التدقيق", "list-outline"], ["settings", "الإعدادات", "settings-outline"],
] as const;

const QURAN_PLACEMENT_LEVEL_NAMES = ["الغرس", "السنبلة", "النماء", "الثمرة", "الوارثون"] as const;

export function AdminFrame({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  return <><Header title={title} right={right} menu="admin" /><Screen><View style={styles.nav}><Pressable onPress={() => router.replace("/admin")}><Text style={[styles.home, { color: colors.primary }]}>لوحة المشرف</Text></Pressable></View>{children}</Screen></>;
}

export function AdminList({ title, procedure = "kpis", icon = "shield-checkmark-outline" }: { title: string; procedure?: string; icon?: string }) {
  // The procedure name is deliberately selected from the server's admin router;
  // this keeps every native section backed by the authenticated tRPC API.
  const adminApi = trpc.admin as any;
  const input = procedure === "fatwaInbox" ? { tab: "pending" } : procedure === "auditLogsList" ? { page: 1 } : undefined;
  const q = adminApi[procedure].useQuery(input, { retry: 1 });
  const { colors } = useTheme();
  if (q.isLoading) return <AdminFrame title={title}><LoadingState /></AdminFrame>;
  if (q.error) return <AdminFrame title={title}><ErrorState onRetry={() => void q.refetch()} /></AdminFrame>;
  const raw = q.data;
  const data = (Array.isArray(raw) ? { items: raw } : (raw ?? {})) as Record<string, any>;
  const urgent = data.urgent ?? {};
  const count = Array.isArray(data.items) ? data.items.length : Object.values(urgent).reduce((a: number, v: any) => a + (typeof v === "number" ? v : 0), 0);
  return <AdminFrame title={title}>
    <Card accent><Text style={[styles.heading, { color: colors.text }]}>{title}</Text><Text style={[styles.description, { color: colors.muted }]}>إدارة {title} ومتابعة آخر التحديثات من الخادم.</Text><View style={styles.stats}><Badge label={`العناصر النشطة: ${count}`} /><Badge label="متصل بالخادم" tone="success" /></View></Card>
    <SectionTitle title="ملخص الحالة" />
    {count === 0 ? <EmptyState title="لا توجد عناصر معلقة" description="ستظهر البيانات هنا عند توفرها." icon={icon} /> : <Card>{Array.isArray(data.items) ? data.items.slice(0, 12).map((item: any, index: number) => <View key={String(item.id ?? index)} style={[styles.row, { borderBottomColor: colors.border }]}><Text style={[styles.value, { color: colors.text }]}>{String(item.fullName ?? item.title ?? item.name ?? item.status ?? "عنصر")}</Text><Text style={[styles.label, { color: colors.muted }]}>{String(item.createdAt ?? item.scheduledAt ?? "")}</Text></View>) : Object.entries(urgent).map(([key, value]) => <View key={key} style={[styles.row, { borderBottomColor: colors.border }]}><Text style={[styles.value, { color: colors.text }]}>{String(value)}</Text><Text style={[styles.label, { color: colors.muted }]}>{key}</Text></View>)}</Card>}
    <Button label="تحديث البيانات" variant="secondary" icon="refresh-outline" onPress={() => void q.refetch()} />
    {procedure !== "kpis" ? <Text style={[styles.note, { color: colors.muted }]}>تُحمّل القائمة التفصيلية عبر إجراء المشرف الحقيقي: {procedure}</Text> : null}
  </AdminFrame>;
}

export function ConfirmButton({ label, onConfirm, danger = false, disabled = false, loading = false }: { label: string; onConfirm: () => void; danger?: boolean; disabled?: boolean; loading?: boolean }) {
  return <Button label={label} variant={danger ? "danger" : "secondary"} disabled={disabled} loading={loading} onPress={() => void confirmAr("تأكيد العملية", `هل تريد تنفيذ «${label}»؟`).then((ok) => { if (ok && !disabled && !loading) onConfirm(); })} />;
}

export function AdminWorkflow({ title, kind }: { title: string; kind: "placement" | "kyc" | "qiraat" | "promotion" | "fatwa" | "mufti" }) {
  const { colors } = useTheme(); const { token, role } = useAuth(); const utils = trpc.useUtils();
  const queries = {
    placement: trpc.admin.placementList.useQuery(undefined), kyc: trpc.admin.kycList.useQuery(undefined),
    qiraat: trpc.admin.qiraatList.useQuery(undefined), promotion: trpc.admin.promotionsList.useQuery(undefined),
    fatwa: trpc.admin.fatwaInbox.useQuery({ tab: "pending" }), mufti: trpc.admin.muftisList.useQuery(undefined),
  } as const;
  const q = queries[kind]; const [selected, setSelected] = useState<any>(null); const [note, setNote] = useState(""); const [category, setCategory] = useState(""); const [selectedMuftiId, setSelectedMuftiId] = useState(""); const [resultLevelId, setResultLevelId] = useState<number | undefined>(); const [feedback, setFeedback] = useState(""); const [certificateOpenPath, setCertificateOpenPath] = useState<string | null>(null); const [certificateOpenError, setCertificateOpenError] = useState("");
  const placementPath = selected?.pathType === "tajweed_correction" ? "tajweed_correction" : "quran";
  const levelsQ = trpc.admin.placementLevelThresholds.useQuery({ path: placementPath }, { enabled: kind === "placement" && !!selected });
  const placement = trpc.admin.placementReview.useMutation(); const kyc = trpc.admin.kycReview.useMutation(); const qiraat = trpc.admin.qiraatReview.useMutation(); const promotion = trpc.admin.promotionReview.useMutation();
  const fatwaAssign = trpc.admin.fatwaAssign.useMutation(); const fatwaCategory = trpc.admin.fatwaUpdateCategory.useMutation(); const fatwaReject = trpc.admin.fatwaRejectQuestion.useMutation(); const muftiUnassign = trpc.admin.muftiUnassign.useMutation(); const muftisQ = trpc.admin.muftisList.useQuery(undefined, { enabled: kind === "fatwa" });
  const pending = placement.isPending || kyc.isPending || qiraat.isPending || promotion.isPending || fatwaAssign.isPending || fatwaCategory.isPending || fatwaReject.isPending || muftiUnassign.isPending;
  const close = () => { setSelected(null); setNote(""); setSelectedMuftiId(""); setResultLevelId(undefined); setCertificateOpenPath(null); setCertificateOpenError(""); };
  const run = async (fn: () => Promise<unknown>, invalidate?: () => void) => { try { await fn(); close(); setFeedback("تم تنفيذ العملية بنجاح"); void q.refetch(); invalidate?.(); } catch (e) { setFeedback(userFacingErrorMessage(e, "تعذر تنفيذ العملية. حاول مرة أخرى.")); } };
  const openCertificate = async (value: unknown) => {
    const raw = typeof value === "string" ? value.trim() : "";
    setCertificateOpenPath(raw || null);
    setCertificateOpenError("");
    const target = raw ? resolveLibraryAsset(raw, token) : "";
    try {
      if (!target) throw new Error("missing certificate");
      const parsed = new URL(target);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid certificate");
      if (!(await Linking.canOpenURL(target))) throw new Error("unsupported certificate");
      await Linking.openURL(target);
      setCertificateOpenPath(null);
    } catch {
      setCertificateOpenError("تعذر فتح الشهادة. تحقق من الاتصال وحاول مرة أخرى.");
    }
  };
  if (q.isLoading) return <AdminFrame title={title}><LoadingState /></AdminFrame>;
  if (q.error) return <AdminFrame title={title}><ErrorState onRetry={() => void q.refetch()} /><Text style={{ color: colors.danger, textAlign: "right" }}>{userFacingErrorMessage(q.error, "تعذر تحميل البيانات.")}</Text></AdminFrame>;
  const raw: any = q.data; const rows: any[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
  const label = (r: any) => r.name ?? r.fullName ?? r.studentName ?? r.teacherName ?? r.questionText ?? r.title ?? "عنصر";
  const isPending = (r: any) => !r.status || ["pending", "submitted", "awaiting_review", "under_review"].includes(String(r.status).toLowerCase());
  const elapsed = (r: any) => {
    if (r.hoursAgo != null && Number.isFinite(Number(r.hoursAgo))) return `منذ ${Math.max(0, Math.round(Number(r.hoursAgo)))} ساعة${Number(r.hoursAgo) >= 20 ? " · اقتربت مهلة 24س!" : ""}`;
    const created = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
    if (!Number.isFinite(created)) return "";
    const hours = Math.max(0, Math.floor((Date.now() - created) / 3600000));
    return `منذ ${hours} ساعة${hours >= 20 ? " · اقتربت مهلة 24س!" : ""}`;
  };
  const timestamp = (value: unknown) => {
    if (!value) return "";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  };
  const media = (url: unknown, type: "audio" | "video" = "video") => typeof url === "string" && url.trim() ? <LibraryMediaPlayer source={url} contentType={type} /> : <Text style={[styles.note, { color: colors.muted }]}>لا يوجد ملف مرفق</Text>;
  const ask = (text: string, fn: () => void) => void confirmAr("تأكيد العملية", text).then((ok) => { if (ok) fn(); });
  const certificates = selected?.certificates ?? [];
  const answers = Array.isArray(selected?.answers) ? selected.answers : [];
  const placementLevels = placementPath === "quran"
    ? QURAN_PLACEMENT_LEVEL_NAMES
      .map((name) => (Array.isArray(levelsQ.data) ? levelsQ.data.find((level: any) => level.path === "quran" && level.name === name) : undefined))
      .filter(Boolean) as Array<{ id: number; name: string; path: string }>
    : Array.isArray(levelsQ.data)
      ? levelsQ.data.filter((level: any) => level.path === placementPath)
      : [];
  const reviewTeacher = (decision: "approve" | "reject" | "request_info") => {
    if (!selected) return;
    void run(() => kyc.mutateAsync({ teacherId: selected.teacherId, decision, notes: note.trim() || undefined }), () => void utils.admin.kycList.invalidate());
  };
  return <AdminFrame title={title}>
    {!!feedback && <Text style={[styles.note, { color: feedback.startsWith("تعذر") ? colors.danger : colors.success }]}>{feedback}</Text>}
     {!rows.length ? <EmptyState title="لا توجد عناصر معلقة" description="ستظهر البيانات هنا عند توفرها." /> : rows.map((r, i) => <Card key={String(r.id ?? r.teacherId ?? r.userId ?? i)}>
       <Text style={[styles.value, { color: colors.text }]} numberOfLines={3}>{label(r)}</Text>
       <Text style={[styles.label, { color: colors.muted }]}>{r.status ?? r.kycStatus ?? r.pathType ?? r.categoryLabel ?? ""}</Text>
       {elapsed(r) ? <Text style={[styles.note, { color: Number(r.hoursAgo) >= 20 ? colors.danger : colors.muted }]}>{elapsed(r)}</Text> : null}
       {timestamp(r.createdAt) ? <Text style={[styles.note, { color: colors.muted }]}>تاريخ التسجيل: {timestamp(r.createdAt)}</Text> : null}
       {kind === "placement" ? <><Text style={[styles.note, { color: colors.muted }]}>{r.pathType === "tajweed_correction" ? "تصحيح التلاوة" : (r.pathType ?? "القرآن الكريم")}{r.schoolStage ? ` · ${r.schoolStage}` : ""}{r.schoolGrade ? ` — ${r.schoolGrade}` : ""}</Text>{isPending(r) ? <Button label="تشغيل ومراجعة" icon="play-circle-outline" onPress={() => { setSelected(r); setResultLevelId(undefined); setNote(""); }} /> : null}</> : kind === "qiraat" || kind === "promotion" ? (isPending(r) ? <Button label="مراجعة" onPress={() => { setSelected(r); setNote(""); }} /> : null) : kind === "mufti" ? <Button label="إلغاء التعيين" variant="danger" disabled={pending} onPress={() => ask("هل تريد إلغاء التعيين؟", () => void run(() => muftiUnassign.mutateAsync({ teacherId: r.teacherId })))} /> : kind === "fatwa" && !r.muftiId ? <Button label="إسناد للمفتي" disabled={pending} onPress={() => { setSelected(r); setSelectedMuftiId(""); }} /> : (isPending(r) ? <Button label="مراجعة" onPress={() => { setSelected(r); setNote(""); setCategory(r.category ?? ""); }} /> : null)}
    </Card>)}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={close}><View style={styles.backdrop}><SafeAreaView style={[styles.modal, { backgroundColor: colors.card }] }><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
       <View style={styles.modalHeader}>
         <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى قائمة المراجعة" onPress={close} style={[styles.modalBack, { borderColor: colors.border, backgroundColor: colors.input }]}>
           <Icon name="arrow-forward" size={17} color={colors.primary} />
           <Text style={[styles.modalBackText, { color: colors.primary }]}>رجوع</Text>
         </Pressable>
         <Text style={[styles.modalHeaderTitle, { color: colors.primary }]}>مراجعة الطالب</Text>
       </View>
       <Text style={[styles.heading, { color: colors.text }]}>{label(selected ?? {})}</Text>{selected?.questionText ? <Text style={[styles.note, { color: colors.text }]}>{selected.questionText}</Text> : null}
          {kind === "placement" ? <><Text style={[styles.note, { color: colors.muted }]}>{selected?.pathType === "tajweed_correction" ? "تصحيح التلاوة" : (selected?.pathType ?? "القرآن الكريم")}{selected?.schoolStage ? ` · ${selected.schoolStage}` : ""}{selected?.schoolGrade ? ` — ${selected.schoolGrade}` : ""}</Text>{media(selected?.videoUrl)}{role === "admin" && PLACEMENT_VIDEO_AB_DIAGNOSTIC_ENABLED && isPlacementVideoAbOriginal(selected?.videoUrl) ? <PlacementVideoAbHarness originalSource={selected.videoUrl} /> : null}<Text style={[styles.label, { color: colors.muted }]}>المستوى عند القبول (مطلوب للاعتماد)</Text>{levelsQ.isLoading ? <LoadingState label="جارٍ تحميل مستويات هذا المسار…" /> : placementLevels.map((level: any) => <Pressable key={level.id} onPress={() => setResultLevelId(level.id)} style={[styles.choice, { borderColor: resultLevelId === level.id ? colors.primary : colors.border, backgroundColor: resultLevelId === level.id ? colors.primary : colors.input }]}><Text style={{ color: resultLevelId === level.id ? colors.primaryText : colors.text, textAlign: "right" }}>{level.name}</Text></Pressable>)}</> : null}
        {kind === "kyc" ? <>{media(selected?.videoUrl)}{selected?.specialization || selected?.experienceYears != null || selected?.bio ? <Card><Text style={[styles.note, { color: colors.text }]}>{selected.specialization ? `التخصص: ${selected.specialization}\n` : ""}{selected.experienceYears != null ? `سنوات الخبرة: ${selected.experienceYears}\n` : ""}{selected.bio ?? ""}</Text></Card> : null}{answers.length ? <Card><Text style={[styles.label, { color: colors.text }]}>إجابات الأسئلة</Text>{answers.map((a: any, i: number) => <Text key={i} style={[styles.note, { color: colors.text }]}>{`${i + 1}. ${a.q ?? a.question ?? ""}\n${a.a ?? a.answer ?? ""}`}</Text>)}</Card> : null}<Text style={[styles.label, { color: colors.text }]}>الشهادات والمؤهلات</Text>{certificates.length ? certificates.map((c: any) => <Button key={c.id} label={c.title ?? "فتح الشهادة"} variant="secondary" icon="document-outline" onPress={() => void openCertificate(c.filePath)} />) : <Text style={[styles.note, { color: colors.muted }]}>لا توجد شهادات مرفوعة</Text>}</> : null}
         {kind === "qiraat" ? <>{selected?.createdAt ? <Text style={[styles.note, { color: colors.muted }]}>تاريخ الإرسال: {timestamp(selected.createdAt)}</Text> : null}{selected?.status ? <Text style={[styles.note, { color: colors.muted }]}>الحالة: {selected.status}</Text> : null}{selected?.certificateUrl ? <Button label="فتح الشهادة للمعاينة" variant="secondary" icon="document-text-outline" onPress={() => void openCertificate(selected.certificateUrl)} /> : <Text style={[styles.note, { color: colors.muted }]}>لا توجد شهادة مرفقة</Text>}</> : null}
        {kind === "promotion" ? <><Text style={[styles.note, { color: colors.text }]}>{selected?.fromName ?? selected?.fromLevelName ?? ""}{(selected?.fromName || selected?.fromLevelName) && (selected?.toName || selected?.toLevelName) ? " ← " : ""}{selected?.toName ?? selected?.toLevelName ?? ""}</Text>{media(selected?.videoUrl)}</> : null}
       {kind === "fatwa" ? <><TextInput value={category} onChangeText={setCategory} placeholder="التصنيف" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />{!selected?.muftiId ? <><Text style={[styles.label, { color: colors.muted }]}>اختر المفتي</Text>{(muftisQ.data ?? []).map((mufti: any) => <Pressable key={mufti.teacherId} onPress={() => setSelectedMuftiId(mufti.teacherId)} style={[styles.input, { backgroundColor: selectedMuftiId === mufti.teacherId ? colors.primary : colors.input, borderColor: selectedMuftiId === mufti.teacherId ? colors.primary : colors.border }]}><Text style={{ color: selectedMuftiId === mufti.teacherId ? colors.primaryText : colors.text, textAlign: "right" }}>{mufti.fullName}</Text></Pressable>)}<Button label="إسناد للمفتي" disabled={!selectedMuftiId} onPress={() => run(() => fatwaAssign.mutateAsync({ questionId: selected.id, muftiId: selectedMuftiId, urgent: false }))} /></> : null}<Button label="حفظ التصنيف" onPress={() => run(() => fatwaCategory.mutateAsync({ questionId: selected.id, category: category as never }))} /><Button label="رفض السؤال" variant="danger" onPress={() => run(() => fatwaReject.mutateAsync({ questionId: selected.id, reason: note.trim() || "غير مناسب للنشر" }))} /></> : null}
        {kind !== "fatwa" && kind !== "mufti" ? <TextInput value={note} onChangeText={setNote} placeholder={kind === "qiraat" ? "ملاحظات (10 أحرف على الأقل عند الرفض)…" : kind === "kyc" ? "ملاحظات المراجعة (مطلوبة عند طلب معلومات إضافية)…" : "ملاحظات المراجعة (اختيارية)…"} placeholderTextColor={colors.muted} multiline maxLength={500} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /> : null}
        {kind === "placement" ? <><Button label="اعتماد" disabled={!resultLevelId || pending} loading={placement.isPending} onPress={() => ask("هل تريد اعتماد الطالب؟", () => void run(() => placement.mutateAsync({ studentId: selected.userId, approve: true, resultLevelId, notes: note.trim() || undefined }), () => void utils.admin.placementList.invalidate()))} /><Button label="رفض" variant="danger" disabled={pending} onPress={() => ask("هل تريد رفض الطلب؟", () => void run(() => placement.mutateAsync({ studentId: selected.userId, approve: false, notes: note.trim() || undefined }), () => void utils.admin.placementList.invalidate()))} /></> : null}
       {kind === "kyc" ? <><Button label="اعتماد" disabled={pending} loading={kyc.isPending} onPress={() => ask("هل تريد اعتماد المعلم؟", () => reviewTeacher("approve"))} /><Button label="رفض" variant="danger" disabled={pending || !note.trim()} onPress={() => ask("هل تريد رفض الطلب؟", () => reviewTeacher("reject"))} /><Button label="طلب معلومات" variant="secondary" disabled={pending || !note.trim()} onPress={() => reviewTeacher("request_info")} /></> : null}
        {kind === "qiraat" ? <><Button label="اعتماد" disabled={pending} loading={qiraat.isPending} onPress={() => ask("هل تريد اعتماد الشهادة؟", () => void run(() => qiraat.mutateAsync({ certId: selected.id, approve: true, notes: note.trim() || undefined }), () => void utils.admin.qiraatList.invalidate()))} /><Button label="رفض" variant="danger" disabled={pending || note.trim().length < 10} onPress={() => ask("هل تريد رفض الشهادة؟", () => void run(() => qiraat.mutateAsync({ certId: selected.id, approve: false, notes: note.trim() }), () => void utils.admin.qiraatList.invalidate()))} /></> : null}
        {kind === "promotion" ? <><Button label="اعتماد الترقية" disabled={pending} loading={promotion.isPending} onPress={() => ask("هل تريد اعتماد الترقية؟", () => void run(() => promotion.mutateAsync({ requestId: selected.id, approve: true, notes: note.trim() || undefined }), () => void utils.admin.promotionsList.invalidate()))} /><Button label="رفض" variant="danger" disabled={pending} onPress={() => ask("هل تريد رفض الطلب؟", () => void run(() => promotion.mutateAsync({ requestId: selected.id, approve: false, notes: note.trim() || undefined }), () => void utils.admin.promotionsList.invalidate()))} /></> : null}
        {certificateOpenError ? <><Text style={[styles.note, { color: colors.danger }]}>{certificateOpenError}</Text><Button label="إعادة فتح الشهادة" variant="secondary" icon="refresh-outline" onPress={() => void openCertificate(certificateOpenPath)} /></> : null}
        <Button label="إغلاق" variant="secondary" onPress={close} />
     </ScrollView></SafeAreaView></View></Modal>
    <Button label="تحديث البيانات" variant="secondary" icon="refresh-outline" onPress={() => void q.refetch()} />
  </AdminFrame>;
}

/** Small, deliberately boring native form primitive used by the CRUD screens. */
export function AdminInput({ value, onChangeText, placeholder, multiline = false, keyboardType = "default" }: { value: string; onChangeText: (v: string) => void; placeholder: string; multiline?: boolean; keyboardType?: "default" | "number-pad" | "decimal-pad" }) {
  const { colors } = useTheme();
  const handleChange = (next: string) => {
    const normalized = keyboardType === "number-pad" ? normalizeDigits(next).replace(/\D/g, "") : next;
    onChangeText(normalized);
  };
  return <TextInput value={value} onChangeText={handleChange} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input, minHeight: multiline ? 80 : undefined }]} />;
}

export type AdminSelectOption = { value: string; label: string };

export function AdminSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "اختر…",
  searchable = false,
  disabled = false,
}: {
  label: string;
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);
  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    : options;
  return (
    <View style={styles.selectWrap}>
      <Text style={[styles.selectLabel, { color: colors.muted }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => { setSearch(""); setOpen(true); }}
        style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.input, opacity: disabled ? 0.5 : 1 }]}
      >
        <Text style={[styles.selectValue, { color: selected ? colors.text : colors.muted }]}>{selected?.label ?? placeholder}</Text>
        <Text style={[styles.selectChevron, { color: colors.muted }]}>⌄</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="إغلاق">
                <Text style={[styles.pickerClose, { color: colors.primary }]}>إغلاق</Text>
              </Pressable>
            </View>
            {searchable ? (
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="ابحث بالاسم…"
                placeholderTextColor={colors.muted}
                accessibilityLabel="البحث بالاسم"
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              />
            ) : null}
            {!visibleOptions.length ? <Text style={[styles.note, { color: colors.muted }]}>لا نتائج مطابقة</Text> : null}
            {visibleOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => { onChange(option.value); setOpen(false); }}
                style={[styles.pickerOption, { borderBottomColor: colors.border, backgroundColor: option.value === value ? `${colors.primary}12` : "transparent" }]}
              >
                <Text style={[styles.pickerOptionText, { color: option.value === value ? colors.primary : colors.text }]}>{option.label}</Text>
                {option.value === value ? <Text style={[styles.pickerCheck, { color: colors.primary }]}>✓</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function AdminDateTimeField({
  label,
  value,
  mode,
  onChange,
}: {
  label: string;
  value?: string;
  mode: "date" | "time";
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const display = value
    ? mode === "date"
      ? date.toLocaleDateString("ar-SA")
      : date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    : "لم يتم الاختيار";
  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== "ios") setOpen(false);
    if (event.type === "dismissed" || !selectedDate) return;
    onChange(selectedDate.toISOString());
  };
  return (
    <View style={styles.selectWrap}>
      <Text style={[styles.selectLabel, { color: colors.muted }]}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.input }]}>
        <Text style={[styles.selectValue, { color: value ? colors.text : colors.muted }]}>{display}</Text>
        <Text style={[styles.selectChevron, { color: colors.muted }]}>▣</Text>
      </Pressable>
      {open ? (
        <DateTimePicker value={date} mode={mode} is24Hour={mode === "time"} onChange={handleChange} />
      ) : null}
    </View>
  );
}

export function safeError(error: unknown, fallback: string) {
  return userFacingErrorMessage(error, fallback);
}

 const styles = StyleSheet.create({ nav: { alignItems: "flex-end", marginBottom: 8 }, home: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 }, heading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 19, textAlign: "right" }, description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right" }, stats: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 14 }, row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth }, value: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16 }, label: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 }, note: { textAlign: "right", fontSize: 11, marginTop: 14, lineHeight: 20 }, input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 9, textAlign: "right", fontFamily: "IBMPlexSansArabic_400Regular", minHeight: 58 }, choice: { borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 6 }, backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" }, modal: { maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1 }, modalContent: { padding: 18, gap: 10, paddingBottom: 28 }, modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", minHeight: 44 }, modalHeaderTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, textAlign: "right" }, modalBack: { minHeight: 42, minWidth: 86, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 }, modalBackText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 }, selectWrap: { marginBottom: 8 }, selectLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right", marginBottom: 5 }, selectButton: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, selectValue: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, textAlign: "right" }, selectChevron: { fontSize: 18, marginLeft: 8 }, pickerBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" }, pickerSheet: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18 }, pickerHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, pickerTitle: { fontFamily: "Amiri_700Bold", fontSize: 20 }, pickerClose: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 }, pickerOption: { minHeight: 48, paddingHorizontal: 10, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 10 }, pickerOptionText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "right" }, pickerCheck: { fontSize: 18 } });