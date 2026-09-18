import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Card, Header, Screen } from "../../components/ui";
import { useTheme, palette } from "../../lib/theme";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../lib/auth";
import { COUNTRIES, normalizeNationalPhoneInput, toE164, validatePhoneNumber } from "../../lib/countries";
import { validateRegistrationPassword } from "../../lib/registration-validation";
import { isValidPersonName, normalizeDigits, normalizePersonName } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";
import { userFacingErrorDetails } from "../../lib/user-facing-error";

type Step = "name" | "birthdate" | "phone" | "school" | "level" | "grade" | "password" | "email";
type SchoolStage = "primary" | "middle" | "high";

const STAGES: Array<{ key: SchoolStage; title: string }> = [
  { key: "primary", title: "الابتدائية" },
  { key: "middle", title: "المتوسطة" },
  { key: "high", title: "الثانوية" },
];

const GRADES: Record<SchoolStage, string[]> = {
  primary: ["الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس"],
  middle: ["الصف السادس", "الصف السابع", "الصف الثامن", "الصف التاسع"],
  high: ["الصف العاشر", "الصف الحادي عشر", "الصف الثاني عشر"],
};

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function calcAge(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (!value || Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const month = now.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < date.getDate())) age -= 1;
  return age;
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepHeader}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.stepSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

function ChoiceCard({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? (isDark ? `${palette.gold}18` : `${palette.burgundy}0d`) : colors.input,
          borderColor: selected ? (isDark ? palette.gold : palette.burgundy) : colors.border,
        },
      ]}
    >
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.choiceSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

export function CountryPicker({ dial, onSelect }: { dial: string; onSelect: (value: string) => void }) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((country) => country.dial === dial) ?? COUNTRIES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="الدولة ورمز الاتصال"
        style={[styles.countryButton, { backgroundColor: colors.input, borderColor: colors.border }]}
      >
        <Text style={[styles.countryButtonText, { color: colors.text }]}>{selected.flag} {selected.name}</Text>
        <Text style={[styles.countryDial, { color: colors.muted }]}>+{selected.dial} ︾</Text>
      </Pressable>
      <NativeModal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.countryModal, { backgroundColor: isDark ? "#451322" : "#FFFCF5" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>اختر الدولة</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="إغلاق اختيار الدولة">
                <Text style={[styles.closeText, { color: colors.primary }]}>إغلاق</Text>
              </Pressable>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(country) => country.iso}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onSelect(item.dial); setOpen(false); }}
                  style={[styles.countryRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.countryName, { color: colors.text }]}>{item.flag} {item.name}</Text>
                  <Text style={[styles.countryDial, { color: colors.muted }]}>+{item.dial}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </NativeModal>
    </>
  );
}

export default function Register() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [fullName, setFullName] = useState("");
  const [dobY, setDobY] = useState("");
  const [dobM, setDobM] = useState("");
  const [dobD, setDobD] = useState("");
  const [dial, setDial] = useState("965");
  const [phone, setPhone] = useState("");
  const [phoneHasInvalidCharacters, setPhoneHasInvalidCharacters] = useState(false);
  const [inSchool, setInSchool] = useState<boolean | null>(null);
  const [stage, setStage] = useState<SchoolStage | null>(null);
  const [grade, setGrade] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const checkPhone = trpc.auth.checkPhone.useMutation();
  const completeProfile = trpc.auth.completeProfile.useMutation();
  const busy = checkPhone.isPending || completeProfile.isPending;
  const birthDate = dobY && dobM && dobD ? `${dobY}-${dobM.padStart(2, "0")}-${dobD.padStart(2, "0")}` : "";
  const age = useMemo(() => calcAge(birthDate), [birthDate]);
  const serverError = completeProfile.error ? userFacingErrorDetails(completeProfile.error, "تعذر إنشاء الحساب. حاول مرة أخرى.") : null;
  const visibleError = error || serverError?.message || "";
  const totalSteps = inSchool ? 8 : 6;
  const stepIndex: Record<Step, number> = { name: 1, birthdate: 2, phone: 3, school: 4, level: 5, grade: 6, password: inSchool ? 7 : 5, email: inSchool ? 8 : 6 };

  const clearError = () => {
    setError("");
    if (completeProfile.error) completeProfile.reset();
  };

  const goBack = () => {
    clearError();
    if (step === "birthdate") setStep("name");
    else if (step === "phone") setStep("birthdate");
    else if (step === "school") setStep("phone");
    else if (step === "level") setStep("school");
    else if (step === "grade") setStep("level");
    else if (step === "password") setStep(inSchool ? "grade" : "school");
    else if (step === "email") setStep("password");
    else router.back();
  };

  const submitRegistration = async () => {
    clearError();
    const normalizedName = normalizePersonName(fullName);
    try {
      const result = await completeProfile.mutateAsync({
        fullName: normalizedName,
        phone: toE164(dial, normalizeNationalPhoneInput(dial, phone)),
        birthDate,
        schoolStage: inSchool ? stage ?? undefined : undefined,
        schoolGrade: inSchool ? grade : undefined,
        password,
        confirmPassword,
        role: "student",
        rememberMe: true,
        email: email.trim() ? email.trim().toLowerCase() : undefined,
      });
      await signIn(result.token, result.role, normalizedName);
      router.replace("/student/home");
    } catch {
      // The server-facing message is rendered through userFacingErrorDetails.
    }
  };

  const next = async () => {
    clearError();
    if (step === "name") {
      const normalizedName = normalizePersonName(fullName);
      if (!isValidPersonName(normalizedName)) {
        setError("الاسم غير صالح");
        return;
      }
      if (normalizedName.split(" ").length < 3) {
        setError("الرجاء إدخال الاسم ثلاثياً على الأقل (مثال: محمد أحمد علي)");
        return;
      }
      setFullName(normalizedName);
      setStep("birthdate");
      return;
    }
    if (step === "birthdate") {
      if (!birthDate || age === null || age < 4 || age > 100) {
        setError("أدخل تاريخ ميلاد صحيحاً");
        return;
      }
      setStep("phone");
      return;
    }
    if (step === "phone") {
      const nationalPhone = normalizeNationalPhoneInput(dial, phone);
      const phoneError = phoneHasInvalidCharacters
        ? "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة."
        : validatePhoneNumber(dial, nationalPhone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
      try {
        const result = await checkPhone.mutateAsync({ phone: toE164(dial, nationalPhone) });
        if (result.registered) {
          router.replace({
            pathname: "/login",
            params: {
              identifier: toE164(dial, nationalPhone),
              role: "student",
              reason: "existing-account",
            },
          });
          return;
        }
        setPhone(nationalPhone);
        setStep("school");
      } catch (caught) {
        setError(userFacingErrorDetails(caught, "تعذّر التحقق من الرقم — حاول مرة أخرى").message);
      }
      return;
    }
    if (step === "school") {
      if (inSchool === null) {
        setError("الرجاء اختيار وضعك المدرسي");
        return;
      }
      setStep(inSchool ? "level" : "password");
      return;
    }
    if (step === "level") {
      if (!stage) {
        setError("الرجاء اختيار مرحلتك الدراسية");
        return;
      }
      setStep("grade");
      return;
    }
    if (step === "grade") {
      if (!grade) {
        setError("الرجاء اختيار صفك الدراسي");
        return;
      }
      setStep("password");
      return;
    }
    if (step === "password") {
      const passwordError = validateRegistrationPassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setError("كلمتا السر غير متطابقتين");
        return;
      }
      setStep("email");
      return;
    }
    await submitRegistration();
  };

  const inputStyle = (hasError = false) => [
    styles.input,
    {
      backgroundColor: colors.input,
      borderColor: hasError ? colors.danger : colors.border,
      color: colors.text,
    },
  ];

  const actions = (primaryLabel: string, onPrimary = next, primaryLoading = false) => (
    <View style={styles.actions}>
      <Button label="السابق" variant="secondary" onPress={goBack} style={styles.actionButton} />
      <Button label={primaryLabel} onPress={() => void onPrimary()} loading={primaryLoading} disabled={busy && !primaryLoading} style={styles.actionButton} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll contentStyle={styles.screen}>
        <Header title="حساب جديد" back />
        <View style={styles.brand}>
          <Image source={require("../../assets/images/logo-gold.png")} resizeMode="contain" style={styles.logo} accessibilityLabel="تبيان" />
        </View>
        <Card style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressText, { color: colors.muted }]}>الخطوة {stepIndex[step]} من {totalSteps}</Text>
            <Text style={[styles.progressText, { color: colors.primary }]}>{Math.round((stepIndex[step] / totalSteps) * 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.input }]}>
            <View style={[styles.progressFill, { backgroundColor: palette.gold, width: `${(stepIndex[step] / totalSteps) * 100}%` }]} />
          </View>

          {step === "name" ? (
            <>
              <StepHeader title="ما اسمك الكامل؟" subtitle="سيظهر اسمك لمعلمك وزملائك في الحلقة" />
              <TextInput value={fullName} onChangeText={(value) => { setFullName(value); clearError(); }} placeholder="مثال: أحمد محمد" placeholderTextColor={colors.muted} style={inputStyle()} textAlign="right" autoFocus />
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              <Button label="التالي" onPress={() => void next()} style={styles.fullButton} />
            </>
          ) : null}

          {step === "birthdate" ? (
            <>
              <StepHeader title="متى وُلدت؟" />
              <View style={styles.dateRow}>
                <TextInput value={dobD} onChangeText={(value) => { setDobD(normalizeDigits(value).replace(/\D/g, "").slice(0, 2)); clearError(); }} placeholder="اليوم" placeholderTextColor={colors.muted} keyboardType="number-pad" style={inputStyle()} textAlign="center" />
                <TextInput value={dobM} onChangeText={(value) => { setDobM(normalizeDigits(value).replace(/\D/g, "").slice(0, 2)); clearError(); }} placeholder="الشهر" placeholderTextColor={colors.muted} keyboardType="number-pad" style={inputStyle()} textAlign="center" />
                <TextInput value={dobY} onChangeText={(value) => { setDobY(normalizeDigits(value).replace(/\D/g, "").slice(0, 4)); clearError(); }} placeholder="السنة" placeholderTextColor={colors.muted} keyboardType="number-pad" style={inputStyle()} textAlign="center" />
              </View>
              {age !== null && age >= 4 && age <= 100 ? <Text style={[styles.ageHint, { color: colors.primary }]}>العمر: {age} سنة</Text> : null}
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              {actions("التالي")}
            </>
          ) : null}

          {step === "phone" ? (
            <>
              <StepHeader title="رقم جوالك" subtitle="اختر دولتك وسيظهر مفتاحها تلقائياً — سيُستخدم الرقم مع كلمة السر للدخول" />
              <CountryPicker dial={dial} onSelect={(value) => { setDial(value); clearError(); }} />
              <View style={styles.phoneInputWrap}>
                <Text style={[styles.dialPrefix, { color: colors.muted }]}>+{dial}</Text>
                <TextInput
                  value={phone}
                  onChangeText={(value) => {
                    const normalized = normalizeDigits(value);
                    setPhoneHasInvalidCharacters(/[^\d\s().+-]/.test(normalized));
                    setPhone(normalizeNationalPhoneInput(dial, value));
                    clearError();
                  }}
                  placeholder="5XXXXXXXX"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  style={inputStyle()}
                  textAlign="left"
                  maxLength={15}
                  autoFocus
                />
              </View>
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              {actions(checkPhone.isPending ? "جارٍ التحقق…" : "التالي", next, checkPhone.isPending)}
            </>
          ) : null}

          {step === "school" ? (
            <>
              <StepHeader title="هل أنت طالب في المدرسة؟" subtitle="اختر ما ينطبق على وضعك الحالي" />
              <ChoiceCard title="نعم" subtitle="أنا مقيّد في مدرسة" selected={inSchool === true} onPress={() => { setInSchool(true); clearError(); }} />
              <ChoiceCard title="لا" subtitle="خريج أو خارج المدرسة" selected={inSchool === false} onPress={() => { setInSchool(false); clearError(); }} />
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              <Button label="التالي" onPress={() => void next()} style={styles.fullButton} />
            </>
          ) : null}

          {step === "level" ? (
            <>
              <StepHeader title="ما مرحلتك الدراسية؟" subtitle="اختر المرحلة التي أنت فيها الآن" />
              {STAGES.map((item) => <ChoiceCard key={item.key} title={item.title} selected={stage === item.key} onPress={() => { setStage(item.key); setGrade(""); clearError(); }} />)}
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              {actions("التالي")}
            </>
          ) : null}

          {step === "grade" && stage ? (
            <>
              <StepHeader title="ما صفّك الدراسي؟" subtitle={`اختر صفك في المرحلة ${STAGES.find((item) => item.key === stage)?.title}`} />
              <View style={styles.gradeGrid}>
                {GRADES[stage].map((item) => (
                  <Pressable key={item} onPress={() => { setGrade(item); clearError(); }} style={[styles.gradePill, { backgroundColor: grade === item ? `${colors.primary}18` : colors.input, borderColor: grade === item ? colors.primary : colors.border }]}>
                    <Text style={[styles.gradeText, { color: colors.text }]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              {actions("التالي")}
            </>
          ) : null}

          {step === "password" ? (
            <>
              <StepHeader title="أنشئ كلمة سر" subtitle="يمكن أن تكون كلمة المرور حرفاً أو رقماً واحداً فأكثر" />
              <View style={styles.passwordField}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>كلمة السر</Text>
                <View style={styles.passwordWrap}>
                  <TextInput accessibilityLabel="كلمة السر" value={password} onChangeText={(value) => { setPassword(value); clearError(); }} placeholder="أدخل كلمة السر" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} style={[inputStyle(), styles.passwordInput]} textAlign="right" autoFocus />
                  <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"} onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}><Text style={{ color: colors.muted }}>{showPassword ? "إخفاء" : "إظهار"}</Text></Pressable>
                </View>
              </View>
              <View style={styles.passwordField}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>تأكيد كلمة السر</Text>
                <View style={styles.passwordWrap}>
                  <TextInput accessibilityLabel="تأكيد كلمة السر" value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); clearError(); }} placeholder="أعد إدخال كلمة السر" placeholderTextColor={colors.muted} secureTextEntry={!showConfirmPassword} style={[inputStyle(), styles.passwordInput]} textAlign="right" />
                  <Pressable accessibilityRole="button" accessibilityLabel={showConfirmPassword ? "إخفاء تأكيد كلمة السر" : "إظهار تأكيد كلمة السر"} onPress={() => setShowConfirmPassword((value) => !value)} style={styles.eyeButton}><Text style={{ color: colors.muted }}>{showConfirmPassword ? "إخفاء" : "إظهار"}</Text></Pressable>
                </View>
              </View>
              <View style={styles.rules}>
                <Text style={{ color: password.trim().length > 0 ? colors.success : colors.muted }}>• محرف واحد غير مسافة على الأقل</Text>
                {confirmPassword ? <Text style={{ color: password === confirmPassword ? colors.success : colors.danger }}>{password === confirmPassword ? "• الكلمتان متطابقتان" : "• الكلمتان غير متطابقتين"}</Text> : null}
              </View>
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              {actions(completeProfile.isPending ? "جارٍ التسجيل…" : "التالي")}
            </>
          ) : null}

          {step === "email" ? (
            <>
              <StepHeader title="البريد الإلكتروني (اختياري)" subtitle="لاستعادة حسابك واستلام التنبيهات — يمكنك الإكمال بدونه" />
              <TextInput value={email} onChangeText={(value) => { setEmail(value); clearError(); }} placeholder="name@example.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" style={inputStyle()} textAlign="left" />
              {visibleError ? <Text style={[styles.error, { color: colors.danger }]}>{visibleError}</Text> : null}
              {actions(completeProfile.isPending ? "جارٍ التسجيل…" : "إكمال التسجيل", submitRegistration, completeProfile.isPending)}
            </>
          ) : null}
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  brand: { alignItems: "center", marginTop: 4, marginBottom: 3 },
  logo: { width: 150, height: 68 },
  card: { marginTop: 16, padding: 20 },
  progressHeader: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 7 },
  progressText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11 },
  progressTrack: { height: 7, borderRadius: 7, overflow: "hidden", marginBottom: 24 },
  progressFill: { height: 7, borderRadius: 7 },
  stepHeader: { marginBottom: 18 },
  stepTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 21, textAlign: "right" },
  stepSubtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginTop: 5 },
  input: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, marginBottom: 10 },
  dateRow: { flexDirection: "row-reverse", gap: 8 },
  ageHint: { fontFamily: "IBMPlexSansArabic_600SemiBold", textAlign: "center", fontSize: 12, marginBottom: 5 },
  countryButton: { minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  countryButtonText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13 },
  countryDial: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  phoneInputWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  dialPrefix: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 14, minWidth: 42, textAlign: "center" },
  choice: { minHeight: 64, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 10 },
  choiceCopy: { flex: 1, alignItems: "flex-end" },
  choiceTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  choiceSubtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 2, textAlign: "right" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  gradeGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  gradePill: { minWidth: "47%", minHeight: 48, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  gradeText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "center" },
  passwordField: { marginBottom: 2 },
  fieldLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginBottom: 6 },
  passwordWrap: { position: "relative" },
  passwordInput: { paddingLeft: 76 },
  eyeButton: { position: "absolute", left: 8, top: 6, minWidth: 60, height: 40, alignItems: "center", justifyContent: "center", zIndex: 2 },
  rules: { gap: 4, marginTop: 2, marginBottom: 5, alignItems: "flex-end" },
  error: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 20, textAlign: "right", marginBottom: 8 },
  actions: { flexDirection: "row-reverse", gap: 10, marginTop: 8 },
  actionButton: { flex: 1 },
  fullButton: { marginTop: 8, width: "100%" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  countryModal: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingBottom: 12 },
  modalTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 18 },
  closeText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  countryRow: { minHeight: 48, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  countryName: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
});