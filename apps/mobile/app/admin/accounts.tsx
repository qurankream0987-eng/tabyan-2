import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { AdminFrame, AdminSelect } from "../../components/admin/admin-common";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { AdminSheet, ConfirmAction, FormError, HeaderAction, SheetFooter, useAdminFeedback, useDirtyState } from "../../components/admin-ui";
import { isNonWhitespacePassword } from "@workspace/tabyan-domain/password-validation";
import { isValidPersonName, isValidUsername, normalizePersonName, normalizeUsername } from "@workspace/tabyan-domain/input-normalization";

const PATH_LABELS: Record<string, string> = {
  quran: "حفظ ومراجعة القرآن",
  tajweed_correction: "تصحيح التلاوة",
  qiraat: "القراءات",
  tajweed: "التجويد",
  sharia: "الدروس الشرعية",
};
const PATH_ORDER = ["quran", "tajweed_correction", "qiraat", "tajweed", "sharia"] as const;
const SHARIA_SUBJECTS = [
  { key: "aqeedah", label: "العقيدة" },
  { key: "fiqh", label: "الفقه" },
  { key: "seerah", label: "السيرة النبوية" },
];
const TAJWEED_LEVEL_LABELS = ["المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع", "المستوى الخامس", "المستوى السادس"];

type Kind = "teacher" | "supervisor";

export default function Accounts() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const accounts = trpc.admin.accountsList.useQuery();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("teacher");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [path, setPath] = useState<string>("quran");
  const [subject, setSubject] = useState("aqeedah");
  const [levelId, setLevelId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const notify = useAdminFeedback();
  const setFeedback = (message: string | null, tone: "success" | "error" = "success") => { if (message) notify(message, tone); };
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<any | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newConfirm, setNewConfirm] = useState("");

  const createDirty = useDirtyState(open ? { kind, fullName, username, password, confirm, path, subject, levelId } : null);
  const resetDirty = useDirtyState(resetTarget ? { newPassword, newConfirm } : null);
  const levels = trpc.admin.levelsList.useQuery(undefined, { enabled: open && kind === "teacher" });
  const activeLevels = (levels.data ?? []).filter((level: any) => level.isActive);
  const availablePaths = useMemo(() => {
    const present = new Set(activeLevels.map((level: any) => level.path));
    return [
      ...PATH_ORDER.filter((value) => present.has(value)),
      ...Array.from(present).filter((value) => !PATH_ORDER.includes(value as (typeof PATH_ORDER)[number])),
    ];
  }, [activeLevels]);
  const pathLevels = activeLevels
    .filter((level: any) => level.path === path && (path !== "sharia" || level.nameEn === subject))
    .sort((a: any, b: any) => a.orderIndex - b.orderIndex || a.id - b.id);
  useEffect(() => {
    if (!availablePaths.length) {
      if (path) setPath("");
      if (levelId !== null) setLevelId(null);
      return;
    }
    if (!availablePaths.includes(path)) {
      setPath(availablePaths[0]);
      setLevelId(null);
    }
  }, [availablePaths, path, levelId]);
  useEffect(() => {
    if (levelId !== null && !pathLevels.some((level: any) => level.id === levelId)) setLevelId(null);
  }, [levelId, pathLevels]);

  const invalidate = () => void utils.admin.accountsList.invalidate();
  const createSupervisor = trpc.admin.createSupervisor.useMutation({
    onSuccess: () => { setFeedback("أُنشئ حساب المشرف بنجاح"); closeCreate(); invalidate(); },
    onError: (error) => setFormError(userFacingErrorMessage(error, "تعذر إنشاء حساب المشرف. تحقق من البيانات وحاول مرة أخرى.")),
  });
  const createTeacher = trpc.admin.createTeacher.useMutation({
    onSuccess: () => { setFeedback("أُنشئ حساب المعلم واعتمد مباشرة"); closeCreate(); invalidate(); },
    onError: (error) => setFormError(userFacingErrorMessage(error, "تعذر إنشاء حساب المعلم. تحقق من البيانات وحاول مرة أخرى.")),
  });
  const setActive = trpc.admin.accountSetActive.useMutation({
    onMutate: (vars) => setPendingId(vars.userId),
    onSettled: () => { setPendingId(null); setSuspendTarget(null); },
    onSuccess: () => { setFeedback("تم تحديث حالة الحساب"); invalidate(); },
    onError: (error) => setFeedback(userFacingErrorMessage(error, "تعذر تحديث حالة الحساب. حاول مرة أخرى."), "error"),
  });
  const resetPassword = trpc.admin.accountResetPassword.useMutation({
    onSuccess: () => { setFeedback("أُعيد تعيين كلمة السر وأُنهيت الجلسات القائمة"); closeReset(); },
    onError: (error) => setResetError(userFacingErrorMessage(error, "تعذر إعادة تعيين كلمة السر. حاول مرة أخرى.")),
  });
  const terminateSessions = trpc.admin.accountTerminateSessions.useMutation({
    onMutate: (vars) => setPendingId(vars.userId),
    onSettled: () => { setPendingId(null); setTerminateTarget(null); },
    onSuccess: () => { setFeedback("أُنهيت كل جلسات الحساب"); invalidate(); },
    onError: (error) => setFeedback(userFacingErrorMessage(error, "تعذر إنهاء الجلسات. حاول مرة أخرى."), "error"),
  });

  function closeCreate() {
    setOpen(false);
    setFullName("");
    setUsername("");
    setPassword("");
    setConfirm("");
    setPath("quran");
    setSubject("aqeedah");
    setLevelId(null);
    setFormError(null);
  }

  function closeReset() {
    setResetTarget(null);
    setNewPassword("");
    setNewConfirm("");
    setResetError(null);
  }

  function submitCreate() {
    const normalizedName = normalizePersonName(fullName);
    const normalized = normalizeUsername(username);
    if (!isValidPersonName(normalizedName, 1, 100)) {
      setFormError("اكتب حرفاً واحداً على الأقل بالعربية أو الإنجليزية");
      return;
    }
    if (!isValidUsername(normalized)) {
      setFormError("اسم المستخدم: يمكن استخدام الحروف العربية أو الإنجليزية والأرقام و _ و - و . (3-30 خانة)");
      return;
    }
    if (!isNonWhitespacePassword(password)) {
      setFormError("أدخل كلمة المرور");
      return;
    }
    if (password !== confirm) {
      setFormError("تأكيد كلمة السر غير مطابق");
      return;
    }
    if (kind === "teacher" && levelId === null) {
      setFormError("اختر المستوى");
      return;
    }
    setFormError(null);
    if (kind === "supervisor") {
      createSupervisor.mutate({ username: normalized, password, fullName: normalizedName });
    } else {
      createTeacher.mutate({ username: normalized, password, fullName: normalizedName, path: path as "quran" | "tajweed_correction" | "qiraat" | "tajweed" | "sharia", levelId: Number(levelId) });
    }
  }

  function toggleActive(account: any) {
    const next = !account.isActive;
    if (account.isActive) {
      setSuspendTarget(account);
    } else {
      setActive.mutate({ userId: account.id, isActive: next });
    }
  }

  function terminate(account: any) {
    setTerminateTarget(account);
  }

  function submitReset() {
    if (!resetTarget) return;
    if (!isNonWhitespacePassword(newPassword)) {
      setResetError("أدخل كلمة المرور");
      return;
    }
    if (newPassword !== newConfirm) {
      setResetError("تأكيد كلمة السر غير مطابق");
      return;
    }
    setResetError(null);
    resetPassword.mutate({ userId: resetTarget.id, password: newPassword });
  }

  if (accounts.isLoading) return <AdminFrame title="إدارة الحسابات"><LoadingState /></AdminFrame>;
  if (accounts.error) return <AdminFrame title="إدارة الحسابات"><ErrorState onRetry={() => void accounts.refetch()} /></AdminFrame>;

  const rows = (accounts.data ?? []) as any[];
  return (
    <AdminFrame title="إدارة الحسابات" right={<HeaderAction label="إضافة" accessibilityLabel="إضافة حساب جديد" onPress={() => setOpen(true)} />}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>إدارة الحسابات</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>إنشاء حسابات المشرفين والمعلمين المعتمدة مباشرة</Text>
        </View>
      </View>

      <AdminSheet visible={open} title="إضافة حساب جديد" subtitle={kind === "teacher" ? "حساب معلم معتمد مباشرة" : "حساب مشرف"} onClose={closeCreate}
        dirty={createDirty} busy={createSupervisor.isPending || createTeacher.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={submitCreate} loading={createSupervisor.isPending || createTeacher.isPending}
          primaryLabel={kind === "teacher" ? "إنشاء حساب المعلم" : "إنشاء حساب المشرف"} />}>
          <View style={styles.kindRow}>
            {([["teacher", "معلم"], ["supervisor", "مشرف"]] as [Kind, string][]).map(([value, label]) => (
              <Pressable key={value} onPress={() => { setKind(value); setLevelId(null); setFormError(null); }} style={[styles.kindButton, { borderColor: kind === value ? colors.primary : colors.border, backgroundColor: kind === value ? `${colors.primary}12` : colors.card }]}>
                <Text style={[styles.kindText, { color: colors.text }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
           <Text style={[styles.label, { color: colors.text }]}>الاسم الكامل (عربي أو إنجليزي)</Text>
           <TextInput value={fullName} onChangeText={(value) => { setFullName(value); setFormError(null); }} placeholder="محمد أحمد العجمي" placeholderTextColor={colors.muted} autoCapitalize="words" textAlign="right" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
            <Text style={[styles.label, { color: colors.text }]}>اسم دخول {kind === "teacher" ? "المعلم" : "المشرف"} (فريد — عربي أو إنجليزي، بلا مسافات)</Text>
           <TextInput value={username} onChangeText={(value) => { setUsername(value); setFormError(null); }} placeholder="محمد_العجمي" placeholderTextColor={colors.muted} autoCapitalize="none" textAlign="right" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
            <Text style={[styles.muted, { color: colors.muted }]}>مثال مقبول: {kind === "teacher" ? "معلم_١ أو محمد_العجمي" : "مشرف_١ أو محمد_العجمي"} — لا تستخدم مسافة داخل اسم المستخدم.</Text>
           <Text style={[styles.label, { color: colors.text }]}>كلمة المرور</Text>
           <TextInput value={password} onChangeText={setPassword} placeholder="أدخل كلمة المرور" placeholderTextColor={colors.muted} secureTextEntry textAlign="left" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
           <Text style={[styles.label, { color: colors.text }]}>تأكيد كلمة السر</Text>
          <TextInput value={confirm} onChangeText={setConfirm} placeholder="تأكيد كلمة السر" placeholderTextColor={colors.muted} secureTextEntry textAlign="left" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />

          {kind === "teacher" ? (
            <>
              <AdminSelect label="المسار" value={path} options={availablePaths.map((value) => ({ value, label: PATH_LABELS[value] ?? value }))} onChange={(value) => { setPath(value); setLevelId(null); }} />
              {path === "sharia" ? (
                <>
                  <AdminSelect label="المادة الشرعية" value={subject} options={SHARIA_SUBJECTS.map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => { setSubject(value); setLevelId(null); }} />
                </>
              ) : null}
               {levels.isLoading ? <LoadingState label="جارٍ تحميل المستويات…" /> : pathLevels.length ? <AdminSelect label={path === "sharia" ? "المستوى (تابع للمادة)" : "المستوى (تابع للمسار)"} value={levelId === null ? "" : String(levelId)} options={pathLevels.map((level: any, index: number) => ({ value: String(level.id), label: path === "tajweed" ? (TAJWEED_LEVEL_LABELS[index] ?? level.name) : level.name }))} onChange={(value) => setLevelId(Number(value))} placeholder="اختر المستوى" /> : <Text style={[styles.muted, { color: colors.danger }]}>لا توجد مستويات نشطة — أنشئها من صفحة «المواد والمستويات» أولاً</Text>}
            </>
          ) : null}
          <FormError message={formError} />

      </AdminSheet>

      <AdminSheet visible={!!resetTarget} title="إعادة تعيين كلمة السر" subtitle={resetTarget ? `${resetTarget.username ?? resetTarget.fullName} — ستُنهى جلساته القائمة` : undefined}
        onClose={closeReset} dirty={resetDirty} busy={resetPassword.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={submitReset} loading={resetPassword.isPending} primaryLabel="حفظ كلمة السر الجديدة" />}>
        <FormError message={resetError} />
        <Text style={[styles.label, { color: colors.text }]}>كلمة السر الجديدة</Text>
        <TextInput value={newPassword} onChangeText={(value) => { setNewPassword(value); setResetError(null); }} placeholder="أدخل كلمة المرور الجديدة" placeholderTextColor={colors.muted} secureTextEntry textAlign="left" accessibilityLabel="كلمة السر الجديدة" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
        <Text style={[styles.label, { color: colors.text }]}>تأكيد كلمة السر</Text>
        <TextInput value={newConfirm} onChangeText={(value) => { setNewConfirm(value); setResetError(null); }} placeholder="تأكيد كلمة السر" placeholderTextColor={colors.muted} secureTextEntry textAlign="left" accessibilityLabel="تأكيد كلمة السر" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
      </AdminSheet>

      <ConfirmAction visible={!!suspendTarget} title="إيقاف هذا الحساب؟" itemName={suspendTarget ? String(suspendTarget.username ?? suspendTarget.fullName) : undefined}
        impact="سيُمنع صاحب الحساب من الدخول وتُنهى جلساته الحالية فوراً. يمكنك إعادة تنشيطه لاحقاً." confirmLabel="إيقاف الحساب"
        loading={setActive.isPending} onCancel={() => setSuspendTarget(null)} onConfirm={() => suspendTarget && setActive.mutate({ userId: suspendTarget.id, isActive: false })} />
      <ConfirmAction visible={!!terminateTarget} title="إنهاء كل الجلسات؟" itemName={terminateTarget ? String(terminateTarget.username ?? terminateTarget.fullName) : undefined}
        impact="سيُسجَّل خروج الحساب من كل الأجهزة، ويمكنه الدخول مجدداً بكلمة السر." confirmLabel="إنهاء الجلسات"
        loading={terminateSessions.isPending} onCancel={() => setTerminateTarget(null)} onConfirm={() => terminateTarget && terminateSessions.mutate({ userId: terminateTarget.id })} />

      {!rows.length ? <EmptyState title="لا توجد حسابات منشأة بعد" description="ابدأ بإضافة حساب جديد" icon="key-outline" /> : rows.map((account) => (
        <Card key={account.id}>
          <View style={styles.accountHeader}>
            <View style={[styles.accountIcon, { backgroundColor: `${colors.primary}14` }]}><Text style={{ color: colors.primary, fontSize: 18 }}>{account.role === "admin" ? "◈" : "●"}</Text></View>
            <View style={styles.accountBody}>
             <Text style={[styles.accountName, { color: colors.text }]}>{account.fullName ?? account.username}</Text>
             {account.username ? <Text style={[styles.muted, { color: colors.muted }]}>{account.username}</Text> : null}
              <Text style={[styles.muted, { color: colors.muted }]}>{account.role === "admin" ? "مشرف" : "معلم"}{account.role === "teacher" && account.assignedPath ? ` · ${PATH_LABELS[account.assignedPath] ?? account.assignedPath}` : ""}{account.role === "teacher" && account.levelName ? ` — ${account.levelName}` : ""}</Text>
            </View>
            <View style={styles.accountStatus}><Badge label={account.isActive ? "نشط" : "موقوف"} tone={account.isActive ? "success" : "danger"} /><Text style={[styles.muted, { color: colors.muted }]}>{formatDate(account.createdAt)}</Text></View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.actions}>
            <Button label={account.isActive ? "إيقاف الحساب" : "تنشيط الحساب"} variant={account.isActive ? "danger" : "primary"} loading={setActive.isPending && pendingId === account.id} disabled={pendingId === account.id} onPress={() => toggleActive(account)} />
            <Button label="إعادة تعيين كلمة السر" variant="secondary" onPress={() => setResetTarget(account)} />
            <Button label="إنهاء الجلسات" variant="secondary" loading={terminateSessions.isPending && pendingId === account.id} disabled={pendingId === account.id} onPress={() => terminate(account)} />
          </View>
        </Card>
      ))}
    </AdminFrame>
  );
}

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  headerText: { flex: 1, alignItems: "flex-end" },
  title: { fontFamily: "Amiri_700Bold", fontSize: 22, textAlign: "right" },
  subtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 3 },
  feedback: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginBottom: 10 },
  formTitle: { fontFamily: "Amiri_700Bold", fontSize: 18, textAlign: "right", marginBottom: 12 },
  kindRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  kindButton: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, alignItems: "center" },
  kindText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 9, fontFamily: "IBMPlexSansArabic_400Regular" },
  label: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right", marginTop: 4, marginBottom: 6 },
  optionRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginBottom: 8 },
  option: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  optionText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right" },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginVertical: 8 },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 3 },
  actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 10 },
  accountHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  accountIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  accountBody: { flex: 1, alignItems: "flex-end" },
  accountName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  accountStatus: { alignItems: "flex-end", gap: 3 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
});