import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { I18nManager, Platform, View } from "react-native";
import { useFonts } from "expo-font";
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic";
import { Amiri_400Regular, Amiri_700Bold } from "@expo-google-fonts/amiri";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../lib/theme";
import { TRPCProvider } from "../lib/trpc";
import { AuthProvider } from "../lib/auth";
import { BrandedSplash } from "../components/branded-splash";

if (Platform.OS !== "web") void SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { isDark } = useTheme();
  const [brandedSplashDone, setBrandedSplashDone] = useState(false);
  const finishBrandedSplash = useCallback(() => setBrandedSplashDone(true), []);
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </SafeAreaView>
      {!brandedSplashDone ? <BrandedSplash onDone={finishBrandedSplash} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
  });
  const ready = Platform.OS === "web" || loaded || !!fontError;

  useEffect(() => {
    if (Platform.OS !== "web" && !I18nManager.isRTL) I18nManager.allowRTL(true);
    if (Platform.OS !== "web" && ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: "#FAF7F0" }} />;
  return <SafeAreaProvider><ThemeProvider><TRPCProvider><AuthProvider><AppShell /></AuthProvider></TRPCProvider></ThemeProvider></SafeAreaProvider>;
}
