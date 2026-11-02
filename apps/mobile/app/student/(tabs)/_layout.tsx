import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgIcon, type SvgIconName } from "../../../components/ui";
import { palette, useTheme } from "../../../lib/theme";

// Same seven tabs as the web StudentBottomNav, with its icons.
const TABS: Record<string, [SvgIconName, string]> = {
  home: ["home", "الرئيسية"],
  schedule: ["calendar", "جدولي"],
  recordings: ["video", "حلقاتي"],
  library: ["library", "المكتبة"],
  fatwa: ["scale", "الفتاوى"],
  mushaf: ["quran", "المصحف"],
  account: ["user", "حسابي"],
};

export default function StudentTabsLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const active = isDark ? palette.gold : palette.burgundy;
  const barBottom = Math.max(10, insets.bottom + 6);
  const barHeight = 70;
  const activeFill = isDark ? "rgba(212,175,55,0.12)" : "rgba(128,0,32,0.10)";
  const common = {
    headerShown: false,
    // A light slide-and-fade between tabs.
    animation: "shift",
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: active,
    tabBarInactiveTintColor: colors.muted,
    // Web: a floating glass pill with a burgundy-tinted shadow.
    tabBarStyle: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom: barBottom,
      height: barHeight,
      borderRadius: 32,
      borderTopWidth: 0,
      borderWidth: 1,
      borderColor: isDark ? "rgba(212,175,55,0.15)" : "rgba(128,0,32,0.12)",
      backgroundColor: isDark ? "#3F111D" : "#FEFBF4",
      paddingHorizontal: 6,
      paddingTop: 0,
      paddingBottom: 0,
      shadowColor: isDark ? "#000" : palette.burgundy,
      shadowOpacity: isDark ? 0.5 : 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      display: "flex",
    },
    // Icon, label and the active pill are drawn together in tabBarIcon, so the pill has a real size
    // and is never clipped by the bar's inner container.
    tabBarShowLabel: false,
    tabBarItemStyle: { height: barHeight - 2, paddingVertical: 0, paddingHorizontal: 0, justifyContent: "center", alignItems: "center" },
    tabBarIconStyle: { width: "100%", height: barHeight - 12, alignItems: "center", justifyContent: "center" },
  } as const;
  const options = (key: string) => ({
    title: TABS[key][1],
    tabBarAccessibilityLabel: TABS[key][1],
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <View style={[styles.pill, focused ? { backgroundColor: activeFill } : null]}>
        <View style={styles.icon}>
          <SvgIcon name={TABS[key][0]} size={23} color={color} />
        </View>
        <Text numberOfLines={1} allowFontScaling={false} style={[styles.label, { color, fontFamily: focused ? "IBMPlexSansArabic_700Bold" : "IBMPlexSansArabic_500Medium" }]}>{TABS[key][1]}</Text>
      </View>
    ),
  });
  // Listed left to right on screen: the layout never mirrors (see app/_layout.tsx),
  // so home goes last to sit on the right.
  return (
    <Tabs screenOptions={common} initialRouteName="home">
      <Tabs.Screen name="account" options={options("account")} />
      {/* The index; the full-screen reader is the stack route /student/mushaf. */}
      <Tabs.Screen name="mushaf-tab" options={options("mushaf")} />
      <Tabs.Screen name="fatwa" options={options("fatwa")} />
      <Tabs.Screen name="library" options={options("library")} />
      <Tabs.Screen name="recordings" options={options("recordings")} />
      <Tabs.Screen name="schedule" options={options("schedule")} />
      <Tabs.Screen name="home" options={options("home")} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // A circle: as wide as the tab allows, capped so the label still fits inside.
  pill: { width: "100%", maxWidth: 56, aspectRatio: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", gap: 1 },
  icon: { alignItems: "center", justifyContent: "center", height: 26 },
  label: { fontSize: 10, lineHeight: 14, textAlign: "center", alignSelf: "stretch" },
});
