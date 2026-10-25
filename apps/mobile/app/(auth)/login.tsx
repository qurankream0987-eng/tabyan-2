import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Icon, Screen } from "../../components/ui";
import { useTheme, palette } from "../../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../lib/auth";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { normalizeDigits } from "../../../../packages/trpc/src/lib/input-normalization";
import { resolveNativeLoginMethod } from "../../lib/native-login-method";

function errorMessage(error: unknown) {
  return userFacingErrorMessage(error, "تعذر تسجيل الدخول. تحقق من بياناتك.");
}

export default function Login() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    identifier?: string;
    role?: "student" | "teacher" | "admin";
    reason?: "existing-account";
  }>();
  const [identifier, setIdentifier] = useState(() => String(params.identifier ?? ""));
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const loginRole = params.role ?? "student";
  const [error, setError] = useState("");
  const studentLogin = trpc.auth.studentPasswordLogin.useMutation();
  const accountLogin = trpc.auth.passwordLogin.useMutation();
  const loading = studentLogin.isPending || accountLogin.isPending;

  const submitLogin = async () => {
    setError("");
    const rawValue = identifier.trim();
    const value = loginRole === "student" && !rawValue.includes("@") ? normalizeDigits(rawValue) : rawValue;
    if (!value || !password) {
      setError(loginRole === "student" ? "أدخل رقم الهاتف أو البريد الإلكتروني وكلمة السر" : "أدخل اسم المستخدم وكلمة السر");
      return;
    }
    try {
      const loginMethod = resolveNativeLoginMethod(loginRole, value);
      if (loginMethod === "invalid-student-identifier") {
        setError("حساب الطالب يسجل الدخول برقم الهاتف أو البريد الإلكتروني فقط");
        return;
      }
      const result = loginMethod === "student"
        ? await studentLogin.mutateAsync({ identifier: value, password, rememberMe })
        : await accountLogin.mutateAsync({ username: value, password, rememberMe });

      if (params.role && result.role !== params.role) {
        const roleName = params.role === "teacher" ? "معلم" : params.role === "admin" ? "مشرف" : "طالب";
        throw new Error(`هذا الحساب ليس حساب ${roleName}`);
      }
      if (loginMethod === "student" && result.role !== "student") throw new Error("هذا الحساب ليس حساب طالب");

      await signIn(result.token, result.role, result.name);
      router.replace(result.role === "teacher" ? "/teacher" : result.role === "admin" ? "/admin" : "/student/home");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top}>
      <Screen contentStyle={styles.screen}>
        <Card style={styles.form}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق تسجيل الدخول"
            testID="login-close"
            onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
            style={[styles.closeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Icon name="close-outline" size={21} color={colors.primary} />
          </Pressable>
          <Image source={isDark ? require("../../assets/images/logo-dark.png") : require("../../assets/images/logo-light.png")} resizeMode="contain" style={styles.logo} accessibilityLabel="تبيان" />
          <Text style={[styles.title, { color: colors.text }]}>
            {loginRole === "teacher" ? "دخول المعلم" : loginRole === "admin" ? "دخول المشرف" : "تسجيل الدخول"}
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {loginRole === "student"
              ? "استخدم رقم الهاتف أو البريد الإلكتروني مع كلمة السر"
              : "استخدم اسم المستخدم وكلمة السر"}
          </Text>
          {params.reason === "existing-account" && loginRole === "student" ? (
            <View style={[styles.notice, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Icon name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.text }]}>
                هذا الرقم مرتبط بحساب موجود. أدخل كلمة السر لتسجيل الدخول؛ لن تُنشأ كلمة سر جديدة.
              </Text>
            </View>
          ) : null}
          <TextInput
            value={identifier}
            onChangeText={(value) => { setIdentifier(value); setError(""); }}
            placeholder={loginRole === "student" ? "الهاتف أو البريد الإلكتروني" : "اسم المستخدم"}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="default"
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            textAlign="center"
            autoComplete="username"
          />
          <TextInput
            value={password}
            onChangeText={(value) => { setPassword(value); setError(""); }}
            placeholder="كلمة السر"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="current-password"
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            textAlign="center"
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
            testID="login-remember-me"
            onPress={() => setRememberMe((value) => !value)}
            style={styles.remember}
          >
            <View style={[styles.check, { borderColor: rememberMe ? colors.primary : colors.border, backgroundColor: rememberMe ? colors.primary : "transparent" }]}>
              {rememberMe ? <Icon name="checkmark" size={14} color={colors.primaryText} /> : null}
            </View>
            <Text style={[styles.rememberText, { color: colors.muted }]}>تذكرني على هذا الجهاز</Text>
          </Pressable>
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <Button
            testID="login-submit"
            label={loading ? "جارٍ الدخول…" : loginRole === "student" ? "تسجيل الدخول" : "دخول"}
            onPress={() => void submitLogin()}
            loading={loading}
            disabled={!identifier.trim() || !password}
            style={styles.submit}
          />
          {loginRole === "student" ? (
            <Pressable
              testID="login-register-new-account"
              onPress={() => router.push("/register")}
              style={[styles.register, { borderColor: colors.border, marginTop: 12 }]}
            >
              <Text style={[styles.registerText, { color: colors.text }]}>إنشاء حساب جديد</Text>
            </Pressable>
          ) : null}
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingTop: 20, paddingBottom: 24, alignItems: "center", justifyContent: "center" },
  form: { width: "100%", maxWidth: 440, paddingHorizontal: 20, paddingTop: 46, paddingBottom: 20, borderRadius: 22, alignItems: "stretch" },
  closeButton: { position: "absolute", top: 12, left: 12, zIndex: 1, width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 48, height: 42, alignSelf: "center", marginBottom: 8 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 23, textAlign: "center" },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "center", marginTop: 4, marginBottom: 17 },
  notice: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  noticeText: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 20, textAlign: "right" },
  input: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 15, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, marginBottom: 11 },
  remember: { flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 1, marginBottom: 5 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rememberText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  error: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, textAlign: "center", lineHeight: 20, marginVertical: 8 },
  submit: { minHeight: 50, borderRadius: 999, marginTop: 10 },
  register: { minHeight: 48, borderRadius: 999, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  registerText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14 },
});
