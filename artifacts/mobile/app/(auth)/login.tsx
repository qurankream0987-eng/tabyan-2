import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Icon, Screen } from "../../components/ui";
import { useTheme, palette } from "../../lib/theme";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../lib/auth";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { normalizeDigits } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";

function errorMessage(error: unknown) {
  return userFacingErrorMessage(error, "تعذر تسجيل الدخول. تحقق من بياناتك.");
}

export default function Login() {
  const { colors, isDark } = useTheme();
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
  const [loginRole, setLoginRole] = useState<"student" | "teacher" | "admin">(() => params.role ?? "student");
  const [error, setError] = useState("");
  const studentLogin = trpc.auth.studentPasswordLogin.useMutation();
  const accountLogin = trpc.auth.passwordLogin.useMutation();
  const loading = studentLogin.isPending || accountLogin.isPending;

  const submitLogin = async () => {
    setError("");
    const rawValue = identifier.trim();
    const value = loginRole === "student" && !rawValue.includes("@") ? normalizeDigits(rawValue) : rawValue;
    if (!value || !password) {
      setError(loginRole === "student" ? "أدخل رقم الهاتف أو البريد وكلمة السر" : "أدخل اسم المستخدم وكلمة السر");
      return;
    }

    try {
      const isPhone = /^\+|^05/.test(value);
      const isEmail = value.includes("@");
      if (loginRole === "student" && !isPhone && !isEmail) {
        setError("حساب الطالب يسجل الدخول برقم الهاتف أو البريد الإلكتروني فقط");
        return;
      }
      const result = loginRole === "student"
        ? await studentLogin.mutateAsync({ identifier: value, password, rememberMe })
        : await accountLogin.mutateAsync({ username: value, password, rememberMe });

      if (result.role !== loginRole) {
        const roleName = loginRole === "teacher" ? "معلم" : loginRole === "admin" ? "مشرف" : "طالب";
        throw new Error(`هذا الحساب ليس حساب ${roleName}`);
      }

      await signIn(result.token, result.role, result.name);
      router.replace(result.role === "teacher" ? "/teacher" : result.role === "admin" ? "/admin" : "/student/home");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen contentStyle={styles.screen}>
        <View style={styles.brand}>
          <Image source={require("../../assets/images/logo-gold.png")} resizeMode="contain" style={styles.logo} accessibilityLabel="تبيان" />
          <Text style={[styles.brandSub, { color: colors.muted }]}>رفيقك في رحلة القرآن</Text>
        </View>
        <Card style={styles.form}>
          <View style={styles.roleChoices}>
            {([
              ["student", "طالب"],
              ["teacher", "معلم"],
              ["admin", "مشرف"],
            ] as const).map(([role, label]) => {
              const selected = loginRole === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => { setLoginRole(role); setError(""); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.roleChoice,
                    {
                      backgroundColor: selected ? (isDark ? palette.gold : palette.burgundy) : colors.input,
                      borderColor: selected ? (isDark ? palette.gold : palette.burgundy) : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.roleChoiceText, { color: selected ? (isDark ? palette.night : "#FFF") : colors.text }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {loginRole === "teacher" ? "دخول المعلم" : loginRole === "admin" ? "دخول المشرف" : "تسجيل الدخول"}
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {loginRole === "student" ? "استخدم رقم الهاتف أو البريد الإلكتروني مع كلمة السر" : "استخدم اسم المستخدم وكلمة السر"}
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
            placeholder={loginRole === "student" ? "رقم الهاتف أو البريد الإلكتروني" : "اسم المستخدم"}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType={loginRole === "student" ? "email-address" : "default"}
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            textAlign="right"
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
            textAlign="right"
          />
          <Pressable onPress={() => setRememberMe((value) => !value)} style={styles.remember}><View style={[styles.check, { borderColor: rememberMe ? colors.primary : colors.border, backgroundColor: rememberMe ? colors.primary : "transparent" }]}>{rememberMe ? <Icon name="checkmark" size={14} color={colors.primaryText} /> : null}</View><Text style={[styles.rememberText, { color: colors.muted }]}>تذكرني على هذا الجهاز</Text></Pressable>
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <Button label={loginRole === "student" ? "تسجيل الدخول" : "دخول"} icon="log-in-outline" onPress={() => void submitLogin()} loading={loading} disabled={!identifier.trim() || !password} />
          <View style={styles.divider}><View style={[styles.line, { backgroundColor: colors.border }]} /><Text style={[styles.or, { color: colors.muted }]}>أو</Text><View style={[styles.line, { backgroundColor: colors.border }]} /></View>
          {loginRole === "student" ? <Pressable onPress={() => router.push("/register")} style={[styles.register, { borderColor: colors.border }]}><Text style={[styles.registerText, { color: colors.text }]}>إنشاء حساب جديد</Text></Pressable> : null}
        </Card>
        <Text style={[styles.security, { color: colors.muted }]}><Icon name="shield-checkmark-outline" size={14} color={colors.muted} /> بياناتك محمية بتوثيق خادمي آمن</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 44, alignItems: "stretch" },
  brand: { alignItems: "center", marginBottom: 28 },
  logo: { width: 170, height: 86, marginBottom: 3 },
  brandSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, marginTop: 2 },
  form: { padding: 20 },
  roleChoices: { flexDirection: "row-reverse", gap: 8, marginBottom: 18 },
  roleChoice: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  roleChoiceText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 21, textAlign: "right" },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginTop: 5, marginBottom: 18 },
  notice: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  noticeText: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 20, textAlign: "right" },
  input: { height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, marginBottom: 10 },
  remember: { flexDirection: "row-reverse", justifyContent: "flex-start", alignItems: "center", gap: 8, marginVertical: 5 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rememberText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  error: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, textAlign: "right", lineHeight: 20, marginVertical: 8 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  or: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  register: { minHeight: 46, borderRadius: 999, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  registerText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14 },
  security: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center", marginTop: 18 },
});
