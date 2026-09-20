import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useTheme, palette } from "../lib/theme";
import { NavigationMenu } from "./navigation-menu";
import { useAuth, type Role } from "../lib/auth";
import { trpc } from "../lib/trpc";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({ name, size = 22, color, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Ionicons name={name as IconName} size={size} color={color ?? colors.primary} style={style} />;
}

export function Screen({ children, scroll = true, contentStyle }: { children: React.ReactNode; scroll?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const body = <View style={[styles.content, { backgroundColor: colors.background }, contentStyle]}>{children}</View>;
  const pathname = usePathname();
  const tabTitles: Record<string, string> = {
    "/student/home": "الرئيسية",
    "/student/schedule": "جدولي",
    "/student/recordings": "حلقاتي",
    "/student/library": "المكتبة",
    "/student/fatwa": "الفتاوى",
    "/student/account": "حسابي",
  };
  const studentTabTitle = tabTitles[pathname];
  const isStudentTabs = !!studentTabTitle;
  const content = scroll
     ? <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.scrollContent, isStudentTabs ? styles.tabScrollContent : undefined, { paddingBottom: Math.max(isStudentTabs ? 120 : 40, insets.bottom + 24) }]} showsVerticalScrollIndicator={false}>{body}</ScrollView>
    : body;
  return (
    <>
      {studentTabTitle ? <Header title={studentTabTitle} menu="student" /> : null}
      {content}
    </>
  );
}

export function Header({ title, subtitle, back = false, right, menu }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; menu?: Role }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { role } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const notificationPath = role ? `/${role}/notifications` : null;
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: Boolean(notificationPath),
    staleTime: 30_000,
    retry: false,
  });
  return (
    <>
      <View style={[styles.header, {
        backgroundColor: colors.background,
        borderBottomColor: `${colors.border}66`,
      }]}>
      <View style={styles.headerSide}>
        {menu ? (
          <Pressable accessibilityLabel="القائمة" onPress={() => setMenuOpen(true)} style={[styles.iconButton, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Icon name="menu-outline" color={colors.primary} />
          </Pressable>
        ) : back ? (
          <Pressable accessibilityLabel="رجوع" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={[styles.iconButton, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Icon name="arrow-forward" color={colors.primary} />
          </Pressable>
        ) : !role ? (
          <Pressable accessibilityLabel="تغيير المظهر" onPress={toggleTheme} style={[styles.iconButton, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Icon name={isDark ? "sunny-outline" : "moon-outline"} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerTitle}>
        <Text numberOfLines={1} style={[styles.headerText, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerActions}>
        {notificationPath ? (
          <Pressable
            accessibilityLabel="الإشعارات"
            onPress={() => router.push(notificationPath as never)}
            style={[styles.iconButton, { backgroundColor: colors.input, borderColor: colors.border }]}
          >
            <Icon name="notifications-outline" color={colors.primary} />
            {(unreadQuery.data?.count ?? 0) > 0 ? (
              <View style={[styles.notificationBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.notificationBadgeText}>{unreadQuery.data?.count}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        {role ? (
          <Pressable accessibilityLabel="تغيير المظهر" onPress={toggleTheme} style={[styles.iconButton, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Icon name={isDark ? "sunny-outline" : "moon-outline"} color={colors.primary} />
          </Pressable>
        ) : null}
        {right ?? <Image source={isDark ? require("../assets/images/logo-dark.png") : require("../assets/images/logo-light.png")} resizeMode="contain" style={styles.headerLogo} accessibilityLabel="تبيان" />}
      </View>
      </View>
      {menu ? <NavigationMenu role={menu} visible={menuOpen} onClose={() => setMenuOpen(false)} /> : null}
    </>
  );
}

export function Card({ children, style, accent = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  const { colors } = useTheme();
  // بلا ظل — التمايز عن الخلفية يأتي من الحد واللون فقط، اتساقاً مع هوية هادئة خالية من التكلف.
  return <View style={[styles.card, {
    backgroundColor: colors.card,
    borderColor: accent ? `${palette.gold}88` : colors.border,
  }, style]}>{children}</View>;
}

export function Button({ label, onPress, variant = "primary", icon, disabled = false, loading = false, style }: {
  label: string; onPress?: () => void; variant?: "primary" | "secondary" | "quiet" | "danger"; icon?: string; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const background = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : variant === "secondary" ? colors.input : "transparent";
  const foreground = variant === "primary" || variant === "danger" ? colors.primaryText : colors.text;
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [
      styles.button, { backgroundColor: background, borderColor: variant === "secondary" ? colors.border : background, opacity: disabled ? 0.5 : pressed ? 0.86 : 1 },
      style,
    ]}>
      {loading ? <ActivityIndicator color={foreground} /> : null}
      {icon && !loading ? <Icon name={icon} size={18} color={foreground} /> : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: colors.text }]}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={[styles.actionText, { color: colors.primary }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const { colors } = useTheme();
  const safe = Math.max(0, Math.min(100, value));
  return (
    <View>
      {label ? <View style={styles.progressLabel}><Text style={[styles.smallText, { color: colors.muted }]}>{label}</Text><Text style={[styles.smallText, { color: colors.primary }]}>{Math.round(safe)}%</Text></View> : null}
      <View style={[styles.progressTrack, { backgroundColor: colors.input }]}><View style={[styles.progressFill, { width: `${safe}%`, backgroundColor: palette.gold }]} /></View>
    </View>
  );
}

export function LoadingState({ label = "جارٍ التحميل…" }: { label?: string }) {
  const { colors } = useTheme();
  return <View style={styles.state}><ActivityIndicator color={colors.primary} size="large" /><Text style={[styles.stateText, { color: colors.muted }]}>{label}</Text></View>;
}

export function EmptyState({ title, description, action, onAction, icon = "diamond-outline" }: { title: string; description?: string; action?: string; onAction?: () => void; icon?: string }) {
  const { colors } = useTheme();
  return <Card style={styles.empty}><Icon name={icon} size={38} color={palette.gold} /><Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>{description ? <Text style={[styles.emptyDescription, { color: colors.muted }]}>{description}</Text> : null}{action ? <Button label={action} onPress={onAction} variant="secondary" /> : null}</Card>;
}

export function ErrorState({ onRetry, message = "تعذر الوصول إلى البيانات. تحقق من الاتصال وحاول مرة أخرى." }: { onRetry?: () => void; message?: string }) {
  const { colors } = useTheme();
  return <Card style={styles.empty}><Icon name="cloud-offline-outline" size={38} color={colors.danger} /><Text style={[styles.emptyTitle, { color: colors.text }]}>حدث خطأ مؤقت</Text><Text style={[styles.emptyDescription, { color: colors.muted }]}>{message}</Text>{onRetry ? <Button label="إعادة المحاولة" onPress={onRetry} variant="secondary" icon="refresh-outline" /> : null}</Card>;
}

export function Badge({ label, tone = "gold" }: { label: string; tone?: "gold" | "success" | "danger" | "muted" }) {
  const { colors } = useTheme();
  const bg = tone === "success" ? `${colors.success}22` : tone === "danger" ? `${colors.danger}22` : tone === "muted" ? colors.input : `${palette.gold}25`;
  const fg = tone === "success" ? colors.success : tone === "danger" ? colors.danger : tone === "muted" ? colors.muted : colors.primary;
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color: fg }]}>{label}</Text></View>;
}

export function FeatureTile({ title, description, icon, onPress, accent = false, style }: { title: string; description?: string; icon: string; onPress: () => void; accent?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, { backgroundColor: colors.card, borderColor: accent ? `${palette.gold}88` : colors.border, opacity: pressed ? 0.86 : 1 }, style]}><View style={[styles.tileIcon, { backgroundColor: accent ? `${palette.gold}22` : colors.input }]}><Icon name={icon} size={25} color={accent ? palette.gold : colors.primary} /></View><View style={styles.tileBody}><Text style={[styles.tileTitle, { color: colors.text }]}>{title}</Text>{description ? <Text numberOfLines={2} style={[styles.tileDescription, { color: colors.muted }]}>{description}</Text> : null}</View><Icon name="chevron-back" size={18} color={colors.muted} /></Pressable>;
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  scrollContent: { paddingBottom: 40 },
  tabScrollContent: { paddingBottom: 104 },
  header: { minHeight: 72, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", shadowOpacity: 0, elevation: 0 },
  headerSide: { width: 44, alignItems: "flex-start" },
  headerActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 2 },
  headerLogo: { width: 54, height: 32 },
  headerTitle: { flex: 1, alignItems: "center" },
  headerText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 18, textAlign: "center" },
  headerSubtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 1, textAlign: "center" },
  iconButton: { width: 40, height: 40, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  notificationBadge: { position: "absolute", top: 1, left: 1, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFF" },
  notificationBadgeText: { color: "#FFF", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 9, lineHeight: 12, textAlign: "center" },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 12, overflow: "hidden" },
  button: { minHeight: 46, borderRadius: 999, borderWidth: 1, paddingHorizontal: 20, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center" },
  buttonText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 10 },
  sectionText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 17 },
  actionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  smallText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12 },
  progressLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressTrack: { height: 8, borderRadius: 8, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 8 },
  state: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 14 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 28 },
  emptyTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "center" },
  emptyDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 23, textAlign: "center", marginBottom: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  badgeText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 },
  tile: { minHeight: 80, borderRadius: 20, borderWidth: 1, padding: 13, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  tileIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  tileBody: { flex: 1, alignItems: "flex-end" },
  tileTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  tileDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 2 },
});
