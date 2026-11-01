import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useId, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useTheme, palette, type ThemePreference } from "../../lib/theme";
import { NavigationMenu } from "./navigation-menu";
import { useAuth, type Role } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SoftPressable } from "./soft-pressable";
import { useKeyboardFrame } from "../../lib/keyboard";
import designTokens from "../../constants/colors";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { GlowBackground } from "./glow";
import { PageSkeleton } from "./skeleton";

export { SvgIcon, type IconName as SvgIconName } from "./svg-icon";
export { PageHero } from "./page-hero";
export { SoftPressable } from "./soft-pressable";
export { Skeleton, PageSkeleton } from "./skeleton";

type IconName = keyof typeof Ionicons.glyphMap;

/** First letter of the first two words, like the web InitialsAvatar. */
export function initials(name: string | null | undefined) {
  const letters = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("");
  return letters || "ت";
}

/** Web `.btn-primary-bubble`: burgundy gradient by day, gold by night. */
const PRIMARY_GRADIENT = { light: ["#A02040", "#800020", "#6B0018"], dark: ["#EBCB5C", "#D4AF37", "#B8962A"] } as const;
/** Web `.card-bubble` / `.glass` border: thin burgundy by day, gold by night. */
export const cardBorder = (isDark: boolean) => (isDark ? "rgba(212,175,55,0.28)" : "rgba(128,0,32,0.18)");

export function Icon({ name, size = 22, color, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Ionicons name={name as IconName} size={size} color={color ?? colors.primary} style={style} />;
}

export function Screen({ children, scroll = true, scrollEnabled = true, contentStyle, scrollStyle, scrollContentStyle }: { children: React.ReactNode; scroll?: boolean; scrollEnabled?: boolean; contentStyle?: StyleProp<ViewStyle>; scrollStyle?: StyleProp<ViewStyle>; scrollContentStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardAreaRef = useRef<View>(null);
  useEffect(() => {
    if (!scrollEnabled) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollEnabled]);
  // Android no longer shrinks the window for the keyboard (edge to edge), so
  // the screen ends at the keyboard and scrolls the focused field above it.
  const keyboard = useKeyboardFrame();
  const keyboardInset = Platform.OS === "android" ? keyboard.height : 0;
  useEffect(() => {
    if (!keyboardInset || !scroll) return;
    // Wait for the shortened layout; scrolling earlier is clamped to the old height.
    const timer = setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput();
      const area = keyboardAreaRef.current;
      if (!input || !area) return;
      // Measure both in the same coordinates: the keyboard event reports screen
      // positions, which are offset from the window on edge-to-edge Android.
      area.measureInWindow((_areaX, areaY, _areaWidth, areaHeight) => {
        const visibleBottom = areaY + areaHeight - keyboardInset;
        input.measureInWindow((_x, y, _width, height) => {
          const overlap = y + height + 24 - visibleBottom;
          if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
        });
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [keyboardInset, scroll]);
  const body = <View style={[styles.content, contentStyle]}>{children}</View>;
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
     ? <ScrollView ref={scrollRef} onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} automaticallyAdjustKeyboardInsets scrollEnabled={scrollEnabled} style={[styles.transparent, scrollStyle]} contentContainerStyle={[styles.scrollContent, isStudentTabs ? styles.tabScrollContent : undefined, { paddingBottom: Math.max(isStudentTabs ? 120 : 40, insets.bottom + 24) }, scrollContentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">{body}</ScrollView>
    : body;
  return (
    <>
      {studentTabTitle ? <Header title={studentTabTitle} menu="student" home={pathname === "/student/home"} /> : null}
      {/* Always wrapped: swapping the tree when the keyboard opens would remount the field and close it. */}
      <View ref={keyboardAreaRef} style={[styles.keyboardArea, { paddingBottom: keyboardInset, backgroundColor: colors.background }]}>
        {Platform.OS === "web" ? null : <GlowBackground />}
        {content}
      </View>
    </>
  );
}

/**
 * Screen header. The menu (or back) button sits at the right, where Arabic
 * reading starts; notifications and any screen action sit at the left. The
 * light/dark choice lives in settings.
 * The title is centred on the screen, clear of whichever side is wider. Home
 * screens show the logo in place of a title.
 */
export function Header({ title, subtitle, back = false, right, menu, home = false, nativeHeaderSurface = "default" }: {
  title: string; subtitle?: string; back?: boolean; right?: React.ReactNode; menu?: Role; home?: boolean; nativeHeaderSurface?: "default" | "page";
}) {
  // Both sides take the wider side's width so the title stays centred on the
  // screen while the header still grows with a two-line subtitle.
  const [sideWidth, setSideWidth] = useState(44);
  const measureSide = (width: number) => setSideWidth((current) => Math.max(current, Math.ceil(width)));
  const { colors, isDark } = useTheme();
  const { role, name } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const profilePath = role === "student" ? "/student/account" : role === "teacher" ? "/teacher/settings" : role === "admin" ? "/admin/settings" : null;
  const useNativePageSurface = Platform.OS !== "web" && nativeHeaderSurface === "page";
  const headerActionSurface = useNativePageSurface
    ? styles.headerActionBare
    : Platform.OS !== "web" && isDark
      ? { backgroundColor: colors.secondary, borderColor: "transparent", borderWidth: 0 }
    : { backgroundColor: colors.input, borderColor: colors.border };
  const notificationPath = role === "admin" ? "/admin/inbox" : role ? `/${role}/notifications` : null;
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: Boolean(notificationPath),
    staleTime: 30_000,
    retry: false,
  });
  return (
    <>
      <View style={[
        styles.header,
        Platform.OS === "web" ? styles.headerWebDepth : styles.headerNativeFlat,
        {
          backgroundColor: Platform.OS === "web" ? colors.card : colors.background,
          borderBottomColor: Platform.OS === "web" ? colors.border : "transparent",
        },
      ]}>
      <View style={[styles.headerActions, { minWidth: sideWidth }]} onLayout={(event) => measureSide(event.nativeEvent.layout.width)}>
        {notificationPath ? (
          <SoftPressable
            accessibilityLabel="الإشعارات"
            onPress={() => router.push(notificationPath as never)}
            style={[styles.iconButton, headerActionSurface]}
          >
            <Icon name="notifications-outline" color={colors.primary} />
            {(unreadQuery.data?.count ?? 0) > 0 ? (
              <View style={[styles.notificationBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.notificationBadgeText}>{unreadQuery.data?.count}</Text>
              </View>
            ) : null}
          </SoftPressable>
        ) : null}
        {right}
        {profilePath && !right ? (
          <SoftPressable accessibilityLabel="حسابي" onPress={() => router.push(profilePath as never)} style={[styles.avatar, { backgroundColor: colors.primary, borderColor: palette.gold }]}>
            <Text style={[styles.avatarText, { color: colors.primaryText }]}>{initials(name)}</Text>
          </SoftPressable>
        ) : null}
      </View>
      <View pointerEvents="none" style={styles.headerTitle}>
        {home ? (
          <Image source={isDark ? require("../../assets/images/logo-dark.png") : require("../../assets/images/logo-light.png")} resizeMode="contain" style={styles.headerLogo} accessibilityLabel="تبيان" />
        ) : (
          <>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { color: isDark ? palette.gold : palette.burgundy }]}>{title}</Text>
            {subtitle ? <Text numberOfLines={2} style={[styles.headerSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
          </>
        )}
      </View>
      <View style={[styles.headerSide, { minWidth: sideWidth }]} onLayout={(event) => measureSide(event.nativeEvent.layout.width)}>
        {menu ? (
          <SoftPressable accessibilityLabel="القائمة" onPress={() => setMenuOpen(true)} style={[styles.iconButton, headerActionSurface]}>
            <Icon name="menu-outline" color={colors.primary} />
          </SoftPressable>
        ) : back ? (
          <SoftPressable accessibilityLabel="رجوع" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={[styles.iconButton, headerActionSurface]}>
            <Icon name="arrow-forward" color={colors.primary} />
          </SoftPressable>
        ) : null}
      </View>
      </View>
      {menu ? <NavigationMenu role={menu} visible={menuOpen} onClose={() => setMenuOpen(false)} /> : null}
    </>
  );
}

export function Card({ children, style, accent = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  const { colors, isDark } = useTheme();
  // Web `.card-bubble`: a burgundy-tinted shadow lifts the card off the page.
  return <View style={[styles.card, {
    backgroundColor: colors.card,
    borderColor: accent ? `${palette.gold}88` : cardBorder(isDark),
    shadowColor: isDark ? "#000" : palette.burgundy,
  }, style]}>{children}</View>;
}

export function Button({ label, onPress, variant = "primary", icon, disabled = false, loading = false, testID, style }: {
  label: string; onPress?: () => void; variant?: "primary" | "secondary" | "quiet" | "danger"; icon?: string; disabled?: boolean; loading?: boolean; testID?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors, mode, isDark } = useTheme();
  // Web `.btn-bubble`: a full pill; primary carries a gradient, secondary a tinted fill with a 1.5px border.
  const tint = isDark ? "212,175,55" : "128,0,32";
  const background = variant === "primary" ? PRIMARY_GRADIENT[mode][1] : variant === "danger" ? `${colors.danger}1A` : variant === "secondary" ? `rgba(${tint},${isDark ? 0.09 : 0.07})` : "transparent";
  const foreground = variant === "danger" ? colors.danger : variant === "primary" ? (isDark ? palette.night : "#FFFFFF") : colors.primary;
  const borderColor = variant === "secondary" ? `rgba(${tint},${isDark ? 0.28 : 0.22})` : variant === "danger" ? `${colors.danger}40` : variant === "quiet" ? "transparent" : background;
  // The gradient needs real pixel sizes; percentages inside the Svg do not track the pill.
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Gradient ids are global on the web build; keep them unique per button.
  const gradientId = useId();
  return (
    <SoftPressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress}
      onLayout={variant === "primary" ? (event) => { const { width, height } = event.nativeEvent.layout; setSize((current) => (current.width === width && current.height === height ? current : { width, height })); } : undefined}
      style={[
        styles.button, { backgroundColor: background, borderColor, shadowColor: isDark ? "#000" : palette.burgundy, ...(variant === "primary" ? styles.buttonLift : null), ...(disabled ? { opacity: 0.52 } : {}) },
        style,
      ]}>
      {variant === "primary" && size.width > 0 ? (
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={`btn-${gradientId}`} x1="0" y1="0" x2={size.width} y2={size.height * 0.6} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={PRIMARY_GRADIENT[mode][0]} />
              <Stop offset="0.52" stopColor={PRIMARY_GRADIENT[mode][1]} />
              <Stop offset="1" stopColor={PRIMARY_GRADIENT[mode][2]} />
            </LinearGradient>
            <LinearGradient id={`sheen-${gradientId}`} x1="0" y1="0" x2="0" y2={size.height} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.26} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#btn-${gradientId})`} />
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#sheen-${gradientId})`} />
        </Svg>
      ) : null}
      {loading ? <ActivityIndicator color={foreground} /> : null}
      {icon && !loading ? <Icon name={icon} size={18} color={foreground} /> : null}
      <Text numberOfLines={1} style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </SoftPressable>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "system", label: "تلقائي", icon: "phone-portrait-outline" },
  { value: "light", label: "فاتح", icon: "sunny-outline" },
  { value: "dark", label: "داكن", icon: "moon-outline" },
];

/** Light/dark choice for settings screens; "تلقائي" follows the device. */
export function ThemePreferencePicker() {
  const { colors, preference, setPreference } = useTheme();
  return (
    <View style={styles.themePicker}>
      <Text style={[styles.themePickerTitle, { color: colors.text }]}>المظهر</Text>
      <Text style={[styles.themePickerHint, { color: colors.muted }]}>«تلقائي» يتبع إعداد الوضع الليلي في جهازك.</Text>
      <View style={styles.themeOptions}>
        {THEME_OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <SoftPressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setPreference(option.value)}
              style={[styles.themeOption, { backgroundColor: selected ? colors.primary : colors.input, borderColor: selected ? colors.primary : colors.border }]}
            >
              <Icon name={option.icon} size={18} color={selected ? colors.primaryText : colors.primary} />
              <Text style={[styles.themeOptionText, { color: selected ? colors.primaryText : colors.text }]}>{option.label}</Text>
            </SoftPressable>
          );
        })}
      </View>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionText, { color: isDark ? palette.gold : palette.burgundy }]}>{title}</Text>
      {action ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}><Text style={[styles.actionText, { color: colors.primary }]}>{action}</Text></Pressable> : null}
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

/** Placeholder blocks in the page's shape while data loads (web skeletons); `spinner` keeps the old wheel. */
export function LoadingState({ label = "جارٍ التحميل…", spinner = false }: { label?: string; spinner?: boolean }) {
  const { colors } = useTheme();
  if (!spinner) return <View accessibilityLabel={label}><PageSkeleton /></View>;
  return <View style={styles.state}><ActivityIndicator color={colors.primary} size="large" /><Text style={[styles.stateText, { color: colors.muted }]}>{label}</Text></View>;
}

/** Web EmptyState diamond: an outlined square turned 45° around a filled dot. */
function EmptyDiamond() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44" fill="none">
      <Rect x={10} y={10} width={24} height={24} rx={2} stroke={palette.gold} strokeWidth={1.6} transform="rotate(45 22 22)" />
      <Rect x={15} y={15} width={14} height={14} rx={1} stroke={palette.burgundy} strokeWidth={1.4} transform="rotate(45 22 22)" />
      <Circle cx={22} cy={22} r={3} fill={palette.burgundy} />
    </Svg>
  );
}

/** Web EmptyState: a bare gold diamond in a soft glow, an Amiri title, no card. */
export function EmptyState({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void; /** Kept for callers; the web always shows the gold diamond. */ icon?: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyGlow, { backgroundColor: `${palette.gold}${isDark ? "26" : "1F"}` }]}><EmptyDiamond /></View>
      <Text style={[styles.emptyTitle, { color: isDark ? palette.gold : palette.burgundy }]}>{title}</Text>
      {description ? <Text style={[styles.emptyDescription, { color: colors.muted }]}>{description}</Text> : null}
      {action ? <Button label={action} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

export function ErrorState({ onRetry, message = "تعذر الوصول إلى البيانات. تحقق من الاتصال وحاول مرة أخرى." }: { onRetry?: () => void; message?: string }) {
  const { colors } = useTheme();
  return <Card style={styles.empty}><Icon name="cloud-offline-outline" size={38} color={colors.danger} /><Text style={[styles.emptyTitle, { color: colors.text }]}>حدث خطأ مؤقت</Text><Text style={[styles.emptyDescription, { color: colors.muted }]}>{message}</Text>{onRetry ? <Button label="إعادة المحاولة" onPress={onRetry} variant="secondary" icon="refresh-outline" /> : null}</Card>;
}

export type BadgeTone = "gold" | "success" | "danger" | "muted" | "info" | "warning" | "live";

/** Web StatusBadge palette: green / amber / red / blue, gold for brand states, solid burgundy for "live". */
export function Badge({ label, tone = "gold", style }: { label: string; tone?: BadgeTone; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const palettes: Record<BadgeTone, { bg: string; fg: string }> = {
    gold: { bg: `${palette.gold}25`, fg: colors.primary },
    success: { bg: isDark ? "rgba(74,222,128,0.18)" : "#DCFCE7", fg: isDark ? "#86EFAC" : "#166534" },
    warning: { bg: isDark ? "rgba(250,204,21,0.18)" : "#FEF9C3", fg: isDark ? "#FDE047" : "#854D0E" },
    danger: { bg: isDark ? "rgba(248,113,113,0.18)" : "#FEE2E2", fg: isDark ? "#FCA5A5" : "#991B1B" },
    info: { bg: isDark ? "rgba(96,165,250,0.18)" : "#DBEAFE", fg: isDark ? "#93C5FD" : "#1E40AF" },
    muted: { bg: colors.input, fg: colors.muted },
    live: { bg: colors.primary, fg: colors.primaryText },
  };
  const { bg, fg } = palettes[tone];
  return <View style={[styles.badge, { backgroundColor: bg }, style]}><Text numberOfLines={1} style={[styles.badgeText, { color: fg }]}>{label}</Text></View>;
}

export function FeatureTile({ title, description, icon, onPress, accent = false, style }: { title: string; description?: string; icon: string; onPress: () => void; accent?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  return <SoftPressable accessibilityRole="button" onPress={onPress} style={[styles.tile, { backgroundColor: colors.card, borderColor: accent ? `${palette.gold}88` : cardBorder(isDark), shadowColor: isDark ? "#000" : palette.burgundy }, style]}><View style={[styles.tileIcon, { backgroundColor: accent ? `${palette.gold}22` : colors.input }]}><Icon name={icon} size={25} color={accent ? palette.gold : colors.primary} /></View><View style={styles.tileBody}><Text style={[styles.tileTitle, { color: colors.text }]}>{title}</Text>{description ? <Text numberOfLines={2} style={[styles.tileDescription, { color: colors.muted }]}>{description}</Text> : null}</View><Icon name="chevron-back" size={18} color={colors.muted} /></SoftPressable>;
}

const styles = StyleSheet.create({
  content: { flex: 1, width: "100%", maxWidth: 820, alignSelf: "center", paddingHorizontal: 18, paddingTop: 12 },
  scrollContent: { paddingBottom: 40 },
  keyboardArea: { flex: 1 },
  transparent: { backgroundColor: "transparent" },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 17, includeFontPadding: false },
  buttonLift: { shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  emptyGlow: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  tabScrollContent: { paddingBottom: 104 },
  header: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerNativeFlat: { borderBottomWidth: 0, shadowColor: "transparent", shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0, boxShadow: "none" },
  headerWebDepth: { borderBottomWidth: StyleSheet.hairlineWidth, shadowColor: "#2B0D12", shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  headerSide: { minWidth: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  headerActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 6 },
  headerLogo: { width: 48, height: 48 },
  headerActionBare: { backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0 },
  headerTitle: { flex: 1, minWidth: 0, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  headerText: { alignSelf: "stretch", fontFamily: "Amiri_700Bold", fontSize: 22, lineHeight: 32, textAlign: "center" },
  headerSubtitle: { alignSelf: "stretch", fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 1, textAlign: "center" },
  iconButton: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  notificationBadge: { position: "absolute", top: 1, left: 1, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFF" },
  notificationBadgeText: { color: "#FFF", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 9, lineHeight: 12, textAlign: "center" },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 12, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  button: { minHeight: 46, borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 20, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  buttonText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 23, flexShrink: 1, textAlign: "center", paddingVertical: 8 },
  themePicker: { gap: 6 },
  themePickerTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  themePickerHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
  themeOptions: { flexDirection: "row-reverse", gap: 8, marginTop: 4 },
  themeOption: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 },
  themeOptionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  sectionAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  sectionTitle: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 10 },
  sectionText: { flex: 1, fontFamily: "Amiri_700Bold", fontSize: 21, lineHeight: 30, textAlign: "right" },
  actionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  smallText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, lineHeight: 20 },
  progressLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressTrack: { height: 8, borderRadius: 8, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 8 },
  state: { minHeight: 168, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 20 },
  stateText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 14 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  emptyTitle: { fontFamily: "Amiri_700Bold", fontSize: 22, lineHeight: 34, textAlign: "center" },
  emptyDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 23, textAlign: "center", marginBottom: 4 },
  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, alignSelf: "flex-start" },
  badgeText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 },
  tile: { minHeight: 76, borderRadius: 22, borderWidth: 1, padding: 14, marginBottom: 10, flexDirection: "row-reverse", alignItems: "center", gap: 12, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tileBody: { flex: 1, minWidth: 0 },
  tileTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 23, textAlign: "right" },
  tileDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 2 },
});
