import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { usePathname, useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Badge, Button, Card, EmptyState, ErrorState, Header, LoadingState, Screen, SectionTitle } from "../ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { LibraryMediaPlayer } from "../library/library-media-player";
import { useAuth } from "../../lib/auth";
import { resolveLibraryAsset } from "../../lib/media/library-media";
import { AdminSheet, ConfirmAction, useAdminFeedback } from "./admin-ui";
import { SidebarLayout, useSidebarLayout } from "../ui/navigation-menu";
import { toast } from "../../lib/toast";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";
import {
  isPlacementVideoAbOriginal,
  PlacementVideoAbHarness,
  PLACEMENT_VIDEO_AB_DIAGNOSTIC_ENABLED,
} from "../placement/placement-video-ab-harness";

export const adminRoutes = [
  ["users", "المستخدمون", "users"], ["accounts", "الحسابات", "shield"],
  ["schedules", "الجداول", "calendar"], ["sessions-monitoring", "مراقبة الجلسات", "video"],
  ["library", "المكتبة", "library"], ["qiraat", "القراءات", "certificate"],
  ["promotions", "طلبات الترقية", "trending-up"], ["levels", "المستويات", "graduation"],
  ["sharia", "العلوم الشرعية", "books"], ["teachers-review", "مراجعة المعلمين", "user"],
  ["students-review", "مراجعة الطلاب", "video"], ["fatwas", "الفتاوى", "scale"],
  ["muftis", "المفتون", "bookmark"], ["assessments", "التقييمات", "clipboard"],
  ["analytics", "التحليلات", "chart"], ["notifications", "الإشعارات", "bell"],
  ["inbox", "صندوق الوارد", "mail"], ["audit-log", "سجل التدقيق", "clipboard"], ["settings", "الإعدادات", "settings"],
] as const;

export function AdminFrame({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const pathname = usePathname();
  const wide = useSidebarLayout();
  const page = <><Header title={title} right={right} menu={wide ? undefined : "admin"} home={pathname === "/admin"} /><Screen>{wide ? null : <View style={styles.nav}><Pressable onPress={() => router.replace("/admin")}><Text style={[styles.home, { color: colors.primary }]}>لوحة المشرف</Text></Pressable></View>}{children}</Screen></>;
  return <SidebarLayout role="admin" wide={wide}>{page}</SidebarLayout>;
}

/** KYC decision shared by the dedicated review screen and the generic workflow. */
export function useKycReview(onDone?: () => void) {
  const utils = trpc.useUtils();
  const mutation = trpc.admin.kycReview.useMutation();
  const review = async (teacherId: string, decision: "approve" | "reject" | "request_info", notes: string) => {
    if (mutation.isPending) return false;
    if (decision === "request_info" && !notes.trim()) { toast("اكتب الملاحظات التي توضّح المطلوب من المعلم", "error"); return false; }
    try {
      await mutation.mutateAsync({ teacherId, decision, notes: notes.trim() || undefined });
      toast("تمت المراجعة", "success");
      void utils.admin.kycList.invalidate(); void utils.admin.kpis.invalidate();
      onDone?.();
      return true;
    } catch (e) {
      toast(userFacingErrorMessage(e, "تعذر تنفيذ المراجعة، حاول مرة أخرى."), "error");
      return false;
    }
  };
  return { review, pending: mutation.isPending, decision: mutation.variables?.decision };
}

/**
 * Opens a certificate in the in-app browser: the capability URL carries the
 * session token, so it must not reach the system browser's history.
 */
export function useCertificateOpener() {
  const { token } = useAuth();
  return async (value: unknown) => {
    const raw = typeof value === "string" ? value.trim() : "";
    const target = raw && token ? resolveLibraryAsset(raw, token) : "";
    try {
      if (!target) throw new Error("missing certificate");
      const parsed = new URL(target);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid certificate");
      await WebBrowser.openBrowserAsync(target);
    } catch {
      toast("تعذر فتح الشهادة. تحقق من الاتصال وحاول مرة أخرى.", "error");
    }
  };
}

export const KYC_CONFIRM = {
  approve: { title: "هل تريد اعتماد المعلم؟", impact: "سيُعتمد حساب المعلم ويمكنه استقبال الحلقات فوراً.", label: "اعتماد" },
  reject: { title: "رفض طلب المعلم؟", impact: "سيُبلَّغ المعلم برفض طلبه مع الملاحظات المكتوبة.", label: "رفض الطلب" },
} as const;

export function AdminList({ title, procedure = "kpis", icon = "shield" }: { title: string; procedure?: string; icon?: string }) {
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
    <Button label="تحديث البيانات" variant="secondary" icon="refresh" onPress={() => void q.refetch()} />
    {procedure !== "kpis" ? <Text style={[styles.note, { color: colors.muted }]}>تُحمّل القائمة التفصيلية عبر إجراء المشرف الحقيقي: {procedure}</Text> : null}
  </AdminFrame>;
}

/**
 * Button guarded by a specific confirmation (item name + impact). The confirm sheet
 * is rendered next to the button, so inside an open sheet it stacks correctly on iOS.
 */
export function ConfirmButton({ label, onConfirm, danger = false, primary = false, disabled = false, loading = false, title, itemName, impact, confirmLabel, icon }: {
  label: string; onConfirm: () => void; danger?: boolean; primary?: boolean; disabled?: boolean; loading?: boolean;
  title?: string; itemName?: string; impact?: string; confirmLabel?: string; icon?: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Button label={label} icon={icon} variant={danger ? "danger" : primary ? "primary" : "secondary"} disabled={disabled} loading={loading} onPress={() => setOpen(true)} />
    <ConfirmAction visible={open} title={title ?? `تأكيد «${label}»؟`} itemName={itemName} impact={impact} confirmLabel={confirmLabel ?? label}
      tone={danger ? "danger" : "primary"} loading={loading} onCancel={() => setOpen(false)}
      onConfirm={() => { if (disabled || loading) return; setOpen(false); onConfirm(); }} />
  </>;
}

const WORKFLOW_IMPACT: Record<string, string> = {
  "هل تريد إلغاء التعيين؟": "سيُلغى تعيين المفتي من كل التصنيفات، ولن تُسند إليه فتاوى جديدة.",
  "هل تريد اعتماد الطالب؟": "سيُعتمد الطالب في المستوى المختار ويصله إشعار بالنتيجة.",
  "هل تريد اعتماد المعلم؟": "سيُعتمد حساب المعلم ويمكنه استقبال الحلقات فوراً.",
  "هل تريد اعتماد الشهادة؟": "ستُعتمد الإجازة وتظهر في ملف الطالب.",
  "هل تريد رفض الشهادة؟": "ستُرفض الشهادة ويصل الطالب سبب الرفض المكتوب.",
  "هل تريد اعتماد الترقية؟": "يُنقل الطالب فوراً إلى المستوى التالي ويصله إشعار «مبروك!».",
  "هل تريد رفض الطلب؟": "سيُرفض الطلب ويُبلَّغ صاحبه مع الملاحظات المكتوبة.",
};

const STAGE_LABELS: Record<string, string> = { primary: "ابتدائي", middle: "متوسط", high: "ثانوي" };

/** "منذ 5 ساعات" up to two days, then whole days, with Arabic count agreement. */
function ageLabel(hours: number): string {
  if (hours < 1) return "منذ أقل من ساعة";
  if (hours < 48) return hours === 1 ? "منذ ساعة" : hours === 2 ? "منذ ساعتين" : hours <= 10 ? `منذ ${hours} ساعات` : `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return days <= 10 ? `منذ ${days} أيام` : `منذ ${days} يومًا`;
}

export function AdminWorkflow({ title, kind }: { title: string; kind: "placement" | "kyc" | "qiraat" | "promotion" | "fatwa" | "mufti" }) {
  const { colors } = useTheme(); const { token, role } = useAuth(); const utils = trpc.useUtils();
  const queries = {
    placement: trpc.admin.placementList.useQuery(undefined, { enabled: kind === "placement" }), kyc: trpc.admin.kycList.useQuery(undefined, { enabled: kind === "kyc" }),
    qiraat: trpc.admin.qiraatList.useQuery(undefined, { enabled: kind === "qiraat" }), promotion: trpc.admin.promotionsList.useQuery(undefined, { enabled: kind === "promotion" }),
    fatwa: trpc.admin.fatwaInbox.useQuery({ tab: "pending" }, { enabled: kind === "fatwa" }), mufti: trpc.admin.muftisList.useQuery(undefined, { enabled: kind === "mufti" }),
  } as const;
  const notify = useAdminFeedback();
  const q = queries[kind]; const [selected, setSelected] = useState<any>(null); const [note, setNote] = useState(""); const [category, setCategory] = useState(""); const [selectedMuftiId, setSelectedMuftiId] = useState(""); const [resultLevelId, setResultLevelId] = useState<number | undefined>(); const [feedback, setFeedback] = useState(""); const [certificateOpenPath, setCertificateOpenPath] = useState<string | null>(null); const [certificateOpenError, setCertificateOpenError] = useState("");
  const placementPath = selected?.pathType === "tajweed_correction" ? "tajweed_correction" : "quran";
  const levelsQ = trpc.admin.placementLevelThresholds.useQuery({ path: placementPath }, { enabled: kind === "placement" && !!selected });
  const placement = trpc.admin.placementReview.useMutation(); const qiraat = trpc.admin.qiraatReview.useMutation(); const promotion = trpc.admin.promotionReview.useMutation();
  const fatwaAssign = trpc.admin.fatwaAssign.useMutation(); const fatwaCategory = trpc.admin.fatwaUpdateCategory.useMutation(); const fatwaReject = trpc.admin.fatwaRejectQuestion.useMutation(); const muftiUnassign = trpc.admin.muftiUnassign.useMutation(); const muftisQ = trpc.admin.muftisList.useQuery(undefined, { enabled: kind === "fatwa" });
  const [confirmState, setConfirmState] = useState<{ title: string; itemName?: string; fn: () => void } | null>(null);
  const close = () => { setSelected(null); setConfirmState(null); setNote(""); setSelectedMuftiId(""); setResultLevelId(undefined); setCertificateOpenPath(null); setCertificateOpenError(""); setFeedback(""); };
  const kycReview = useKycReview(() => { close(); void q.refetch(); });
  const pending = placement.isPending || kycReview.pending || qiraat.isPending || promotion.isPending || fatwaAssign.isPending || fatwaCategory.isPending || fatwaReject.isPending || muftiUnassign.isPending;
  const run = async (fn: () => Promise<unknown>, invalidate?: () => void) => { try { await fn(); close(); notify("تمت المراجعة"); void q.refetch(); void utils.admin.kpis.invalidate(); invalidate?.(); } catch (e) { setFeedback(userFacingErrorMessage(e, "تعذر تنفيذ العملية. حاول مرة أخرى.")); } };
  const openCertificate = async (value: unknown) => {
    const raw = typeof value === "string" ? value.trim() : "";
    setCertificateOpenPath(raw || null);
    setCertificateOpenError("");
    const target = raw && token ? resolveLibraryAsset(raw, token) : "";
    try {
      if (!target) throw new Error("missing certificate");
      const parsed = new URL(target);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("invalid certificate");
      await WebBrowser.openBrowserAsync(target);
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
    let hours: number;
    if (r.hoursAgo != null && Number.isFinite(Number(r.hoursAgo))) hours = Math.max(0, Math.round(Number(r.hoursAgo)));
    else {
      const created = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
      if (!Number.isFinite(created)) return "";
      hours = Math.max(0, Math.floor((Date.now() - created) / 3600000));
    }
    return `${ageLabel(hours)}${hours >= 24 ? " · تجاوزت مهلة 24س!" : hours >= 20 ? " · اقتربت مهلة 24س!" : ""}`;
  };
  const timestamp = (value: unknown) => {
    if (!value) return "";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  };
  const media = (url: unknown, type: "audio" | "video" = "video", preferPrivateDownload = false) => typeof url === "string" && url.trim() ? <LibraryMediaPlayer source={url} contentType={type} preferPrivateDownload={preferPrivateDownload} /> : <Text style={[styles.note, { color: colors.muted }]}>لا يوجد ملف مرفق</Text>;
  const ask = (text: string, fn: () => void, itemName?: string) => setConfirmState({ title: text, itemName: itemName ?? (selected ? String(label(selected)) : undefined), fn });
  const confirmElement = <ConfirmAction visible={!!confirmState} title={confirmState?.title ?? ""} itemName={confirmState?.itemName} impact={confirmState ? WORKFLOW_IMPACT[confirmState.title] : undefined}
    confirmLabel={confirmState?.title.includes("رفض") || confirmState?.title.includes("إلغاء") ? "تأكيد" : "اعتماد"} tone={confirmState?.title.includes("رفض") || confirmState?.title.includes("إلغاء") ? "danger" : "primary"}
    loading={pending} onCancel={() => setConfirmState(null)} onConfirm={() => { const run = confirmState?.fn; setConfirmState(null); run?.(); }} />;
  const certificates = selected?.certificates ?? [];
  const answers = Array.isArray(selected?.answers) ? selected.answers : [];
  // The protected endpoint owns the eligible level list, exactly as on Web.
  const placementLevels = Array.isArray(levelsQ.data) ? levelsQ.data : [];
  const reviewTeacher = (decision: "approve" | "reject" | "request_info") => { if (selected && !pending) void kycReview.review(selected.teacherId, decision, note); };
  return <AdminFrame title={title}>
     {!rows.length ? <EmptyState title="لا توجد عناصر معلقة" description="ستظهر البيانات هنا عند توفرها." /> : rows.map((r, i) => <Card key={String(r.id ?? r.teacherId ?? r.userId ?? i)}>
       <Text style={[styles.value, { color: colors.text }]} numberOfLines={3}>{label(r)}</Text>
        {r.status || r.kycStatus ? <Text style={[styles.label, { color: colors.muted }]}>{({ pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض", request_info: "معلومات إضافية مطلوبة" } as Record<string, string>)[r.status ?? r.kycStatus] ?? "قيد المراجعة"}</Text> : null}
       {elapsed(r) ? <Text style={[styles.note, { color: Number(r.hoursAgo) >= 20 ? colors.danger : colors.muted }]}>{elapsed(r)}</Text> : null}
       {timestamp(r.createdAt) ? <Text style={[styles.note, { color: colors.muted }]}>تاريخ التسجيل: {timestamp(r.createdAt)}</Text> : null}
        {kind === "placement" ? <><Text style={[styles.note, { color: colors.muted }]}>{r.pathType === "tajweed_correction" ? "تصحيح التلاوة" : "القرآن الكريم"}{r.schoolStage ? ` · ${STAGE_LABELS[r.schoolStage] ?? r.schoolStage}` : ""}{r.schoolGrade ? ` — ${r.schoolGrade}` : ""}</Text>{isPending(r) ? <Button label="تشغيل ومراجعة" icon="play" onPress={() => { setSelected(r); setResultLevelId(undefined); setNote(""); }} /> : null}</> : kind === "qiraat" || kind === "promotion" ? (isPending(r) ? <Button label="مراجعة" onPress={() => { setSelected(r); setNote(""); }} /> : null) : kind === "mufti" ? <Button label="إلغاء التعيين" variant="danger" disabled={pending} onPress={() => ask("هل تريد إلغاء التعيين؟", () => void run(() => muftiUnassign.mutateAsync({ teacherId: r.teacherId })), String(label(r)))} /> : kind === "fatwa" && !r.muftiId ? <Button label="إسناد للمفتي" disabled={pending} onPress={() => { setSelected(r); setSelectedMuftiId(""); }} /> : (isPending(r) ? <Button label="تشغيل ومراجعة" onPress={() => { setSelected(r); setNote(""); setCategory(r.category ?? ""); }} /> : null)}
    </Card>)}
      <AdminSheet visible={!!selected} title={kind === "kyc" ? "مراجعة المعلم" : "مراجعة اختبار تحديد المستوى"} subtitle={selected ? String(label(selected)) : undefined}
        onClose={close} dirty={!!note || resultLevelId != null} busy={pending}
        footer={kind === "placement" || kind === "kyc" ? <View style={{ gap: 8 }}>
          {kind === "placement" ? <>
            <ConfirmButton primary label="قبول" disabled={!resultLevelId || pending || levelsQ.isError} loading={placement.isPending}
              title="هل تريد اعتماد الطالب؟" itemName={selected ? String(label(selected)) : undefined} impact={WORKFLOW_IMPACT["هل تريد اعتماد الطالب؟"]}
              onConfirm={() => { if (selected && resultLevelId) void run(() => placement.mutateAsync({ studentId: selected.userId, approve: true, resultLevelId, notes: note.trim() || undefined }), () => void utils.admin.placementList.invalidate()); }} />
            <ConfirmButton danger label="رفض" disabled={pending} loading={placement.isPending} title="رفض اختبار الطالب؟" itemName={selected ? String(label(selected)) : undefined}
              impact="سيُبلَّغ الطالب برفض الاختبار ويمكنه إعادة المحاولة وفق إعدادات المنصة."
              onConfirm={() => { if (selected) void run(() => placement.mutateAsync({ studentId: selected.userId, approve: false }), () => void utils.admin.placementList.invalidate()); }} />
          </> : <>
            <ConfirmButton primary label="اعتماد" disabled={pending} loading={kycReview.pending} title={KYC_CONFIRM.approve.title} itemName={selected ? String(label(selected)) : undefined} impact={KYC_CONFIRM.approve.impact} onConfirm={() => reviewTeacher("approve")} />
            <ConfirmButton danger label="رفض" disabled={pending} loading={kycReview.pending} title={KYC_CONFIRM.reject.title} itemName={selected ? String(label(selected)) : undefined} impact={KYC_CONFIRM.reject.impact} onConfirm={() => reviewTeacher("reject")} />
            <Button label="طلب معلومات" variant="secondary" disabled={pending || !note.trim()} loading={kycReview.pending} onPress={() => reviewTeacher("request_info")} />
          </>}
        </View> : undefined}>
        {feedback ? <Text accessibilityRole="alert" style={[styles.note, { color: colors.danger }]}>{feedback}</Text> : null}
       <Text style={[styles.heading, { color: colors.text }]}>{label(selected ?? {})}</Text>{selected?.questionText ? <Text style={[styles.note, { color: colors.text }]}>{selected.questionText}</Text> : null}
           {kind === "placement" ? <><Text style={[styles.note, { color: colors.muted }]}>{selected?.pathType === "tajweed_correction" ? "تصحيح التلاوة" : (selected?.pathType ?? "القرآن الكريم")}{selected?.schoolStage ? ` · ${STAGE_LABELS[selected.schoolStage] ?? selected.schoolStage}` : ""}{selected?.schoolGrade ? ` — ${selected.schoolGrade}` : ""}</Text>{media(selected?.videoUrl, "video", true)}{role === "admin" && PLACEMENT_VIDEO_AB_DIAGNOSTIC_ENABLED && isPlacementVideoAbOriginal(selected?.videoUrl) ? <PlacementVideoAbHarness originalSource={selected.videoUrl} /> : null}<Text style={[styles.label, { color: colors.muted }]}>المستوى عند القبول (مطلوب للاعتماد)</Text>{levelsQ.isLoading ? <LoadingState label="جارٍ تحميل مستويات هذا المسار…" /> : placementLevels.map((level: any) => <Pressable key={level.id} onPress={() => setResultLevelId(level.id)} style={[styles.choice, { borderColor: resultLevelId === level.id ? colors.primary : colors.border, backgroundColor: resultLevelId === level.id ? colors.primary : colors.input }]}><Text style={{ color: resultLevelId === level.id ? colors.primaryText : colors.text, textAlign: "right" }}>{level.name}</Text></Pressable>)}</> : null}
        {kind === "kyc" ? <>{media(selected?.videoUrl)}{selected?.specialization || selected?.experienceYears != null || selected?.bio ? <Card><Text style={[styles.note, { color: colors.text }]}>{selected.specialization ? `التخصص: ${selected.specialization}\n` : ""}{selected.experienceYears != null ? `سنوات الخبرة: ${selected.experienceYears}\n` : ""}{selected.bio ?? ""}</Text></Card> : null}{answers.length ? <Card><Text style={[styles.label, { color: colors.text }]}>إجابات الأسئلة</Text>{answers.map((a: any, i: number) => <Text key={i} style={[styles.note, { color: colors.text }]}>{`${i + 1}. ${a.q ?? a.question ?? ""}\n${a.a ?? a.answer ?? ""}`}</Text>)}</Card> : null}<Text style={[styles.label, { color: colors.text }]}>الشهادات والمؤهلات</Text>{certificates.length ? certificates.map((c: any) => <Button key={c.id} label={c.title ?? "فتح الشهادة"} variant="secondary" icon="file-text" onPress={() => void openCertificate(c.filePath)} />) : <Text style={[styles.note, { color: colors.muted }]}>لا توجد شهادات مرفوعة</Text>}</> : null}
         {kind === "qiraat" ? <>{selected?.createdAt ? <Text style={[styles.note, { color: colors.muted }]}>تاريخ الإرسال: {timestamp(selected.createdAt)}</Text> : null}{selected?.status ? <Text style={[styles.note, { color: colors.muted }]}>الحالة: {selected.status}</Text> : null}{selected?.certificateUrl ? <Button label="فتح الشهادة للمعاينة" variant="secondary" icon="file-text" onPress={() => void openCertificate(selected.certificateUrl)} /> : <Text style={[styles.note, { color: colors.muted }]}>لا توجد شهادة مرفقة</Text>}</> : null}
        {kind === "promotion" ? <><Text style={[styles.note, { color: colors.text }]}>{selected?.fromName ?? selected?.fromLevelName ?? ""}{(selected?.fromName || selected?.fromLevelName) && (selected?.toName || selected?.toLevelName) ? " ← " : ""}{selected?.toName ?? selected?.toLevelName ?? ""}</Text>{media(selected?.videoUrl)}</> : null}
        {kind === "fatwa" ? <><TextInput value={category} onChangeText={setCategory} placeholder="التصنيف" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />{!selected?.muftiId ? <><Text style={[styles.label, { color: colors.muted }]}>اختر المفتي</Text>{(muftisQ.data ?? []).map((mufti: any) => <Pressable key={mufti.teacherId} onPress={() => setSelectedMuftiId(mufti.teacherId)} style={[styles.input, { backgroundColor: selectedMuftiId === mufti.teacherId ? colors.primary : colors.input, borderColor: selectedMuftiId === mufti.teacherId ? colors.primary : colors.border }]}><Text style={{ color: selectedMuftiId === mufti.teacherId ? colors.primaryText : colors.text, textAlign: "right" }}>{mufti.fullName}</Text></Pressable>)}<Button label="إسناد للمفتي" disabled={!selectedMuftiId || pending} loading={fatwaAssign.isPending} onPress={() => run(() => fatwaAssign.mutateAsync({ questionId: selected.id, muftiId: selectedMuftiId, urgent: false }))} /></> : null}<Button label="حفظ التصنيف" disabled={pending} loading={fatwaCategory.isPending} onPress={() => run(() => fatwaCategory.mutateAsync({ questionId: selected.id, category: category as never }))} /><Button label="رفض السؤال" variant="danger" disabled={pending} loading={fatwaReject.isPending} onPress={() => run(() => fatwaReject.mutateAsync({ questionId: selected.id, reason: note.trim() || "غير مناسب للنشر" }))} /></> : null}
        {kind !== "fatwa" && kind !== "mufti" ? <TextInput value={note} onChangeText={setNote} placeholder={kind === "qiraat" ? "ملاحظات (10 أحرف على الأقل عند الرفض)…" : kind === "kyc" ? "ملاحظات المراجعة (مطلوبة عند طلب معلومات إضافية)…" : "ملاحظات المراجعة (اختيارية)…"} placeholderTextColor={colors.muted} multiline maxLength={500} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /> : null}
        {kind === "qiraat" ? <><Button label="اعتماد" disabled={pending} loading={qiraat.isPending} onPress={() => ask("هل تريد اعتماد الشهادة؟", () => void run(() => qiraat.mutateAsync({ certId: selected.id, approve: true, notes: note.trim() || undefined }), () => void utils.admin.qiraatList.invalidate()))} /><Button label="رفض" variant="danger" disabled={pending || note.trim().length < 10} loading={qiraat.isPending} onPress={() => ask("هل تريد رفض الشهادة؟", () => void run(() => qiraat.mutateAsync({ certId: selected.id, approve: false, notes: note.trim() }), () => void utils.admin.qiraatList.invalidate()))} /></> : null}
        {kind === "promotion" ? <><Button label="اعتماد الترقية" disabled={pending} loading={promotion.isPending} onPress={() => ask("هل تريد اعتماد الترقية؟", () => void run(() => promotion.mutateAsync({ requestId: selected.id, approve: true, notes: note.trim() || undefined }), () => void utils.admin.promotionsPendingList.invalidate()))} /><Button label="رفض" variant="danger" disabled={pending} loading={promotion.isPending} onPress={() => ask("هل تريد رفض الطلب؟", () => void run(() => promotion.mutateAsync({ requestId: selected.id, approve: false, notes: note.trim() || undefined }), () => void utils.admin.promotionsPendingList.invalidate()))} /></> : null}
        {certificateOpenError ? <><Text style={[styles.note, { color: colors.danger }]}>{certificateOpenError}</Text><Button label="إعادة فتح الشهادة" variant="secondary" icon="refresh" onPress={() => void openCertificate(certificateOpenPath)} /></> : null}
     {selected ? confirmElement : null}
      </AdminSheet>
      {!selected ? confirmElement : null}
    <Button label="تحديث البيانات" variant="secondary" icon="refresh" onPress={() => void q.refetch()} />
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
        <KeyboardAvoidingView behavior="padding" style={styles.pickerBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]} contentContainerStyle={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="إغلاق" style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" }}>
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
          </ScrollView>
        </KeyboardAvoidingView>
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

 const styles = StyleSheet.create({ nav: { alignItems: "flex-end", marginBottom: 8 }, home: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 }, heading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 19, textAlign: "right" }, description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right" }, stats: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 14 }, row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth }, value: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" }, label: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 }, note: { textAlign: "right", fontSize: 11, marginTop: 14, lineHeight: 20, fontFamily: "IBMPlexSansArabic_400Regular" }, input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 9, textAlign: "right", fontFamily: "IBMPlexSansArabic_400Regular", minHeight: 58 }, choice: { borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 6 }, backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" }, modal: { maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1 }, modalKeyboard: { flexShrink: 1 }, modalContent: { padding: 18, gap: 10, paddingBottom: 28 }, modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", minHeight: 44 }, modalHeaderTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 18, textAlign: "right" }, modalBack: { minHeight: 42, minWidth: 86, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 }, modalBackText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 }, selectWrap: { marginBottom: 8 }, selectLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right", marginBottom: 5 }, selectButton: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, selectValue: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, textAlign: "right" }, selectChevron: { fontSize: 18, marginLeft: 8 }, pickerBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" }, pickerSheet: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1 }, pickerContent: { padding: 16, paddingBottom: 32 }, pickerHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, pickerTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 18 }, pickerClose: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 }, pickerOption: { minHeight: 48, paddingHorizontal: 10, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 10 }, pickerOptionText: { flex: 1, paddingVertical: 12, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "right" }, pickerCheck: { fontSize: 18 } });
