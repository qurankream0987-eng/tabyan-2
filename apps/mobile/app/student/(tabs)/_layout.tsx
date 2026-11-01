import { Tabs } from "expo-router";
import { Platform } from "react-native";
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
  const isWeb = Platform.OS === "web";
  const tabBarHeight = 72 + insets.bottom;
  const common = {
    headerShown: false,
    // A light slide-and-fade between tabs.
    animation: "shift",
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
      paddingHorizontal: 8,
      backgroundColor: colors.card,
      borderTopColor: isWeb ? colors.border : "transparent",
      borderTopWidth: isWeb ? 1 : 0,
      position: "absolute",
      ...(isWeb
        ? {
            shadowColor: "#2B0D12",
            shadowOpacity: 0.055,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: -3 },
            elevation: 5,
          }
        : {
            shadowColor: "transparent",
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
            elevation: 0,
            boxShadow: "none",
          }),
      display: "flex",
    },
    // The library paints the active background on an inner view with no radius; clip it here.
    tabBarItemStyle: { borderRadius: 15, overflow: "hidden", marginHorizontal: 3, marginVertical: 5 },
    tabBarActiveBackgroundColor: `${colors.primary}14`,
    tabBarLabelStyle: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 10, lineHeight: 14 },
  } as const;
  const icon = (name: string) => ({ color, size }: { color: string; size: number }) => <Icon name={name} size={size - 1} color={color} />;
  // Listed left to right on screen: the layout never mirrors (see app/_layout.tsx),
  // so home goes last to sit on the right.
  return (
    <Tabs screenOptions={common} initialRouteName="home">
      <Tabs.Screen name="account" options={{ title: tabs.account[1], tabBarIcon: icon(tabs.account[0]) }} />
      <Tabs.Screen name="fatwa" options={{ title: tabs.fatwa[1], tabBarIcon: icon(tabs.fatwa[0]) }} />
      <Tabs.Screen name="library" options={{ title: tabs.library[1], tabBarIcon: icon(tabs.library[0]) }} />
      <Tabs.Screen name="recordings" options={{ title: tabs.recordings[1], tabBarIcon: icon(tabs.recordings[0]) }} />
      <Tabs.Screen name="schedule" options={{ title: tabs.schedule[1], tabBarIcon: icon(tabs.schedule[0]) }} />
      <Tabs.Screen name="home" options={{ title: tabs.home[1], tabBarIcon: icon(tabs.home[0]) }} />
    </Tabs>
  );
}
