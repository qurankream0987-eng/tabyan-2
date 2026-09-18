import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Header, Screen } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { normalizeNationalPhoneInput, toE164, validatePhoneNumber } from "../../lib/countries";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { validateRegistrationPassword } from "../../lib/registration-validation";
import { isValidPersonName, normalizePersonName } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";
import { CountryPicker } from "./register";

type Step = "name" | "phone" | "password";

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useTheme();
  return <View style={styles.stepHeader}><Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.stepSubtitle, { color: colors.muted }]}>{subtitle}</Text></View>;
}

export default function TeacherRegister() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [fullName, setFullName] = useState("");
  const [dial, setDial] = useState("965");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const checkPhone = trpc.auth.checkPhone.useMutation();
  const completeProfile = trpc.auth.completeProfile.useMutation();
  const busy = checkPhone.isPending || completeProfile.isPending;
  const stepIndex = step === "name" ? 1 : step === "phone" ? 2 : 3;

  const next = async () => {
    setError("");
    if (step === "name") {
      const normalizedName = normalizePersonName(fullName);
      if (!isValidPersonName(normalizedName)) {
        setError("الاسم غير صالح");
        return;
      }
      setFullName(normalizedName);
      setStep("phone");
      return;
    }
    if (step === "phone") {
      const normalizedPhone = normalizeNationalPhoneInput(dial, phone);
      const phoneError = validatePhoneNumber(dial, normalizedPhone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
      try {
        const result = await checkPhone.mutateAsync({ phone: toE164(dial, normalizedPhone) });
        if (result.registered) {
          setError("هذا الرقم مسجّل مسبقاً — استخدم تسجيل الدخول بكلمة السر");
          return;
        }
        setStep("password");
      } catch (caught) {
        setError(userFacingErrorMessage(caught, "تعذّر التحقق من الرقم — حاول مرة أخرى"));
      }
      return;
    }
    const passwordError = validateRegistrationPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا السر غير متطابقتين");
      return;
    }
    try {
      const result = await completeProfile.mutateAsync({
        phone: toE164(dial, normalizeNationalPhoneInput(dial, phone)),
        fullName: normalizePersonName(fullName),
        birthDate: "1990-01-01",
        role: "teacher",
        password,
        confirmPassword,
        rememberMe: true,
      });
      await signIn(result.token, result.role, normalizePersonName(fullName));
      router.replace("/teacher");
    } catch (caught) {
      setError(userFacingErrorMessage(caught, "تعذّر إكمال التسجيل — حاول مرة أخرى"));
    }
  };

  const back = () => {
    setError("");
    if (step === "phone") setStep("name");
    else if (step === "password") setStep("phone");
    else router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title="حساب معلم" back />
      <Screen scroll contentStyle={styles.screen}>
          <Image source={require("../../assets/images/logo-gold.png")} resizeMode="contain" style={styles.logo} accessibilityLabel="تبيان" />
        <Card style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progress, { color: colors.muted }]}>الخطوة {stepIndex} من 3</Text>
            <Text style={[styles.progress, { color: colors.primary }]}>{Math.round((stepIndex / 3) * 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.input }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(stepIndex / 3) * 100}%` }]} /></View>

          {step === "name" ? (
            <>
              <StepHeader title="ما اسمك الكامل؟" subtitle="التسجيل كمعلم في منصة تبيان" />
              <TextInput autoFocus value={fullName} onChangeText={(value) => { setFullName(value); setError(""); }} placeholder="مثال: أحمد محمد" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} textAlign="right" />
            </>
          ) : null}
          {step === "phone" ? (
            <>
              <StepHeader title="رقم جوالك" subtitle="سيُستخدم الرقم مع كلمة المرور للدخول — لا يوجد رمز تحقق" />
              <CountryPicker dial={dial} onSelect={(value) => { setDial(value); setError(""); }} />
              <View style={styles.phoneRow}>
                <Text style={[styles.dial, { color: colors.muted }]}>+{dial}</Text>
              <TextInput autoFocus value={phone} onChangeText={(value) => { setPhone(normalizeNationalPhoneInput(dial, value)); setError(""); }} placeholder="5XXXXXXXX" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={[styles.input, styles.phoneInput, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} textAlign="left" />
              </View>
            </>
          ) : null}
          {step === "password" ? (
            <>
               <StepHeader title="أنشئ كلمة مرور" subtitle="يمكن أن تكون كلمة المرور حرفاً أو رقماً واحداً فأكثر" />
               <TextInput autoFocus value={password} onChangeText={(value) => { setPassword(value); setError(""); }} placeholder="أدخل كلمة المرور" placeholderTextColor={colors.muted} secureTextEntry style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} textAlign="left" />
               <TextInput value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setError(""); }} placeholder="تأكيد كلمة المرور" placeholderTextColor={colors.muted} secureTextEntry style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} textAlign="left" />
            </>
          ) : null}
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="السابق" variant="secondary" onPress={back} style={styles.actionButton} />
            <Button label={step === "password" ? (completeProfile.isPending ? "جارٍ التسجيل…" : "إنشاء الحساب") : checkPhone.isPending ? "جارٍ التحقق…" : "التالي"} onPress={() => void next()} loading={busy} style={styles.actionButton} />
          </View>
          <Button label="لدي حساب معلم — تسجيل الدخول" variant="quiet" onPress={() => router.replace({ pathname: "/login", params: { role: "teacher" } })} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 3 },
  logo: { width: 150, height: 68, alignSelf: "center", marginBottom: 4 },
  card: { padding: 20 },
  progressHeader: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 7 },
  progress: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11 },
  progressTrack: { height: 7, borderRadius: 7, overflow: "hidden", marginBottom: 24 },
  progressFill: { height: 7, borderRadius: 7 },
  stepHeader: { marginBottom: 18 },
  stepTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 21, textAlign: "right" },
  stepSubtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginTop: 5 },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, marginBottom: 10 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dial: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 14, minWidth: 42, textAlign: "center" },
  phoneInput: { flex: 1 },
  error: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 20, textAlign: "right", marginBottom: 8 },
  actions: { flexDirection: "row-reverse", gap: 10, marginTop: 8 },
  actionButton: { flex: 1 },
});