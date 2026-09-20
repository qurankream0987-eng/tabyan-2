import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Button, Card, ErrorState, FeatureTile, LoadingState, Screen, SectionTitle } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme } from "../../../lib/theme";

export default function Account() {
  const { token, name, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const query = trpc.auth.me.useQuery(undefined, { enabled: !!token, retry: false });
  const data = query.data as any;
  const userName = data?.fullName ?? name ?? "مستخدم تبيان";
  const student = data?.student as { totalJuz?: number | null } | null | undefined;
  const age = data?.age as number | null | undefined;
  if (query.isLoading) return <Screen><LoadingState /></Screen>;
 return <Screen><Card accent style={styles.profile}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={[styles.avatarText, { color: colors.primaryText }]}>{userName.slice(0, 1)}</Text></View><Text style={[styles.name, { color: colors.text }]}>{userName}</Text><Text style={[styles.phone, { color: colors.muted }]}>{data?.phone ?? ""}</Text><View style={styles.stats}>{age != null ? <Text style={[styles.stat, { color: colors.text, backgroundColor: colors.input }]}>العمر: {age} سنة</Text> : null}<Text style={[styles.stat, { color: colors.text, backgroundColor: colors.input }]}>الأجزاء: {student?.totalJuz ?? 0}</Text></View></Card>{query.error ? <ErrorState onRetry={() => void query.refetch()} /> : null}<SectionTitle title="مساحتي" /><FeatureTile title="تقدمي الدراسي" description="الأجزاء والجلسات ومتوسط الإنجاز" icon="trending-up-outline" onPress={() => router.push("/student/progress")} /><FeatureTile title="إجازاتي وشهاداتي" description="شهادات القراءات وطلبات الاعتماد" icon="ribbon-outline" onPress={() => router.push("/student/ijazat")} /><FeatureTile title="الإشعارات" description="التنبيهات وإعدادات التسليم" icon="notifications-outline" onPress={() => router.push("/student/notifications")} /><FeatureTile title="المساعدة" description="أسئلة شائعة وطرق التواصل" icon="help-circle-outline" onPress={() => router.push("/student/help")} /><SectionTitle title="الحساب" /><Card><Pressable onPress={toggleTheme} style={styles.settingRow}><Text style={[styles.settingText, { color: colors.text }]}>الوضع الليلي</Text><Text style={[styles.themeStatus, { color: colors.muted }]}>{isDark ? "مفعّل" : "معطّل"}</Text></Pressable><View style={[styles.separator, { backgroundColor: colors.border }]} /><Pressable onPress={() => router.push("/student/settings")} style={styles.settingRow}><Text style={[styles.settingText, { color: colors.text }]}>الإعدادات والتفضيلات</Text><Text style={[styles.arrow, { color: colors.muted }]}>‹</Text></Pressable><View style={[styles.separator, { backgroundColor: colors.border }]} /><Pressable onPress={() => router.push("/student/settings?focus=delete" as never)} style={styles.settingRow}><Text style={[styles.settingText, { color: colors.danger }]}>حذف الحساب</Text><Text style={[styles.arrow, { color: colors.danger }]}>‹</Text></Pressable></Card><Button label="تسجيل الخروج" icon="log-out-outline" variant="secondary" onPress={() => void signOut().then(() => router.replace("/login"))} /></Screen>;
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingVertical: 24 },
  avatar: { width: 68, height: 68, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  avatarText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 27 },
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 20 },
  phone: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 4 },
  stats: { flexDirection: "row", gap: 8, marginTop: 12 },
  stat: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  settingRow: { minHeight: 50, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  settingText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  themeStatus: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  arrow: { fontSize: 26, lineHeight: 26 },
  separator: { height: StyleSheet.hairlineWidth },
});
