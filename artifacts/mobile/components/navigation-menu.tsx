import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, type Role } from "../lib/auth";
import { trpc } from "../lib/trpc";
import { palette, useTheme } from "../lib/theme";

type MenuItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  section?: "main" | "secondary" | "access";
};

function MenuIcon({ name, size, color }: { name: string; size: number; color: string }) {
  return <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
}

const MENUS: Record<Role, MenuItem[]> = {
  student: [
    { href: "/student/account", label: "الملف الشخصي", icon: "person-outline", section: "main" },
    { href: "/student/schedule", label: "الجدول الأسبوعي", icon: "calendar-outline", section: "main" },
    { href: "/student/progress", label: "تقدمي", icon: "bar-chart-outline", section: "main" },
    { href: "/student/recordings", label: "حلقاتي المسجلة", icon: "videocam-outline", section: "main" },
    { href: "/student/library", label: "مكتبتي", icon: "library-outline", section: "main" },
    { href: "/student/fatwa", label: "فتاواي", icon: "scale-outline", section: "main" },
    { href: "/student/ijazat", label: "إجازاتي", icon: "ribbon-outline", section: "main" },
    { href: "/student/settings", label: "الإعدادات", icon: "settings-outline", section: "secondary" },
    { href: "/student/notifications", label: "الإشعارات", icon: "notifications-outline", section: "secondary" },
    { href: "/student/help", label: "المساعدة والدعم", icon: "help-circle-outline", section: "secondary" },
    { href: "/teacher-register", label: "التسجيل كمعلم", icon: "clipboard-outline", section: "access" },
    { href: "/login?role=admin", label: "بوابة الإشراف", icon: "shield-outline", section: "access" },
  ],
  teacher: [
    { href: "/teacher", label: "لوحة التحكم", icon: "home-outline", exact: true, section: "main" },
    { href: "/teacher/schedule", label: "جدولي", icon: "calendar-outline", section: "main" },
    { href: "/teacher/students", label: "طلابي", icon: "people-outline", section: "main" },
    { href: "/teacher/recordings", label: "حلقاتي المُسجَّلة", icon: "videocam-outline", section: "main" },
    { href: "/teacher/fatwas", label: "فتاواي", icon: "scale-outline", section: "main" },
    { href: "/teacher/evaluations", label: "تقييماتي", icon: "bar-chart-outline", section: "main" },
    { href: "/teacher/broadcast", label: "الإشعارات الجماعية", icon: "notifications-outline", section: "main" },
    { href: "/teacher/settings", label: "الإعدادات", icon: "settings-outline", section: "main" },
    { href: "/login?role=admin", label: "بوابة الإشراف", icon: "shield-outline", section: "access" },
  ],
  admin: [
    { href: "/admin", label: "الرئيسية", icon: "home-outline", exact: true },
    { href: "/admin/accounts", label: "إدارة الحسابات", icon: "shield-outline" },
    { href: "/admin/users", label: "المستخدمون", icon: "people-outline" },
    { href: "/admin/schedules", label: "الجداول والمواعيد", icon: "calendar-outline" },
    { href: "/admin/sessions-monitoring", label: "متابعة الحلقات", icon: "videocam-outline" },
    { href: "/admin/library", label: "المكتبة", icon: "library-outline" },
    { href: "/admin/qiraat", label: "إجازات الشاطبية", icon: "ribbon-outline" },
    { href: "/admin/promotions", label: "ترقية المستويات", icon: "school-outline" },
    { href: "/admin/levels", label: "إدارة المستويات", icon: "school-outline" },
    { href: "/admin/sharia", label: "الدروس الشرعية", icon: "book-outline" },
    { href: "/admin/students-review", label: "مراجعة الطلاب", icon: "videocam-outline" },
    { href: "/admin/teachers-review", label: "مراجعة المعلمين", icon: "person-outline" },
    { href: "/admin/fatwas", label: "الفتاوى", icon: "scale-outline" },
    { href: "/admin/muftis", label: "المفتون", icon: "bookmark-outline" },
    { href: "/admin/assessments", label: "منشئ التقييمات", icon: "clipboard-outline" },
    { href: "/admin/analytics", label: "التحليلات", icon: "bar-chart-outline" },
    { href: "/admin/notifications", label: "مركز الإشعارات", icon: "notifications-outline" },
    { href: "/admin/audit-log", label: "سجل التدقيق", icon: "clipboard-outline" },
    { href: "/admin/settings", label: "الإعدادات", icon: "settings-outline" },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  student: "طالب",
  teacher: "لوحة المعلم",
  admin: "لوحة الإشراف",
};

export function NavigationMenu({ role, visible, onClose }: { role: Role; visible: boolean; onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const { name, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const teacherCapability = trpc.teacher.kycStatus.useQuery(undefined, { enabled: role === "teacher", retry: false });
  const items = role === "teacher" && teacherCapability.data?.isMufti !== true
    ? MENUS[role].filter((item) => item.href !== "/teacher/fatwas")
    : MENUS[role];

  const navigate = (href: string) => {
    onClose();
    router.push(href as never);
  };

  const logout = async () => {
    onClose();
    await signOut();
    router.replace("/login" as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="إغلاق القائمة" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.panel, { backgroundColor: colors.card, borderLeftColor: colors.border }]}>
          <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryText }]}>{(name ?? "ت").slice(0, 1)}</Text>
            </View>
            <View style={styles.identity}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{name ?? "مستخدم تبيان"}</Text>
              <Text style={[styles.role, { color: colors.muted }]}>{ROLE_LABELS[role]}</Text>
            </View>
            <Pressable accessibilityLabel="إغلاق" onPress={onClose} style={styles.closeButton}>
              <MenuIcon name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {items.map((item, index) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const separator = index > 0 && item.section !== items[index - 1]?.section;
              return (
                <View key={item.href} style={separator ? styles.withSeparator : undefined}>
                  {separator ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => navigate(item.href)}
                    style={({ pressed }) => [
                      styles.menuItem,
                      { backgroundColor: active ? (isDark ? `${palette.gold}25` : `${colors.primary}12`) : "transparent", opacity: pressed ? 0.82 : 1 },
                    ]}
                  >
                    <MenuIcon name={item.icon} size={19} color={active ? palette.goldDark : colors.muted} />
                    <Text style={[styles.menuText, { color: active ? colors.primary : colors.text }]}>{item.label}</Text>
                    {active ? <View style={[styles.activeDot, { backgroundColor: palette.gold }]} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تسجيل الخروج"
              onPress={() => void logout()}
              style={({ pressed }) => [styles.logout, { opacity: pressed ? 0.78 : 1 }]}
            >
              <MenuIcon name="log-out-outline" size={19} color={colors.danger} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>تسجيل الخروج</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row", backgroundColor: "transparent" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  panel: { width: "82%", maxWidth: 360, borderLeftWidth: StyleSheet.hairlineWidth, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 18, elevation: 12 },
  panelHeader: { minHeight: 102, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 20 },
  identity: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, maxWidth: "100%" },
  role: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  menuScroll: { flex: 1 },
  menuContent: { padding: 12, gap: 3 },
  withSeparator: { borderTopWidth: 0 },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  menuItem: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  menuText: { flex: 1, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, textAlign: "right" },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  logout: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  logoutText: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
});