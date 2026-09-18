import { Tabs } from "expo-router";
import { Icon } from "../../../components/ui";
import { useTheme } from "../../../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = {
  home: ["home-outline", "الرئيسية"],
  schedule: ["calendar-outline", "جدولي"],
  recordings: ["videocam-outline", "حلقاتي"],
  library: ["library-outline", "المكتبة"],
  fatwa: ["scale-outline", "الفتاوى"],
  account: ["person-outline", "حسابي"],
} as const;

export default function StudentTabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 72 + insets.bottom;
  const common = {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      height: tabBarHeight,
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: Math.max(8, insets.bottom + 4),
      paddingTop: 6,
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      position: "absolute",
      shadowOpacity: 0,
      elevation: 0,
      display: "flex",
    },
    tabBarItemStyle: { borderRadius: 16, marginHorizontal: 3, marginVertical: 5 },
    tabBarActiveBackgroundColor: `${colors.primary}14`,
    tabBarLabelStyle: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 9 },
  } as const;
  const icon = (name: string) => ({ color, size }: { color: string; size: number }) => <Icon name={name} size={size - 1} color={color} />;
  return (
    <Tabs screenOptions={common}>
      <Tabs.Screen name="home" options={{ title: tabs.home[1], tabBarIcon: icon(tabs.home[0]) }} />
      <Tabs.Screen name="schedule" options={{ title: tabs.schedule[1], tabBarIcon: icon(tabs.schedule[0]) }} />
      <Tabs.Screen name="recordings" options={{ title: tabs.recordings[1], tabBarIcon: icon(tabs.recordings[0]) }} />
      <Tabs.Screen name="library" options={{ title: tabs.library[1], tabBarIcon: icon(tabs.library[0]) }} />
      <Tabs.Screen name="fatwa" options={{ title: tabs.fatwa[1], tabBarIcon: icon(tabs.fatwa[0]) }} />
      {/* Web يضع المصحف هنا، لكن Mobile يستثنيه عمداً حتى تعود أصول QCF في إصدار مستقل. */}
      <Tabs.Screen name="account" options={{ title: tabs.account[1], tabBarIcon: icon(tabs.account[0]) }} />
    </Tabs>
  );
}
